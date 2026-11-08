import { expect, test } from "@playwright/test";

async function signInDemo(page) {
  await page.goto("/forge/app/");
  await page.locator("#demoEmail").fill("demo@qacrew.it");
  await page.locator("#demoPassword").fill("qacrew2026");
  await page.locator("#demoLoginForm button[type=submit]").click();
  await expect(page.locator("#appShell")).toBeVisible();
  await expect(page.locator("#exGrid [data-work='ex-test']")).toBeVisible();
}

test("demo sample preview is bilingual and never requests real generation", async ({ page }) => {
  const generateRequests = [];
  page.on("request", (request) => { if (request.url().includes("/api/generate")) generateRequests.push(request.url()); });
  await page.goto("/forge/app/");
  await page.locator("#login [data-forge-lang=en]").click();
  await signInDemo(page);
  await page.locator("#recentGrid [data-open-tool]").click();
  await expect(page.locator("#generationNotice")).toContainText("real generation is off");
  await expect(page.locator("#genBtn")).toContainText("Show sample output");
  await page.locator("#inputText").fill("As a user, I can pay with a saved card. Payment confirmation should be shown.");
  await page.locator("#docLanguage").selectOption("en");
  await page.locator("#genBtn").click();
  await expect(page.locator("#resOut")).toContainText("Successful payment with a saved card");
  await expect(page.locator("#resTags")).toContainText("Document language: English");
  await expect(page.getByRole("button", { name: "Start testing with this plan" })).toBeVisible();
  await page.getByRole("button", { name: "Start testing with this plan" }).click();
  await expect(page.getByText("Set up this test run")).toBeVisible();
  await expect(page.getByText("Records stay in this browser and are not shared with a team.")).toBeVisible();
  await page.locator("#runPlatform").locator("xpath=..").locator("[data-forge-select-toggle]").click();
  await expect(page.locator("#runPlatform").locator("xpath=..").locator("[role=listbox]")).toHaveCSS("background-color", "rgb(22, 20, 18)");
  await page.locator("#runPlatform").locator("xpath=..").locator('[data-forge-option="Android"]').click();
  await expect(page.locator("#runPlatform")).toHaveValue("Android");
  await page.locator("#runVersion").fill("v3.9");
  await page.locator("#runEnvironment").fill("Sample environment");
  await page.locator("[data-create-run]").click();
  await expect(page.locator("#executionPanel")).toContainText("SAMPLE PROJECT");
  expect(generateRequests).toEqual([]);
});

test("test execution, blocker and linked bug survive reload; bug closure needs explicit retest", async ({ page }) => {
  await signInDemo(page);
  await page.locator("#exGrid [data-work='ex-test']").click();
  await page.getByRole("button", { name: "Bu planla teste başla" }).click();
  await page.locator("#runVersion").fill("v4.2.0");
  await page.locator("#runEnvironment").fill("Staging · iPhone 15");
  await page.locator("[data-create-run]").click();
  await expect(page.locator("#executionPanel .run-case")).toHaveCount(5);

  const cases = page.locator("#executionPanel .run-case");
  await cases.nth(0).locator("[data-run-field=actual]").fill("123456789");
  await cases.nth(0).locator("[data-forge-select-toggle]").click();
  await cases.nth(0).locator('[data-forge-option="failed"]').click();
  await expect(cases.nth(0).locator("[data-run-field=status]")).toHaveValue("pending");
  await expect(page.locator("#toast")).toContainText("en az 10 karakter");
  await cases.nth(0).locator("[data-run-field=actual]").fill("Sipariş onayı açılmadı; uygulama hata verdi.");
  await cases.nth(0).locator("[data-forge-select-toggle]").click();
  await cases.nth(0).locator('[data-forge-option="failed"]').click();
  await cases.nth(0).getByRole("button", { name: "İlişkili hata kaydı aç" }).click();
  await page.locator("#bugActual").fill("Ödeme sonrası sipariş onay ekranı açılmıyor.");
  await page.locator("[data-save-bug]").click();
  await expect(page.locator("#executionPanel .bug-card")).toContainText("BUG-");
  await expect(page.locator("#releaseRisks")).toContainText("Açık yüksek / kritik hatalar");

  await cases.nth(1).locator("[data-run-field=actual]").fill("Bu test ortamında ödeme servisi kapalı.");
  await cases.nth(1).locator("[data-forge-select-toggle]").click();
  await cases.nth(1).locator('[data-forge-option="blocked"]').click();
  await cases.nth(1).locator("[data-run-field=blockedReason]").fill("Staging ödeme servisi erişilemiyor.");

  await cases.nth(2).locator("[data-run-field=actual]").fill("1234567890");
  await cases.nth(2).locator("[data-forge-select-toggle]").click();
  await cases.nth(2).locator('[data-forge-option="passed"]').click();
  await expect(cases.nth(2).locator("[data-run-field=status]")).toHaveValue("passed");

  await cases.nth(0).locator("[data-run-field=actual]").fill("Düzeltme sonrası sipariş onayı açıldı.");
  await cases.nth(0).locator("[data-forge-select-toggle]").click();
  await cases.nth(0).locator('[data-forge-option="passed"]').click();
  await expect(page.locator("#executionPanel .bug-card")).toContainText("Açık");
  await page.reload();
  await signInDemo(page);
  await page.locator("[data-run-view]").filter({ hasText: "v4.2.0" }).click();
  await expect(page.locator("#executionPanel .run-case").nth(0)).toContainText("Geçti");
  await expect(page.locator("#executionPanel .run-case").nth(1)).toContainText("Staging ödeme servisi erişilemiyor.");
  await expect(page.locator("#executionPanel .bug-card")).toContainText("Açık");

  const bug = page.locator("#executionPanel .bug-card");
  await bug.locator("[data-bug-field=retestResult]").selectOption("passed");
  await bug.locator("[data-bug-field=retestNote]").fill("v4.2.0 sürümünde düzeltme doğrulandı.");
  await bug.getByRole("button", { name: "Doğrulamayı onayla ve hatayı kapat" }).click();
  await expect(page.locator("#executionPanel .bug-card")).toContainText("Kapalı");
});

test("panel navigation and execution cards fit 760px and 390px widths", async ({ page, isMobile }) => {
  test.skip(isMobile, "The 390px viewport is verified by the mobile project.");
  await page.setViewportSize({ width: 760, height: 900 });
  await signInDemo(page);
  await expect(page.locator(".tabs [data-tab=tpl]")).toBeVisible();
  await expect(page.locator(".tabs [data-tab=tpl]")).toHaveText("Şablonlar");
  let overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await page.setViewportSize({ width: 390, height: 844 });
  overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await page.locator("#exGrid [data-work='ex-test']").click();
  await expect(page.locator("#resActions")).toBeVisible();
  overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
