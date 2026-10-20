import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';

const csp=readFileSync('public/_headers','utf8').split('\n').find(line=>line.includes('Content-Security-Policy:'))!.split('Content-Security-Policy:')[1].trim().replace('__INLINE_SCRIPT_HASHES__',"'nonce-test'");

test('hero plays real local footage under production CSP and respects pause',async({page})=>{
 const violations:string[]=[];
 page.on('console',message=>{if(/Content Security Policy|violates.*directive/i.test(message.text()))violations.push(message.text());});
 await page.route('**/en/',async route=>{
  const response=await route.fetch();
  await route.fulfill({response,headers:{...response.headers(),'content-security-policy':csp},body:(await response.text()).replace(/<script\b/g,'<script nonce="test"')});
 });
 await page.goto('/en/');
 const video=page.locator('[data-hero-video]');
 await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.currentTime),{timeout:15000}).toBeGreaterThan(.1);
 await expect(video).toHaveAttribute('src','/media/hero-krabi-1280.mp4');
 await expect(page.locator('iframe')).toHaveCount(0);
 await page.getByRole('button',{name:'Pause background video',exact:true}).click();
 await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.paused)).toBe(true);
 await page.locator('#destinations').scrollIntoViewIfNeeded();
 await page.locator('.header').scrollIntoViewIfNeeded();
 await expect(video).toHaveJSProperty('paused',true);
 await page.getByRole('button',{name:'Play background video',exact:true}).click();
 await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.paused)).toBe(false);
 await page.emulateMedia({reducedMotion:'reduce'});
 await expect(video).toHaveJSProperty('paused',true);
 await expect(page.locator('[data-hero-toggle]')).toBeHidden();
 await expect(page.locator('[data-nature-hero]')).not.toHaveClass(/video-ready/);
 expect(violations).toEqual([]);
});

for(const mode of ['reduced-motion','save-data'] as const)test(`${mode} keeps the photo without downloading video`,async({page})=>{
 if(mode==='reduced-motion')await page.emulateMedia({reducedMotion:'reduce'});
 else await page.addInitScript(()=>Object.defineProperty(navigator,'connection',{value:{saveData:true,effectiveType:'4g'}}));
 const media:string[]=[];
 page.on('request',request=>{if(request.url().includes('/media/hero-'))media.push(request.url());});
 await page.goto('/en/');
 await expect(page.locator('[data-nature-hero] img')).toBeVisible();
 // Observe beyond the deliberate progressive-video delay.
 await page.waitForTimeout(2200);
 expect(media).toEqual([]);
 await expect(page.locator('[data-hero-video]')).not.toHaveAttribute('src',/./);
 if(mode==='save-data'){
  await page.getByRole('button',{name:'Play background video',exact:true}).click();
  await expect.poll(()=>page.locator('[data-hero-video]').evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(.1);
 }
});

test('a failed video leaves a useful photo and readable copy',async({page})=>{
 await page.route('**/media/hero-*.mp4',route=>route.abort());
 await page.goto('/en/');
 await expect(page.locator('[data-hero-video]')).toHaveAttribute('src',/mp4/,{timeout:15000});
 await expect(page.locator('[data-hero-toggle]')).toBeHidden();
 await expect(page.locator('[data-nature-hero] img')).toBeVisible();
 await expect(page.locator('h1')).toBeVisible();
});

test('mobile uses the small video and every pilot locale fits without overflow',async({page})=>{
 test.setTimeout(60000);
 await page.setViewportSize({width:390,height:844});
 await page.goto('/en/');
 await expect(page.locator('[data-hero-video]')).toHaveAttribute('src','/media/hero-krabi-720.mp4',{timeout:15000});
 for(const locale of ['en','da','sv','no','es','it','fr','nl','hu']){
  for(const path of ['','thailand','thailand/tours/northern-table-southern-sea']){
   await page.goto(`/${locale}/${path}`);
   await expect(page.locator('h1')).toBeVisible();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${locale}/${path}`).toBe(true);
   const header=await page.locator('.header').boundingBox();
   const heading=await page.locator('h1').boundingBox();
   expect(heading!.y).toBeGreaterThanOrEqual(header!.height);
  }
 }
});
