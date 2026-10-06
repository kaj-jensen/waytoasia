import {test,expect} from '@playwright/test';

const countries=['china','south-korea','thailand','vietnam','indonesia','japan'];

test('journal country navigation and six new illustrated stories work',async({page})=>{
 await page.goto('/en/inspiration/');
 for(const country of countries){
  const group=page.locator(`.country-group#${country}`);
  await expect(group).toBeVisible();
  const story=group.locator('.story').first();
  await story.scrollIntoViewIfNeeded();
  await expect(story.locator('img')).toHaveAttribute('src',new RegExp(`^/images/journal/responsive/${country}-[0-9]+\\.webp$`));
  await expect(story.locator('img')).toHaveAttribute('srcset',new RegExp(`${country}-480\\.webp 480w`));
  expect(await story.locator('img').evaluate((image:HTMLImageElement)=>image.complete&&image.naturalWidth>0)).toBeTruthy();
  const href=await story.getAttribute('href');
  await page.goto(href!);
  await expect(page.locator('.prose p')).toHaveCount(6);
  await expect(page.locator('article header h1')).toBeVisible();
  if(country==='japan'){
   await expect(page.locator('.prose .btn')).toHaveAttribute('href','/en/trip-planner');
   await expect(page.locator('article aside a')).toHaveAttribute('href','/en/inspiration#japan');
  }
  await page.goto('/en/inspiration/');
 }
});

test('journal and article fit a mobile viewport',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 for(const path of ['/en/inspiration/','/en/inspiration/kyoto-a-city-best-met-on-foot']){
  await page.goto(path);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
 }
});
