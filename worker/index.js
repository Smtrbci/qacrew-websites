export { WorkspaceStore } from "./workspace.js";
import { applyCommand } from "./workspace.js";
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
  if(data.registered){const account=await getRegisteredUser(env,data.email);if(!account)return null;return {...data,role:account.role,persona:account.persona||null,workspaceKey:account.workspace_key};}
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
    const { key, limit, windowMs, period = null, now = Date.now() } = await request.json();
    const storage = this.state.storage;
    const slot = typeof period === "string" && /^\d{4}-\d{2}$/.test(period) ? period : Math.floor(now / windowMs);
    const result = await storage.transaction(async (txn) => {
      const saved = await txn.get(key);
      const current = saved?.slot === slot ? saved.count : 0;
      if (current >= limit) return { allowed: false, remaining: 0, used: current };
      await txn.put(key, { slot, count: current + 1 });
      return { allowed: true, remaining: limit - current - 1, used: current + 1 };
    });
    await storage.setAlarm(now + windowMs * 2);
    return json(result);
  }
  async alarm() { await this.state.storage.deleteAll(); }
}

async function consume(env, identity, limit, windowMs, period = null) {
  const id = env.QUOTA.idFromName(await digest(identity));
  const stub = env.QUOTA.get(id);
  const response = await stub.fetch("https://quota.internal/consume", { method: "POST", body: JSON.stringify({ key: identity, limit, windowMs, period }) });
  return response.json();
}
function planFor(env) {
  const plans = { starter: { name: "Starter", generations: 50, seats: 1 }, pro: { name: "Pro", generations: 250, seats: 1 }, team: { name: "Team", generations: 1000, seats: 5 } };
  return plans[String(env.FORGE_PLAN || "starter").toLowerCase()] || plans.starter;
}
const BILLING_PRICES = {
  pri_01m7dt0d4kfckn1es9602kak1g: { plan: "starter", period: "monthly" },
  pri_01m7dt0dbeye1gdctcsz6taafy: { plan: "starter", period: "yearly" },
  pri_01m7dt0dy77cjwdhnq15r41v2w: { plan: "pro", period: "monthly" },
  pri_01m7dt0e5zdvwwa9k4498ysnfx: { plan: "pro", period: "yearly" },
  pri_01m7dt0enhx9qx29gvmvbztrac: { plan: "team", period: "monthly" },
  pri_01m7dt0ewra0mj0ar69x34ndw0: { plan: "team", period: "yearly" }
};
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);
const CLOSED_SUBSCRIPTION_STATUSES = new Set(["canceled", "past_due", "paused"]);
function billingPlanFromItems(items = []) {
  for (const item of items) {
    const priceId = item?.price?.id || item?.price_id || item?.priceId;
    if (BILLING_PRICES[priceId]) return { ...BILLING_PRICES[priceId], priceId };
  }
  return null;
}
function billingCustomData(data = {}) { return data.custom_data || data.customData || {}; }
function normalizedUserId(value) {
  if (typeof value !== "string" || value.length > 254) return "";
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}
async function isForgeAccount(email, env) {
  if (!email) return false;
  if (email === String(env.FORGE_LOGIN_EMAIL || "").toLowerCase()) return true;
  if (members(env, false).some((member) => member.email.toLowerCase() === email)) return true;
  return Boolean(await getRegisteredUser(env, email));
}
async function auditActorHash(email, secret) {
  if (!email || !secret) return null;
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(email.toLowerCase())));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
async function writeBillingAudit(env, requestId, eventType, outcome, email, plan, referenceId, statusCode) {
  if (!env.BILLING_DB) return;
  try {
    const actorHash = await auditActorHash(email, env.SESSION_SECRET);
    await env.BILLING_DB.batch([
      env.BILLING_DB.prepare(`INSERT INTO billing_audit_log
        (id,request_id,event_type,outcome,actor_hash,plan,reference_id,status_code)
        VALUES (?,?,?,?,?,?,?,?)`)
        .bind(crypto.randomUUID(), requestId, eventType, outcome, actorHash, ["starter", "pro", "team"].includes(plan) ? plan : null, referenceId || null, statusCode || null),
      env.BILLING_DB.prepare("DELETE FROM billing_audit_log WHERE created_at < datetime('now','-180 days')")
    ]);
  } catch {
    // Keep checkout functional if audit storage is temporarily unavailable; never log email or tokens.
    console.warn("Forge billing audit write failed", { requestId, eventType });
  }
}
async function activeSubscription(env, userId) {
  if (!env.BILLING_DB || !userId) return null;
  const account = await getRegisteredUser(env, userId);
  if (account?.workspace_key) {
    const team = await env.BILLING_DB.prepare(
      "SELECT user_id, workspace_key, plan, status, subscription_id, price_id, updated_at FROM forge_subscriptions WHERE workspace_key = ? AND plan = 'team' AND status IN ('active','trialing') ORDER BY updated_at DESC LIMIT 1"
    ).bind(account.workspace_key).first();
    if (team) return team;
  }
  const direct = await env.BILLING_DB.prepare(
    "SELECT user_id, workspace_key, plan, status, subscription_id, price_id, updated_at FROM forge_subscriptions WHERE user_id = ? AND status IN ('active','trialing') ORDER BY updated_at DESC LIMIT 1"
  ).bind(userId).first();
  if (direct) return direct;
  return null;
}
async function effectivePlan(env, userId) {
  const subscription = await activeSubscription(env, userId);
  return subscription ? planFor({ FORGE_PLAN: subscription.plan }) : planFor(env);
}
function constantTimeHexEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length || !/^[\da-f]+$/i.test(a) || !/^[\da-f]+$/i.test(b)) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
async function verifyPaddleSignature(rawBody, header, secret, now = Date.now()) {
  if (!secret || !header) return false;
  const parts = header.split(";").map((part) => part.trim().split("=", 2));
  const timestamp = parts.find(([key]) => key === "ts")?.[1];
  const signatures = parts.filter(([key]) => key === "h1").map(([, value]) => value).filter(Boolean);
  if (!timestamp || !/^\d{1,12}$/.test(timestamp) || !signatures.length) return false;
  if (Math.abs(Math.floor(now / 1000) - Number(timestamp)) > 300) return false;
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = new Uint8Array(encoder.encode(`${timestamp}:`).length + rawBody.length);
  signed.set(encoder.encode(`${timestamp}:`)); signed.set(rawBody, encoder.encode(`${timestamp}:`).length);
  const expected = [...new Uint8Array(await crypto.subtle.sign("HMAC", key, signed))].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return signatures.some((signature) => constantTimeHexEqual(signature, expected));
}
async function readRawBody(request, maxBytes) {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > maxBytes) return null;
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) { await reader.cancel(); return null; }
    chunks.push(value);
  }
  const body = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return body;
}
async function createCheckoutIntent(request, env) {
  if (request.method !== "POST" || !originAllowed(request)) return failure(400, "invalid_request", "İstek geçersiz.");
  const requestId = crypto.randomUUID();
  let user;
  try { user = await sessionUser(request, env); }
  catch {
    await writeBillingAudit(env, requestId, "checkout_intent", "session_lookup_failed", "", "", "", 503);
    return json({ error: "session_lookup_failed", message: "Oturumun şu an doğrulanamıyor. Biraz sonra tekrar dene.", requestId }, 503, { "x-request-id": requestId });
  }
  if (!user || user.demo) {
    await writeBillingAudit(env, requestId, "checkout_intent", "rejected_login_required", user?.email, "", "", 401);
    return json({ error: "login_required", message: "Ödeme planını hesaba bağlamak için giriş yapın.", requestId }, 401, { "x-request-id": requestId });
  }
  if (!env.BILLING_DB) {
    await writeBillingAudit(env, requestId, "checkout_intent", "billing_unavailable", user.email, "", "", 503);
    return json({ error: "billing_unavailable", message: "Ödeme abonelik deposu henüz yapılandırılmamış.", requestId }, 503, { "x-request-id": requestId });
  }
  const body = await bodyJson(request, 4096), plan = body.value?.plan, period = body.value?.period;
  if (body.tooLarge || body.invalid || !body.value || typeof body.value !== "object" || Array.isArray(body.value)) {
    await writeBillingAudit(env, requestId, "checkout_intent", "rejected_invalid_request", user.email, plan, "", 400);
    return json({ error: "invalid_request", message: "Ödeme seçimi geçersiz.", requestId }, 400, { "x-request-id": requestId });
  }
  const price = Object.entries(BILLING_PRICES).find(([, value]) => value.plan === plan && value.period === period);
  if (!price) {
    await writeBillingAudit(env, requestId, "checkout_intent", "rejected_invalid_price", user.email, plan, "", 400);
    return json({ error: "invalid_price", message: "Paket veya dönem geçersiz.", requestId }, 400, { "x-request-id": requestId });
  }
  const userId = normalizedUserId(user.email);
  try {
    if (!userId || !(user.registered || await isForgeAccount(userId, env))) {
      await writeBillingAudit(env, requestId, "checkout_intent", "rejected_account_not_found", user.email, plan, price[0], 403);
      return json({ error: "account_not_found", message: "Forge hesabın doğrulanamadı. Tekrar giriş yap veya destek ekibine başvur.", requestId }, 403, { "x-request-id": requestId });
    }
  } catch {
    await writeBillingAudit(env, requestId, "checkout_intent", "account_lookup_failed", user.email, plan, price[0], 503);
    return json({ error: "account_lookup_failed", message: "Hesap doğrulaması şu an yapılamıyor. Biraz sonra tekrar dene.", requestId }, 503, { "x-request-id": requestId });
  }
  const intent = await sign({ purpose: "paddle_checkout", userId, plan, period, priceId: price[0], exp: Date.now() + 30 * 24 * 60 * 60 * 1000 }, env.SESSION_SECRET);
  await writeBillingAudit(env, requestId, "checkout_intent", "created", user.email, plan, price[0], 200);
  return json({ customData: { userId, plan, period, priceId: price[0], intent }, requestId }, 200, { "x-request-id": requestId });
}
async function acceptPaddleEvent(env, event) {
  const db = env.BILLING_DB;
  if (!db) return failure(503, "billing_unavailable", "Abonelik deposu yapılandırılmamış.");
  const eventId = typeof event.event_id === "string" ? event.event_id : "";
  if (!/^evt_[a-z\d]{20,40}$/i.test(eventId) || !event.data || typeof event.data !== "object") return failure(400, "invalid_event", "Paddle olayı geçersiz.");
  const eventType = event.event_type;
  if (!new Set(["subscription.created", "subscription.updated", "transaction.completed"]).has(eventType)) return json({ ok: true, ignored: true });
  const occurredAt = typeof event.occurred_at === "string" && Number.isFinite(Date.parse(event.occurred_at)) ? event.occurred_at : new Date().toISOString();
  const data = event.data, custom = billingCustomData(data);
  let userId = normalizedUserId(custom.userId || custom.user_id);
  let picked = billingPlanFromItems(data.items);
  let subscriptionId = eventType.startsWith("subscription.") ? data.id : data.subscription_id;
  let transactionId = eventType === "transaction.completed" ? data.id : (eventType === "subscription.created" ? data.transaction_id : null);
  let status = eventType.startsWith("subscription.") ? String(data.status || "").toLowerCase() : "completed";
  let intent = null;
  if (custom.intent && env.SESSION_SECRET) intent = await verify(custom.intent, env.SESSION_SECRET);
  if (intent?.purpose === "paddle_checkout" && intent.exp > Date.now() && intent.userId === userId && intent.priceId === picked?.priceId && intent.plan === picked?.plan) {
    // Signed checkout intent binds the Paddle custom data to the authenticated Forge account.
  } else {
    intent = null;
    userId = "";
  }
  if (eventType === "subscription.updated" && !userId && typeof subscriptionId === "string") {
    const previous = await db.prepare("SELECT user_id, plan, period, price_id FROM forge_subscriptions WHERE subscription_id = ?").bind(subscriptionId).first();
    if (previous) { userId = previous.user_id; if (!picked) picked = { plan: previous.plan, period: previous.period, priceId: previous.price_id }; }
  }
  if (eventType === "transaction.completed" && !userId && typeof transactionId === "string") {
    const previous = await db.prepare("SELECT user_id, plan, period, price_id FROM paddle_transactions WHERE transaction_id = ?").bind(transactionId).first();
    if (previous) { userId = previous.user_id; if (!picked) picked = { plan: previous.plan, period: previous.period, priceId: previous.price_id }; }
  }
  const account = userId ? await getRegisteredUser(env, userId) : null;
  if (userId && !account && !await isForgeAccount(userId, env)) userId = "";
  if (userId && (!picked || !BILLING_PRICES[picked.priceId])) userId = "";
  await db.prepare("INSERT OR IGNORE INTO paddle_events (event_id, event_type, occurred_at, processed, received_at) VALUES (?, ?, ?, 0, ?)")
    .bind(eventId, eventType, occurredAt, new Date().toISOString()).run();
  const existingEvent = await db.prepare("SELECT processed FROM paddle_events WHERE event_id = ?").bind(eventId).first();
  if (existingEvent?.processed) {
    await writeBillingAudit(env, crypto.randomUUID(), `paddle_${eventType}`, "duplicate", userId, picked?.plan, eventId, 200);
    return json({ ok: true, duplicate: true });
  }
  const statements = [];
  if (eventType.startsWith("subscription.") && userId && picked && typeof subscriptionId === "string" && /^sub_[a-z\d]{20,40}$/i.test(subscriptionId) && (ACTIVE_SUBSCRIPTION_STATUSES.has(status) || CLOSED_SUBSCRIPTION_STATUSES.has(status))) {
    statements.push(db.prepare(`INSERT INTO forge_subscriptions (subscription_id,user_id,workspace_key,plan,period,price_id,status,transaction_id,occurred_at,updated_at)
      SELECT ?,?,?,?,?,?,?,?,?,?
      WHERE EXISTS (SELECT 1 FROM paddle_events WHERE event_id=? AND processed=0)
      ON CONFLICT(subscription_id) DO UPDATE SET user_id=excluded.user_id,workspace_key=excluded.workspace_key,plan=excluded.plan,period=excluded.period,price_id=excluded.price_id,status=excluded.status,transaction_id=COALESCE(excluded.transaction_id,forge_subscriptions.transaction_id),occurred_at=excluded.occurred_at,updated_at=excluded.updated_at
      WHERE excluded.occurred_at >= forge_subscriptions.occurred_at`)
      .bind(subscriptionId, userId, account?.workspace_key || null, picked.plan, picked.period, picked.priceId, status, transactionId, occurredAt, new Date().toISOString(), eventId));
    if (transactionId && /^txn_[a-z\d]{20,40}$/i.test(transactionId)) {
      statements.push(db.prepare(`INSERT INTO paddle_transactions (transaction_id,user_id,subscription_id,plan,period,price_id,status,event_id,occurred_at)
        SELECT ?,?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM paddle_events WHERE event_id=? AND processed=0)
        ON CONFLICT(transaction_id) DO UPDATE SET user_id=excluded.user_id,subscription_id=excluded.subscription_id,plan=excluded.plan,period=excluded.period,price_id=excluded.price_id,status=excluded.status,event_id=excluded.event_id,occurred_at=excluded.occurred_at
        WHERE excluded.occurred_at >= paddle_transactions.occurred_at`)
        .bind(transactionId,userId,subscriptionId,picked.plan,picked.period,picked.priceId,status,eventId,occurredAt,eventId));
    }
    statements.push(db.prepare(`UPDATE paddle_transactions SET user_id=?,subscription_id=?,plan=?,period=?,price_id=?,status=?,occurred_at=?
      WHERE transaction_id=? AND EXISTS (SELECT 1 FROM paddle_events WHERE event_id=? AND processed=0)`)
      .bind(userId,subscriptionId,picked.plan,picked.period,picked.priceId,status,occurredAt,transactionId,eventId));
  } else if (eventType === "transaction.completed" && userId && picked && typeof transactionId === "string" && /^txn_[a-z\d]{20,40}$/i.test(transactionId)) {
    statements.push(db.prepare(`INSERT INTO paddle_transactions (transaction_id,user_id,subscription_id,plan,period,price_id,status,event_id,occurred_at)
      SELECT ?,?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM paddle_events WHERE event_id=? AND processed=0)
      ON CONFLICT(transaction_id) DO UPDATE SET user_id=excluded.user_id,subscription_id=COALESCE(excluded.subscription_id,paddle_transactions.subscription_id),plan=excluded.plan,period=excluded.period,price_id=excluded.price_id,status=excluded.status,event_id=excluded.event_id,occurred_at=excluded.occurred_at
      WHERE excluded.occurred_at >= paddle_transactions.occurred_at`)
      .bind(transactionId,userId,subscriptionId,picked.plan,picked.period,picked.priceId,"completed",eventId,occurredAt,eventId));
  }
  statements.push(db.prepare("UPDATE paddle_events SET processed=1 WHERE event_id=? AND processed=0").bind(eventId));
  await db.batch(statements);
  await writeBillingAudit(env, crypto.randomUUID(), `paddle_${eventType}`, userId ? "processed" : "unmatched", userId, picked?.plan, eventId, 200);
  return json({ ok: true });
}
async function handlePaddleWebhook(request, env) {
  if (request.method !== "POST") return failure(405, "method_not_allowed", "POST gerekli.");
  if (!env.PADDLE_WEBHOOK_SECRET) return failure(503, "webhook_unconfigured", "Paddle webhook secret yapılandırılmamış.");
  const rawBody = await readRawBody(request, 1024 * 1024);
  if (!rawBody) return failure(413, "payload_too_large", "Webhook gövdesi çok büyük.");
  const valid = await verifyPaddleSignature(rawBody, request.headers.get("Paddle-Signature"), env.PADDLE_WEBHOOK_SECRET);
  if (!valid) return failure(401, "invalid_signature", "Paddle webhook imzası geçersiz veya süresi dolmuş.");
  let event;
  try { event = JSON.parse(new TextDecoder().decode(rawBody)); }
  catch { return failure(400, "invalid_json", "Webhook JSON gövdesi geçersiz."); }
  return acceptPaddleEvent(env, event);
}
async function handleSubscriptionLookup(request, env) {
  if (request.method !== "GET") return failure(405, "method_not_allowed", "GET gerekli.");
  const user = await sessionUser(request, env);
  if (!user) return failure(401, "login_required", "Abonelik durumunu görmek için giriş yapın.");
  if (user.demo) return json({ active: false, status: "demo", plan: null });
  if (!env.BILLING_DB) return failure(503, "billing_unavailable", "Abonelik deposu henüz yapılandırılmamış.");
  const params = new URL(request.url).searchParams;
  const txn = params.get("txn") || "";
  if (!txn) {
    const userId = normalizedUserId(user.email);
    const subscription = await activeSubscription(env, userId);
    return json({ active: !!subscription, status: subscription?.status || "none", plan: subscription?.plan || null, priceId: subscription?.price_id || null, updatedAt: subscription?.updated_at || null, trialDays: 7, plans: { starter: { monthly: "pri_01m7dt0d4kfckn1es9602kak1g", yearly: "pri_01m7dt0dbeye1gdctcsz6taafy" }, pro: { monthly: "pri_01m7dt0dy77cjwdhnq15r41v2w", yearly: "pri_01m7dt0e5zdvwwa9k4498ysnfx" }, team: { monthly: "pri_01m7dt0enhx9qx29gvmvbztrac", yearly: "pri_01m7dt0ewra0mj0ar69x34ndw0" } } });
  }
  if (!/^txn_[a-z\d]{20,40}$/i.test(txn)) return failure(400, "invalid_transaction", "İşlem kimliği geçersiz.");
  const userId = normalizedUserId(user.email);
  const transaction = await env.BILLING_DB.prepare("SELECT user_id, subscription_id, plan FROM paddle_transactions WHERE transaction_id=?").bind(txn).first();
  if (!transaction) return json({ status: "pending", active: false });
  if (transaction.user_id !== userId) return failure(404, "not_found", "İşlem bulunamadı.");
  const subscription = transaction.subscription_id ? await env.BILLING_DB.prepare("SELECT plan,status,subscription_id,price_id,updated_at FROM forge_subscriptions WHERE subscription_id=? AND user_id=?").bind(transaction.subscription_id,userId).first() : null;
  const active = !!subscription && ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status);
  return json({ status: subscription?.status || "pending", active, plan: active ? subscription.plan : null, transactionId: txn, subscriptionId: subscription?.subscription_id || null, updatedAt: subscription?.updated_at || null });
}
function supabasePublishableKey(env){return String(env.SUPABASE_PUBLISHABLE_KEY||env.SUPABASE_ANON_KEY||'');}
function supabaseAuthHeaders(env){const key=supabasePublishableKey(env);if(!key)throw new Error('Supabase publishable key missing');return {apikey:key,'content-type':'application/json'};}
async function getRegisteredUser(env,email){
  if(!env.SUPABASE_URL||!env.SUPABASE_SERVICE_ROLE_KEY)return null;
  const query=new URLSearchParams({email:'eq.'+email,select:'email,workspace_key,role,persona',limit:'1'});
  const response=await fetch(String(env.SUPABASE_URL).replace(/\/$/,'')+'/rest/v1/forge_users?'+query,{headers:supabaseHeaders(env),signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error('Supabase account lookup failed '+response.status);
  return (await response.json())[0]||null;
}
async function ensureRegisteredUser(env,email,role='admin',workspaceKey=null,persona=null){
  if(!['admin','qa','dev','pm','pmo'].includes(role))role='admin';
  const current=await getRegisteredUser(env,email);if(current)return current;
  workspaceKey ||= 'user:'+crypto.randomUUID();
  const response=await fetch(String(env.SUPABASE_URL).replace(/\/$/,'')+'/rest/v1/forge_users',{method:'POST',headers:{...supabaseHeaders(env),Prefer:'return=minimal'},body:JSON.stringify({email,workspace_key:workspaceKey,role,persona:['qa','dev','pm','pmo'].includes(persona)?persona:null}),signal:AbortSignal.timeout(10000)});
  if(response.status===409)return await getRegisteredUser(env,email);
  if(!response.ok)throw new Error('Supabase account profile insert failed '+response.status);
  return {email,workspace_key:workspaceKey,role,persona};
}
async function supabaseRpc(env,name,payload){
  const response=await fetch(String(env.SUPABASE_URL).replace(/\/$/,'')+'/rest/v1/rpc/'+name,{method:'POST',headers:supabaseHeaders(env),body:JSON.stringify(payload),signal:AbortSignal.timeout(12000)});
  const data=await response.json().catch(()=>null);
  if(!response.ok){const error=new Error(data?.message||'Supabase RPC failed '+response.status);error.status=response.status;error.code=data?.message||data?.code||'';throw error;}
  return data;
}
async function getTeamInvite(env,token,email=''){
  if(typeof token!=='string'||token.length<32||token.length>160)return null;
  const params=new URLSearchParams({token_hash:'eq.'+await digest(token),accepted_at:'is.null',revoked_at:'is.null',expires_at:'gt.'+new Date().toISOString(),select:'id,email,workspace_key,role,invited_by,expires_at',limit:'1'});
  if(email)params.set('email','eq.'+email);
  const response=await fetch(String(env.SUPABASE_URL).replace(/\/$/,'')+'/rest/v1/forge_team_invites?'+params,{headers:supabaseHeaders(env),signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error('Team invitation lookup failed '+response.status);
  return (await response.json())[0]||null;
}
async function listWorkspaceUsers(env,workspaceKey){
  const params=new URLSearchParams({workspace_key:'eq.'+workspaceKey,select:'email,role,persona,created_at',order:'created_at.asc',limit:'6'});
  const response=await fetch(String(env.SUPABASE_URL).replace(/\/$/,'')+'/rest/v1/forge_users?'+params,{headers:supabaseHeaders(env),signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error('Team member lookup failed '+response.status);
  return response.json();
}
async function listWorkspaceInvites(env,workspaceKey){
  const params=new URLSearchParams({workspace_key:'eq.'+workspaceKey,accepted_at:'is.null',revoked_at:'is.null',expires_at:'gt.'+new Date().toISOString(),select:'id,email,role,created_at,expires_at',order:'created_at.desc',limit:'5'});
  const response=await fetch(String(env.SUPABASE_URL).replace(/\/$/,'')+'/rest/v1/forge_team_invites?'+params,{headers:supabaseHeaders(env),signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error('Team invite lookup failed '+response.status);
  return response.json();
}
async function teamInvitePreview(request,env){
  if(request.method!=='POST')return failure(405,'invalid_method','Method not allowed.');
  if(!originAllowed(request))return failure(403,'invalid_origin','İstek kaynağı geçersiz.');
  if(!env.SUPABASE_URL||!env.SUPABASE_SERVICE_ROLE_KEY)return failure(503,'team_unavailable','Takım davetleri şu an yapılandırılmamış.');
  try{
    const parsed=await bodyJson(request,2048),token=typeof parsed.value?.token==='string'?parsed.value.token:'',invite=await getTeamInvite(env,token);
    if(!invite)return failure(404,'invite_invalid','Davet bağlantısı geçersiz veya süresi dolmuş.');
    const subscription=await activeSubscription(env,invite.invited_by);
    if(subscription?.plan!=='team')return failure(410,'team_subscription_inactive','Bu takım daveti artık etkin değil.');
    return json({email:invite.email,role:invite.role,expiresAt:invite.expires_at});
  }catch(error){console.error('Forge invite preview failed:',String(error?.message||error));return failure(503,'team_unavailable','Davet bilgisi şu an alınamadı.');}
}
async function teamStatus(env,user){
  if(!user.registered)return {enabled:false,members:[{email:user.email,role:user.role}],invites:[],usedSeats:1,seats:1};
  let subscription=await activeSubscription(env,user.email);
  if(subscription?.plan==='team')user=await promoteTeamOwner(env,user,subscription);
  const workspaceKey=user.workspaceKey;
  const teamActive=subscription?.plan==='team';
  const people=await listWorkspaceUsers(env,workspaceKey);
  const invites=teamActive&&subscription.user_id===user.email?await listWorkspaceInvites(env,workspaceKey):[];
  return {enabled:teamActive,owner:teamActive&&subscription.user_id===user.email,plan:subscription?.plan||null,members:people,invites,usedSeats:people.length+invites.length,seats:5,user:{email:user.email,role:user.role,persona:user.persona||null}};
}
async function createTeamInvite(request,env,user){
  if(!user.registered)return failure(403,'registered_account_required','Takım daveti için doğrulanmış Forge hesabı gerekli.');
  const parsed=await bodyJson(request,4096),body=parsed.value;
  if(parsed.invalid||parsed.tooLarge||typeof body?.email!=='string'||typeof body?.role!=='string')return failure(400,'invalid_invite','E-posta ve rol gerekli.');
  const email=body.email.trim().toLowerCase(),role=body.role;
  if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return failure(400,'invalid_email','Geçerli bir e-posta adresi gir.');
  if(!['qa','dev','pm','pmo'].includes(role))return failure(400,'invalid_role','QA, Developer, PM veya PMO rolü seç.');
  if(email===user.email)return failure(400,'self_invite','Kendi hesabına davet gönderemezsin.');
  try{
    const subscription=await activeSubscription(env,user.email);
    if(subscription?.plan!=='team'||subscription.user_id!==user.email)return failure(403,'team_plan_required','Davet göndermek için etkin Team aboneliğinin sahibi olmalısın.');
    user=await promoteTeamOwner(env,user,subscription);
    const token=b64url(crypto.getRandomValues(new Uint8Array(32))),tokenHash=await digest(token),inviteId=crypto.randomUUID();
    await supabaseRpc(env,'forge_create_team_invite',{p_id:inviteId,p_token_hash:tokenHash,p_email:email,p_workspace_key:user.workspaceKey,p_role:role,p_invited_by:user.email});
    const url=new URL('/forge/app/#register?invite='+encodeURIComponent(token),request.url).toString();
    return json({invite:{id:inviteId,email,role,expiresAt:new Date(Date.now()+7*86400000).toISOString()},url});
  }catch(error){
    const message=String(error?.code||error?.message||'');
    if(message.includes('team_seats_full'))return failure(409,'team_seats_full','Team planındaki beş koltuk dolu. Önce bekleyen bir daveti iptal et.');
    if(message.includes('already_member'))return failure(409,'already_member','Bu e-posta ekipte zaten kayıtlı.');
    if(message.includes('invite_exists'))return failure(409,'invite_exists','Bu e-posta için bekleyen bir davet var.');
    if(error?.code==='team_plan_required')return failure(403,'team_plan_required','Davet göndermek için etkin Team aboneliğinin sahibi olmalısın.');
    console.error('Forge team invite create failed:',String(error?.message||error));return failure(503,'team_unavailable','Davet oluşturulamadı. Biraz sonra tekrar dene.');
  }
}
async function revokeTeamInvite(env,user,id){
  if(!user.registered||! /^[0-9a-f-]{36}$/i.test(id))return failure(400,'invalid_invite','Davet seçimi geçersiz.');
  const subscription=await activeSubscription(env,user.email);
  if(subscription?.plan!=='team'||subscription.user_id!==user.email)return failure(403,'team_plan_required','Davetleri yalnız Team yöneticisi değiştirebilir.');
  const params=new URLSearchParams({id:'eq.'+id,workspace_key:'eq.'+user.workspaceKey,accepted_at:'is.null',revoked_at:'is.null'});
  const response=await fetch(String(env.SUPABASE_URL).replace(/\/$/,'')+'/rest/v1/forge_team_invites?'+params,{method:'PATCH',headers:{...supabaseHeaders(env),Prefer:'return=minimal'},body:JSON.stringify({revoked_at:new Date().toISOString()}),signal:AbortSignal.timeout(10000)});
  if(!response.ok)return failure(503,'team_unavailable','Davet iptal edilemedi.');
  return json({revoked:true});
}
async function acceptTeamInvite(env,user,token){
  if(!user.registered)return failure(401,'unauthorized','Önce giriş yap.');
  const invite=await getTeamInvite(env,token,user.email);
  if(!invite)return failure(400,'invite_invalid','Davet bağlantısı geçersiz, süresi dolmuş veya başka bir e-posta için oluşturulmuş.');
  const subscription=await activeSubscription(env,invite.invited_by);
  if(subscription?.plan!=='team')return failure(403,'team_subscription_inactive','Bu davet için etkin Team aboneliği bulunamadı.');
  try{
    const profile=await supabaseRpc(env,'forge_accept_team_invite',{p_token_hash:await digest(token),p_email:user.email,p_persona:user.persona||null});
    return json({accepted:true,user:{email:profile.email,role:profile.role}});
  }catch(error){
    if(String(error?.code||'').includes('account_has_existing_workspace'))return failure(409,'account_has_existing_workspace','Bu hesapta mevcut bir çalışma alanı var. Önce verilerini Team alanına taşıman gerekir.');
    if(String(error?.code||'').includes('team_seats_full'))return failure(409,'team_seats_full','Team planındaki beş koltuk dolu.');
    console.error('Forge team invite accept failed:',String(error?.message||error));return failure(503,'team_unavailable','Davet kabul edilemedi. Biraz sonra tekrar dene.');
  }
}
async function promoteTeamOwner(env,user,subscription){
  if(!subscription||subscription.plan!=='team'||subscription.user_id!==user.email||user.role==='admin')return user;
  const params=new URLSearchParams({email:'eq.'+user.email});
  const response=await fetch(String(env.SUPABASE_URL).replace(/\/$/,'')+'/rest/v1/forge_users?'+params,{method:'PATCH',headers:{...supabaseHeaders(env),Prefer:'return=minimal'},body:JSON.stringify({role:'admin'}),signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error('Team owner role update failed '+response.status);
  return {...user,role:'admin'};
}
async function handleRegistration(request,env){
  if(request.method!=='POST')return failure(405,'invalid_method','Method not allowed.');
  if(!originAllowed(request))return failure(403,'invalid_origin','İstek kaynağı geçersiz.');
  if(!env.SESSION_SECRET||env.SESSION_SECRET.length<32||!env.SUPABASE_URL||!env.SUPABASE_SERVICE_ROLE_KEY||!supabasePublishableKey(env)||!env.QUOTA)return failure(503,'registration_unavailable','Üyelik servisi yapılandırılmamış.');
  const ip=request.headers.get('cf-connecting-ip')||'unknown';const limit=await consume(env,'register:'+ip,5,60*60*1000);if(!limit.allowed)return failure(429,'rate_limited','Çok fazla kayıt denemesi. Bir saat sonra tekrar dene.');
  const parsed=await bodyJson(request,4096),body=parsed.value;
  if(parsed.tooLarge||parsed.invalid||!body||typeof body.email!=='string'||typeof body.password!=='string')return failure(400,'invalid_request','E-posta ve şifre gerekli.');
  const email=body.email.trim().toLowerCase(),password=body.password;
  if(body.legalConsent!==true||body.legalVersion!=='legal_v1_2026-11-16')return failure(400,'legal_consent_required','Kayıt için Kullanım Koşulları ve İade Politikası onayı gerekli.');
  const persona=typeof body.persona==='string'?body.persona:(typeof body.role==='string'?body.role:'qa');
  if(!['qa','dev','pm','pmo'].includes(persona))return failure(400,'invalid_role','QA, Developer, PM veya PMO rolü seç.');
  if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return failure(400,'invalid_email','Geçerli bir e-posta adresi gir.');
  if(password.length<12||password.length>256)return failure(400,'invalid_password','Şifre en az 12, en fazla 256 karakter olmalı.');
  if(email===DEMO_LOGIN.email||email===String(env.FORGE_LOGIN_EMAIL||'').toLowerCase()||members(env,false).some(x=>x.email.toLowerCase()===email))return failure(409,'account_exists','Bu e-posta zaten kayıtlı. Giriş yapmayı dene.');
  try{
    const invitationToken=typeof body.invitationToken==='string'?body.invitationToken:'';
    const invitation=invitationToken?await getTeamInvite(env,invitationToken,email):null;
    if(invitationToken&&!invitation)return failure(400,'invite_invalid','Davet bağlantısı geçersiz, süresi dolmuş veya başka bir e-posta için oluşturulmuş.');
    if(await getRegisteredUser(env,email))return failure(409,'account_exists','Bu e-posta zaten kayıtlı. Giriş yapmayı dene.');
    const response=await fetch(String(env.SUPABASE_URL).replace(/\/$/,'')+'/auth/v1/signup',{method:'POST',headers:supabaseAuthHeaders(env),body:JSON.stringify({email,password,data:{forge_role:invitation?.role||'admin',forge_persona:persona,forge_invite_id:invitation?.id||null,forge_legal_consent:{version:body.legalVersion,terms_and_refund_accepted:true,privacy_notice_read:true,marketing_consent:body.marketingConsent===true,accepted_at:new Date().toISOString()}}}),signal:AbortSignal.timeout(15000)});
    const result=await response.json().catch(()=>({}));
    if(!response.ok){if(response.status===429)return failure(429,'email_rate_limited','Doğrulama e-postası sınırına ulaşıldı. Biraz sonra tekrar dene.');if(response.status===422||response.status===400)return failure(409,'account_exists','Bu e-posta ile kayıt açılamadı. Adresi kontrol et veya giriş yapmayı dene.');throw new Error('Supabase Auth signup failed '+response.status);}
    if(result.access_token||result.session)return failure(503,'email_confirmation_disabled','Supabase’te e-posta doğrulamasını etkinleştir.');
    return json({verificationRequired:true,email,invitedRole:invitation?.role||null},202);
  }catch(error){console.error('Forge registration failed:',String(error?.message||error));return failure(503,'registration_unavailable','Hesap kaydı başlatılamadı. Biraz sonra tekrar dene.');}
}
async function handleRegistrationVerify(request,env){
  if(request.method!=='POST')return failure(405,'invalid_method','Method not allowed.');if(!originAllowed(request))return failure(403,'invalid_origin','İstek kaynağı geçersiz.');
  if(!env.SESSION_SECRET||env.SESSION_SECRET.length<32||!env.SUPABASE_URL||!env.SUPABASE_SERVICE_ROLE_KEY||!supabasePublishableKey(env)||!env.QUOTA)return failure(503,'registration_unavailable','Üyelik servisi yapılandırılmamış.');
  const ip=request.headers.get('cf-connecting-ip')||'unknown';const limit=await consume(env,'verify:'+ip,12,60*60*1000);if(!limit.allowed)return failure(429,'rate_limited','Çok fazla kod denemesi. Biraz sonra tekrar dene.');
  const parsed=await bodyJson(request,4096),body=parsed.value;if(parsed.invalid||parsed.tooLarge||typeof body?.email!=='string'||typeof body?.token!=='string')return failure(400,'invalid_request','E-posta ve doğrulama kodu gerekli.');
  const email=body.email.trim().toLowerCase(),code=body.token.trim();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!/^\d{6,8}$/.test(code))return failure(400,'invalid_request','E-posta veya 6–8 haneli kod geçersiz.');
  try{
    const invitationToken=typeof body.invitationToken==='string'?body.invitationToken:'';
    const invitation=invitationToken?await getTeamInvite(env,invitationToken,email):null;
    if(invitationToken&&!invitation)return failure(400,'invite_invalid','Davet bağlantısı geçersiz, süresi dolmuş veya başka bir e-posta için oluşturulmuş.');
    if(invitation){const subscription=await activeSubscription(env,invitation.invited_by);if(subscription?.plan!=='team')return failure(403,'team_subscription_inactive','Takım daveti artık etkin değil. Takım yöneticisinden planı kontrol etmesini iste.');}
    const response=await fetch(String(env.SUPABASE_URL).replace(/\/$/,'')+'/auth/v1/verify',{method:'POST',headers:supabaseAuthHeaders(env),body:JSON.stringify({type:'signup',email,token:code}),signal:AbortSignal.timeout(15000)});
    const result=await response.json().catch(()=>({}));if(!response.ok)return failure(response.status===429?429:400,'invalid_code',response.status===429?'Çok fazla kod isteği. Biraz sonra tekrar dene.':'Kod geçersiz veya süresi dolmuş. Yeni kod iste.');
    const confirmedEmail=String(result.user?.email||'').trim().toLowerCase();if(confirmedEmail!==email||!(result.user?.email_confirmed_at||result.user?.confirmed_at))return failure(400,'email_not_confirmed','E-posta doğrulanamadı. Kodu kontrol edip tekrar dene.');
    const persona=result.user?.user_metadata?.forge_persona||'qa';
    let profile;
    if(invitation){profile=await supabaseRpc(env,'forge_accept_team_invite',{p_token_hash:await digest(invitationToken),p_email:email,p_persona:persona});}
    else profile=await ensureRegisteredUser(env,email,'admin',null,persona);
    const exp=Date.now()+12*60*60*1000,sessionToken=await sign({email,registered:true,exp},env.SESSION_SECRET);
    return json({user:{email,role:profile.role,demo:false}},200,{'set-cookie':secureCookie(request,sessionToken,12*60*60)});
  }catch(error){console.error('Forge email verification failed:',String(error?.message||error));return failure(503,'verification_unavailable','Doğrulama şu an tamamlanamadı. Biraz sonra tekrar dene.');}
}
async function handleRegistrationResend(request,env){
  if(request.method!=='POST')return failure(405,'invalid_method','Method not allowed.');if(!originAllowed(request))return failure(403,'invalid_origin','İstek kaynağı geçersiz.');
  if(!env.SUPABASE_URL||!supabasePublishableKey(env)||!env.QUOTA)return failure(503,'registration_unavailable','Üyelik servisi yapılandırılmamış.');
  const ip=request.headers.get('cf-connecting-ip')||'unknown';const limit=await consume(env,'resend:'+ip,3,60*60*1000);if(!limit.allowed)return failure(429,'rate_limited','Yeni kod isteme sınırına ulaştın. Bir saat sonra tekrar dene.');
  const parsed=await bodyJson(request,2048),email=typeof parsed.value?.email==='string'?parsed.value.email.trim().toLowerCase():'';if(parsed.invalid||parsed.tooLarge||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return failure(400,'invalid_request','Geçerli e-posta adresi gerekli.');
  try{const response=await fetch(String(env.SUPABASE_URL).replace(/\/$/,'')+'/auth/v1/resend',{method:'POST',headers:supabaseAuthHeaders(env),body:JSON.stringify({type:'signup',email}),signal:AbortSignal.timeout(15000)});if(!response.ok){if(response.status===429)return failure(429,'email_rate_limited','E-posta gönderim sınırına ulaşıldı. Biraz sonra tekrar dene.');throw new Error('Supabase Auth resend failed '+response.status);}return json({sent:true});}
  catch(error){console.error('Forge verification resend failed:',String(error?.message||error));return failure(503,'resend_unavailable','Yeni kod gönderilemedi. Biraz sonra tekrar dene.');}
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
  let registered=null,isRegistered=false;
  if(!isDemo&&!isConfiguredUser&&!isMember){
    try{
      if(supabasePublishableKey(env)&&env.SUPABASE_URL&&env.SUPABASE_SERVICE_ROLE_KEY){
        const authResponse=await fetch(String(env.SUPABASE_URL).replace(/\/$/,'')+'/auth/v1/token?grant_type=password',{method:'POST',headers:supabaseAuthHeaders(env),body:JSON.stringify({email,password:body.value.password}),signal:AbortSignal.timeout(15000)});
        if(authResponse.ok){const auth=await authResponse.json(),confirmed=String(auth.user?.email||'').toLowerCase()===email&&(auth.user?.email_confirmed_at||auth.user?.confirmed_at);if(confirmed){registered=await ensureRegisteredUser(env,email,auth.user?.user_metadata?.forge_role||'admin');isRegistered=!!registered;}}
        else if(authResponse.status>=500)throw new Error('Supabase Auth login failed '+authResponse.status);
        else{const authError=await authResponse.json().catch(()=>({}));if(authError.code==='email_not_confirmed'||/email not confirmed/i.test(authError.msg||authError.message||''))return failure(403,'email_not_confirmed','Giriş yapmadan önce e-posta adresini doğrula.');}
      }
    }catch(error){console.error('Forge account login failed:',String(error?.message||error));return failure(503,'login_unavailable','Giriş servisi şu an kullanılamıyor.');}
  }
  if (!isDemo && !isConfiguredUser && !isMember && !isRegistered) return failure(401, "unauthorized", "E-posta veya şifre hatalı.");
  const exp = Date.now() + 12 * 60 * 60 * 1000;
  const sessionEmail = isDemo ? DEMO_LOGIN.email : email;
  const token = await sign({ email: sessionEmail, demo: isDemo, registered:isRegistered||undefined, exp }, env.SESSION_SECRET);
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
  const plan = await effectivePlan(env, normalizedUserId(user.email)), month = today.slice(0, 7), workspace = user.workspaceKey || env.FORGE_WORKSPACE_ID || user.email;
  const monthly = await consume(env, `generation:${workspace}`, plan.generations, 32 * 24 * 60 * 60 * 1000, month);
  if (!monthly.allowed) return failure(429, "generation_quota_reached", `${plan.name} planının aylık ${plan.generations} üretim kotası doldu. Kota gelecek ayın ilk günü UTC saatinde yenilenir.`);
  const model = job.depth === "deep" ? (env.DEEP_MODEL || "claude-opus-5") : (env.QUICK_MODEL || "claude-sonnet-5");
  return runModel(job, env, model, { plan: plan.name, limit: plan.generations, used: monthly.used, remaining: monthly.remaining, resets: new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 1)).toISOString() });
}

async function runModel(job, env, model, quota = null) {
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
  return json(quota ? { result, quota } : { result });
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
    if(url.pathname==='/api/team/invite-preview')return teamInvitePreview(request,env);
    if (url.pathname === "/api/paddle/webhook") return handlePaddleWebhook(request, env);
    if (url.pathname === "/api/billing/checkout-intent") return createCheckoutIntent(request, env);
    if (url.pathname === "/api/forge/subscription") return handleSubscriptionLookup(request, env);
    if (url.pathname === "/api/billing/config" && request.method === "GET") {
      const token = String(env.PADDLE_CLIENT_TOKEN || "");
      const sandbox = env.PADDLE_ENV === "sandbox" && token.startsWith("test_");
      return json({ enabled: sandbox, environment: "sandbox", token: sandbox ? token : "" });
    }
    if (url.pathname === "/api/register") return handleRegistration(request, env);
    if (url.pathname === "/api/register/verify") return handleRegistrationVerify(request, env);
    if (url.pathname === "/api/register/resend") return handleRegistrationResend(request, env);
    if(url.pathname.startsWith("/api/workspace"))return handleWorkspace(request,env);
    if (url.pathname === "/api/session") return handleSession(request, env);
    if (url.pathname === "/api/generate") return handleGenerate(request, env);
    if (url.pathname === "/api/public-try") return handlePublicTry(request, env);
    return env.ASSETS.fetch(request);
  }
};

function members(env,enforceSeats=true){try{const list=JSON.parse(env.FORGE_USERS_JSON||'[]');if(!Array.isArray(list))return [];const valid=list.filter(x=>typeof x.email==='string'&&['admin','qa','dev','pm','pmo'].includes(x.role));if(!enforceSeats||env.FORGE_PREVIEW_MODE==='true')return valid;const owner=String(env.FORGE_LOGIN_EMAIL||'').toLowerCase(),seen=new Set(owner?[owner]:[]),active=[];for(const member of valid){const email=member.email.toLowerCase();if(seen.has(email))continue;seen.add(email);active.push(member);}return active.slice(0,Math.max(0,planFor(env).seats-(owner?1:0)));}catch{return [];}}
async function checkPassword(password,member){
 if(typeof member.salt!=='string'||typeof member.hash!=='string')return false;
 const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
 const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:encoder.encode(member.salt),iterations:100000,hash:'SHA-256'},key,256);
 const hash=[...new Uint8Array(bits)].map(b=>b.toString(16).padStart(2,'0')).join('');
 if(hash.length!==member.hash.length)return false;let diff=0;for(let i=0;i<hash.length;i++)diff|=hash.charCodeAt(i)^member.hash.charCodeAt(i);return diff===0;
}
async function handleWorkspace(request,env){
 const url=new URL(request.url),path=url.pathname.slice('/api/workspace'.length)||'/state';
 if(path==='/config')return json({preview:env.FORGE_PREVIEW_MODE==='true',ai:!!env.ANTHROPIC_API_KEY,github:!!(env.GITHUB_TOKEN&&env.GITHUB_REPOSITORY),repository:env.GITHUB_REPOSITORY||'',plan:planFor(env),accounts:env.FORGE_PREVIEW_MODE==='true'?members(env,false).map(({email,role})=>({email,role})):[]});
 if(!env.WORKSPACE)return failure(503,'workspace_disabled','Çalışma alanı sunucu deposu yapılandırılmamış.');
 if(path.startsWith('/shared/')){
  const token=path.slice('/shared/'.length);if(!/^[a-f0-9-]{72}$/.test(token))return failure(404,'not_found','Paylaşım bulunamadı.');
  // Public reports are isolated snapshots, addressed by unguessable, expiring tokens.
  const stub=env.WORKSPACE.get(env.WORKSPACE.idFromName('share-index'));
  return stub.fetch(new Request('https://workspace.internal/share/'+token));
 }
 let user=await sessionUser(request,env);if(!user)return failure(401,'unauthorized','Oturum açın / Sign in');
 if(user.demo){
  if(request.method!=='GET')return failure(403,'demo_read_only','Demo hesabı salt okunurdur.');
  if(path==='/members')return json({members:[{email:'qa@demo.qacrew.it',role:'qa'},{email:'developer@demo.qacrew.it',role:'dev'},{email:'pm@demo.qacrew.it',role:'pm'}],user});
  if(path==='/state'){const demo=env.WORKSPACE.get(env.WORKSPACE.idFromName('public-demo-workspace'));return demo.fetch(new Request('https://workspace.internal/demo-state'));}
  return failure(403,'demo_read_only','Demo hesabında bu işlem salt okunur modda kullanılamaz.');
 }
 if(!['GET','POST'].includes(request.method))return failure(405,'invalid_method','Unsupported method');
 if(request.method==='POST'&&!originAllowed(request))return failure(403,'invalid_origin','İstek kaynağı geçersiz');
 const key=user.workspaceKey||env.FORGE_WORKSPACE_ID||user.email,stub=env.WORKSPACE.get(env.WORKSPACE.idFromName('workspace:'+key));
 if(path==='/team'&&request.method==='GET'){
  try{const status=await teamStatus(env,user);if(status.user){user={...user,...status.user};}return json({...status,user:{email:user.email,role:user.role,persona:user.persona||null}});}
  catch(error){console.error('Forge team status failed:',String(error?.message||error));return failure(503,'team_unavailable','Takım bilgisi şu an alınamadı.');}
 }
 if(path==='/team/invites'&&request.method==='POST')return createTeamInvite(request,env,user);
 if(path==='/team/invites/revoke'&&request.method==='POST'){
  const parsed=await bodyJson(request,2048),id=typeof parsed.value?.id==='string'?parsed.value.id:'';
  if(parsed.invalid||parsed.tooLarge)return failure(400,'invalid_invite','Davet seçimi geçersiz.');
  return revokeTeamInvite(env,user,id);
 }
 if(path==='/team/invites/accept'&&request.method==='POST'){
  const parsed=await bodyJson(request,2048),token=typeof parsed.value?.token==='string'?parsed.value.token:'';
  if(parsed.invalid||parsed.tooLarge)return failure(400,'invalid_invite','Davet bağlantısı geçersiz.');
  return acceptTeamInvite(env,user,token);
 }
 if(path==='/members'){
  if(user.registered){if(request.method==='POST')return failure(405,'invalid_method','Unsupported method');try{const sub=await activeSubscription(env,user.email);if(sub?.plan==='team')user=await promoteTeamOwner(env,user,sub);return json({members:await listWorkspaceUsers(env,user.workspaceKey),user:{email:user.email,role:user.role,persona:user.persona||null}});}catch(error){console.error('Forge team members read failed:',String(error?.message||error));return failure(503,'team_unavailable','Ekip bilgisi şu an alınamadı.');}}
  return json({members:members(env).map(({email,role})=>({email,role})),user});
 }
 if(path.startsWith('/github')){try{return await githubWorkspace(request,env,user,path);}catch{return failure(502,'github_unavailable','GitHub bağlantısı kurulamadı. Tekrar deneyin.');}}
 if(path==='/share'&&request.method==='POST'&&env.SUPABASE_URL&&env.SUPABASE_SERVICE_ROLE_KEY){
  const parsed=await bodyJson(request,64000),p=parsed.value;if(parsed.invalid||parsed.tooLarge)return failure(400,'invalid_body','Geçersiz paylaşım isteği');
  try{const state=await readForgeWorkspace(env,key,stub),project=state.projects.find(x=>x.id===p?.projectId);if(!project)return failure(404,'not_found','Proje bulunamadı');
   const runs=project.runs.filter(r=>r.version===p.version);if(!runs.length)return failure(400,'no_runs','Koşum yok');
   const token=crypto.randomUUID()+crypto.randomUUID(),snapshot={project:project.name,version:p.version,runs:runs.map(r=>({title:r.title,platform:r.platform,environment:r.environment,cases:r.cases.map(c=>({title:c.title,priority:c.priority,status:c.status,note:c.note,executedAt:c.executedAt,executedBy:c.executedBy}))})),bugs:project.bugs.filter(b=>b.version===p.version).map(b=>({id:b.id,title:b.title,status:b.status,severity:b.severity})),decision:project.decisions.filter(d=>d.version===p.version).at(-1)||null,createdAt:new Date().toISOString(),by:user.email,expires:Date.now()+7*86400000};
   const index=env.WORKSPACE.get(env.WORKSPACE.idFromName('share-index'));await index.fetch(new Request('https://workspace.internal/publish',{method:'POST',headers:{'x-workspace-user':JSON.stringify(user),'content-type':'application/json'},body:JSON.stringify({token,snapshot})}));return json({token,expires:snapshot.expires});
  }catch(e){console.error('Forge Supabase share failed:',String(e?.message||e));return failure(502,'supabase_unavailable','Supabase çalışma alanına erişilemedi.');}
 }
 const allowed=request.method==='GET'?(path==='/state'||/^\/evidence\/[a-f0-9-]+$/.test(path)):['/command','/evidence','/share'].includes(path);
 if(!allowed)return failure(404,'not_found','Not found');
 let body;
 if(request.method==='POST'){const parsed=await bodyJson(request,path==='/evidence'?7100000:3200000);if(parsed.invalid||parsed.tooLarge)return failure(413,'invalid_body','İstek çok büyük veya geçersiz');body=JSON.stringify(parsed.value);}
 if(env.SUPABASE_URL&&env.SUPABASE_SERVICE_ROLE_KEY&&(path==='/state'||path==='/command')){
  try{
   if(path==='/state'){const state=await readForgeWorkspace(env,key,stub);return json({state});}
   const command=JSON.parse(body),current=await readForgeWorkspace(env,key,stub);
   if(command.revision!==current.revision)return failure(409,'revision_conflict','Başka kullanıcı kaydı güncelledi. Yenileyip tekrar deneyin / Conflict: reload and retry');
   let next;try{next=applyCommand(current,command,user);}catch(e){return failure(e.status||400,'invalid_command',e.message||'İşlem gerçekleştirilemedi');}
   if(!await saveForgeWorkspace(env,key,current.revision,next))return failure(409,'revision_conflict','Başka kullanıcı kaydı güncelledi. Yenileyip tekrar deneyin / Conflict: reload and retry');
   return json({state:next});
  }catch(e){console.error('Forge Supabase workspace request failed:',String(e?.message||e));return failure(502,'supabase_unavailable','Supabase çalışma alanına erişilemedi. Ayarları ve veritabanı geçişini kontrol edin.');}
 }
 const result=await stub.fetch(new Request('https://workspace.internal'+path,{method:request.method,headers:{'x-workspace-user':JSON.stringify(user),'content-type':'application/json'},body}));
 if(path==='/share'&&result.ok){const data=await result.json(),snapshot=await stub.fetch(new Request('https://workspace.internal/share/'+data.token));
  const index=env.WORKSPACE.get(env.WORKSPACE.idFromName('share-index'));await index.fetch(new Request('https://workspace.internal/publish',{method:'POST',headers:{'x-workspace-user':JSON.stringify(user)},body:JSON.stringify({token:data.token,snapshot:await snapshot.json()})}));return json(data);}
 return result;
}
function supabaseHeaders(env){
 const key=String(env.SUPABASE_SERVICE_ROLE_KEY||'');
 const headers={apikey:key,'content-type':'application/json',Accept:'application/json'};
 // New opaque Supabase secret keys are API keys, not JWTs; sending one as a
 // Bearer token makes PostgREST reject the request with Invalid JWT.
 if(!key.startsWith('sb_secret_'))headers.Authorization='Bearer '+key;
 return headers;
}
async function readForgeWorkspace(env,key,legacyStub){
 const root=String(env.SUPABASE_URL).replace(/\/$/,'');const query=new URLSearchParams({workspace_key:'eq.'+key,select:'state,revision'});
 const response=await fetch(root+'/rest/v1/forge_workspaces?'+query,{headers:supabaseHeaders(env),signal:AbortSignal.timeout(12000)});if(!response.ok)throw new Error('Supabase read failed '+response.status);
 const rows=await response.json();if(rows[0]?.state)return rows[0].state;
 if(key.startsWith('user:')){const state={schema:1,revision:0,projects:[],audit:[]};await saveForgeWorkspace(env,key,null,state);const reread=await fetch(root+'/rest/v1/forge_workspaces?'+query,{headers:supabaseHeaders(env),signal:AbortSignal.timeout(12000)});if(!reread.ok)throw new Error('Supabase initialize failed');const saved=await reread.json();if(!saved[0]?.state)throw new Error('Workspace initialization conflict');return saved[0].state;}
 // First request performs a one-time, lossless copy from the existing Durable Object.
 const legacy=await legacyStub.fetch(new Request('https://workspace.internal/state',{headers:{'x-workspace-user':JSON.stringify({email:'migration',role:'admin'})}}));if(!legacy.ok)throw new Error('Legacy workspace read failed');
 const {state}=await legacy.json();await saveForgeWorkspace(env,key,null,state);const reread=await fetch(root+'/rest/v1/forge_workspaces?'+query,{headers:supabaseHeaders(env),signal:AbortSignal.timeout(12000)});if(!reread.ok)throw new Error('Supabase initialize failed');const saved=await reread.json();if(!saved[0]?.state)throw new Error('Workspace initialization conflict');return saved[0].state;
}
async function saveForgeWorkspace(env,key,expectedRevision,state){
 const response=await fetch(String(env.SUPABASE_URL).replace(/\/$/,'')+'/rest/v1/rpc/forge_save_workspace',{method:'POST',headers:supabaseHeaders(env),body:JSON.stringify({p_workspace_key:key,p_expected_revision:expectedRevision,p_state:state}),signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw new Error('Supabase save failed '+response.status);return response.json()===true;
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
