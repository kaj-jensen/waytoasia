import {expect,test} from '@playwright/test';

const suggestion={id:'test-suggestion',generatedAt:'2026-09-24T00:00:00.000Z',title:'Thailand at a thoughtful pace',summary:'Here is a food-led 12-day Thailand route with four nights in Bangkok, four in the north and a quiet four-night coastal finish, moving Bangkok → Chiang Mai → the southern coast.',recommendedDuration:'12 days / 11 nights',route:[{days:'Days 1–4',place:'Thailand: Bangkok',focus:'Use one riverside base for neighbourhood markets, old-city temples and an introduction to regional Thai cooking.',highlights:['Morning at a local market','Thonburi canals and kitchens'],onwardTravel:'Fly or take the overnight train north to Chiang Mai.'},{days:'Days 5–8',place:'Thailand: Chiang Mai',focus:'Slow down for northern food traditions, craft communities and a full day outside the city.',highlights:['Northern cooking session','Lanna craft district'],onwardTravel:'Fly south, then continue by road or boat to the season-matched coast.'},{days:'Days 9–12',place:'Thailand: Southern coast',focus:'Finish with one coastal base and enough unscheduled time for weather-led island or mainland outings.',highlights:['Half-day coastal outing','Two unhurried beach days'],onwardTravel:''}],hotelStays:[{place:'Bangkok',nights:4,options:[{id:'bangkok-a',name:'Riva Surya Bangkok',area:'Riverside',standard:'Luxury',whyFit:'A practical riverside base with character.',roomGuidance:'Request a 30 m² Riva Room or larger.',reviewSignal:'Guests repeatedly praise the location and service.',sources:[{title:'Hotel reviews',url:'https://www.tripadvisor.com/example-hotel',domain:'tripadvisor.com'}]},{id:'bangkok-b',name:'Eastin Grand Hotel Sathorn',area:'Sathorn',standard:'Comfort',whyFit:'Direct transport access and a full-service feel.',roomGuidance:'Request a Superior Sky room or larger.',reviewSignal:'Reviews often mention the pool and transport access.',sources:[{title:'Hotel reviews',url:'https://www.booking.com/example-hotel',domain:'booking.com'}]}]}],dayPlans:[{day:1,place:'Bangkok',theme:'Ease into Bangkok through food or heritage',options:[{id:'day-1-food',name:'Bangrak tasting walk',type:'Culinary',description:'A guided neighbourhood tasting route through family-run kitchens.',whyFit:'A gentle first-day introduction for food-focused travellers.',interestTags:['food'],sources:[{title:'Experience reviews',url:'https://www.tripadvisor.com/example-tour',domain:'tripadvisor.com'}]},{id:'day-1-history',name:'Old Bangkok riverside heritage',type:'History',description:'Explore riverside temples and historic lanes with a local guide.',whyFit:'Adds context without overloading arrival day.',interestTags:['history'],sources:[{title:'Experience reviews',url:'https://www.getyourguide.com/example-tour',domain:'getyourguide.com'}]}]}],fitReasons:['Balances food and local culture.','Keeps the requested pace comfortable.'],practicalNotes:['Choose the Andaman or Gulf coast only after the travel month is known.','Compare the Bangkok–Chiang Mai sleeper with a flight based on comfort and available time.','For a slower route, keep all four northern nights and remove one Bangkok excursion rather than changing hotels again.'],travellerResearch:'not-connected',travellerInsights:[],closing:'Would you like to choose a coast, slow the route, or add a specific food experience?',availability:'not-connected',pricing:'illustrative-only',matchedJourneys:[{slug:'northern-table-southern-sea',name:'Northern Table, Southern Sea',country:'thailand',duration:11,href:'/en/thailand/tours/northern-table-southern-sea',prices:{USD:5400,EUR:4950,DKK:36900,SEK:55300,NOK:57600,HUF:1940000}}]};

test('trip planner creates a clearly unbooked itinerary suggestion',async({page})=>{
  const sourcedSuggestion={...suggestion,travellerResearch:'live-sources',travellerInsights:[{insight:'Travellers repeatedly recommend keeping Chiang Mai as a proper base rather than compressing the north into a day trip.',sources:[{title:'Thailand route discussion',url:'https://www.reddit.com/r/ThailandTourism/example',domain:'reddit.com'}]}]};
  let consultantRequest:{profile?:{durationDays?:number;interests?:string[]};suggestion?:{title?:string};builderChoices?:{hotels?:Record<string,string>;days?:Record<string,string>;dayNotes?:Record<string,string>}}={};
  await page.route('**/api/trip-suggestion',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({suggestion:sourcedSuggestion,requestId:'test-request'})}));
  await page.route('**/api/trip-enquiry',route=>{consultantRequest=route.request().postDataJSON();return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,proposalUrl:'https://waytoasia.com/proposal/test-private-token'})})});
  await page.goto('/en/trip-planner');
  await expect(page.getByRole('heading',{name:'Design a journey worth taking.'})).toBeVisible();
  await expect(page.getByText('Journey Designer · Way to Asia')).toBeVisible();
  await page.getByLabel('Thailand').check();
  await page.getByLabel('Food & local culture').check();
  await page.getByRole('button',{name:/Create my trip idea/}).click();
  await expect(page.getByRole('heading',{name:suggestion.title})).toBeVisible();
  await expect(page.getByText('Ideas only · No live availability or confirmed prices yet')).toBeVisible();
  await expect(page.getByRole('link',{name:/Northern Table, Southern Sea/})).toHaveAttribute('href','/en/thailand/tours/northern-table-southern-sea');
  await expect(page.getByRole('heading',{name:'What travellers consistently mention'})).toBeVisible();
  await expect(page.getByRole('link',{name:/Thailand route discussion/})).toHaveAttribute('href','https://www.reddit.com/r/ThailandTourism/example');
  await page.setViewportSize({width:390,height:844});
  const resultWidths=await page.locator('[data-trip-result]').evaluate(element=>({client:element.clientWidth,scroll:element.scrollWidth}));
  expect(resultWidths.scroll).toBeLessThanOrEqual(resultWidths.client);
  await expect(page.getByRole('heading',{name:'Send this plan to a travel consultant'})).toBeVisible();
  await expect(page.getByText('Eastin Grand Hotel Sathorn').locator('..').locator('input')).toBeChecked();
  await page.getByLabel('Write my own idea for this day — Day 1').fill('A quiet first evening with a private street-food guide.');
  await expect(page.getByRole('heading',{name:'Check the HBX sandbox'})).toHaveCount(0);
  await page.getByLabel('Your name').fill('Test Traveller');
  await page.getByLabel('Email address').fill('test@example.com');
  await page.getByLabel(/I agree that Way to Asia/).check();
  await page.getByRole('button',{name:/Create my private proposal/}).click();
  await expect(page.getByText(/Your private journey page is ready/)).toBeVisible();
  await expect(page.getByRole('link',{name:/View my private journey/})).toHaveAttribute('href','https://waytoasia.com/proposal/test-private-token');
  expect(consultantRequest.profile?.durationDays).toBe(12);
  expect(consultantRequest.profile?.interests).toContain('food');
  expect(consultantRequest.suggestion?.title).toBe(suggestion.title);
  expect(consultantRequest.builderChoices?.hotels?.['stay-0']).toBe('bangkok-b');
  expect(consultantRequest.builderChoices?.days?.['day-1']).toBe('custom');
  expect(consultantRequest.builderChoices?.dayNotes?.['day-1']).toContain('street-food');
});

test('trip planner remains usable at a mobile width',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/da/trip-planner');
  await expect(page.getByRole('heading',{name:'Design en rejse, der er værd at tage på.'})).toBeVisible();
  await expect(page.locator('.menu')).toBeVisible();
  await expect(page.locator('.menu')).not.toHaveAccessibleName('');
  await expect(page.getByRole('button',{name:/Skab mit rejseforslag/})).toBeVisible();
});

test('agent plans beyond the catalogue and revises the complete journey',async({page})=>{
  const independent={...suggestion,title:'Japan and Taiwan beyond the catalogue',summary:'Here is a 12-day route balancing food, craft and landscapes across Japan and Taiwan, moving Tokyo → Kanazawa → Kyoto, then flying from Osaka to Taipei → Hualien.',route:[{days:'Days 1–6',place:'Japan: Tokyo, Kanazawa & Kyoto',focus:'Link three distinct bases by rail for Tokyo neighbourhoods, Kanazawa craft and Kyoto temple districts.',highlights:['Tokyo food markets','Kanazawa craft quarter'],onwardTravel:'International flight from Osaka to Taipei.'},{days:'Days 7–12',place:'Taiwan: Taipei & Hualien',focus:'Use rail for Taipei food culture and a quieter east-coast finish with room for landscapes.',highlights:['Taipei night markets','East-coast rail journey'],onwardTravel:''}],matchedJourneys:[]};
  const revised={...independent,title:'Japan and Taiwan with fewer cities',route:[{days:'Days 1–5',place:'Japan: Japanese Alps',focus:'Use two unhurried bases for village walks, craft and mountain landscapes instead of several cities.',highlights:['Mountain village walk','Local craft workshop'],onwardTravel:'International flight from central Japan to Taipei.'},{days:'Days 6–12',place:'Taiwan: Taipei & the east coast',focus:'Travel by rail for food culture, coastal scenery and national-park landscapes without a domestic flight.',highlights:['Taipei night market','East-coast rail and walking'],onwardTravel:''}]};
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
  await expect(page.getByText('International flight from Osaka to Taipei.')).toBeVisible();
  await page.getByPlaceholder(/Replace the final city/).fill('Use fewer cities and add more nature.');
  await page.getByRole('button',{name:/Revise my journey/}).click();
  await expect(page.getByRole('heading',{name:revised.title})).toBeVisible();
  await expect(page.getByPlaceholder(/Replace the final city/)).toHaveValue('');
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(receivedDestination).toBe('Japan and Taiwan');
  expect(receivedRefinement).toBe('Use fewer cities and add more nature.');
});
