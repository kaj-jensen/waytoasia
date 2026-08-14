import {test,expect} from '@playwright/test';
const locales=['en','es','it','fr','nl','hu','sv','da','no'];
for(const locale of locales)test(`${locale} homepage`,async({page})=>{const response=await page.goto(`/${locale}/`);expect(response?.ok()).toBeTruthy();await expect(page.locator('h1')).toBeVisible();await expect(page.locator('html')).toHaveAttribute('lang',locale)});
test('country and tour routes resolve',async({page})=>{for(const path of ['/en/japan','/da/thailand','/fr/vietnam/tours','/en/japan/tours/japan-in-stillness']){const response=await page.goto(path);expect(response?.status(),path).toBe(200);await expect(page.locator('h1')).toBeVisible()}});
test('language switcher preserves route',async({page})=>{await page.goto('/en/japan');await page.locator('[data-language]').selectOption('/fr/japan');await expect(page).toHaveURL(/\/fr\/japan\/?$/)});
