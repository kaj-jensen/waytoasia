import {expect,test} from '@playwright/test';

const suggestion={id:'test-suggestion',generatedAt:'2026-09-24T00:00:00.000Z',title:'Thailand at a thoughtful pace',summary:'A food-led route with time for Bangkok, the north and a quiet coastal finish.',recommendedDuration:'12 days',route:[{days:'Days 1–4',place:'Bangkok',focus:'River neighbourhoods, markets and an introduction to Thai cooking.'},{days:'Days 5–8',place:'Chiang Mai',focus:'Northern food traditions, craft and a slower day outside the city.'},{days:'Days 9–12',place:'Southern coast',focus:'A season-matched island stay with room to unwind.'}],fitReasons:['Balances food and local culture.','Keeps the requested pace comfortable.'],practicalNotes:['The right coast depends on the travel month.','Entry requirements must be checked before travel.'],closing:'A Way to Asia travel designer can refine the stays and exact logistics.',availability:'not-connected',pricing:'illustrative-only',matchedJourneys:[{slug:'northern-table-southern-sea',name:'Northern Table, Southern Sea',country:'thailand',duration:11,href:'/en/thailand/tours/northern-table-southern-sea',prices:{USD:5400,EUR:4950,DKK:36900,SEK:55300,NOK:57600,HUF:1940000}}]};

test('trip planner creates a clearly unbooked itinerary suggestion',async({page})=>{
  await page.route('**/api/trip-suggestion',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({suggestion,requestId:'test-request'})}));
  await page.goto('/en/trip-planner');
  await expect(page.getByRole('heading',{name:'Begin with what matters to you.'})).toBeVisible();
  await page.getByLabel('Thailand').check();
  await page.getByLabel('Food & local culture').check();
  await page.getByRole('button',{name:/Create my trip idea/}).click();
  await expect(page.getByRole('heading',{name:suggestion.title})).toBeVisible();
  await expect(page.getByText('Ideas only · No live availability or confirmed prices yet')).toBeVisible();
  await expect(page.getByRole('link',{name:/Northern Table, Southern Sea/})).toHaveAttribute('href','/en/thailand/tours/northern-table-southern-sea');
});

test('trip planner remains usable at a mobile width',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/da/trip-planner');
  await expect(page.getByRole('heading',{name:'Begynd med det, der betyder noget for dig.'})).toBeVisible();
  await expect(page.locator('.menu')).toBeVisible();
  await expect(page.locator('.menu')).not.toHaveAccessibleName('');
  await expect(page.getByRole('button',{name:/Skab mit rejseforslag/})).toBeVisible();
});
