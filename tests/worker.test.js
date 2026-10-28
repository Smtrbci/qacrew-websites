import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { readFile } from "node:fs/promises";
import worker, { QuotaCounter } from "../worker/index.js";
import { buildPrompt, parseModelJson, validResult, validateJob } from "../worker/prompts.js";

if (!globalThis.crypto) globalThis.crypto = webcrypto;

const validJob = { type: "test", plats: ["Web", "iOS"], depth: "quick", project: "Ödeme", input: "Kullanıcı kayıtlı kartıyla ödeme yapabilmelidir. 3D Secure akışı doğrulanmalıdır." };
function env(overrides = {}) {
  const objects = new Map();
  return {
    ANTHROPIC_API_KEY: "test-key",
    FORGE_LOGIN_EMAIL: "qa@example.com",
    FORGE_LOGIN_PASSWORD: "test-password",
    SESSION_SECRET: "a-secure-session-secret-with-at-least-32-chars",
    ASSETS: { fetch: async () => new Response("asset") },
    QUOTA: {
      idFromName(name) { return name; },
      get(id) {
        if (!objects.has(id)) {
          const data = new Map();
          objects.set(id, { fetch: async (_url, init) => new QuotaCounter({ storage: { transaction: async (fn) => fn({ get: async (k) => data.get(k), put: async (k, v) => data.set(k, v) }), setAlarm: async () => {}, deleteAll: async () => data.clear() } }).fetch(new Request("https://quota.internal", init)) });
        }
        return objects.get(id);
      }
    },
    ...overrides
  };
}
async function login(e) {
  const response = await worker.fetch(new Request("https://qacrew.it/api/session", { method: "POST", headers: { origin: "https://qacrew.it", "content-type": "application/json" }, body: JSON.stringify({ email: e.FORGE_LOGIN_EMAIL, password: e.FORGE_LOGIN_PASSWORD }) }), e);
  assert.equal(response.status, 200);
  return response.headers.get("set-cookie").split(";")[0];
}
const okModel = { content: [{ type: "text", text: JSON.stringify({ title: "Ödeme", summary: "Ödeme testi.", items: [{ id: "TC-001", scenario: "Kayıtlı kartla ödeme", type: "Pozitif", preconditions: "Kart kayıtlı", steps: ["Sepete ürün ekle", "Ödemeyi tamamla"], expected: "Sipariş oluşur", priority: "Yüksek" }] }) }] };
async function generate(e, auth, ip = "192.0.2.1") {
  return worker.fetch(new Request("https://qacrew.it/api/generate", { method: "POST", headers: { origin: "https://qacrew.it", cookie: auth, "content-type": "application/json", "cf-connecting-ip": ip }, body: JSON.stringify({ job: validJob }) }), e);
}

test("validates strict jobs and builds prompts only on server", () => {
  assert.ok(validateJob(validJob));
  assert.equal(validateJob({ ...validJob, prompt: "client prompt" }), null);
  assert.equal(validateJob({ ...validJob, input: "x".repeat(12001) }), null);
  assert.match(buildPrompt(validJob), /GİRDİ BAŞLANGICI/);
  assert.deepEqual(parseModelJson("```json\n{\"ok\":true}\n```"), { ok: true });
  assert.equal(validResult("test", okModel.content[0].text), false);
});

test("generation requires a session and reports a missing API key in Turkish", async () => {
  const e = env({ ANTHROPIC_API_KEY: "" });
  const noSession = await generate(e, "");
  assert.equal(noSession.status, 401);
  const auth = await login(e);
  const response = await generate(e, auth);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "sampling_disabled", message: "Üretim servisi şu an kapalı" });
});

test("successful request sends only server-built prompt upstream and returns JSON result", async () => {
  const e = env();
  const auth = await login(e);
  const originalFetch = globalThis.fetch;
  let upstreamBody;
  globalThis.fetch = async (url, init) => {
    assert.equal(url, "https://api.anthropic.com/v1/messages");
    upstreamBody = JSON.parse(init.body);
    return Response.json(okModel);
  };
  try {
    const response = await generate(e, auth);
    assert.equal(response.status, 200);
    assert.ok((await response.json()).result.items.length);
    assert.equal(upstreamBody.max_tokens, 8000);
    assert.match(upstreamBody.messages[0].content, /Kullanıcı kayıtlı kartıyla ödeme/);
    assert.equal(upstreamBody.messages[0].content.includes('"prompt"'), false);
    assert.equal(upstreamBody.system, "Yalnızca istenen JSON nesnesini döndür.");
  } finally { globalThis.fetch = originalFetch; }
});

test("persistent quotas enforce three requests per IP and ten per authenticated user per UTC day", async () => {
  const e = env();
  const auth = await login(e);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json(okModel);
  try {
    for (let i = 0; i < 3; i++) assert.equal((await generate(e, auth, "192.0.2.99")).status, 200);
    const perIp = await generate(e, auth, "192.0.2.99");
    assert.equal(perIp.status, 429);
    assert.equal((await perIp.json()).error, "rate_limited");
    // Use separate IPs for the user quota test, preserving one authenticated identity.
    for (let i = 0; i < 7; i++) assert.equal((await generate(e, auth, `198.51.100.${i + 1}`)).status, 200);
    const daily = await generate(e, auth, "203.0.113.250");
    assert.equal(daily.status, 429);
    assert.match((await daily.json()).message, /Günlük deneme hakkın doldu/);
  } finally { globalThis.fetch = originalFetch; }
});

test("request body over 64 KB gets 413", async () => {
  const e = env();
  const auth = await login(e);
  const response = await worker.fetch(new Request("https://qacrew.it/api/generate", { method: "POST", headers: { cookie: auth, "content-type": "application/json", "content-length": "70000" }, body: " ".repeat(70000) }), e);
  assert.equal(response.status, 413);
  assert.equal((await response.json()).error, "prompt_too_large");
});

test("public try stays closed and landing demo does not call the generation API", async () => {
  const e = env();
  const response = await worker.fetch(new Request("https://qacrew.it/api/public-try", { method: "POST" }), e);
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, "sampling_disabled");
  const [home, script, app] = await Promise.all([
    readFile(new URL("../forge/index.html", import.meta.url), "utf8"),
    readFile(new URL("../forge/js/site.js", import.meta.url), "utf8"),
    readFile(new URL("../forge/js/app.js", import.meta.url), "utf8")
  ]);
  assert.match(home, /Kendi senaryonu dene/);
  assert.match(home, /app\/\?try=1/);
  assert.doesNotMatch(script, /\/api\/generate/);
  assert.match(app, /fetch\("\/api\/generate"/);
  assert.doesNotMatch(app, /QAPrompts\.build|prompt\s*:/);
});

test("API credentials are server-only and forbidden brand spelling is absent", async () => {
  const [panel, workerSource, config] = await Promise.all([
    readFile(new URL("../forge/app/index.html", import.meta.url), "utf8"),
    readFile(new URL("../worker/index.js", import.meta.url), "utf8"),
    readFile(new URL("../.assetsignore", import.meta.url), "utf8")
  ]);
  assert.doesNotMatch(panel, /ANTHROPIC_API_KEY|sk-ant-/);
  assert.match(workerSource, /ANTHROPIC_API_KEY/);
  assert.match(config, /worker\/\*\*/);
  const files = ["../index.html", "../forge/index.html", "../forge/app/index.html", "../js/studio-v2.js", "../forge/js/i18n.js", "../forge/js/app-i18n.js"];
  for (const file of files) assert.doesNotMatch(await readFile(new URL(file, import.meta.url), "utf8"), /QACrew|Qacrew|QA Crew/);
});
