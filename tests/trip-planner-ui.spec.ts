import {expect,test} from '@playwright/test';

const suggestion={id:'test-suggestion',generatedAt:'2026-09-24T00:00:00.000Z',title:'Thailand at a thoughtful pace',summary:'A food-led route with time for Bangkok, the north and a quiet coastal finish.',recommendedDuration:'12 days',route:[{days:'Days 1–4',place:'Bangkok',focus:'River neighbourhoods, markets and an introduction to Thai cooking.'},{days:'Days 5–8',place:'Chiang Mai',focus:'Northern food traditions, craft and a slower day outside the city.'},{days:'Days 9–12',place:'Southern coast',focus:'A season-matched island stay with room to unwind.'}],fitReasons:['Balances food and local culture.','Keeps the requested pace comfortable.'],practicalNotes:['The right coast depends on the travel month.','Entry requirements must be checked before travel.'],closing:'A Way to Asia travel designer can refine the stays and exact logistics.',availability:'not-connected',pricing:'illustrative-only',matchedJourneys:[{slug:'northern-table-southern-sea',name:'Northern Table, Southern Sea',country:'thailand',duration:11,href:'/en/thailand/tours/northern-table-southern-sea',prices:{USD:5400,EUR:4950,DKK:36900,SEK:55300,NOK:57600,HUF:1940000}}]};

test('trip planner creates a clearly unbooked itinerary suggestion',async({page})=>{
  await page.route('**/api/trip-suggestion',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({suggestion,requestId:'test-request'})}));
  await page.route('**/api/supplier-availability',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({provider:'HBX / Hotelbeds',environment:'evaluation-sandbox',bookable:false,gateway:{id:'bangkok',name:'Bangkok'},checkedAt:'2026-09-24T00:00:00.000Z',sections:[{vertical:'accommodation',status:'available',offers:[{title:'Bangkok Test Hotel',summary:'River room · Breakfast',total:{amountMinor:50000,currency:'EUR'},cancellation:[],attributes:{},recheckRequired:true}]},{vertical:'activity',status:'none',offers:[],message:'No sandbox results were returned.'},{vertical:'transfer',status:'skipped',offers:[],message:'Transfer search needs an HBX hotel result from the same check.'}]})}));
  await page.goto('/en/trip-planner');
  await expect(page.getByRole('heading',{name:'Begin with what matters to you.'})).toBeVisible();
  await page.getByLabel('Thailand').check();
  await page.getByLabel('Food & local culture').check();
  await page.getByRole('button',{name:/Create my trip idea/}).click();
  await expect(page.getByRole('heading',{name:suggestion.title})).toBeVisible();
  await expect(page.getByText('Ideas only · No live availability or confirmed prices yet')).toBeVisible();
  await expect(page.getByRole('link',{name:/Northern Table, Southern Sea/})).toHaveAttribute('href','/en/thailand/tours/northern-table-southern-sea');
  await expect(page.getByRole('heading',{name:'Check the HBX sandbox'})).toBeVisible();
  await page.getByRole('button',{name:'Check sandbox availability'}).click();
  await expect(page.getByText('Bangkok Test Hotel')).toBeVisible();
  await expect(page.getByText('Evaluation data only · Prices require recheck · No booking or payment')).toBeVisible();
});

test('trip planner remains usable at a mobile width',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/da/trip-planner');
  await expect(page.getByRole('heading',{name:'Begynd med det, der betyder noget for dig.'})).toBeVisible();
  await expect(page.locator('.menu')).toBeVisible();
  await expect(page.locator('.menu')).not.toHaveAccessibleName('');
  await expect(page.getByRole('button',{name:/Skab mit rejseforslag/})).toBeVisible();
});

test('agent plans beyond the catalogue and revises the complete journey',async({page})=>{
  const independent={...suggestion,title:'Japan and Taiwan beyond the catalogue',summary:'A tailor-made route that is not limited to published Way to Asia journeys.',route:[{days:'Days 1–6',place:'Japan',focus:'Tokyo neighbourhoods, Kanazawa craft and mountain landscapes.'},{days:'Days 7–12',place:'Taiwan',focus:'Taipei food culture and the quieter east coast.'}],matchedJourneys:[]};
  const revised={...independent,title:'Japan and Taiwan with fewer cities',route:[{days:'Days 1–5',place:'Japanese Alps',focus:'Village walks, craft and two unhurried bases.'},{days:'Days 6–12',place:'Eastern Taiwan',focus:'Rail travel, coast and national-park landscapes.'}]};
  let receivedDestination='';
  let receivedRefinement='';
  await page.route('**/api/trip-suggestion',async route=>{
    const body=route.request().postDataJSON() as {destinationIdeas?:string;refinement?:string};
    receivedDestination=body.destinationIdeas??receivedDestination;
    receivedRefinement=body.refinement??receivedRefinement;
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({suggestion:body.refinement?revised:independent,requestId:'agent-test'})});
  });
  await page.goto('/en/trip-planner');
  await page.getByLabel('Destinations or regions — anywhere in Asia').fill('Japan and Taiwan');
  await page.getByRole('button',{name:/Create my trip idea/}).click();
  await expect(page.getByRole('heading',{name:independent.title})).toBeVisible();
  await expect(page.getByText('Tailor-made beyond the catalogue')).toBeVisible();
  await page.getByPlaceholder(/Replace the final city/).fill('Use fewer cities and add more nature.');
  await page.getByRole('button',{name:/Revise my journey/}).click();
  await expect(page.getByRole('heading',{name:revised.title})).toBeVisible();
  await expect(page.getByPlaceholder(/Replace the final city/)).toHaveValue('');
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(receivedDestination).toBe('Japan and Taiwan');
  expect(receivedRefinement).toBe('Use fewer cities and add more nature.');
});
