import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';

const csp=readFileSync('public/_headers','utf8').split('\n').find(line=>line.includes('Content-Security-Policy:'))!.split('Content-Security-Policy:')[1].trim().replace('__INLINE_SCRIPT_HASHES__',"'nonce-test'");

test('the real three-scene video plays under production CSP and respects pause',async({page})=>{
 const violations:string[]=[];
 page.on('console',message=>{if(/Content Security Policy|violates.*directive/i.test(message.text()))violations.push(message.text());});
 await page.route('**/en/',async route=>{
  const response=await route.fetch();
  await route.fulfill({response,headers:{...response.headers(),'content-security-policy':csp},body:(await response.text()).replace(/<script\b/g,'<script nonce="test"')});
 });
 await page.goto('/en/');
 const hero=page.locator('[data-nature-hero]');
 const video=hero.locator('video');
 await expect(hero.locator('img')).toHaveAttribute('src',/homepage-arashiyama/);
 await expect(hero).toHaveClass(/has-video/);
 await expect(video).toHaveCSS('opacity','1');
 await expect(video).toHaveAttribute('src','/media/asia-hero-desktop.mp4');
 await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(.1);
 const media=await video.evaluate((v:HTMLVideoElement)=>({duration:v.duration,muted:v.muted,loop:v.loop,inline:v.playsInline,width:v.videoWidth}));
 expect(media.duration).toBeGreaterThan(22);expect(media.duration).toBeLessThan(23);
 expect(media).toMatchObject({muted:true,loop:true,inline:true,width:1280});
 await page.getByRole('button',{name:'Pause hero video',exact:true}).click();
 await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.paused)).toBe(true);
 await page.locator('#destinations').scrollIntoViewIfNeeded();
 await page.locator('.header').scrollIntoViewIfNeeded();
 await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.paused)).toBe(true);
 await page.getByRole('button',{name:'Play hero video',exact:true}).click();
 await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.paused)).toBe(false);
 await page.locator('footer').scrollIntoViewIfNeeded();
 await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.paused)).toBe(true);
 await page.locator('.header').scrollIntoViewIfNeeded();
 await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.paused)).toBe(false);
 // Exercise the actual encoded final transition and HTML video loop.
 await video.evaluate((v:HTMLVideoElement)=>{v.currentTime=v.duration-.2;});
 await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeLessThan(2);
 await page.emulateMedia({reducedMotion:'reduce'});
 await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.paused)).toBe(true);
 await expect(hero).not.toHaveClass(/has-video/);
 expect(violations).toEqual([]);
});

for(const mode of ['reduced-motion','save-data'] as const)test(`${mode} keeps the original photo without automatically downloading video`,async({page})=>{
 if(mode==='reduced-motion')await page.emulateMedia({reducedMotion:'reduce'});
 else await page.addInitScript(()=>Object.defineProperty(navigator,'connection',{value:{saveData:true}}));
 const downloads:string[]=[];
 page.on('request',request=>{if(request.url().includes('/media/asia-hero-'))downloads.push(request.url());});
 await page.goto('/en/');
 const hero=page.locator('[data-nature-hero]');
 await expect(hero.locator('img')).toBeVisible();
 await expect(page.getByRole('button',{name:'Play hero video',exact:true})).toBeVisible();
 expect(downloads).toEqual([]);
 await expect(hero.locator('video')).not.toHaveAttribute('src');
 await page.getByRole('button',{name:'Play hero video',exact:true}).click();
 await expect(hero).toHaveClass(/has-video/);
 expect(downloads.length).toBeGreaterThan(0);
});

test('mobile downloads only its smaller crop and plays inline',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const downloads:string[]=[];
 page.on('request',request=>{if(request.url().includes('/media/asia-hero-'))downloads.push(request.url());});
 await page.goto('/en/');
 await expect(page.locator('[data-nature-hero]')).toHaveClass(/has-video/);
 expect(downloads.every(url=>url.endsWith('asia-hero-mobile.mp4'))).toBe(true);
 await expect.poll(()=>page.locator('video').evaluate((v:HTMLVideoElement)=>v.videoWidth)).toBe(576);
});

test('a failed video retains the original photo and the enquiry link',async({page})=>{
 await page.route('**/media/asia-hero-*.mp4',route=>route.abort());
 await page.goto('/en/');
 await expect(page.locator('[data-nature-hero] img')).toBeVisible();
 await expect(page.locator('[data-nature-hero]')).not.toHaveClass(/has-video/);
 await expect(page.getByRole('button',{name:'Play hero video',exact:true})).toBeVisible();
 await expect(page.locator('.header a[href="/en/contact"]')).toBeVisible();
});

test('every pilot locale fits on mobile with localized video controls',async({page})=>{
 test.setTimeout(60000);
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.setViewportSize({width:390,height:844});
 for(const locale of ['en','da','sv','no','es','it','fr','nl','hu']){
  for(const path of ['','thailand','thailand/tours/northern-table-southern-sea']){
   await page.goto(`/${locale}/${path}`);
   await expect(page.locator('h1')).toBeVisible();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${locale}/${path}`).toBe(true);
   const header=await page.locator('.header').boundingBox();
   const heading=await page.locator('h1').boundingBox();
   expect(heading!.y).toBeGreaterThanOrEqual(header!.height);
   if(!path)await expect(page.locator('[data-hero-toggle]')).toBeVisible();
  }
 }
});
