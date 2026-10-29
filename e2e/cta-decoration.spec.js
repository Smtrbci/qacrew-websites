import { expect, test } from "@playwright/test";

test("closing CTA uses a text-free decorative pattern instead of test-status labels", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/forge/");

  const pattern = page.locator(".cta-pattern");
  await expect(pattern).toBeVisible();
  await expect(pattern.locator("svg")).toBeVisible();
  expect((await pattern.textContent())?.trim()).toBe("");
  await expect(pattern.locator("svg text")).toHaveCount(0);
  await expect(page.locator(".cta-ids")).toHaveCount(0);
  await expect(page.locator(".cta-box h2")).toBeVisible();
});

test("decorative pattern does not create horizontal overflow at 390px", async ({ page, isMobile }) => {
  test.skip(!isMobile, "This is the 390px mobile layout check.");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/forge/#basla");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
