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

test('uses comfort as the default hotel standard',()=>{
  assert.equal(parseTripPlannerRequest({destinationIdeas:'Japan',interests:['food']})?.budget,'comfort');
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
  const suggestion=normalizeTripSuggestion({title:'A considered route',summary:'Here is a measured 12-day route through South Korea, moving Seoul → Gyeongju → Busan with time for neighbourhood food, historic sites and the southern coast.',recommendedDuration:'12 days',route:[{days:'Days 1–4',place:'Korea: Seoul',focus:'Use Seoul as the first base for palaces, markets and distinct neighbourhoods without changing hotels.',highlights:['Gwangjang Market','Bukchon and the palaces'],onwardTravel:'High-speed train to Gyeongju, then a short local transfer.'},{days:'Days 5–8',place:'Korea: Gyeongju',focus:'Spend four days around Silla heritage, temple landscapes and a slower countryside rhythm.',highlights:['Bulguksa Temple','Daereungwon tombs'],onwardTravel:'Train or private transfer south to Busan.'}],fitReasons:['Matches the requested pace.','Balances food and history.'],practicalNotes:['Compare point-to-point rail fares with a Korail pass for these exact sectors.','Spring and autumn best suit the long outdoor days on this route.','For a slower pace, remove one Seoul day rather than reducing Gyeongju to an overnight stop.'],travellerInsights:[{insight:'Travellers repeatedly favour keeping Gyeongju overnight rather than compressing it into a day trip.',sourceUrls:['https://www.reddit.com/r/travel/example','https://invented.example/']}],matchedJourneySlugs:['seoul-and-ancient-kingdoms','invented-tour'],closing:'Would you like to slow the route or add a coastal rest day?'},'en',new Date('2026-09-24T00:00:00Z'),undefined,[{id:'R1',title:'South Korea itinerary discussion',url:'https://www.reddit.com/r/travel/example',domain:'reddit.com',excerpt:'Discussion excerpt.'}]);
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

test('rejects token country sections, unsupported schedules and rushed final-day combinations',()=>{
  const profile=parseTripPlannerRequest({destinationIdeas:'Japan and South Korea',durationDays:17,pace:'balanced',interests:['food','history','nature']});
  assert.ok(profile);
  const issues=assessTripSuggestionQuality({route:[
    {days:'Days 1–5',place:'Japan: Tokyo',plan:'Use Tokyo for neighbourhood food, layered history and a measured first section without changing hotels every night.',highlights:['Yanaka','Tsukiji'],onwardTravel:'Continue by rail to Kyoto.'},
    {days:'Days 6–10',place:'Japan: Kyoto',plan:'Give Kyoto enough time for temple districts, craft traditions and a quieter landscape day beyond the busiest streets.',highlights:['Higashiyama','Uji'],onwardTravel:'Continue by rail to Hiroshima.'},
    {days:'Days 11–14',place:'Japan: Hiroshima',plan:'Use Hiroshima as the western base for modern history, local food and a measured island excursion to Miyajima.',highlights:['Peace Memorial Park','Miyajima'],onwardTravel:'Take a daily nonstop flight to Seoul.'},
    {days:'Days 15–16',place:'South Korea: Seoul',plan:'Base in Seoul for palace history, market food and one neighbourhood evening before continuing south.',highlights:['Gyeongbokgung','Gwangjang Market'],onwardTravel:'Fly domestically to Busan.'},
    {days:'Day 17',place:'South Korea: Busan & Gyeongju',plan:'Try to combine Busan harbour food with a rushed return day trip to Gyeongju before the journey ends.',highlights:['Jagalchi Market','Daereungwon'],onwardTravel:''},
  ],practicalNotes:['Several services run every day.','Compare current individual rail fares before deciding on a pass.','Autumn suits the outdoor days.'],travellerInsights:[],closing:'Would you like to slow the route?'},profile);
  assert.ok(issues.some(issue=>issue.includes('meaningful share')));
  assert.ok(issues.some(issue=>issue.includes('frequency')));
  assert.ok(issues.some(issue=>issue.includes('domestic flight')));
  assert.ok(issues.some(issue=>issue.includes('single day')));
});

test('requires source-backed traveller insights when live research is available',()=>{
  const profile=parseTripPlannerRequest({destinationIdeas:'Japan',durationDays:7,interests:['food']});
  assert.ok(profile);
  const draft={route:[{days:'Days 1–3',place:'Japan: Tokyo',plan:'Use Tokyo for food markets, old neighbourhoods and a measured introduction to the route.',highlights:['Tsukiji','Yanaka'],onwardTravel:'Continue by rail to Kyoto.'},{days:'Days 4–7',place:'Japan: Kyoto',plan:'Slow down in Kyoto for temple districts, seasonal cooking and a quieter final day beyond the centre.',highlights:['Higashiyama','Uji'],onwardTravel:''}],practicalNotes:['Compare current individual rail fares before deciding on a pass.','Spring and autumn suit the walking days.','Remove Uji for a slower pace.'],travellerInsights:[{insight:'A generic unsupported claim that should not pass the source requirement.',sourceUrls:['https://invented.example/']}],closing:'Would you like to slow the route?'};
  const research=[{id:'R1',title:'Forum route discussion',url:'https://www.reddit.com/r/JapanTravel/example',domain:'reddit.com',excerpt:'Travellers discuss route pacing.'}];
  assert.ok(assessTripSuggestionQuality(draft,profile,research).some(issue=>issue.includes('two specific traveller insights')));
});

const openAiResponse=(draft:unknown,status=200,headers?:HeadersInit)=>new Response(JSON.stringify(status===200?{status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(draft),annotations:[]}]}]}:{error:{message:'Rate limit reached'}}),{status,headers:{'Content-Type':'application/json',...headers}});

test('returns a validated suggestion from the OpenAI Responses API',async()=>{
  const request=new Request('https://waytoasia.com/api/trip-suggestion',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://waytoasia.com'},body:JSON.stringify({locale:'en',destinations:['south-korea'],destinationIdeas:'',travelMonth:'flexible',durationDays:12,adults:2,children:0,budget:'comfort',pace:'balanced',interests:['history','food'],notes:''})});
  const draft={title:'Korea in balance',summary:'Here is a 12-day route through South Korea, moving Seoul → Gyeongju → Busan with a balanced mix of palace history, market food and coastal landscapes.',recommendedDuration:'12 days',route:[{days:'Days 1–4',place:'Korea: Seoul',plan:'Settle into one Seoul base for palaces, traditional neighbourhoods and two contrasting market evenings.',highlights:['Gyeongbokgung and Bukchon','Gwangjang Market'],onwardTravel:'High-speed train toward Gyeongju with a short final transfer.'},{days:'Days 5–9',place:'Korea: Gyeongju',plan:'Give the Silla capital enough time for its tombs, temples and a quieter rural day beyond the centre.',highlights:['Daereungwon tombs','Bulguksa Temple'],onwardTravel:'Continue south by train or road to Busan.'},{days:'Days 10–12',place:'Korea: Busan',plan:'Finish beside the sea with harbour food, coastal walks and a final unhurried neighbourhood day.',highlights:['Jagalchi Market','Igidae coastal walk'],onwardTravel:''}],fitReasons:['Balances food and heritage.','Matches the requested duration.'],practicalNotes:['Compare a Korail pass with point-to-point fares for the Seoul–Gyeongju–Busan sectors.','Spring and autumn are especially comfortable for the palace, temple and coastal walking days.','For a slower pace, cut one Seoul night and keep Gyeongju as a proper base rather than a day trip.'],travellerInsights:[],matchedJourneySlugs:['seoul-and-ancient-kingdoms'],closing:'Would you like a slower version or more time on the coast?'};
  const originalFetch=globalThis.fetch;globalThis.fetch=async()=>openAiResponse(draft);
  const response=await onRequestPost({request,env:{OPENAI_API_KEY:'test-key'}}).finally(()=>{globalThis.fetch=originalFetch});
  assert.equal(response.status,200);
  const body=await response.json() as {suggestion: {availability:string;matchedJourneys:Array<{slug:string}>}};
  assert.equal(body.suggestion.availability,'not-connected');
  assert.equal(body.suggestion.matchedJourneys[0].slug,'seoul-and-ancient-kingdoms');
});

test('builds long researched itineraries in parallel day batches',async()=>{
  const request=new Request('https://waytoasia.com/api/trip-suggestion',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://waytoasia.com'},body:JSON.stringify({locale:'en',destinations:['thailand'],travelMonth:'2026-11',durationDays:16,adults:2,children:0,budget:'comfort',pace:'balanced',interests:['history','nature'],notes:''})});
  const source='https://www.tripadvisor.com/Thailand/example';
  const sourceTwo='https://www.reddit.com/r/ThailandTourism/example';
  const hotel=(id:string,name:string)=>({id,name,area:'Central and practical for daily sightseeing.',standard:'Comfort, with dependable facilities and service.',whyFit:'A well-located base for this balanced route.',roomGuidance:'Request a larger twin or double room and verify its exact size.',reviewSignal:'Traveller feedback highlights location and comfort, with some variation by room category.',sourceUrls:[source]});
  const core={title:'Thailand history and nature',summary:'Here is a balanced 16-day Thailand route linking Bangkok, Ayutthaya, Sukhothai, Chiang Mai and Chiang Rai for royal history, northern heritage and mountain landscapes: Bangkok → Ayutthaya → Sukhothai → Chiang Mai → Chiang Rai.',recommendedDuration:'16 days / 15 nights',route:[{days:'Days 1–3',place:'Thailand: Bangkok',plan:'Use Bangkok as a stable first base for royal history, old neighbourhoods and the river without changing hotels every night.',highlights:['Grand Palace','Thonburi canals'],onwardTravel:'Continue by rail to Ayutthaya.'},{days:'Days 4–6',place:'Thailand: Ayutthaya',plan:'Stay in Ayutthaya to explore the temple landscape at a measured pace and include quieter countryside beyond the busiest ruins.',highlights:['Ayutthaya Historical Park','Wat Chaiwatthanaram'],onwardTravel:'Continue north by road and rail to Sukhothai.'},{days:'Days 7–9',place:'Thailand: Sukhothai',plan:'Use Sukhothai as a calm heritage base for the historic park, cycling routes and surrounding rural landscapes.',highlights:['Sukhothai Historical Park','Si Satchanalai'],onwardTravel:'Continue by road to Chiang Mai.'},{days:'Days 10–13',place:'Thailand: Chiang Mai',plan:'Use Chiang Mai for Lanna heritage, old-city temples and mountain scenery while keeping one comfortable northern base.',highlights:['Old City temples','Doi Suthep'],onwardTravel:'Continue by road to Chiang Rai.'},{days:'Days 14–16',place:'Thailand: Chiang Rai',plan:'Finish in Chiang Rai with distinctive temples, river landscapes and a slower final rhythm suited to the balanced brief.',highlights:['Wat Rong Khun','Kok River'],onwardTravel:''}],hotelStays:[{place:'Thailand: Bangkok',nights:3,options:[hotel('bkk-1','Bangkok Comfort One'),hotel('bkk-2','Bangkok Comfort Two')]},{place:'Thailand: Ayutthaya',nights:3,options:[hotel('ayt-1','Ayutthaya Comfort One'),hotel('ayt-2','Ayutthaya Comfort Two')]},{place:'Thailand: Sukhothai',nights:3,options:[hotel('skt-1','Sukhothai Comfort One'),hotel('skt-2','Sukhothai Comfort Two')]},{place:'Thailand: Chiang Mai',nights:4,options:[hotel('cnx-1','Chiang Mai Comfort One'),hotel('cnx-2','Chiang Mai Comfort Two')]},{place:'Thailand: Chiang Rai',nights:2,options:[hotel('cei-1','Chiang Rai Comfort One'),hotel('cei-2','Chiang Rai Comfort Two')]}],dayPlans:[],fitReasons:['Balances history and nature.','Keeps each stop long enough to avoid a rushed circuit.'],practicalNotes:['Compare the Bangkok–Ayutthaya rail sectors with the longer northern road connections before fixing transfers.','November suits the outdoor temple landscapes around Ayutthaya, Sukhothai and the northern mountain days.','For a slower pace, remove one Bangkok excursion rather than shortening every northern base.'],travellerInsights:[{insight:'Travellers value keeping enough time in Bangkok to explore beyond the headline sights.',sourceUrls:[source]},{insight:'Forum discussions support treating northern Thailand as several multi-night bases rather than one rushed loop.',sourceUrls:[sourceTwo]}],matchedJourneySlugs:[],closing:'Would you like to slow the pace or add a rest day?'};
  const days=(start:number,end:number)=>Array.from({length:end-start+1},(_,offset)=>{const day=start+offset;const place=day<=3?'Bangkok':day<=6?'Ayutthaya':day<=9?'Sukhothai':day<=13?'Chiang Mai':'Chiang Rai';return {day,place,theme:`History and nature day ${day}`,options:[{id:`d${day}-history`,name:`Named heritage experience ${day}`,type:'heritage',description:'Explore a named historic district or monument with enough context to make the day specific and useful.',whyFit:'Matches the requested history focus at a balanced pace.',interestTags:['history'],sourceUrls:[source]},{id:`d${day}-nature`,name:`Named nature experience ${day}`,type:'nature',description:'Spend time in a named park, river landscape or mountain setting connected to this base.',whyFit:'Adds the requested nature component without changing hotels.',interestTags:['nature'],sourceUrls:[sourceTwo]}]}});
  const originalFetch=globalThis.fetch;let modelCalls=0;
  globalThis.fetch=async(url,init)=>{
    if(String(url).includes('api.tavily.com'))return new Response(JSON.stringify({results:[{title:'Thailand traveller research',url:source,content:'Current traveller and hotel review context.'},{title:'Thailand forum research',url:sourceTwo,content:'Current route and destination discussion.'}]}),{status:200,headers:{'Content-Type':'application/json'}});
    modelCalls+=1;const body=JSON.parse(String(init?.body||'{}')) as {input?:string};const input=JSON.parse(body.input||'{}') as {task?:string;dayRange?:{start:number;end:number}};
    if(input.task==='create_itinerary_core')return openAiResponse(core);
    return openAiResponse({dayPlans:days(input.dayRange?.start??1,input.dayRange?.end??8)});
  };
  const response=await onRequestPost({request,env:{OPENAI_API_KEY:'test-key',TAVILY_API_KEY:'research-key'}}).finally(()=>{globalThis.fetch=originalFetch});
  assert.equal(response.status,200);
  const body=await response.json() as {suggestion:{dayPlans:unknown[];hotelStays:unknown[]}};
  assert.equal(body.suggestion.dayPlans.length,16);
  assert.equal(body.suggestion.hotelStays.length,5);
  assert.equal(modelCalls,3);
});

test('returns a clear retryable response when OpenAI reaches its configured limit',async()=>{
  const request=new Request('https://waytoasia.com/api/trip-suggestion',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://waytoasia.com'},body:JSON.stringify({locale:'en',destinationIdeas:'Japan',durationDays:7,interests:['food']})});
  const originalFetch=globalThis.fetch;globalThis.fetch=async()=>openAiResponse({},429,{'Retry-After':'90'});
  const response=await onRequestPost({request,env:{OPENAI_API_KEY:'test-key'}}).finally(()=>{globalThis.fetch=originalFetch});
  assert.equal(response.status,429);
  assert.ok(Number(response.headers.get('Retry-After'))>=60);
  const body=await response.json() as {code:string;error:string};
  assert.equal(body.code,'AI_LIMIT');
  assert.match(body.error,/usage limit/);
});

test('sends the existing itinerary and latest request when refining',async()=>{
  let modelInput='';
  const current={title:'Japan and Taiwan',summary:'A 14-day route linking Japanese food and design with Taiwan’s markets and landscapes, moving Tokyo → Kanazawa → Kyoto, then flying to Taipei → Hualien.',recommendedDuration:'14 days',route:[{days:'Days 1–3',place:'Japan: Tokyo',focus:'Use one Tokyo base for neighbourhood food, contemporary design and an early market morning without changing hotels.',highlights:['Tokyo markets','Yanaka lanes'],onwardTravel:'Travel by train to Kanazawa.'},{days:'Days 4–5',place:'Japan: Kanazawa',focus:'Spend two focused days on garden design, preserved districts and the city’s distinctive craft traditions.',highlights:['Kenrokuen','Nagamachi craft'],onwardTravel:'Continue by rail to Kyoto.'},{days:'Days 6–8',place:'Japan: Kyoto',focus:'Give Kyoto three days for temple districts, food culture and one quieter excursion beyond the busiest sights.',highlights:['Higashiyama walk','Uji tea country'],onwardTravel:'International flight from Osaka to Taipei.'},{days:'Days 9–11',place:'Taiwan: Taipei',focus:'Use Taipei as a food-led base for historic streets, night markets and a rail day trip outside the capital.',highlights:['Dihua Street','Night-market tasting'],onwardTravel:'Take the east-coast train to Hualien.'},{days:'Days 12–14',place:'Taiwan: Hualien',focus:'Finish with coastal and mountain landscapes, building in flexibility for local access and weather conditions.',highlights:['East-coast scenery','Mountain walking'],onwardTravel:''}],fitReasons:['Fits the brief.','Uses two countries.'],practicalNotes:['Compare Japanese point-to-point rail tickets before buying a pass.','Use the Osaka–Taipei flight for the country change.','Autumn particularly suits the city walks and east-coast landscapes.'],travellerInsights:[],closing:'Would you like to slow it down?'};
  const request=new Request('https://waytoasia.com/api/trip-suggestion',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://waytoasia.com'},body:JSON.stringify({locale:'en',destinations:[],destinationIdeas:'Japan and Taiwan',travelMonth:'2027-04',durationDays:14,adults:2,children:0,budget:'comfort',pace:'slow',interests:['food'],notes:'',currentSuggestion:current,refinement:'Spend less time in cities and add nature.'})});
  const originalFetch=globalThis.fetch;globalThis.fetch=async(_url,init)=>{modelInput=String(init?.body||'');return openAiResponse({...current,title:'Japan and Taiwan, more slowly',matchedJourneySlugs:[]})};
  const response=await onRequestPost({request,env:{OPENAI_API_KEY:'test-key'}}).finally(()=>{globalThis.fetch=originalFetch});
  assert.equal(response.status,200);
  assert.match(modelInput,/revise_itinerary/);
  assert.match(modelInput,/Spend less time in cities and add nature/);
  assert.match(modelInput,/Japan and Taiwan/);
});
