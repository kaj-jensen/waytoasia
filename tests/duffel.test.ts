import test from 'node:test';
import assert from 'node:assert/strict';
import {searchFlights,getFlight,normaliseOffer,sampleFlight,renderFlights} from '../functions/_lib/duffel';
const offer={id:'off_test',live_mode:false,slices:[{segments:[{origin:{iata_code:'CPH'},destination:{iata_code:'BKK'},departing_at:'2027-02-10T14:00:00',arriving_at:'2027-02-11T06:00:00',marketing_carrier:{name:'Test airline',iata_code:'ZZ'},marketing_carrier_flight_number:'101',duration:'PT10H'}]}]};
test('test tokens only; live credentials and invalid dates never contact provider',async()=>{
 const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('unexpected')};try{
 await assert.rejects(getFlight('duffel_live_example','off_test'),/configure/);
 await assert.rejects(searchFlights('duffel_test_example',{origin:'CPH',destination:'BKK',departure:'2027-02-30',adults:2}),/valid future/);
 assert.equal(calls,0);
 }finally{globalThis.fetch=original}
});
test('search sends only anonymous passenger counts and returns itinerary segments',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async(url,init)=>{assert.equal(String(url),'https://api.duffel.com/air/offer_requests?return_offers=true');const body=JSON.parse(String(init?.body));assert.deepEqual(body.data.passengers,[{type:'adult'},{type:'adult'}]);assert.equal(body.data.slices.length,2);assert.equal(body.data.slices[1].origin,'BKK');return Response.json({data:{live_mode:false,offers:[offer]}})};try{const found=await searchFlights('duffel_test_example',{origin:'cph',destination:'bkk',departure:'2027-02-10',returnDate:'2027-02-24',adults:2});assert.equal(found[0].slices[0][0].flightNumber,'ZZ 101')}finally{globalThis.fetch=original}
});
test('rejects live responses and malformed segments; renderer escapes and labels tests',()=>{assert.throws(()=>normaliseOffer({...offer,live_mode:true}),/Only test/);assert.throws(()=>normaliseOffer({...offer,slices:[]}),/incomplete/);const f=sampleFlight();f.slices[0][0].airline='<script>bad</script>';const html=renderFlights(f);assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('not confirmed flights'));assert.ok(renderFlights(f,'da').includes('Flyrejseplan'))});

test('planner uses arrival date, open-jaw return airport and ranks only suitable API schedules',async()=>{
 const {planFlights,resolveAirport}=await import('../functions/_lib/planner-flights');assert.equal(resolveAirport('Copenhagen'),'CPH');assert.equal(resolveAirport('London'),'');
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async(_url,init)=>{calls++;const data=JSON.parse(String(init?.body)).data;assert.equal(data.slices[1].origin,'CNX');const outbound={...offer.slices[0].segments[0]};const inbound={...outbound,origin:{iata_code:'CNX'},destination:{iata_code:'CPH'},departing_at:'2027-02-24T12:00:00',arriving_at:'2027-02-24T20:00:00'};return Response.json({data:{live_mode:false,offers:[{...offer,id:`off_test${calls}`,slices:[{segments:[outbound]},{segments:[inbound]}]}]}})};
 try{const profile={departureAirport:'Copenhagen',travelStartDate:'2027-02-11',travelEndDate:'2027-02-24',adults:2,children:0};const result=await planFlights('duffel_test_example',profile,[{place:'Bangkok'},{place:'Chiang Mai'}]);assert.equal(result.status,'test-results');assert.equal(calls,2);assert.equal(result.offers[0].slices[0][0].arrival.slice(0,10),profile.travelStartDate);assert.equal((await planFlights(undefined,profile,[])).status,'not-connected');assert.equal((await planFlights('duffel_test_example',{...profile,children:1},[])).status,'needs-details');}finally{globalThis.fetch=original}
});

test('readable flight table preserves local clocks and provider airport and cabin details',()=>{
 const f=normaliseOffer({...offer,slices:[{segments:[{...offer.slices[0].segments[0],origin:{iata_code:'CPH',city_name:'Copenhagen',name:'Kastrup'},destination:{iata_code:'BKK',city_name:'Bangkok',name:'Suvarnabhumi'},passengers:[{cabin_class:'business'}]}]}]});
 const html=renderFlights(f);
 for(const expected of ['Copenhagen','Kastrup','Suvarnabhumi','14:00','06:00','10 Feb 2027','11 Feb 2027','Business','10h 0m','<table'])assert.ok(html.includes(expected),expected);
 assert.ok(!html.includes('2027-02-10T'));
});

test('Vietnam combined route names resolve gateways and disclose transfers',async()=>{
 const {resolveRouteAirport,planFlights}=await import('../functions/_lib/planner-flights');
 assert.equal(resolveRouteAirport('Vietnam: Hanoi & Ninh Binh').airport,'HAN');
 assert.deepEqual(resolveRouteAirport('Vietnam: Mekong Delta'),{airport:'SGN',transfer:true});
 assert.equal(resolveRouteAirport('Hanoi & Ho Chi Minh City').airport,'');
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async(_url,init)=>{calls++;const data=JSON.parse(String(init?.body)).data;assert.equal(data.slices[0].destination,'HAN');assert.equal(data.slices[1].origin,'SGN');const segment=offer.slices[0].segments[0];return Response.json({data:{live_mode:false,offers:[{...offer,id:`off_vietnam${calls}`,slices:[{segments:[{...segment,destination:{iata_code:'HAN'},departing_at:'2026-11-07T14:00:00',arriving_at:'2026-11-08T06:00:00'}]},{segments:[{...segment,origin:{iata_code:'SGN'},destination:{iata_code:'CPH'},departing_at:'2026-11-20T12:00:00',arriving_at:'2026-11-20T20:00:00'}]}]}]}})};
 try{const result=await planFlights('duffel_test_example',{departureAirport:'CPH',travelStartDate:'2026-11-08',travelEndDate:'2026-11-20',adults:2,children:0},[{place:'Vietnam: Hanoi & Ninh Binh'},{place:'Vietnam: Mekong Delta'}]);assert.equal(result.status,'test-results');assert.equal(calls,2);assert.deepEqual(result.transfers,[{place:'Vietnam: Mekong Delta',airport:'SGN'}]);}finally{globalThis.fetch=original}
});

test('departure date searches overlap and keep valid offers if one request fails',async()=>{
 const {planFlights}=await import('../functions/_lib/planner-flights');
 const original=globalThis.fetch;let calls=0;let release!:()=>void;
 const bothStarted=new Promise<void>(resolve=>{release=resolve});
 globalThis.fetch=async()=>{
  const call=++calls;if(calls===2)release();
  await Promise.race([bothStarted,new Promise((_,reject)=>setTimeout(()=>reject(Error('searches ran sequentially')),500))]);
  if(call===1)return new Response('',{status:502});
  const segment=offer.slices[0].segments[0];
  return Response.json({data:{live_mode:false,offers:[{...offer,slices:[offer.slices[0],{segments:[{...segment,origin:{iata_code:'BKK'},destination:{iata_code:'CPH'},departing_at:'2027-02-24T12:00:00',arriving_at:'2027-02-24T20:00:00'}]}]}]}});
 };
 try{const result=await planFlights('duffel_test_example',{departureAirport:'CPH',travelStartDate:'2027-02-11',travelEndDate:'2027-02-24',adults:2,children:0},[{place:'Bangkok'}]);assert.equal(calls,2);assert.equal(result.status,'test-results');}finally{globalThis.fetch=original}
});

test('renders every connecting flight, layover and stop within a flight',()=>{
 const base=offer.slices[0].segments[0];
 const f=normaliseOffer({...offer,slices:[{segments:[{...base,origin:{iata_code:'CPH'},destination:{iata_code:'LHR',city_name:'London',time_zone:'Europe/London'},departing_at:'2027-02-10T08:00:00',arriving_at:'2027-02-10T09:00:00',marketing_carrier_flight_number:'801'},{...base,origin:{iata_code:'LHR',time_zone:'Europe/London'},destination:{iata_code:'HAN'},departing_at:'2027-02-10T11:30:00',arriving_at:'2027-02-11T06:00:00',marketing_carrier_flight_number:'901',stops:[{airport:{iata_code:'BKK',city_name:'Bangkok'},arriving_at:'2027-02-11T03:00:00',departing_at:'2027-02-11T04:00:00',duration:'PT1H'}]}]}]});
 const html=renderFlights(f);
 for(const expected of ['ZZ 801','ZZ 901','Connection: London (LHR)','09:00','11:30','2h 30m','Stop during this flight: Bangkok (BKK)','03:00','04:00','1h 0m'])assert.ok(html.includes(expected),expected);
 assert.equal(f.slices[0][1].stops?.length,1);
});
