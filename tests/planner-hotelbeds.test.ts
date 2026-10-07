import test from 'node:test';
import assert from 'node:assert/strict';
import {enrichWithHotelbeds,hotelbedsGateway} from '../functions/_lib/planner-hotelbeds';
import {hbxImage} from '../src/lib/suppliers/hbx';
import {parseTripPlannerRequest,type TripSuggestion} from '../src/lib/tripPlanner';
const env={HBX_HOTEL_API_KEY:'test-hotel',HBX_HOTEL_SECRET:'secret',HBX_ACTIVITY_API_KEY:'test-activity',HBX_ACTIVITY_SECRET:'secret',HBX_TRANSFER_API_KEY:'test-transfer',HBX_TRANSFER_SECRET:'secret'};
const profile=parseTripPlannerRequest({locale:'en',destinations:['thailand'],travelStartDate:'2027-02-10',travelEndDate:'2027-02-17',adults:2,children:0,budget:'comfort',interests:['nature']})!;
const suggestion=()=>({hotelStays:[{place:'Thailand: Bangkok',nights:3,options:[]},{place:'Thailand: Chiang Mai',nights:4,options:[]}],dayPlans:[{day:2,place:'Thailand: Bangkok',options:[]},{day:4,place:'Thailand: Chiang Mai',options:[]}]} as unknown as TripSuggestion);
test('uses exact Hotelbeds products for hotels, airport transfers and tours without disclosing rate keys',async()=>{
 const calls:string[]=[];
 const fetcher:typeof fetch=async(url,init)=>{
  const path=new URL(String(url)).pathname;calls.push(path);
  if(path==='/hotel-api/1.0/hotels'){const body=JSON.parse(String(init?.body));if(body.geolocation)return Response.json({hotels:{hotels:[]}});assert.equal(body.stay.checkIn,'2027-02-10');assert.equal(body.stay.checkOut,'2027-02-13');return Response.json({hotels:{currency:'EUR',hotels:[{code:123,name:'Bangkok Riverside Hotel',categoryName:'4 STARS',rooms:[{name:'Double room',rates:[{rateKey:'private-hotel-token',net:350,boardName:'BREAKFAST'}]}]}]}});}
  if(path.includes('/hotel-content-api/'))return Response.json({hotel:{code:123,address:{content:'Bangkok riverside'},images:[{path:'00/000123/000123a_hb_f_001.jpg',visualOrder:0}]}});
  if(path.includes('/transfer-api/'))return Response.json({services:[{serviceId:'transfer-123',rateKey:'private-transfer-token',vehicle:{name:'Car'},price:{totalAmount:35,currencyId:'EUR'}}]});
  if(path.includes('/activity-api/'))return Response.json({activities:[{activityCode:'tour-123',name:'Bangkok Park Walk',content:{description:'Guided park walk',media:{images:[{urls:[{sizeType:'LARGE',resource:'https://photos.hotelbeds.com/tour-123.jpg'}]}]}},modalities:[{code:'walk',name:'Morning walk',currency:'EUR',amountsFrom:[{amount:25}]}]}]});
  throw Error('Unexpected endpoint '+path);
 };
 const composite=suggestion();composite.hotelStays[0].place='Thailand: Bangkok & Ayutthaya';composite.hotelStays[0].options=[{name:'Eastin Bangkok Hotel',area:'Bangkok'} as never,{name:'Amara Bangkok',area:'Silom'} as never];
 const result=await enrichWithHotelbeds(env,profile,composite,fetcher);
 assert.equal(calls.length,6);assert.equal(result.hotelStays[0].options[0].supplierQuote?.provider,'Hotelbeds');
 assert.match(result.hotelStays[0].options[0].imageUrl!,/000123a_hb_f_001/);
 assert.equal(result.dayPlans[0].options[0].supplierProductId,'tour-123');assert.match(result.dayPlans[0].options[0].imageUrl!,/tour-123/);
 assert.equal(result.airportTransfers?.[0].hotel,'Bangkok Riverside Hotel');assert.match(result.airportTransfers![0].offers[0].description,/Provisional 15:00/);
 assert.doesNotMatch(JSON.stringify(result),/private-.*-token|test-hotel|secret/);
 assert.match(result.hotelStays[1].supplierNote!,/No Hotelbeds hotel/);
});
test('no guessed child ages or unsupported destinations, and errors preserve researched suggestions',async()=>{
 let calls=0;const fetcher:typeof fetch=async()=>{calls++;throw Error('quota')};
 await enrichWithHotelbeds(env,{...profile,children:1},suggestion(),fetcher);assert.equal(calls,0);
 const result=await enrichWithHotelbeds(env,profile,suggestion(),fetcher);assert.equal(result.hotelStays[0].options.length,0);assert.match(result.hotelStays[0].supplierNote!,/unavailable/);
 assert.equal(hotelbedsGateway('Bangkok & Khao Yai',['thailand']),undefined);assert.equal(hotelbedsGateway('Japan: Tokyo',['japan']),undefined);
 assert.equal(hbxImage('https://photos.hotelbeds.com.evil.example/photo.jpg'),undefined);assert.equal(hbxImage('javascript:alert(1)'),undefined);
});

test('accepts supplied family ages and curated coordinates, without guessing composite bases',async()=>{
 const {hotelbedsLocation}=await import('../src/lib/suppliers/locations');
 assert.equal(hotelbedsLocation('Thailand: Chiang Mai',['thailand'])?.latitude,18.7904);
 assert.equal(hotelbedsLocation('Japan: Tokyo',[])?.longitude,139.6917);
 assert.equal(hotelbedsLocation('Hanoi & Ninh Binh',['vietnam']),undefined);
 assert.equal(hotelbedsLocation('Thailand: Bangkok & Ayutthaya',['thailand'],['Eastin Bangkok Sathorn','Amara Bangkok Hotel'])?.name,'Bangkok');
 assert.equal(hotelbedsLocation('Bangkok & Ayutthaya',[],['Eastin Bangkok Sathorn','Amara Bangkok Hotel'])?.name,'Bangkok');
 assert.equal(hotelbedsLocation('Bangkok',[])?.id,'bangkok');
 assert.equal(hotelbedsLocation('Northern Thailand: Chiang Mai & Surrounds',['thailand'],['Yaang Come Village Chiang Mai','Chiang Mai Old City'])?.name,'Chiang Mai');
 assert.equal(hotelbedsLocation('Bangkok & Ayutthaya',['thailand'],['Bangkok hotel','Ayutthaya hotel']),undefined);
 assert.equal(parseTripPlannerRequest({...profile,children:2,childAges:[7]}),null);
 assert.equal(parseTripPlannerRequest({...profile,children:1,childAges:[18]}),null);
 const family=parseTripPlannerRequest({...profile,children:1,childAges:[7]})!;let received=false;
 await enrichWithHotelbeds(env,family,suggestion(),async(url,init)=>{if(String(url).includes('/hotel-api/')){const body=JSON.parse(String(init?.body));assert.equal(body.occupancies[0].paxes[0].age,7);if(body.geolocation)assert.equal(body.geolocation.latitude,18.7904);received=true;}return Response.json({hotels:{hotels:[]},activities:[]})});assert.equal(received,true);
});
