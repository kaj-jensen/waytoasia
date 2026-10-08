import test from 'node:test';
import assert from 'node:assert/strict';
import {routeGateway} from '../functions/_lib/airport-routing';
import {mapPlaces} from '../src/content/mapCoordinates';
import {planFlights} from '../functions/_lib/planner-flights';
test('every catalogue map place has a geographically scoped airport gateway',()=>{
 for(const [country,entries] of Object.entries(mapPlaces))for(const place of Object.keys(entries))assert.ok(routeGateway({place:`${country==='south-korea'?'South Korea':country}: ${place}`},'return').airport,`${country}: ${place}`);
});
test('worldwide route gateways handle modifiers, regions, localised countries and validated model selections',()=>{
 for(const [place,code] of [['China: Lijiang, Yunnan Province','LJG'],['China: Dali, Yunnan Province','DLU'],['Japan: Kyoto','KIX'],['Nepal: Kathmandu','KTM'],['India: Delhi','DEL'],['Cambodia: Siem Reap','SAI'],['Laos: Luang Prabang','LPQ'],['Vietnam: Hoi An','DAD'],['Thailand: Khao Sok','URT']]){
 const metadata=place==='Japan: Kyoto'?{airportCode:'KIX',airportCountry:'JP',airportTransfer:true}:{};
 assert.equal(routeGateway({place,...metadata},'return').airport,code,place);
 }
 assert.equal(routeGateway({place:'Chine: Lijiang, Yunnan Province',airportCode:'LHR',airportCountry:'GB'},'return').airport,'LJG');
 assert.equal(routeGateway({place:'China: Lijiang',airportCode:'KMG',airportCountry:'CN'},'return').airport,'LJG');
 assert.equal(routeGateway({place:'Unidentified remote base',airportCode:'ZZZ'},'return').airport,'');
 assert.equal(routeGateway({place:'Japan: Kyoto',airportCode:'KIX',airportCountry:'JP',airportTransfer:true},'return').transfer,true);
});
test('China Lijiang return route reaches SerpApi with the correct airport',async()=>{
 const calls:URL[]=[];const fetcher:typeof fetch=async(input)=>{const u=new URL(String(input));calls.push(u);const from=u.searchParams.get('departure_id')!,to=u.searchParams.get('arrival_id')!,day=u.searchParams.get('outbound_date')!;return Response.json({best_flights:[{flights:[{departure_airport:{id:from,time:day+' 14:00'},arrival_airport:{id:to,time:(from==='CPH'?'2026-12-14':day)+' 20:00'},duration:600,airline:'Synthetic airline',flight_number:'TEST 1'}]}]})};
 const result=await planFlights('synthetic-key',{departureAirport:'CPH',travelStartDate:'2026-12-14',travelEndDate:'2026-12-27',adults:2,children:0},[{place:'China: Beijing'},{place:'China: Lijiang, Yunnan Province'}],fetcher);assert.equal(result.status,'search-results');assert.equal(calls.length,3);assert.equal(calls[0].searchParams.get('arrival_id'),'PEK');assert.equal(calls[2].searchParams.get('departure_id'),'LJG');
});
