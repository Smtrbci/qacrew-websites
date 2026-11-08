import { expect, test } from "@playwright/test";

async function signInDemo(page) {
  await page.goto("/forge/app/");
  await page.locator("#demoEmail").fill("demo@qacrew.it");
  await page.locator("#demoPassword").fill("qacrew2026");
  await page.locator("#demoLoginForm button[type=submit]").click();
  await expect(page.locator("#appShell")).toBeVisible();
}

test("requirement questions save answers and unknown decisions; the English library stays English", async ({ page }) => {
  await signInDemo(page);
  await page.locator('[data-tab="qa"]').click();
  await page.locator("#featureInput").fill("Kullanıcı kuponla ödeme yapabilir.");
  await page.locator("#featureName").fill("Kupon ödeme");
  await page.locator("#releaseProject").fill("Checkout");
  await page.locator("#scanFeature").click();
  await expect(page.locator("#featureQuestions .qa-question")).toHaveCount(8);
  await page.locator('[data-feature-status="0"]').selectOption("unknown");
  await page.locator('[data-feature-status="1"]').selectOption("confirmed");
  await page.locator('[data-feature-answer="1"]').fill("Minimum sepet tutarı 100 TL.");
  await page.locator("#saveFeature").click();
  const stored = await page.evaluate(() => Object.entries(localStorage).find(([key]) => key.startsWith("qacrew.workflow.v1."))?.[1]);
  expect(stored).toContain("Minimum sepet tutarı 100 TL.");
  await page.locator('[data-forge-lang="en"]:visible').first().click();
  await expect(page.locator("#libraryList")).toContainText("Sign in with valid credentials");
  await expect(page.locator("#libraryList")).not.toContainText("Geçerli bilgilerle giriş");
});

test("release plan honors time budget, snapshots tests as pending, and keeps local records after reload", async ({ page }) => {
  await signInDemo(page);
  await page.locator('[data-tab="qa"]').click();
  await page.locator("#releaseProject").fill("Checkout");
  await page.locator("#releaseVersion").fill("v9.1");
  await page.locator("#releaseOwner").fill("QA Owner");
  await page.locator("#releaseEnvironment").fill("Staging");
  await page.locator("#releasePlatform").selectOption("Web");
  await page.locator("#releaseNotes").fill("Kupon ve ödeme koşulları değişti");
  await page.locator("#releaseModules").fill("Ödeme");
  await page.locator("#timeBudget").selectOption("15");
  await expect(page.locator("#planSuggestions")).toContainText("kritik/yüksek akışlar plan dışında");
  await page.locator("#createReleaseRun").click();
  const run = await page.evaluate(() => {
    const entry = Object.entries(localStorage).find(([key]) => key.startsWith("qacrew.runs."));
    return entry ? JSON.parse(entry[1]).at(-1) : null;
  });
  expect(run.version).toBe("v9.1");
  expect(run.cases.length).toBeGreaterThan(0);
  expect(run.cases.every((item) => item.status === "pending")).toBe(true);
  expect(run.scopeExclusions.length).toBeGreaterThan(0);
  expect(run.impactBasis).toContain("kural tabanlı");
  await page.reload();
  await signInDemo(page);
  const afterReload = await page.evaluate(() => JSON.parse(Object.entries(localStorage).find(([key]) => key.startsWith("qacrew.runs."))[1]).at(-1));
  expect(afterReload.cases.map((item) => item.steps)).toEqual(run.cases.map((item) => item.steps));
});

test("exploration finding becomes one linked issue; sessions and report remain local", async ({ page }) => {
  await signInDemo(page);
  await page.locator('[data-tab="qa"]').click();
  await page.locator('#newSessionForm [name="version"]').fill("v9.2");
  await page.locator('#newSessionForm [name="owner"]').fill("QA Owner");
  await page.locator('#newSessionForm [name="environment"]').fill("Staging · Chrome");
  await page.locator('#newSessionForm [name="scope"]').fill("Checkout");
  await page.locator('#newSessionForm button[type="submit"]').click();
  const session = page.locator(".qa-session").first();
  await session.getByRole("button", { name: "Başlat" }).click();
  await session.locator("[data-add-finding] input[name=finding]").fill("Ödeme reddedilince iki kez tahsilat oluştu.");
  await session.locator("[data-add-finding] button[type=submit]").click();
  await session.getByRole("button", { name: "İlişkili hata aç" }).click();
  const workflowState = await page.evaluate(() => Object.entries(localStorage).filter(([key]) => key.startsWith("qacrew.workflow.v1.")));
  expect(workflowState.length).toBeGreaterThan(0);
  expect(workflowState[0][1]).toContain("Ödeme sırasında bağlantı kesilmesi");
  const savedRun = await page.evaluate(() => JSON.parse(Object.entries(localStorage).find(([key]) => key.startsWith("qacrew.runs."))[1]).at(-1));
  expect(savedRun.bugs).toHaveLength(1);
  expect(savedRun.bugs[0].testId).toBe(savedRun.cases[0].id);
  expect(savedRun.cases[0].status).toBe("failed");
  expect(savedRun.cases[0].executedBy).toBe("QA Owner");
  await page.reload();
  await signInDemo(page);
  await page.locator('[data-tab="qa"]').click();
  await expect(page.locator(".qa-session")).toContainText("v9.2");
});
