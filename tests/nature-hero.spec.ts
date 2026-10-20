import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';

const csp=readFileSync('public/_headers','utf8').split('\n').find(line=>line.includes('Content-Security-Policy:'))!.split('Content-Security-Policy:')[1].trim().replace('__INLINE_SCRIPT_HASHES__',"'nonce-test'");

test('the original photograph moves under production CSP and respects pause',async({page})=>{
 const violations:string[]=[];
 page.on('console',message=>{if(/Content Security Policy|violates.*directive/i.test(message.text()))violations.push(message.text());});
 await page.route('**/en/',async route=>{
  const response=await route.fetch();
  await route.fulfill({response,headers:{...response.headers(),'content-security-policy':csp},body:(await response.text()).replace(/<script\b/g,'<script nonce="test"')});
 });
 await page.goto('/en/');
 const image=page.locator('[data-nature-hero] img');
 await expect(image).toHaveAttribute('src',/homepage-arashiyama/);
 await expect(page.locator('video,iframe')).toHaveCount(0);
 await expect(image).toHaveCSS('animation-play-state','running');
 const initial=await image.evaluate(e=>getComputedStyle(e).transform);
 await expect.poll(()=>image.evaluate(e=>getComputedStyle(e).transform)).not.toBe(initial);
 await page.getByRole('button',{name:'Pause image motion',exact:true}).click();
 await expect(image).toHaveCSS('animation-play-state','paused');
 await page.locator('#destinations').scrollIntoViewIfNeeded();
 await page.locator('.header').scrollIntoViewIfNeeded();
 await expect(image).toHaveCSS('animation-play-state','paused');
 await page.getByRole('button',{name:'Start image motion',exact:true}).click();
 await expect(image).toHaveCSS('animation-play-state','running');
 await page.emulateMedia({reducedMotion:'reduce'});
 await expect(image).toHaveCSS('animation-name','none');
 await expect(page.locator('[data-hero-toggle]')).toBeHidden();
 expect(violations).toEqual([]);
});

for(const mode of ['reduced-motion','save-data'] as const)test(`${mode} retains a still original photo without video downloads`,async({page})=>{
 if(mode==='reduced-motion')await page.emulateMedia({reducedMotion:'reduce'});
 else await page.addInitScript(()=>Object.defineProperty(navigator,'connection',{value:{saveData:true}}));
 const media:string[]=[];
 page.on('request',request=>{if(request.url().includes('/media/hero-'))media.push(request.url());});
 await page.goto('/en/');
 const image=page.locator('[data-nature-hero] img');
 await expect(image).toBeVisible();
 await expect(page.locator('[data-nature-hero]')).not.toHaveClass(/is-playing/);
 if(mode==='reduced-motion')await expect(image).toHaveCSS('animation-name','none');
 else {
  await expect(image).toHaveCSS('animation-play-state','paused');
  await page.getByRole('button',{name:'Start image motion',exact:true}).click();
  await expect(image).toHaveCSS('animation-play-state','running');
 }
 expect(media).toEqual([]);
});

test('every pilot locale fits on mobile with the original photograph',async({page})=>{
 test.setTimeout(60000);
 await page.setViewportSize({width:390,height:844});
 await page.goto('/en/');
 await expect(page.locator('[data-nature-hero] img')).toHaveAttribute('src',/homepage-arashiyama/);
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
