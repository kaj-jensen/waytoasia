import assert from 'node:assert/strict';
import test from 'node:test';
import {normalizeTripSuggestion,parseTripPlannerRequest} from '../src/lib/tripPlanner';
import {onRequestPost} from '../functions/api/trip-suggestion';

test('validates and limits traveller input',()=>{
  const parsed=parseTripPlannerRequest({locale:'da',destinations:['thailand','vietnam','invalid'],travelMonth:'2027-02',durationDays:14,adults:2,children:0,budget:'premium',pace:'slow',interests:['food','nature','food'],notes:'  Local markets  '});
  assert.deepEqual(parsed,{locale:'da',destinations:['thailand','vietnam'],travelMonth:'2027-02',durationDays:14,adults:2,children:0,budget:'premium',pace:'slow',interests:['food','nature'],notes:'Local markets'});
});

test('rejects a profile without interests',()=>{
  assert.equal(parseTripPlannerRequest({interests:[]}),null);
});

test('resolves only real catalogue journeys and server-owned links',()=>{
  const suggestion=normalizeTripSuggestion({title:'A considered route',summary:'A balanced introduction with time to look around.',recommendedDuration:'12 days',route:[{days:'Days 1–4',place:'Seoul',focus:'Palaces and neighbourhoods.'},{days:'Days 5–8',place:'Gyeongju',focus:'Heritage at a slower pace.'}],fitReasons:['Matches the requested pace.','Balances food and history.'],practicalNotes:['Check seasonal conditions.','Confirm entry requirements.'],matchedJourneySlugs:['seoul-and-ancient-kingdoms','invented-tour'],closing:'A travel designer can refine this idea.'},'en',new Date('2026-09-24T00:00:00Z'));
  assert.ok(suggestion);
  assert.equal(suggestion.matchedJourneys.length,1);
  assert.equal(suggestion.matchedJourneys[0].href,'/en/south-korea/tours/seoul-and-ancient-kingdoms');
  assert.equal(suggestion.availability,'not-connected');
  assert.equal(suggestion.pricing,'illustrative-only');
});

test('returns a validated suggestion from the Workers AI binding',async()=>{
  const request=new Request('https://waytoasia.com/api/trip-suggestion',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://waytoasia.com'},body:JSON.stringify({locale:'en',destinations:['south-korea'],travelMonth:'flexible',durationDays:12,adults:2,children:0,budget:'comfort',pace:'balanced',interests:['history','food'],notes:''})});
  const response=await onRequestPost({request,env:{AI:{run:async()=>({response:{title:'Korea in balance',summary:'A thoughtful route linking contemporary city life with historic capitals.',recommendedDuration:'12 days',route:[{days:'Days 1–4',place:'Seoul',focus:'Palaces, markets and neighbourhoods.'},{days:'Days 5–9',place:'Gyeongju',focus:'Silla heritage at a measured pace.'},{days:'Days 10–12',place:'Busan',focus:'Coastal food culture and harbour life.'}],fitReasons:['Balances food and heritage.','Matches the requested duration.'],practicalNotes:['Confirm seasonal conditions.','Verify entry requirements before travel.'],matchedJourneySlugs:['seoul-and-ancient-kingdoms'],closing:'A travel designer can now refine the details.'}})}}});
  assert.equal(response.status,200);
  const body=await response.json() as {suggestion: {availability:string;matchedJourneys:Array<{slug:string}>}};
  assert.equal(body.suggestion.availability,'not-connected');
  assert.equal(body.suggestion.matchedJourneys[0].slug,'seoul-and-ancient-kingdoms');
});
