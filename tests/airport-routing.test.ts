import test from 'node:test';
import assert from 'node:assert/strict';
import {routeGateway} from '../functions/_lib/airport-routing';
import {mapPlaces} from '../src/content/mapCoordinates';
import {normaliseOffer} from '../functions/_lib/duffel';
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
test('China Lijiang return route reaches Duffel with the correct airport',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async(_url,init)=>{const data=JSON.parse(String(init?.body)).data;assert.equal(data.slices[0].destination,'PEK');assert.equal(data.slices[1].origin,'LJG');const f=normaliseOffer({id:'off_china',live_mode:false,slices:[{segments:[{origin:{iata_code:'CPH'},destination:{iata_code:'PEK'},departing_at:'2026-12-13T14:00:00',arriving_at:'2026-12-14T06:00:00',duration:'PT10H'}]},{segments:[{origin:{iata_code:'LJG'},destination:{iata_code:'CPH'},departing_at:'2026-12-27T12:00:00',arriving_at:'2026-12-27T20:00:00',duration:'PT12H'}]}]});return Response.json({data:{live_mode:false,offers:[{id:f.offerId,live_mode:false,slices:f.slices.map(slice=>({segments:slice.map(s=>({origin:{iata_code:s.origin},destination:{iata_code:s.destination},departing_at:s.departure,arriving_at:s.arrival,duration:s.duration}))}))}]}})};
 try{const result=await planFlights('duffel_test_example',{departureAirport:'CPH',travelStartDate:'2026-12-14',travelEndDate:'2026-12-27',adults:2,children:0},[{place:'China: Beijing'},{place:'China: Lijiang, Yunnan Province'}]);assert.equal(result.status,'test-results');}finally{globalThis.fetch=original}
});
