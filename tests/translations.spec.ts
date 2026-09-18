import {test,expect} from '@playwright/test';
import fs from 'node:fs';
const locales=['en','es','it','fr','nl','hu','sv','da','no'];
const generated=JSON.parse(fs.readFileSync('src/content/translations.generated.json','utf8'));
const catalogs=Object.fromEntries(locales.filter(l=>l!=='en').map(l=>[l,{...generated[l],...JSON.parse(fs.readFileSync(`src/content/editorial/${l}.json`,'utf8'))}]));
const tr=(locale:string,source:string)=>catalogs[locale][source]??source;
import {tours} from '../src/content/data';
import {tourOverviews} from '../src/content/tourOverviews';
for(const locale of locales.filter(l=>l!=='en')){
 test(`${locale}: every tour retains its complete translated overview`,async({page})=>{
  for(const tour of tours){
   await page.goto(`/${locale}/${tour.country}/tours/${tour.slug}/`,{waitUntil:'domcontentloaded'});
   const overview=tourOverviews[tour.slug];
   await expect(page.locator('#overview')).toContainText(tr(locale,overview.summary));
   await expect(page.locator('#overview')).toContainText(tr(locale,overview.reason));
  }
 });
 test(`${locale}: filters and gallery stay translated after hydration`,async({page})=>{
  await page.goto(`/${locale}/tours/`);
  await page.locator('astro-island[component-export="default"]').first().evaluate(async node=>{while(node.hasAttribute('ssr'))await new Promise(resolve=>setTimeout(resolve,25));});
  await page.locator('.filters select').first().selectOption('thailand');
  await expect(page.locator('.tour')).toHaveCount(4);
  await expect(page.locator('.filters')).toContainText(tr(locale,'Travel style'));
  await expect(page.locator('.tour').first()).toContainText(tr(locale,'View journey'));
  await page.goto(`/${locale}/thailand/`);
  await page.locator('.gallery button').first().click();
  await page.getByRole('button',{name:tr(locale,'Next photograph'),exact:true}).click();
  await page.getByRole('button',{name:tr(locale,'Close gallery'),exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
 });
 test(`${locale}: enquiry review uses translated labels and selected interests`,async({page})=>{
  await page.goto(`/${locale}/contact/`);
  for(const[name,value]of Object.entries({firstName:'Test',lastName:'Traveller',email:'test@example.com',phone:'+4512345678',residence:'Denmark'}))await page.locator(`[name="${name}"]`).fill(value);
  await page.locator('[name="preferredContact"]').selectOption('email');
  await page.locator('[data-next]').first().click();
  await page.locator('[name="departureDate"]').fill('2027-05-01');
  for(const name of ['dateFlexibility','duration','flightsStatus','budgetCurrency','accommodation','pace'])await page.locator(`[name="${name}"]`).selectOption({index:1});
  await page.locator('[name="departureAirport"]').fill('Copenhagen');
  await page.locator('[name="budgetPerPerson"]').fill('9000');
  const interest=page.locator('input[name="interests"]').first();await interest.check();
  const interestText=(await interest.locator('..').textContent())!.trim();
  await page.locator('[data-next]').last().click();
  await expect(page.locator('[data-review]')).toBeVisible();
  await expect(page.locator('[data-review]')).toContainText(tr(locale,'Your details'));
  await expect(page.locator('[data-review]')).toContainText(tr(locale,'Not specified'));
  await expect(page.locator('[data-review]')).toContainText(interestText);
 });
}
