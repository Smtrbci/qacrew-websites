/* QAcrew Studio — üretim prompt'ları (tarayıcı ve Node sunucusu ortak kullanır) */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.QAPrompts = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var TYPES = ["test", "bug", "smoke", "reg"];
  var PLATFORMS = ["Web", "iOS", "Android", "API"];
  var MAX_INPUT = 12000;

  var SCHEMA = {
    test: '{"title": string, "summary": string, "items": [{"id": "TC-001", "scenario": string, "type": "Pozitif"|"Negatif"|"Sınır değer", "preconditions": string, "steps": [string], "expected": string, "priority": "Yüksek"|"Orta"|"Düşük"}]}',
    bug: '{"title": string, "summary": string, "bug": {"title": string, "severity": "Kritik"|"Yüksek"|"Orta"|"Düşük", "environment": string, "preconditions": string, "steps": [string], "expected": string, "actual": string, "frequency": string, "notes": string, "missing_info": [string]}}',
    smoke: '{"title": string, "summary": string, "items": [{"check": string, "area": string, "note": string, "priority": "Yüksek"|"Orta"|"Düşük"}]}',
    reg: '{"title": string, "summary": string, "items": [{"id": "RG-01", "scope": string, "reason": string, "tests": number, "priority": "Yüksek"|"Orta"|"Düşük"}]}'
  };

  var INSTR = {
    test: "Girdiden çalıştırılabilir manuel test senaryoları çıkar. Pozitif, negatif ve sınır değer senaryolarını karıştır. Her senaryonun adımları somut ve tekrar edilebilir olsun.",
    bug: "Girdideki dağınık bilgiden geliştiricinin tek okumada anlayacağı tek bir bug raporu yaz. Girdide olmayan bilgiyi uydurma: tahmin ettiğin yerleri 'Tahmini' diye belirt ve eksik bilgileri missing_info listesine soru olarak yaz.",
    smoke: "Girdideki sürüm değişikliklerine göre sürüm öncesi smoke test kontrol listesi hazırla. Önce uygulamanın açılması ve kritik akışlar, sonra her değişiklik için en az bir kontrol olsun.",
    reg: "Girdideki değişikliklere göre regresyon test setlerini önceliklendir. Değişen modüller ve onlara bağlı akışlar yüksek, dokunulmayan alanlar düşük öncelikli örneklem olsun. tests alanı o set için önerilen test sayısıdır."
  };

  /** Bir işi doğrular ve temizler. Geçersizse Error fırlatır. */
  function normalize(job) {
    job = job || {};
    var type = TYPES.indexOf(job.type) > -1 ? job.type : null;
    if (!type) throw new Error("type");
    var input = String(job.input || "").trim();
    if (input.length < 20 || input.length > MAX_INPUT) throw new Error("input");
    var plats = (Array.isArray(job.plats) ? job.plats : []).filter(function (p) { return PLATFORMS.indexOf(p) > -1; });
    if (!plats.length) plats = ["Web"];
    return {
      type: type,
      plats: plats,
      depth: job.depth === "deep" ? "deep" : "quick",
      project: String(job.project || "").trim().slice(0, 120),
      input: input
    };
  }

  /** İşten modele gidecek prompt metnini üretir. */
  function build(job) {
    var j = normalize(job);
    var cnt = j.type === "bug" ? "" : (j.depth === "deep" ? "10-14" : "6-8") + " madde üret. ";
    return "Sen deneyimli bir yazılım test uzmanısın (ISTQB bilgisine sahip). Tüm metinleri Türkçe yaz.\n" +
      "Görev: " + INSTR[j.type] + "\n" +
      "Platform(lar): " + j.plats.join(", ") + ". " + (j.project ? "Proje/modül: " + j.project + ". " : "") + cnt + "\n" +
      "Yanıt olarak YALNIZCA şu şekilde tek bir JSON nesnesi döndür, başka metin yazma:\n" + SCHEMA[j.type] + "\n" +
      "title en fazla 60 karakter, summary 1-2 cümle olsun.\n\n" +
      "--- GİRDİ BAŞLANGICI ---\n" + j.input + "\n--- GİRDİ SONU ---";
  }

  /** Model sonucunun beklenen şekilde olup olmadığını kontrol eder. */
  function isValidResult(type, res) {
    if (!res || typeof res !== "object") return false;
    if (type === "bug") return !!res.bug && typeof res.bug === "object";
    return Array.isArray(res.items) && res.items.length > 0;
  }

  return { TYPES: TYPES, PLATFORMS: PLATFORMS, MAX_INPUT: MAX_INPUT, SCHEMA: SCHEMA, INSTR: INSTR, normalize: normalize, build: build, isValidResult: isValidResult };
});
