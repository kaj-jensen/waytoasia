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
