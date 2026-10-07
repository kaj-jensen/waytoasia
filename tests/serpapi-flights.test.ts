import test from 'node:test';
import assert from 'node:assert/strict';
import {normaliseSerpFlight,searchSerpFlights} from '../functions/_lib/serpapi-flights';
import {planFlights} from '../functions/_lib/planner-flights';
import {flightTable} from '../functions/_lib/flight-display';
import {renderFlights} from '../functions/_lib/duffel';
const segment=(origin:string,destination:string,departure:string,arrival:string)=>({departure_airport:{id:origin,name:origin,time:departure},arrival_airport:{id:destination,name:destination,time:arrival},duration:300,airline:'Test airline',flight_number:'TEST 1',travel_class:'Economy'});
test('validates complete segment data and rejects an unreported airport change',()=>{
 assert.equal(normaliseSerpFlight({flights:[segment('CPH','BKK','2027-02-09 14:00','2027-02-10 06:00')]}).length,1);
 assert.equal(normaliseSerpFlight({flights:[{...segment('CPH','BKK','2027-02-09 14:00','2027-02-10 06:00'),flight_number:''}]}).length,0);
 assert.equal(normaliseSerpFlight({flights:[segment('CPH','LHR','2027-02-09 14:00','2027-02-09 16:00'),segment('LGW','BKK','2027-02-09 18:00','2027-02-10 06:00')]}).length,0);
});
test('bounded family open-jaw pilot preserves arrival dates, separate journeys and safe provenance',async()=>{
 const calls:URL[]=[];
 const fetcher:typeof fetch=async(input)=>{const u=new URL(String(input));calls.push(u);assert.equal(u.hostname,'serpapi.com');assert.equal(u.searchParams.get('type'),'2');assert.equal(u.searchParams.get('children'),'1');const out=u.searchParams.get('departure_id')==='CPH';const day=u.searchParams.get('outbound_date')!;return Response.json({best_flights:[{price:123,flights:[segment(out?'CPH':'CNX',out?'BKK':'CPH',day+' 14:00',(out?'2027-02-10':day)+' 20:00')]}]});};
 const plan=await planFlights(undefined,{departureAirport:'CPH',travelStartDate:'2027-02-10',travelEndDate:'2027-02-17',adults:2,children:1,childAges:[7]},[{place:'Thailand: Bangkok'},{place:'Thailand: Chiang Mai'}],'private-key',fetcher);
 assert.equal(calls.length,3);assert.equal(plan.status,'search-results');assert.equal(plan.offers[0].slices[1][0].origin,'CNX');assert.equal(plan.offers[0].totalAmount,undefined);assert.doesNotMatch(JSON.stringify(plan),/private-key|api_key|departure_token/);
 assert.match(flightTable(plan.offers[0]),/searched separately/);assert.doesNotMatch(flightTable(plan.offers[0]),/Sandbox/);assert.match(renderFlights(plan.offers[0]),/Google Flights via SerpApi/);
});
test('supplier errors do not leak key or provider body',async()=>{
 await assert.rejects(searchSerpFlights('secret',{origin:'CPH',destination:'BKK',date:'2027-02-09',adults:2,children:0},async()=>Response.json({error:'secret upstream error'},{status:401})),e=>e instanceof Error&&!/secret/.test(e.message));
});
test('does not guess infant seating or child age categories',async()=>{
 let calls=0;const fetcher:typeof fetch=async()=>{calls++;return Response.json({best_flights:[]})};
 const route=[{place:'Thailand: Bangkok'},{place:'Thailand: Chiang Mai'}];
 for(const childAges of [undefined,[1]]){
 const plan=await planFlights(undefined,{departureAirport:'CPH',travelStartDate:'2027-02-10',travelEndDate:'2027-02-17',adults:2,children:1,childAges},route,'private-key',fetcher);
 assert.equal(plan.status,'needs-details');
 }
 assert.equal(calls,0);
});
