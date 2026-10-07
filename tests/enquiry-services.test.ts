import test from 'node:test';
import assert from 'node:assert/strict';
import {enquiryServices} from '../functions/_lib/enquiry-services';
const payload={suggestion:{title:'Journey',hotelStays:[{place:'Bangkok',nights:3,options:[{id:'h',name:'Saved hotel'}]}],dayPlans:[{day:1,place:'Bangkok',options:[{id:'a',name:'Temple tour',type:'excursion'}]},{day:2,place:'Bangkok',options:[]}],route:[{place:'Bangkok',onwardTravel:'Train to Chiang Mai'},{place:'Chiang Mai'}],priceEstimate:{currency:'EUR',totalLow:4000,totalHigh:5000}},builderChoices:{hotels:{'stay-0':'h'},days:{'day-1':'a'},flightItinerary:{source:'duffel-test',totalAmount:'1200.50',totalCurrency:'USD',slices:[[{origin:'CPH',destination:'LHR',airline:'Test airline'},{origin:'LHR',destination:'BKK',airline:'Test airline'}],[{origin:'BKK',destination:'CPH',airline:'Test airline'}]]}}};
test('all selected services and whole-trip ranges resolve from original and wrapped revisions',()=>{
 for(const snapshot of [JSON.stringify(payload),JSON.stringify({payload,estimatedPrice:'Revised quote: EUR 5,200'})]){
 const source=enquiryServices('{}',snapshot);assert.equal(source.services.length,5);assert.equal(source.services[0].description,'Bangkok · Saved hotel');assert.equal(source.services[0].price,null);assert.equal(source.services[1].type,'Excursions');assert.equal(source.services[2].status,'Not selected');assert.equal(source.planning?.low,4000);
 const flight=source.services.find(s=>s.type==='Flights')!;assert.equal(flight.price?.low,1200.5);assert.match(flight.description,/CPH → LHR → BKK/);assert.match(flight.price!.basis,/all flights/);
 }
 assert.equal(enquiryServices('{}',JSON.stringify({payload,estimatedPrice:'Revised quote: EUR 5,200'})).proposalPrice,'Revised quote: EUR 5,200');
});
test('catalogue inclusions stay bundled, exclusions are explicit, absent fares remain unknown',()=>{
 const source=enquiryServices(JSON.stringify({tour:'silk-and-courtyards',adults:2,children:0,budgetCurrency:'DKK'}));assert.equal(source.services[0].price?.low,98400);assert.ok(source.services.some(s=>s.type==='Hotels'&&s.status==='Included in package'&&s.price===null));assert.ok(source.services.some(s=>s.type==='Flights'&&s.status==='Excluded from package'));
 const legacy=structuredClone(payload);delete (legacy.builderChoices.flightItinerary as {totalAmount?:string}).totalAmount;assert.equal(enquiryServices('{}',JSON.stringify(legacy)).services.find(s=>s.type==='Flights')!.price,null);
 assert.equal(enquiryServices('{}','invalid').services.length,0);
});
