import {test,expect} from '@playwright/test';
import {tours} from '../src/content/data';
import {tourPresentation} from '../src/lib/tourPresentation';
import {tourPhotos} from '../src/content/tourPhotos';
import {tourOverviews} from '../src/content/tourOverviews';
const style={version:8,sources:{},layers:[{id:'background',type:'background',paint:{'background-color':'#ccdfdc'}}]};
test('every route has distinct copy, valid focus areas and complete day coverage',()=>{
 expect(new Set(Object.values(tourOverviews).map(t=>t.summary)).size).toBe(20);
 for(const tour of tours){const model=tourPresentation(tour);expect(tourOverviews[tour.slug]).toBeDefined();expect(model.stops.every(s=>s.day>0)).toBeTruthy();expect(model.entries.every(e=>e.points.length&&e.points.every(p=>p.length===2&&p.every(Number.isFinite)))).toBeTruthy();expect(Number(model.entries[0].range.split('–')[0])).toBe(1);expect(Number(model.entries.at(-1)!.range.split('–').at(-1))).toBe(tour.duration);}
});
for(const country of ['china','south-korea','thailand','vietnam','indonesia'])test(`${country} tours share the approved photo layout and working map`,async({page})=>{
 await page.route('https://tiles.openfreemap.org/styles/liberty',r=>r.fulfill({json:style}));
 for(const tour of tours.filter(t=>t.country===country)){
  await page.setViewportSize({width:1440,height:1000});await page.goto(`/en/${country}/tours/${tour.slug}/`);await page.evaluate(()=>document.fonts.ready);
  await expect(page.locator('h1')).toHaveText(tour.name);if(country==='south-korea'){await expect(page.locator('.booking-card')).toContainText('Illustrative price');await expect(page.locator('.booking-card')).toContainText('sample itinerary');}
  const image=await page.locator('.media-main').boundingBox(),card=await page.locator('.booking-card').boundingBox();expect(Math.abs(image!.y-card!.y)).toBeLessThan(1);expect(Math.abs(image!.y+image!.height-card!.y-card!.height)).toBeLessThan(1);
  await expect(page.locator('video,iframe')).toHaveCount(0);
  await expect(page.locator('.tour-section')).toHaveCount(3);
  await expect(page.locator('#overview')).toContainText(tourOverviews[tour.slug].summary);
  await page.locator('.section-links a[href="#itinerary"]').click();await expect(page.locator('.map-card')).toHaveAttribute('data-ready','true');
  await page.locator('.day').last().locator('summary').click();await expect(page.locator('.day[open]')).toHaveCount(1);await expect(page.locator('[data-map-title]')).toContainText(tour.dailyItinerary?`Day ${tour.duration}`:`Days ${tour.itinerary.at(-1)!.day}`);
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 }
});
test('photo gallery works with keyboard and contains no video requests',async({page})=>{
 const requests:string[]=[];page.on('request',r=>{if(/youtube|ytimg|googlevideo|vimeo/.test(r.url()))requests.push(r.url());});
 await page.goto('/en/south-korea/tours/seoul-and-ancient-kingdoms/');await page.locator('.media-thumbnails').first().getByRole('button').nth(1).click();await expect(page.locator('.media-caption')).toContainText('2 / 6');await page.getByRole('button',{name:'View gallery',exact:true}).click();await page.keyboard.press('ArrowRight');await expect(page.locator('.media-dialog-caption')).toContainText('3 / 6');await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).not.toBeVisible();expect(requests).toEqual([]);
});
test('map failure retains the route and fullscreen closes accessibly',async({page})=>{
 await page.route('https://tiles.openfreemap.org/**',r=>r.abort());await page.goto('/en/south-korea/tours/seoul-and-ancient-kingdoms/?day=12#itinerary');await expect(page.locator('[data-map-title]')).toHaveText('Day 12 · Busan');await expect(page.locator('.map-fallback')).toBeVisible();await page.locator('[data-map-expand]').click();await expect(page.locator('[data-map-expand]')).toHaveAttribute('aria-label','Close enlarged map');await page.locator('[data-map-expand]').click();await expect(page.locator('[data-map-expand]')).toHaveAttribute('aria-label','Enlarge map');
});
test('all 180 localized tour pages use the shared template without video embeds',async({request})=>{
 for(const locale of ['en','es','it','fr','nl','hu','sv','da','no'])for(const tour of tours){const response=await request.get(`/${locale}/${tour.country}/tours/${tour.slug}/`);expect(response.ok()).toBeTruthy();const html=await response.text();expect(html).toContain('class="tour-product"');expect(html).not.toMatch(/<(?:video|iframe)\b/);expect(html).not.toContain('youtube');expect(html).toContain(`/${locale}/contact?tour=${tour.slug}`);}
});
test('Swedish map and gallery controls remain Swedish after interaction',async({page})=>{
 await page.route('https://tiles.openfreemap.org/styles/liberty',r=>r.fulfill({json:style}));await page.goto('/sv/thailand/tours/kingdoms-of-siam/');await page.getByRole('button',{name:'Visa bildgalleri',exact:true}).click();await page.getByRole('button',{name:'Nästa bild',exact:true}).last().click();await page.getByRole('button',{name:'Stäng bildgalleriet',exact:true}).click();await page.locator('a[href="#itinerary"]').click();await page.locator('.day').last().locator('summary').click();await expect(page.locator('[data-map-title]')).toContainText('Dagar 07–10');await expect(page.locator('[data-map-expand]')).toHaveAttribute('aria-label','Förstora kartan');await page.locator('[data-map-overview]').click();await expect(page.locator('[data-map-title]')).toHaveText('Hela resan');
});

test('tour photographs are exclusive to each tour and match its lead image',()=>{
 const owners=new Map<string,string>();
 for(const tour of tours){const images=tourPhotos[tour.slug];expect(images).toHaveLength(6);expect(tour.image).toBe(images[0].src);for(const image of images){const asset=new URL(image.src).pathname;expect(owners.has(asset),`${asset} shared with ${owners.get(asset)}`).toBe(false);owners.set(asset,tour.slug);expect(image.source).toMatch(/^https:\/\/unsplash.com\//);}}
 expect(owners.size).toBe(120);
});

test('South Korea replaces Japan throughout all localized country pages',async({request})=>{
 for(const locale of ['en','es','it','fr','nl','hu','sv','da','no']){
  const response=await request.get(`/${locale}/south-korea/`);expect(response.ok()).toBeTruthy();const html=await response.text();
  expect(html).toContain('seoul-and-ancient-kingdoms');expect(html).toContain('korea-at-the-table');expect(html).toContain('mountains-and-east-sea');expect(html).toContain('seoul-and-jeju-slowly');
  expect(html).not.toMatch(/\/(?:japan)\b|japan-in-stillness|hokkaido-wild-summer|kyushu-fire-and-water|sacred-kansai-trails/);
 }
});
test('Korean daily map includes transfers and opens the correct arrival day',async({page})=>{
 await page.route('https://tiles.openfreemap.org/styles/liberty',r=>r.fulfill({json:style}));
 await page.goto('/en/south-korea/tours/seoul-and-ancient-kingdoms/#itinerary');
 await expect(page.locator('.map-card')).toHaveAttribute('data-ready','true');
 await page.locator('.itinerary-marker').nth(1).click();await expect(page.locator('[data-map-title]')).toHaveText('Day 5 · Andong');
 const model=tourPresentation(tours.find(t=>t.slug==='seoul-and-ancient-kingdoms')!);expect(model.entries[4].points).toHaveLength(2);expect(model.stops.map(stop=>stop.day)).toEqual([1,5,7,10]);
});
