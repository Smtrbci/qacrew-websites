import { buildPrompt, parseModelJson, validResult, validateJob } from "./prompts.js";

const encoder = new TextEncoder();
const json = (data, status = 200, extra = {}) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra } });
const failure = (status, code, message) => json({ error: code, message }, status);

async function digest(value) {
  const bytes = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function b64url(bytes) { return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
function fromB64url(value) { return Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)); }
async function sign(payload, secret) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const body = b64url(encoder.encode(JSON.stringify(payload)));
  return `${body}.${b64url(await crypto.subtle.sign("HMAC", key, encoder.encode(body)))}`;
}
async function verify(token, secret) {
  try {
    const [body, signature] = token.split(".");
    if (!body || !signature) return null;
    const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    if (!await crypto.subtle.verify("HMAC", key, fromB64url(signature), encoder.encode(body))) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(body)));
    return payload.exp > Date.now() ? payload : null;
  } catch { return null; }
}
function cookie(request) { return (request.headers.get("cookie") || "").split(";").map((x) => x.trim()).find((x) => x.startsWith("qacrew_session="))?.slice("qacrew_session=".length) || ""; }
function secureCookie(request, value, maxAge) { return `qacrew_session=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`; }
function originAllowed(request) {
  const origin = request.headers.get("origin");
  return !origin || new URL(origin).host === new URL(request.url).host;
}
async function sessionUser(request, env) {
  if (!env.SESSION_SECRET) return null;
  const data = await verify(cookie(request), env.SESSION_SECRET);
  return data?.email ? data : null;
}
async function bodyJson(request, maxBytes) {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > maxBytes) return { tooLarge: true };
  const reader = request.body?.getReader();
  if (!reader) return { value: {} };
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); return { tooLarge: true }; }
      chunks.push(value);
    }
  } catch { return { invalid: true }; }
  try { return { value: JSON.parse(new TextDecoder().decode(BufferlessConcat(chunks, size))) }; }
  catch { return { invalid: true }; }
}
function BufferlessConcat(chunks, length) { const out = new Uint8Array(length); let offset = 0; for (const part of chunks) { out.set(part, offset); offset += part.length; } return out; }

export class QuotaCounter {
  constructor(state) { this.state = state; }
  async fetch(request) {
    const { key, limit, windowMs, now = Date.now() } = await request.json();
    const storage = this.state.storage;
    const slot = Math.floor(now / windowMs);
    const result = await storage.transaction(async (txn) => {
      const saved = await txn.get(key);
      const current = saved?.slot === slot ? saved.count : 0;
      if (current >= limit) return { allowed: false, remaining: 0 };
      await txn.put(key, { slot, count: current + 1 });
      return { allowed: true, remaining: limit - current - 1 };
    });
    await storage.setAlarm(now + windowMs * 2);
    return json(result);
  }
  async alarm() { await this.state.storage.deleteAll(); }
}

async function consume(env, identity, limit, windowMs) {
  const id = env.QUOTA.idFromName(await digest(identity));
  const stub = env.QUOTA.get(id);
  const response = await stub.fetch("https://quota.internal/consume", { method: "POST", body: JSON.stringify({ key: identity, limit, windowMs }) });
  return response.json();
}
async function handleSession(request, env) {
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32 || !env.FORGE_LOGIN_EMAIL || !env.FORGE_LOGIN_PASSWORD) return failure(503, "sampling_disabled", "Giriş servisi şu an yapılandırılmamış.");
  if (request.method === "GET") {
    const user = await sessionUser(request, env);
    return user ? json({ user: { email: user.email } }) : failure(401, "unauthorized", "Oturum açın.");
  }
  if (!originAllowed(request)) return failure(403, "invalid_request", "İstek kaynağı geçersiz.");
  if (request.method === "DELETE") return json({ ok: true }, 200, { "set-cookie": secureCookie(request, "", 0) });
  if (request.method !== "POST") return failure(405, "invalid_request", "Desteklenmeyen istek.");
  if (!env.QUOTA) return failure(503, "sampling_disabled", "Giriş servisi şu an yapılandırılmamış.");
  const loginIp = request.headers.get("cf-connecting-ip") || "unknown";
  const loginRate = await consume(env, `login:${loginIp}`, 5, 60_000);
  if (!loginRate.allowed) return failure(429, "rate_limited", "Çok fazla giriş denemesi. Bir dakika sonra tekrar dene.");
  const body = await bodyJson(request, 4096);
  if (body.tooLarge || body.invalid || !body.value || typeof body.value.email !== "string" || typeof body.value.password !== "string") return failure(400, "invalid_request", "E-posta ve şifre gerekli.");
  if (body.value.email.toLowerCase() !== env.FORGE_LOGIN_EMAIL.toLowerCase() || body.value.password !== env.FORGE_LOGIN_PASSWORD) return failure(401, "unauthorized", "E-posta veya şifre hatalı.");
  const exp = Date.now() + 12 * 60 * 60 * 1000;
  const token = await sign({ email: env.FORGE_LOGIN_EMAIL.toLowerCase(), exp }, env.SESSION_SECRET);
  return json({ user: { email: env.FORGE_LOGIN_EMAIL.toLowerCase() } }, 200, { "set-cookie": secureCookie(request, token, 12 * 60 * 60) });
}

async function handleGenerate(request, env) {
  if (request.method !== "POST" || !originAllowed(request)) return failure(400, "invalid_request", "İstek geçersiz.");
  const user = await sessionUser(request, env);
  if (!user) return failure(401, "unauthorized", "Üretim için giriş yapın.");
  const body = await bodyJson(request, 64 * 1024);
  if (body.tooLarge) return failure(413, "prompt_too_large", "İstek 64 KB sınırını aşıyor.");
  if (body.invalid || !body.value || Object.keys(body.value).length !== 1 || !Object.hasOwn(body.value, "job")) return failure(400, "invalid_request", "İstek gövdesi geçersiz.");
  const job = validateJob(body.value.job);
  if (!job) return failure(400, "invalid_request", "İş alanlarını kontrol edip tekrar deneyin.");
  if (!env.ANTHROPIC_API_KEY) return failure(503, "sampling_disabled", "Üretim servisi şu an kapalı");
  if (!env.QUOTA) return failure(503, "sampling_disabled", "Üretim kotası yapılandırılmamış.");
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const minute = await consume(env, `ip:${ip}`, 3, 60_000);
  if (!minute.allowed) return failure(429, "rate_limited", "Dakikada en fazla 3 üretim isteği; biraz bekleyip tekrar dene.");
  const today = new Date().toISOString().slice(0, 10);
  const daily = await consume(env, `user:${user.email}:${today}`, 10, 24 * 60 * 60 * 1000);
  if (!daily.allowed) return failure(429, "rate_limited", "Günlük deneme hakkın doldu, yarın tekrar dene");
  const model = job.depth === "deep" ? (env.DEEP_MODEL || "claude-opus-5") : (env.QUICK_MODEL || "claude-sonnet-5");
  return runModel(job, env, model);
}

async function runModel(job, env, model) {
  let upstream;
  try {
    upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model, max_tokens: 8000, system: "Yalnızca istenen JSON nesnesini döndür.", messages: [{ role: "user", content: buildPrompt(job) }] }),
      signal: AbortSignal.timeout(125_000)
    });
  } catch { return failure(504, "upstream_error", "Üretim zaman aşımına uğradı; tekrar deneyin."); }
  if (!upstream.ok) {
    if (upstream.status === 401 || upstream.status === 403) return failure(503, "sampling_disabled", "Üretim servisi şu an kapalı");
    if (upstream.status === 429) return failure(429, "rate_limited", "Üretim servisi meşgul; biraz bekleyip tekrar dene.");
    if (upstream.status >= 500) return failure(504, "upstream_error", "Üretim servisi yanıt vermedi; tekrar deneyin.");
    return failure(502, "invalid_json", "Yanıt okunamadı, yeniden üret");
  }
  let payload;
  try { payload = await upstream.json(); } catch { return failure(502, "invalid_json", "Yanıt okunamadı, yeniden üret"); }
  const raw = Array.isArray(payload.content) ? payload.content.map((part) => part.type === "text" ? part.text : "").join("\n") : "";
  const result = parseModelJson(raw);
  if (!validResult(job.type, result)) return failure(502, "invalid_json", "Yanıt okunamadı, yeniden üret");
  return json({ result });
}

async function handlePublicTry(request, env) {
  if (env.ENABLE_PUBLIC_TRY !== "true") return failure(503, "sampling_disabled", "Üretim servisi şu an kapalı");
  if (request.method !== "POST" || !originAllowed(request)) return failure(400, "invalid_request", "İstek geçersiz.");
  if (!env.ANTHROPIC_API_KEY || !env.TURNSTILE_SECRET_KEY || !env.QUOTA) return failure(503, "sampling_disabled", "Üretim servisi şu an kapalı");
  const body = await bodyJson(request, 64 * 1024);
  if (body.tooLarge) return failure(413, "prompt_too_large", "İstek 64 KB sınırını aşıyor.");
  if (body.invalid || !body.value || Object.keys(body.value).sort().join(",") !== "job,turnstileToken" || typeof body.value.turnstileToken !== "string" || body.value.turnstileToken.length > 4096) return failure(400, "invalid_request", "İstek gövdesi geçersiz.");
  const job = validateJob(body.value.job);
  if (!job || job.depth !== "quick" || job.input.length > 1500) return failure(400, "invalid_request", "Açık deneme yalnızca hızlı kapsamda ve en fazla 1.500 karakterle kullanılabilir.");
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  let challenge;
  try {
    const form = new FormData();
    form.set("secret", env.TURNSTILE_SECRET_KEY);
    form.set("response", body.value.turnstileToken);
    form.set("remoteip", ip);
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form, signal: AbortSignal.timeout(8_000) });
    challenge = await response.json();
  } catch { return failure(503, "sampling_disabled", "Bot doğrulaması şu an kullanılamıyor."); }
  if (!challenge?.success || challenge.hostname !== new URL(request.url).hostname) return failure(400, "invalid_request", "Bot doğrulaması başarısız oldu.");
  const today = new Date().toISOString().slice(0, 10);
  const quota = await consume(env, `public:${ip}:${today}`, 1, 24 * 60 * 60 * 1000);
  if (!quota.allowed) return failure(429, "rate_limited", "Günlük deneme hakkın doldu, yarın tekrar dene");
  return runModel(job, env, env.QUICK_MODEL || "claude-sonnet-5");
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/session") return handleSession(request, env);
    if (url.pathname === "/api/generate") return handleGenerate(request, env);
    if (url.pathname === "/api/public-try") return handlePublicTry(request, env);
    return env.ASSETS.fetch(request);
  }
};
