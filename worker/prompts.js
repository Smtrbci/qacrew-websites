const TYPES = ["test", "bug", "smoke", "reg"];
const PLATFORMS = ["Web", "iOS", "Android", "API"];
const INSTRUCTIONS = {
  test: "Girdiden çalıştırılabilir manuel test senaryoları çıkar. Pozitif, negatif ve sınır değer senaryolarını karıştır; adımlar somut ve tekrar edilebilir olsun.",
  bug: "Girdideki bilgilerden tek ve geliştiriciye hazır bir hata raporu yaz. Bilinmeyenleri uydurma; eksik bilgileri soru olarak belirt.",
  smoke: "Sürüm değişikliklerine göre kritik akışları ve her değişikliği kapsayan smoke kontrol listesi hazırla.",
  reg: "Değişikliklere ve bağımlı akışlara göre önceliklendirilmiş regresyon test setleri hazırla."
};
const SCHEMA = {
  test: '{"title":"string","summary":"string","items":[{"id":"TC-001","scenario":"string","type":"Pozitif|Negatif|Sınır değer|Positive|Negative|Boundary value","preconditions":"string","steps":["string"],"expected":"string","priority":"Yüksek|Orta|Düşük|High|Medium|Low"}]}',
  bug: '{"title":"string","summary":"string","bug":{"title":"string","severity":"Kritik|Yüksek|Orta|Düşük|Critical|High|Medium|Low","environment":"string","preconditions":"string","steps":["string"],"expected":"string","actual":"string","frequency":"string","notes":"string","missing_info":["string"]}}',
  smoke: '{"title":"string","summary":"string","items":[{"check":"string","area":"string","note":"string","priority":"Yüksek|Orta|Düşük|High|Medium|Low"}]}',
  reg: '{"title":"string","summary":"string","items":[{"id":"RG-01","scope":"string","reason":"string","tests":1,"priority":"Yüksek|Orta|Düşük|High|Medium|Low"}]}'
};

export function validateJob(job) {
  if (!job || typeof job !== "object" || Array.isArray(job)) return null;
  if (Object.keys(job).some((key) => !["type", "plats", "depth", "project", "input", "language"].includes(key))) return null;
  if (!TYPES.includes(job.type) || !["quick", "deep"].includes(job.depth)) return null;
  if (!Array.isArray(job.plats) || job.plats.length < 1 || job.plats.length > PLATFORMS.length || job.plats.some((p) => !PLATFORMS.includes(p)) || new Set(job.plats).size !== job.plats.length) return null;
  if (typeof job.project !== "string" || job.project.length > 120 || typeof job.input !== "string" || job.input.trim().length < 20 || job.input.length > 12000) return null;
  if (job.language !== undefined && !["tr", "en"].includes(job.language)) return null;
  return { type: job.type, plats: job.plats, depth: job.depth, project: job.project.trim(), input: job.input.trim(), language: job.language || "tr" };
}

export function buildPrompt(job) {
  const count = job.type === "bug" ? "Tek bir hata raporu üret." : `${job.depth === "deep" ? "10–14" : "6–8"} madde üret.`;
  const language = job.language === "en" ? "English" : "Turkish";
  return `You are an experienced software QA specialist. Write the document in ${language}; this is independent from the interface language.\nTask: ${INSTRUCTIONS[job.type]}\nPlatforms: ${job.plats.join(", ")}. ${job.project ? `Project/module: ${job.project}. ` : ""}${count}\nReturn only a JSON object matching this schema: ${SCHEMA[job.type]}\nKeep the title under 60 characters and the summary to 1–2 sentences. Translate enum labels to the requested document language.\n\n--- INPUT START ---\n${job.input}\n--- INPUT END ---`;
}

function text(value) { return typeof value === "string" ? value : ""; }
function strings(value) { return Array.isArray(value) && value.every((x) => typeof x === "string"); }
export function validResult(type, result) {
  if (!result || typeof result !== "object" || Array.isArray(result) || typeof result.title !== "string" || typeof result.summary !== "string") return false;
  if (type === "bug") {
    const b = result.bug;
    return !!b && typeof b === "object" && typeof b.title === "string" && ["Kritik", "Yüksek", "Orta", "Düşük", "Critical", "High", "Medium", "Low"].includes(b.severity) && typeof b.environment === "string" && typeof b.preconditions === "string" && strings(b.steps) && typeof b.expected === "string" && typeof b.actual === "string" && typeof b.frequency === "string" && typeof b.notes === "string" && strings(b.missing_info);
  }
  if (!Array.isArray(result.items) || result.items.length < 1 || result.items.length > 40) return false;
  if (type === "test") return result.items.every((x) => x && typeof x.id === "string" && typeof x.scenario === "string" && ["Pozitif", "Negatif", "Sınır değer", "Positive", "Negative", "Boundary value"].includes(x.type) && typeof x.preconditions === "string" && strings(x.steps) && typeof x.expected === "string" && ["Yüksek", "Orta", "Düşük", "High", "Medium", "Low"].includes(x.priority));
  if (type === "smoke") return result.items.every((x) => x && typeof x.check === "string" && typeof x.area === "string" && typeof x.note === "string" && ["Yüksek", "Orta", "Düşük", "High", "Medium", "Low"].includes(x.priority));
  if (type === "reg") return result.items.every((x) => x && typeof x.id === "string" && typeof x.scope === "string" && typeof x.reason === "string" && Number.isInteger(x.tests) && ["Yüksek", "Orta", "Düşük", "High", "Medium", "Low"].includes(x.priority));
  return false;
}

export function parseModelJson(raw) {
  const source = text(raw).trim();
  const attempts = [source];
  const fenced = source.match(/```json\s*([\s\S]*?)```/i);
  if (fenced) attempts.push(fenced[1].trim());
  const first = source.indexOf("{"), last = source.lastIndexOf("}");
  if (first >= 0 && last > first) attempts.push(source.slice(first, last + 1));
  for (const candidate of attempts) { try { return JSON.parse(candidate); } catch {} }
  return null;
}
