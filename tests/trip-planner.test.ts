import assert from 'node:assert/strict';
import test from 'node:test';
import {assessTripSuggestionQuality,normalizeTripSuggestion,parseTripPlannerRefinement,parseTripPlannerRequest} from '../src/lib/tripPlanner';
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
  const parsed=parseTripPlannerRefinement({refinement:'  Replace Tokyo with rural Kyushu.  ',currentSuggestion:{title:'Japan in balance',summary:'A city and countryside route.',recommendedDuration:'12 days',route:[{days:'Days 1–4',place:'Japan: Tokyo',focus:'Use Tokyo as the base for neighbourhood food and a day beyond the centre.',highlights:['Tsukiji outer market','Yanaka lanes'],onwardTravel:'Train to Kyoto.'},{days:'Days 5–12',place:'Japan: Kyoto',focus:'Slow the pace for temples, craft districts and a rural day trip.',highlights:['Higashiyama walk','Uji tea country'],onwardTravel:''}],fitReasons:['Good pace.'],practicalNotes:['Compare rail fares.'],closing:'Refine it.'}});
  assert.equal(parsed?.instruction,'Replace Tokyo with rural Kyushu.');
  assert.equal(parsed?.currentSuggestion.route[0].place,'Japan: Tokyo');
  assert.deepEqual(parsed?.currentSuggestion.matchedJourneySlugs,[]);
});

test('resolves only real catalogue journeys and server-owned links',()=>{
  const suggestion=normalizeTripSuggestion({title:'A considered route',summary:'Here is a measured 12-day route through South Korea, moving Seoul → Gyeongju → Busan with time for neighbourhood food, historic sites and the southern coast.',recommendedDuration:'12 days',route:[{days:'Days 1–4',place:'Korea: Seoul',focus:'Use Seoul as the first base for palaces, markets and distinct neighbourhoods without changing hotels.',highlights:['Gwangjang Market','Bukchon and the palaces'],onwardTravel:'High-speed train to Gyeongju, then a short local transfer.'},{days:'Days 5–8',place:'Korea: Gyeongju',focus:'Spend four days around Silla heritage, temple landscapes and a slower countryside rhythm.',highlights:['Bulguksa Temple','Daereungwon tombs'],onwardTravel:'Train or private transfer south to Busan.'}],fitReasons:['Matches the requested pace.','Balances food and history.'],practicalNotes:['Compare point-to-point rail fares with a Korail pass for these exact sectors.','Spring and autumn best suit the long outdoor days on this route.','For a slower pace, remove one Seoul day rather than reducing Gyeongju to an overnight stop.'],travellerInsights:[{insight:'Travellers repeatedly favour keeping Gyeongju overnight rather than compressing it into a day trip.',sourceIds:['R1','invented']}],matchedJourneySlugs:['seoul-and-ancient-kingdoms','invented-tour'],closing:'Would you like to slow the route or add a coastal rest day?'},'en',new Date('2026-09-24T00:00:00Z'),undefined,[{id:'R1',title:'South Korea itinerary discussion',url:'https://www.reddit.com/r/travel/example',domain:'reddit.com',excerpt:'Discussion excerpt.'}]);
  assert.ok(suggestion);
  assert.equal(suggestion.matchedJourneys.length,1);
  assert.equal(suggestion.matchedJourneys[0].href,'/en/south-korea/tours/seoul-and-ancient-kingdoms');
  assert.equal(suggestion.availability,'not-connected');
  assert.equal(suggestion.pricing,'illustrative-only');
  assert.equal(suggestion.travellerResearch,'live-sources');
  assert.equal(suggestion.travellerInsights[0].sources.length,1);
  assert.equal(suggestion.travellerInsights[0].sources[0].url,'https://www.reddit.com/r/travel/example');
});

test('rejects an itinerary with gaps in the requested day ranges',()=>{
  const suggestion=normalizeTripSuggestion({title:'Broken route',summary:'Here is a detailed 12-day route whose itinerary accidentally skips a day between its two otherwise useful and specific route chapters.',recommendedDuration:'12 days',route:[{days:'Days 1–4',place:'Tokyo',focus:'A specific first chapter with enough useful detail to pass every check except the route gap.',highlights:['Market morning','Neighbourhood walk'],onwardTravel:'Train onward.'},{days:'Days 6–12',place:'Kyoto',focus:'A specific second chapter with enough useful detail to pass every check except the route gap.',highlights:['Temple district','Craft visit'],onwardTravel:''}],fitReasons:['It is specific.','It is coherent.'],practicalNotes:['A detailed transport note for the route.','A detailed seasonal note for the route.','A detailed pace note for the route.'],travellerInsights:[],matchedJourneySlugs:[],closing:'Would you like to adjust it?'},'en',new Date(),12);
  assert.equal(suggestion,null);
});

test('flags thin chapters and generic practical filler for automatic rewriting',()=>{
  const profile=parseTripPlannerRequest({destinationIdeas:'Japan and South Korea',durationDays:12,interests:['food','history']});
  assert.ok(profile);
  const issues=assessTripSuggestionQuality({route:[{days:'Days 1–6',place:'Japan',focus:'Japan',highlights:['Tokyo','Kyoto'],onwardTravel:'Fly to Korea in approximately 2 hours.'},{days:'Days 7–12',place:'Korea',focus:'Korea',highlights:['Seoul','Busan'],onwardTravel:''}],practicalNotes:['Buy a JR Pass for the Japan leg.','Check the weather.','Ensure all documents are in order.'],closing:'A first idea.'},profile);
  assert.ok(issues.some(issue=>issue.includes('concrete')));
  assert.ok(issues.some(issue=>issue.includes('generic')));
  assert.ok(issues.some(issue=>issue.includes('journey times')));
  assert.ok(issues.some(issue=>issue.includes('rail pass')));
  assert.ok(issues.some(issue=>issue.includes('question')));
});

test('returns a validated suggestion from the Workers AI binding',async()=>{
  const request=new Request('https://waytoasia.com/api/trip-suggestion',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://waytoasia.com'},body:JSON.stringify({locale:'en',destinations:['south-korea'],destinationIdeas:'',travelMonth:'flexible',durationDays:12,adults:2,children:0,budget:'comfort',pace:'balanced',interests:['history','food'],notes:''})});
  const response=await onRequestPost({request,env:{AI:{run:async()=>({response:{title:'Korea in balance',summary:'Here is a 12-day route through South Korea, moving Seoul → Gyeongju → Busan with a balanced mix of palace history, market food and coastal landscapes.',recommendedDuration:'12 days',route:[{days:'Days 1–4',place:'Korea: Seoul',focus:'Settle into one Seoul base for palaces, traditional neighbourhoods and two contrasting market evenings.',highlights:['Gyeongbokgung and Bukchon','Gwangjang Market'],onwardTravel:'High-speed train toward Gyeongju with a short final transfer.'},{days:'Days 5–9',place:'Korea: Gyeongju',focus:'Give the Silla capital enough time for its tombs, temples and a quieter rural day beyond the centre.',highlights:['Daereungwon tombs','Bulguksa Temple'],onwardTravel:'Continue south by train or road to Busan.'},{days:'Days 10–12',place:'Korea: Busan',focus:'Finish beside the sea with harbour food, coastal walks and a final unhurried neighbourhood day.',highlights:['Jagalchi Market','Igidae coastal walk'],onwardTravel:''}],fitReasons:['Balances food and heritage.','Matches the requested duration.'],practicalNotes:['Compare a Korail pass with point-to-point fares for the Seoul–Gyeongju–Busan sectors.','Spring and autumn are especially comfortable for the palace, temple and coastal walking days.','For a slower pace, cut one Seoul night and keep Gyeongju as a proper base rather than a day trip.'],matchedJourneySlugs:['seoul-and-ancient-kingdoms'],closing:'Would you like a slower version or more time on the coast?'}})}}});
  assert.equal(response.status,200);
  const body=await response.json() as {suggestion: {availability:string;matchedJourneys:Array<{slug:string}>}};
  assert.equal(body.suggestion.availability,'not-connected');
  assert.equal(body.suggestion.matchedJourneys[0].slug,'seoul-and-ancient-kingdoms');
});

test('sends the existing itinerary and latest request when refining',async()=>{
  let modelInput='';
  const current={title:'Japan and Taiwan',summary:'A 14-day route linking Japanese food and design with Taiwan’s markets and landscapes, moving Tokyo → Kanazawa → Kyoto, then flying to Taipei → Hualien.',recommendedDuration:'14 days',route:[{days:'Days 1–3',place:'Japan: Tokyo',focus:'Use one Tokyo base for neighbourhood food, contemporary design and an early market morning without changing hotels.',highlights:['Tokyo markets','Yanaka lanes'],onwardTravel:'Travel by train to Kanazawa.'},{days:'Days 4–5',place:'Japan: Kanazawa',focus:'Spend two focused days on garden design, preserved districts and the city’s distinctive craft traditions.',highlights:['Kenrokuen','Nagamachi craft'],onwardTravel:'Continue by rail to Kyoto.'},{days:'Days 6–8',place:'Japan: Kyoto',focus:'Give Kyoto three days for temple districts, food culture and one quieter excursion beyond the busiest sights.',highlights:['Higashiyama walk','Uji tea country'],onwardTravel:'International flight from Osaka to Taipei.'},{days:'Days 9–11',place:'Taiwan: Taipei',focus:'Use Taipei as a food-led base for historic streets, night markets and a rail day trip outside the capital.',highlights:['Dihua Street','Night-market tasting'],onwardTravel:'Take the east-coast train to Hualien.'},{days:'Days 12–14',place:'Taiwan: Hualien',focus:'Finish with coastal and mountain landscapes, building in flexibility for local access and weather conditions.',highlights:['East-coast scenery','Mountain walking'],onwardTravel:''}],fitReasons:['Fits the brief.','Uses two countries.'],practicalNotes:['Compare Japanese point-to-point rail tickets before buying a pass.','Use the Osaka–Taipei flight for the country change.','Autumn particularly suits the city walks and east-coast landscapes.'],travellerInsights:[],closing:'Would you like to slow it down?'};
  const request=new Request('https://waytoasia.com/api/trip-suggestion',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://waytoasia.com'},body:JSON.stringify({locale:'en',destinations:[],destinationIdeas:'Japan and Taiwan',travelMonth:'2027-04',durationDays:14,adults:2,children:0,budget:'comfort',pace:'slow',interests:['food'],notes:'',currentSuggestion:current,refinement:'Spend less time in cities and add nature.'})});
  const response=await onRequestPost({request,env:{AI:{run:async(_model,input)=>{modelInput=JSON.stringify(input);return {response:{...current,title:'Japan and Taiwan, more slowly',matchedJourneySlugs:[]}}}}}});
  assert.equal(response.status,200);
  assert.match(modelInput,/revise_itinerary/);
  assert.match(modelInput,/Spend less time in cities and add nature/);
  assert.match(modelInput,/Japan and Taiwan/);
});
