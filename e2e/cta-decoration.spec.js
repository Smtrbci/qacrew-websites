import {expect,test} from '@playwright/test';
test('Forge primary CTA opens the preserved app and decorations remain noninteractive',async({page})=>{
 await page.goto('/forge/');
 await expect(page.locator('h1')).toContainText('Dağınık notlardan');
 const cta=page.getByRole('link',{name:'Demo panelini aç',exact:true}).first();
 await cta.click();await expect(page).toHaveURL(/\/forge\/app\//);await expect(page.locator('#demoLoginForm')).toBeVisible();
});
