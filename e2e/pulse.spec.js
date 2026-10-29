import { expect, test } from "@playwright/test";

test("Pulse section is visible after examples and before launch status", async ({ page }) => {
  await page.goto("/forge/");
  const examplesIndex = await page.locator("#ornekler").evaluate((el) => Array.from(el.parentElement.children).indexOf(el));
  const pulseIndex = await page.locator("#pulse").evaluate((el) => Array.from(el.parentElement.children).indexOf(el));
  const pricingIndex = await page.locator("#fiyatlar").evaluate((el) => Array.from(el.parentElement.children).indexOf(el));

  expect(examplesIndex).toBeLessThan(pulseIndex);
  expect(pulseIndex).toBeLessThan(pricingIndex);
  await expect(page.getByRole("heading", { name: "Siz test edin, raporu Pulse yazsın." })).toBeVisible();
  await expect(page.getByText("Örnek görünüm", { exact: true })).toBeVisible();
  await expect(page.locator("#pulse .pulse-status")).toHaveText(["Geliştiriliyor", "Planlanıyor", "Araştırma"]);
  await expect(page.locator("#pulse .pulse-preview")).toHaveCSS("display", "grid");
});

test("Pulse menu link navigates to the section on desktop and mobile", async ({ page, isMobile }) => {
  await page.goto("/forge/");
  if (isMobile) {
    await page.getByRole("button", { name: "Menüyü aç" }).click();
    await expect(page.locator("#mobileNav")).toBeVisible();
    await page.locator("#mobileNav a[href='#pulse']").click();
    await expect(page).toHaveURL(/#pulse$/);
    await expect(page.locator("#mobileNav")).toBeHidden();
  } else {
    await page.locator(".nav a[href='#pulse']").click();
    await expect(page).toHaveURL(/#pulse$/);
  }
  await expect(page.locator("#pulse")).toBeInViewport();
});

test("390px viewport has no horizontal page overflow; log scrolls inside its panel", async ({ page, isMobile }) => {
  test.skip(!isMobile, "This is the 390px mobile layout check.");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/forge/#pulse");

  const pageOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const logMetrics = await page.locator(".pulse-log").evaluate((el) => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }));
  expect(pageOverflow).toBeLessThanOrEqual(0);
  expect(logMetrics.scrollWidth).toBeGreaterThan(logMetrics.clientWidth);
});
