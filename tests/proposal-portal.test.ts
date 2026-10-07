import test from 'node:test';
import assert from 'node:assert/strict';
import {plannedStayNights,hotelSourceMatches,customerEmail,hashToken,randomToken,renderManagePage,renderProposalPage,validToken,type ProposalRow,type StoredProposalPayload} from '../functions/_lib/proposals';
import {onRequest as applySiteMiddleware} from '../functions/_middleware';

const payload:StoredProposalPayload={
  traveller:{name:'Test Traveller',email:'test@example.com',phone:'',message:'Please keep the pace comfortable.'},
  profile:{durationDays:8,adults:2,children:0,travelStartDate:'2027-03-10',travelEndDate:'2027-03-17',dateFlexibilityDays:2,travelMonth:'2027-03-10 – 2027-03-17 · ± 2 days',departureAirport:'Copenhagen (CPH)',budget:'comfort',pace:'balanced'},
  suggestion:{
    title:'Japan in spring',summary:'An eight-day route through Tokyo and Kyoto.',recommendedDuration:'8 days / 7 nights',
    route:[
      {days:'Days 1–4',place:'Japan: Tokyo',plan:'Use Tokyo as a comfortable first base.',focus:'Use Tokyo as a comfortable first base.',highlights:['Yanaka','Tsukiji outer market']},
      {days:'Days 5–8',place:'Japan: Kyoto',plan:'Continue to Kyoto for temples and food.',focus:'Continue to Kyoto for temples and food.',highlights:['Higashiyama','Nishiki Market']},
    ],
    hotelStays:[{place:'Tokyo',nights:4,options:[{id:'tokyo-a',name:'Hotel Test',standard:'Comfort',roomGuidance:'Request at least 24 m².'}]}],
    dayPlans:[{day:1,place:'Tokyo',options:[{id:'day-1-a',name:'Old Tokyo walk',description:'A guided walk through historic neighbourhoods.'}]}],
  },
  builderChoices:{hotels:{'stay-0':'tokyo-a'},hotelNotes:{},days:{'day-1':'day-1-a'},dayNotes:{}},
};

const row:ProposalRow={id:'proposal-1',token_hash:'hash',manage_token_hash:'manage-hash',traveller_name:'Test Traveller',traveller_email:'test@example.com',locale:'en',title:'Japan in spring',summary:'An eight-day route through Tokyo and Kyoto.',estimated_price:'From €4,500 per person',consultant_note:'I have kept the hotel rooms above the usual entry-level size.',payload_json:JSON.stringify(payload),status:'ready',traveller_response:'',created_at:'2026-09-25T08:00:00.000Z',updated_at:'2026-09-25T09:00:00.000Z',expires_at:'2026-11-24T08:00:00.000Z',revoked_at:null};

test('proposal tokens are cryptographically shaped and hashable',async()=>{
  const first=randomToken(),second=randomToken();
  assert.equal(validToken(first),true);
  assert.equal(first.length,43);
  assert.notEqual(first,second);
  assert.equal((await hashToken(first)).length,64);
  assert.notEqual(await hashToken(first),await hashToken(second));
});

test('customer proposal renders the structured journey and privacy controls',()=>{
  const html=renderProposalPage(row,'A'.repeat(43),'');
  assert.match(html,/noindex,nofollow,noarchive,nosnippet/);
  assert.match(html,/Japan: Tokyo/);
  assert.match(html,/Hotel Test/);
  assert.match(html,/Old Tokyo walk/);
  assert.match(html,/Approve this direction/);
  assert.match(html,/Private link/);
  assert.match(html,/From €4,500 per person/);
  assert.match(html,/Travel dates/);
  assert.match(html,/10 Mar 2027 – 17 Mar 2027 · ± 2|Mar 10, 2027 – Mar 17, 2027 · ± 2/);
  assert.match(html,/Copenhagen \(CPH\)/);
});

test('consultant workspace edits the same route chapters',()=>{
  const html=renderManagePage(row,false);
  assert.match(html,/Consultant workspace/);
  assert.match(html,/name="route_plan_0"/);
  assert.match(html,/Save changes/);
});

test('customer email is branded, concise and links to the private page',()=>{
  const email=customerEmail(row,'https://waytoasia.com/proposal/private-token');
  assert.match(email.subject,/Your Way to Asia journey/);
  assert.match(email.html,/View my journey/);
  assert.match(email.text,/https:\/\/waytoasia.com\/proposal\/private-token/);
  assert.doesNotMatch(email.html,/Consultant workspace/);
});

test('the direct Pages hostname cannot become a public alternate entrance',async()=>{
  let continued=false;
  const response=await applySiteMiddleware({
    request:new Request('https://waytoasia.pages.dev/en/trip-planner/?source=direct'),
    next:async()=>{
      continued=true;
      return new Response('should not be served');
    },
  });

  assert.equal(response.status,308);
  assert.equal(response.headers.get('location'),'https://waytoasia.com/en/trip-planner/?source=direct');
  assert.equal(response.headers.get('cache-control'),'no-store');
  assert.equal(continued,false);
});

 test('dated route allocates eleven overnight stays and excludes departure day',()=>{
 const p=structuredClone(payload);p.profile.travelStartDate='2026-11-07';p.profile.travelEndDate='2026-11-18';
 p.suggestion.route=[{days:'Days 1–4'},{days:'Days 5–7'},{days:'Days 8–12'}];
 p.suggestion.hotelStays=[{nights:4},{nights:3},{nights:5}];
 assert.deepEqual(plannedStayNights(p),[4,3,4]);
 p.suggestion.route=[{days:'Days 1–4'},{days:'Days 6–7'},{days:'Days 8–12'}];
 assert.deepEqual(plannedStayNights(p),[4,3,5]);
 });
 test('generic or mismatched hotel research cannot become a property link',()=>{
 assert.equal(hotelSourceMatches('Nine Tree Premier Hotel Myeongdong 2',{title:'Best hotels in Seongnam',url:'https://www.booking.com/fourstars/city/kr/songnam.html'}),false);
 assert.equal(hotelSourceMatches('Nine Tree Premier Hotel Myeongdong 2',{title:'Nine Tree Premier Hotel Myeongdong 2',url:'https://example.com/property'}),true);
 });
 test('scope is explicit, safely escaped, and editable by the consultant',()=>{
 const p=structuredClone(payload);
 let html=renderProposalPage({...row,payload_json:JSON.stringify(p)},'a'.repeat(43),'');
 assert.match(html,/What your proposal covers/);assert.match(html,/No services have yet been confirmed/);
 assert.match(html,/Meals and breakfast/);assert.match(html,/No exclusions have yet been confirmed/);
 p.builderChoices.serviceScope={included:['Breakfast <daily>'],excluded:['International flights'],pending:['Airport transfers']};
 html=renderProposalPage({...row,payload_json:JSON.stringify(p)},'a'.repeat(43),'');
 assert.match(html,/Breakfast &lt;daily&gt;/);assert.match(html,/International flights/);assert.match(html,/Airport transfers/);
 assert.doesNotMatch(html,/No services have yet been confirmed/);
 assert.match(renderManagePage({...row,payload_json:JSON.stringify(p)},false),/name="services_included"/);
 });

test('daily programme associates overnight stays with route chapters and excludes departure night',()=>{
 const p=structuredClone(payload);
 p.suggestion.dayPlans=[{day:1,place:'Tokyo',options:[{id:'day-1-a',name:'Old Tokyo walk',description:'Walk'}]},{day:8,place:'Kyoto',options:[]}];
 const html=renderProposalPage({...row,payload_json:JSON.stringify(p)},'A'.repeat(43),'');
 const first=html.split('class="programme-day" id="day-1"')[1].split('</article>')[0];
 assert.match(first,/Hotel Test/);assert.match(first,/Excursions & activities/);
 const last=html.split('class="programme-day" id="day-8"')[1].split('</article>')[0];
 assert.match(last,/Departure day · no overnight stay/);assert.doesNotMatch(last,/Hotel Test/);
 assert.match(first,/inclusion to be confirmed/);
});

test('saved transfer choice is displayed in the matching client route chapter',()=>{
 const p=structuredClone(payload);
 (p.suggestion.route as Array<Record<string,unknown>>)[0].transferOptions=[{id:'bus',name:'Shared express bus to Kyoto',description:'Station-to-station travel'},{id:'private',name:'Private transfer to Kyoto',description:'Pickup arranged with consultant'}];
 p.builderChoices.transfers={'transfer-0':'bus'};
 const html=renderProposalPage({...row,payload_json:JSON.stringify(p)},'A'.repeat(43),'');
 assert.match(html,/Shared express bus to Kyoto/);
 assert.doesNotMatch(html,/Private transfer to Kyoto/);
});

test('selected hotel photos appear in the overview and daily programme, excluding alternatives and unsafe images',()=>{
 const copy=structuredClone(payload);
 copy.suggestion.hotelStays=[{place:'Tokyo',nights:4,options:[{id:'tokyo-a',name:'Hotel Test',imageUrl:'https://static.cupid.travel/hotels/123.jpg',roomGuidance:'Twin room'},{id:'tokyo-b',name:'Unselected hotel',imageUrl:'https://static.cupid.travel/hotels/456.jpg'}]}];
 const html=renderProposalPage({...row,payload_json:JSON.stringify(copy)},'A'.repeat(43),'');
 assert.ok(html.indexOf('id="stays"')<html.indexOf('id="itinerary"'));
 assert.match(html,/class="selected-hotel-photo"[^>]+123.jpg/);
 assert.match(html,/class="programme-hotel-photo"[^>]+123.jpg/);
 assert.doesNotMatch(html,/456.jpg|Unselected hotel/);
 copy.suggestion.hotelStays=[{place:'Tokyo',nights:4,options:[{id:'tokyo-a',name:'Hotel Test',imageUrl:'https://untrusted.example/photo.jpg'}]}];
 assert.doesNotMatch(renderProposalPage({...row,payload_json:JSON.stringify(copy)},'A'.repeat(43),''),/untrusted.example/);
});
