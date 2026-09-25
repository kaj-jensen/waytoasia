import test from 'node:test';
import assert from 'node:assert/strict';
import {customerEmail,hashToken,randomToken,renderManagePage,renderProposalPage,validToken,type ProposalRow,type StoredProposalPayload} from '../functions/_lib/proposals';

const payload:StoredProposalPayload={
  traveller:{name:'Test Traveller',email:'test@example.com',phone:'',message:'Please keep the pace comfortable.'},
  profile:{durationDays:8,adults:2,children:0,travelMonth:'2027-03',budget:'comfort',pace:'balanced'},
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
