import assert from 'node:assert/strict';
import test from 'node:test';
import {normalizeTripSuggestion,parseTripPlannerRefinement,parseTripPlannerRequest} from '../src/lib/tripPlanner';
import {onRequestPost} from '../functions/api/trip-suggestion';

test('validates and limits traveller input',()=>{
  const parsed=parseTripPlannerRequest({locale:'da',destinations:['thailand','vietnam','invalid'],destinationIdeas:'  Japan and Taiwan  ',travelMonth:'2027-02',durationDays:14,adults:2,children:0,budget:'premium',pace:'slow',interests:['food','nature','food'],notes:'  Local markets  '});
  assert.deepEqual(parsed,{locale:'da',destinations:['thailand','vietnam'],destinationIdeas:'Japan and Taiwan',travelMonth:'2027-02',durationDays:14,adults:2,children:0,budget:'premium',pace:'slow',interests:['food','nature'],notes:'Local markets'});
});

test('accepts a natural-language Asia brief without catalogue interests',()=>{
  assert.equal(parseTripPlannerRequest({destinationIdeas:'Japan and Taiwan',interests:[]})?.destinationIdeas,'Japan and Taiwan');
});

test('rejects a profile without interests or a written brief',()=>{
  assert.equal(parseTripPlannerRequest({interests:[]}),null);
});

test('sanitizes a conversational refinement and its previous itinerary',()=>{
  const parsed=parseTripPlannerRefinement({refinement:'  Replace Tokyo with rural Kyushu.  ',currentSuggestion:{title:'Japan in balance',summary:'A city and countryside route.',recommendedDuration:'12 days',route:[{days:'Days 1–4',place:'Tokyo',focus:'Neighbourhoods and food.'},{days:'Days 5–12',place:'Kyoto',focus:'Temples and craft.'}],fitReasons:['Good pace.'],practicalNotes:['Check weather.'],closing:'Refine it.'}});
  assert.equal(parsed?.instruction,'Replace Tokyo with rural Kyushu.');
  assert.equal(parsed?.currentSuggestion.route[0].place,'Tokyo');
  assert.deepEqual(parsed?.currentSuggestion.matchedJourneySlugs,[]);
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
  const request=new Request('https://waytoasia.com/api/trip-suggestion',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://waytoasia.com'},body:JSON.stringify({locale:'en',destinations:['south-korea'],destinationIdeas:'',travelMonth:'flexible',durationDays:12,adults:2,children:0,budget:'comfort',pace:'balanced',interests:['history','food'],notes:''})});
  const response=await onRequestPost({request,env:{AI:{run:async()=>({response:{title:'Korea in balance',summary:'A thoughtful route linking contemporary city life with historic capitals.',recommendedDuration:'12 days',route:[{days:'Days 1–4',place:'Seoul',focus:'Palaces, markets and neighbourhoods.'},{days:'Days 5–9',place:'Gyeongju',focus:'Silla heritage at a measured pace.'},{days:'Days 10–12',place:'Busan',focus:'Coastal food culture and harbour life.'}],fitReasons:['Balances food and heritage.','Matches the requested duration.'],practicalNotes:['Confirm seasonal conditions.','Verify entry requirements before travel.'],matchedJourneySlugs:['seoul-and-ancient-kingdoms'],closing:'A travel designer can now refine the details.'}})}}});
  assert.equal(response.status,200);
  const body=await response.json() as {suggestion: {availability:string;matchedJourneys:Array<{slug:string}>}};
  assert.equal(body.suggestion.availability,'not-connected');
  assert.equal(body.suggestion.matchedJourneys[0].slug,'seoul-and-ancient-kingdoms');
});

test('sends the existing itinerary and latest request when refining',async()=>{
  let modelInput='';
  const current={title:'Japan and Taiwan',summary:'A balanced island route.',recommendedDuration:'14 days',route:[{days:'Days 1–7',place:'Japan',focus:'Food and design.'},{days:'Days 8–14',place:'Taiwan',focus:'Markets and landscapes.'}],fitReasons:['Fits the brief.','Uses two countries.'],practicalNotes:['Check entry rules.','Confirm rail passes.'],closing:'A first idea.'};
  const request=new Request('https://waytoasia.com/api/trip-suggestion',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://waytoasia.com'},body:JSON.stringify({locale:'en',destinations:[],destinationIdeas:'Japan and Taiwan',travelMonth:'2027-04',durationDays:14,adults:2,children:0,budget:'comfort',pace:'slow',interests:['food'],notes:'',currentSuggestion:current,refinement:'Spend less time in cities and add nature.'})});
  const response=await onRequestPost({request,env:{AI:{run:async(_model,input)=>{modelInput=JSON.stringify(input);return {response:{...current,title:'Japan and Taiwan, more slowly',matchedJourneySlugs:[]}}}}}});
  assert.equal(response.status,200);
  assert.match(modelInput,/revise_itinerary/);
  assert.match(modelInput,/Spend less time in cities and add nature/);
  assert.match(modelInput,/Japan and Taiwan/);
});
