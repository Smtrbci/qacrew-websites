import {expect,test} from '@playwright/test';
const pages=['/','/business/','/forge/','/game/','/travel/','/portfolio/','/asistra/','/asistra/giris/','/asistra/app/','/asistra/konusmalar/','/asistra/yeni/','/travel/partner/'];
test('all redesigned pages load without script errors, dead assets, or horizontal overflow',async({page},testInfo)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const bad=[];page.on('response',r=>{if(r.url().startsWith('http://127.0.0.1:4173') && r.status()>=400)bad.push(r.url());});
 for(const route of pages){await page.goto(route);await expect(page.locator('h1').first()).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth),route).toBeLessThanOrEqual(0);
  if(['/','/forge/','/portfolio/','/travel/partner/'].includes(route))await page.screenshot({path:testInfo.outputPath(route.replaceAll('/','_')+'.png'),fullPage:true,animations:"disabled"});
 }
 expect(errors).toEqual([]);expect(bad).toEqual([]);
});
test('theme and language survive navigation between home, products and Forge app',async({page})=>{
 await page.goto('/');await page.locator('[data-lang=en]').click();await page.locator('#qs-theme').uncheck();
 await page.goto('/business/');await expect(page.locator('#qs-lang')).toBeChecked();await expect(page.locator('#qs-theme')).not.toBeChecked();
 await page.goto('/forge/app/');await expect(page.locator('html')).toHaveAttribute('lang','en');await expect(page.locator('html')).toHaveAttribute('data-theme','light');
 await page.screenshot({path:'test-results/forge-light-login.png',fullPage:true,animations:"disabled"});
});
test('portfolio downloads point to actual PDFs and portrait is loaded',async({page,request})=>{
 await page.goto('/portfolio/');await expect(page.locator('.portfolio-photo')).toBeVisible();
 for(const lang of ['tr','en']){const link=page.locator('a[download][href$="-'+lang+'.pdf"]');await expect(link).toHaveCount(1);const response=await request.get(await link.getAttribute('href'));expect(response.status()).toBe(200);expect((await response.body()).subarray(0,4).toString()).toBe('%PDF');}
});
test('Asistra local draft validates input, saves safely, survives reload and can be deleted',async({page})=>{
 await page.goto('/asistra/yeni/');await page.locator('a[href="#uretim"]').click();await expect(page.locator('dialog')).toBeVisible();await page.locator('dialog button').click();
 await page.locator('#ad').fill('Test <business>');await page.locator('#anlat').fill('Open Tuesday. <script>bad()</script>');await page.locator('a[href="#uretim"]').click();
 await expect(page.locator('#sonuc')).toContainText('Open Tuesday. <script>bad()</script>');await page.locator('#sonuc button').click();
 await expect(page).toHaveURL(/\/asistra\/app\//);await page.reload();await expect(page.locator('#localDrafts')).toContainText('Test <business>');await page.locator('#localDrafts button').click();await expect(page.locator('#localDrafts article')).toHaveCount(0);
});
test('Travel local plan is saved and searchable without claiming a real booking',async({page})=>{
 await page.goto('/travel/partner/');await page.locator('[name=title]').fill('Istanbul walk');await page.locator('[name=stops]').fill('Hotel\nMuseum');await page.locator('.studio-demo-form button').click();await page.reload();
 await expect(page.locator('#travelDrafts')).toContainText('Istanbul walk');await page.locator('input[type=search]').fill('no match');await expect(page.locator('#travelDrafts article')).toBeHidden();await page.locator('input[type=search]').fill('Istanbul');await expect(page.locator('#travelDrafts article')).toBeVisible();
});
test('game sample responds to both correct and incorrect answers',async({page})=>{
 await page.goto('/game/');await page.locator('.opt').first().click();await expect(page.locator('#puzzleFeedback')).toContainText('Tekrar dene');await page.locator('.opt').nth(1).click();await expect(page.locator('#puzzleFeedback')).toContainText('Doğru');
});
