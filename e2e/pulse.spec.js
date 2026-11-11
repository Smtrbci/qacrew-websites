import { expect, test } from '@playwright/test';
test('Pulse remains an explicitly future roadmap after examples and before plans', async ({page}) => {
  await page.goto('/forge/');
  const positions=await page.evaluate(()=>['panel','pulse','yayin'].map(id=>document.getElementById(id).getBoundingClientRect().top));
  expect(positions[0]).toBeLessThan(positions[1]);expect(positions[1]).toBeLessThan(positions[2]);
  await expect(page.locator('#pulse')).toContainText('Yakında');
  await expect(page.locator('#pulse .pulse-status .tr')).toHaveText(['Geliştiriliyor','Planlanıyor','Araştırma']);
  await expect(page.locator('#pulse form input[type=email]')).toHaveAttribute('required','');
});
test('Pulse navigation works without page overflow on both viewport sizes',async({page})=>{
  await page.goto('/forge/');await page.locator('a.nav[href="#pulse"]').click();await expect(page).toHaveURL(/#pulse$/);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
});
