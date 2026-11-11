export { WorkspaceStore } from "./workspace.js";
import { buildPrompt, parseModelJson, validResult, validateJob } from "./prompts.js";

const encoder = new TextEncoder();
const DEMO_LOGIN = { email: "demo@qacrew.it", password: "qacrew2026" };
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
  if(!data?.email)return null;
  const member=members(env).find(x=>x.email.toLowerCase()===data.email.toLowerCase());
  if(!member&&!data.demo&&data.email.toLowerCase()!==String(env.FORGE_LOGIN_EMAIL||'').toLowerCase())return null;
  return {...data,role:member?.role || (data.demo ? "qa" : "admin")};
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
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) return failure(503, "sampling_disabled", "Giriş servisi şu an yapılandırılmamış.");
  if (request.method === "GET") {
    const user = await sessionUser(request, env);
    return user ? json({ user: { email: user.email, demo: user.demo === true, role:user.role } }) : failure(401, "unauthorized", "Oturum açın.");
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
  const email = body.value.email.toLowerCase();
  const isDemo = email === DEMO_LOGIN.email && body.value.password === DEMO_LOGIN.password;
  const isConfiguredUser = env.FORGE_LOGIN_EMAIL && env.FORGE_LOGIN_PASSWORD && email === env.FORGE_LOGIN_EMAIL.toLowerCase() && body.value.password === env.FORGE_LOGIN_PASSWORD;
  const member=members(env).find(x=>x.email.toLowerCase()===email);
  const isMember=member&&await checkPassword(body.value.password,member);
  if (!isDemo && !isConfiguredUser && !isMember) return failure(401, "unauthorized", "E-posta veya şifre hatalı.");
  const exp = Date.now() + 12 * 60 * 60 * 1000;
  const sessionEmail = isDemo ? DEMO_LOGIN.email : email;
  const token = await sign({ email: sessionEmail, demo: isDemo, exp }, env.SESSION_SECRET);
  return json({ user: { email: sessionEmail, demo: isDemo, role:member?.role||(isDemo?"qa":"admin") } }, 200, { "set-cookie": secureCookie(request, token, 12 * 60 * 60) });
}

async function handleGenerate(request, env) {
  if (request.method !== "POST" || !originAllowed(request)) return failure(400, "invalid_request", "İstek geçersiz.");
  const user = await sessionUser(request, env);
  if (!user) return failure(401, "unauthorized", "Üretim için giriş yapın.");
  if (user.demo === true) return failure(403, "demo_read_only", "Demo hesabı yalnızca örnekleri görüntüleyebilir; gerçek üretim kapalıdır.");
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
    if(url.pathname.startsWith("/api/workspace"))return handleWorkspace(request,env);
    if (url.pathname === "/api/session") return handleSession(request, env);
    if (url.pathname === "/api/generate") return handleGenerate(request, env);
    if (url.pathname === "/api/public-try") return handlePublicTry(request, env);
    return env.ASSETS.fetch(request);
  }
};

function members(env){try{const list=JSON.parse(env.FORGE_USERS_JSON||'[]');return Array.isArray(list)?list.filter(x=>typeof x.email==='string'&&['admin','qa','dev','pm','pmo'].includes(x.role)):[];}catch{return [];}}
async function checkPassword(password,member){
 if(typeof member.salt!=='string'||typeof member.hash!=='string')return false;
 const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
 const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:encoder.encode(member.salt),iterations:100000,hash:'SHA-256'},key,256);
 const hash=[...new Uint8Array(bits)].map(b=>b.toString(16).padStart(2,'0')).join('');
 if(hash.length!==member.hash.length)return false;let diff=0;for(let i=0;i<hash.length;i++)diff|=hash.charCodeAt(i)^member.hash.charCodeAt(i);return diff===0;
}
async function handleWorkspace(request,env){
 const url=new URL(request.url),path=url.pathname.slice('/api/workspace'.length)||'/state';
 if(path==='/config')return json({preview:env.FORGE_PREVIEW_MODE==='true',ai:!!env.ANTHROPIC_API_KEY,github:!!(env.GITHUB_TOKEN&&env.GITHUB_REPOSITORY),repository:env.GITHUB_REPOSITORY||'',accounts:env.FORGE_PREVIEW_MODE==='true'?members(env).map(({email,role})=>({email,role})):[]});
 if(!env.WORKSPACE)return failure(503,'workspace_disabled','Çalışma alanı sunucu deposu yapılandırılmamış.');
 if(path.startsWith('/shared/')){
  const token=path.slice('/shared/'.length);if(!/^[a-f0-9-]{72}$/.test(token))return failure(404,'not_found','Paylaşım bulunamadı.');
  // Public reports are isolated snapshots, addressed by unguessable, expiring tokens.
  const stub=env.WORKSPACE.get(env.WORKSPACE.idFromName('share-index'));
  return stub.fetch(new Request('https://workspace.internal/share/'+token));
 }
 const user=await sessionUser(request,env);if(!user)return failure(401,'unauthorized','Oturum açın / Sign in');
 if(user.demo)return failure(403,'demo_read_only','Genel demo hesabı ortak çalışma alanına erişemez. Önizleme hesabı kullanın.');
 if(!['GET','POST'].includes(request.method))return failure(405,'invalid_method','Unsupported method');
 if(request.method==='POST'&&!originAllowed(request))return failure(403,'invalid_origin','İstek kaynağı geçersiz');
 const key=env.FORGE_WORKSPACE_ID||user.email,stub=env.WORKSPACE.get(env.WORKSPACE.idFromName('workspace:'+key));
 if(path==='/members')return json({members:members(env).map(({email,role})=>({email,role})),user});
 if(path.startsWith('/github')){try{return await githubWorkspace(request,env,user,path);}catch{return failure(502,'github_unavailable','GitHub bağlantısı kurulamadı. Tekrar deneyin.');}}
 const allowed=request.method==='GET'?(path==='/state'||/^\/evidence\/[a-f0-9-]+$/.test(path)):['/command','/evidence','/share'].includes(path);
 if(!allowed)return failure(404,'not_found','Not found');
 let body;
 if(request.method==='POST'){const parsed=await bodyJson(request,path==='/evidence'?7100000:3200000);if(parsed.invalid||parsed.tooLarge)return failure(413,'invalid_body','İstek çok büyük veya geçersiz');body=JSON.stringify(parsed.value);}
 const result=await stub.fetch(new Request('https://workspace.internal'+path,{method:request.method,headers:{'x-workspace-user':JSON.stringify(user),'content-type':'application/json'},body}));
 if(path==='/share'&&result.ok){const data=await result.json(),snapshot=await stub.fetch(new Request('https://workspace.internal/share/'+data.token));
  const index=env.WORKSPACE.get(env.WORKSPACE.idFromName('share-index'));await index.fetch(new Request('https://workspace.internal/publish',{method:'POST',headers:{'x-workspace-user':JSON.stringify(user)},body:JSON.stringify({token:data.token,snapshot:await snapshot.json()})}));return json(data);}
 return result;
}
async function githubWorkspace(request,env,user,path){
 if(!env.GITHUB_REPOSITORY)return failure(503,'github_not_configured','GitHub için sunucuda GITHUB_REPOSITORY ayarlanmalı.');
 const repository=env.GITHUB_REPOSITORY;if(!/^[\w.-]+\/[\w.-]+$/.test(repository))return failure(503,'invalid_repository','Geçersiz GitHub deposu');
 const headers={...(env.GITHUB_TOKEN?{Authorization:'Bearer '+env.GITHUB_TOKEN}:{}),Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'QAcrew-Forge','content-type':'application/json'};
 if(path==='/github/issue'&&request.method==='GET'){
  const number=new URL(request.url).searchParams.get('number');if(!/^[1-9]\d{0,8}$/.test(number||''))return failure(400,'invalid_issue','İş kalemi numarası gerekli');
  const r=await fetch('https://api.github.com/repos/'+repository+'/issues/'+number,{headers,signal:AbortSignal.timeout(15000)});if(!r.ok)return failure(502,'github_error','GitHub iş kalemi okunamadı ('+r.status+')');const item=await r.json();return json({title:item.title,input:item.body||'',source:item.html_url});
 }
 if(path==='/github/export'&&request.method==='POST'){
  if(!env.GITHUB_TOKEN)return failure(503,'github_not_configured','Doğrudan aktarım için sunucuda GitHub yetkisi gerekli. GitHub taslak bağlantısını kullanın.');
  if(!['admin','qa','dev','pm'].includes(user.role))return failure(403,'forbidden','Aktarım yetkiniz yok');
  const parsed=await bodyJson(request,64000),data=parsed.value;if(parsed.invalid||parsed.tooLarge||!data||typeof data.title!=='string'||typeof data.body!=='string'||data.title.length>256||data.body.length>60000)return failure(400,'invalid_issue','Geçersiz hata içeriği');
  const r=await fetch('https://api.github.com/repos/'+repository+'/issues',{method:'POST',headers,body:JSON.stringify({title:data.title,body:data.body}),signal:AbortSignal.timeout(15000)});if(!r.ok)return failure(502,'github_error','GitHub aktarımı başarısız ('+r.status+')');const issue=await r.json();return json({url:issue.html_url,number:issue.number});
 }
 return failure(404,'not_found','Not found');
}
