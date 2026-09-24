import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {tours} from '../src/content/data';
import {tourPresentation} from '../src/lib/tourPresentation';
const csp=readFileSync('public/_headers','utf8').split('\n').find(line=>line.includes('Content-Security-Policy:'))!.split('Content-Security-Policy:')[1].trim().replace('__INLINE_SCRIPT_HASHES__',"'nonce-test'");
for(const tour of tours)test(`real map under production CSP: ${tour.slug}`,async({page})=>{
 test.setTimeout(90000);
 const violations:string[]=[];const tiles:string[]=[];
 page.on('console',msg=>{if(/Content Security Policy|violates.*directive/i.test(msg.text()))violations.push(msg.text());});
 page.on('response',r=>{if(r.ok()&&/tiles.openfreemap.org.*(?:pbf|planet)/.test(r.url()))tiles.push(r.url());});
 await page.route('**/en/**',async route=>{const response=await route.fetch();const responseHeaders=response.headers();const headers={...responseHeaders,'content-security-policy':csp};if(!responseHeaders['content-type']?.includes('text/html')){await route.fulfill({response,headers});return}const body=(await response.text()).replace(/<script\b/g,'<script nonce="test"');await route.fulfill({response,headers,body});});
 await page.goto(`/en/${tour.country}/tours/${tour.slug}/#itinerary`);
 await expect(page.locator('.map-card')).toHaveAttribute('data-ready','true',{timeout:45000});
 await expect(page.locator('.map-fallback')).toBeHidden();
 expect(tiles.length,'Real vector tiles must load, not just a blank canvas').toBeGreaterThan(0);
 const model=tourPresentation(tour);
 await expect(page.locator('.itinerary-marker')).toHaveCount(model.stops.length);
 await expect(page.locator('.map-legend>span')).toHaveCount(new Set(model.legs.flatMap(l=>l.modes)).size);
 for(let i=0;i<model.entries.length;i++){
  await page.locator('[data-show-day]').nth(i).evaluate((el:HTMLButtonElement)=>el.click());
  await expect(page.locator('.map-card')).toHaveAttribute('data-active-day',String(i+1));
  await expect(page.locator('.itinerary-marker.active')).not.toHaveCount(0);
 }
 await page.locator('[data-map-overview]').click();
 await expect(page.locator('.map-card')).toHaveAttribute('data-active-day','0');
 await page.setViewportSize({width:390,height:844});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await expect.poll(async()=>page.locator('.map-card').evaluate(card=>{const box=card.querySelector('.map-stage')!.getBoundingClientRect();return [...card.querySelectorAll('.itinerary-marker')].every(marker=>{const r=marker.getBoundingClientRect();return r.left>=box.left&&r.right<=box.right&&r.top>=box.top&&r.bottom<=box.bottom;});})).toBe(true);
 await page.locator('[data-map-expand]').click();await expect(page.locator('[data-map-expand]')).toHaveAttribute('aria-label','Close enlarged map');
 await page.locator('[data-map-expand]').click();await expect(page.locator('[data-map-expand]')).toHaveAttribute('aria-label','Enlarge map');
 expect(violations).toEqual([]);
});
