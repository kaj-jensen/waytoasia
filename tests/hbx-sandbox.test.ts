import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import test from 'node:test';
import {createHbxSandboxAdapter,createHbxSignature,HbxSandboxError} from '../src/lib/suppliers/hbx';

const credentials={
  accommodation:{apiKey:'hotel-key',secret:'hotel-secret'},
  activity:{apiKey:'activity-key',secret:'activity-secret'},
  transfer:{apiKey:'transfer-key',secret:'transfer-secret'},
};

test('HBX signature is a lowercase SHA-256 hash of key, secret and Unix timestamp',async()=>{
  const timestamp=1_700_000_000;
  const expected=createHash('sha256').update(`hotel-keyhotel-secret${timestamp}`).digest('hex');
  assert.equal(await createHbxSignature('hotel-key','hotel-secret',timestamp),expected);
});

test('HBX adapter rejects live and non-HBX hosts',()=>{
  assert.throws(()=>createHbxSandboxAdapter({credentials,baseUrl:'https://api.hotelbeds.com'}),HbxSandboxError);
  assert.throws(()=>createHbxSandboxAdapter({credentials,baseUrl:'https://example.com'}),HbxSandboxError);
});

test('hotel search signs the sandbox request and normalizes rates',async()=>{
  let captured:Request|undefined;
  const adapter=createHbxSandboxAdapter({credentials,now:()=>1_700_000_000_000,fetcher:async(input,init)=>{
    captured=new Request(input,init);
    return Response.json({hotels:{currency:'EUR',hotels:[{code:101,name:'Riverside Hotel',categoryName:'4 STARS',rooms:[{name:'Deluxe river room',rates:[{rateKey:'hotel-rate',rateType:'RECHECK',net:'125.50',boardName:'BREAKFAST',cancellationPolicies:[{amount:'125.50',from:'2027-02-10T23:59:00+07:00'}]}]}]}]}});
  }});
  const result=await adapter.search({vertical:'accommodation',requestId:'req-1',locale:'en',currency:'EUR',travellerCountry:'DK',party:{adults:2,childAges:[]},destination:{name:'Bangkok',supplierCode:'BKK'},checkIn:'2027-02-12',checkOut:'2027-02-14',rooms:[{adults:2,childAges:[]}]},new AbortController().signal);
  assert.equal(captured?.url,'https://api.test.hotelbeds.com/hotel-api/1.0/hotels');
  assert.equal(captured?.headers.get('api-key'),'hotel-key');
  assert.equal(captured?.headers.get('x-signature'),await createHbxSignature('hotel-key','hotel-secret',1_700_000_000));
  assert.equal(result.offers[0]?.total.amountMinor,12550);
  assert.equal(result.offers[0]?.recheckRequired,true);
  assert.equal(result.offers[0]?.cancellation[0]?.deadline,'2027-02-10T23:59:00+07:00');
});

test('transfer search uses only the availability endpoint and normalizes services',async()=>{
  let capturedUrl='';
  const adapter=createHbxSandboxAdapter({credentials,fetcher:async(input)=>{
    capturedUrl=String(input);
    return Response.json({services:[{serviceId:'22',transferType:'PRIVATE',direction:'ARRIVAL',vehicle:{name:'Car'},category:{name:'Standard'},price:{totalAmount:42.75,currencyId:'EUR'},rateKey:'transfer-rate',cancellationPolicies:[]}]});
  }});
  const result=await adapter.search({vertical:'transfer',requestId:'req-2',locale:'en',currency:'EUR',travellerCountry:'DK',party:{adults:2,childAges:[2,8]},pickup:{type:'airport',name:'Bangkok Airport',code:'BKK'},dropoff:{type:'hotel',name:'Hotel',code:'1234'},pickupAt:'2027-02-12T15:30:00+07:00'},new AbortController().signal);
  assert.match(capturedUrl,/\/transfer-api\/1\.0\/availability\/en\/from\/IATA\/BKK\/to\/ATLAS\/1234\/2027-02-12T15:30:00\/2\/1\/1$/);
  assert.equal(result.offers[0]?.total.amountMinor,4275);
  assert.equal(result.offers[0]?.title,'Car transfer');
});

test('activity search uses the activity key and keeps short-lived rate keys recheckable',async()=>{
  let captured:Request|undefined;
  const adapter=createHbxSandboxAdapter({credentials,fetcher:async(input,init)=>{
    captured=new Request(input,init);
    return Response.json({activities:[{code:'ACT-1',name:'Bangkok food walk',type:'EXCURSION',modalities:[{name:'Evening tour',currency:'EUR',rates:[{rateKey:'activity-rate',amountFrom:38,cancellationPolicies:[]}]}]}]});
  }});
  const result=await adapter.search({vertical:'activity',requestId:'req-activity',locale:'en',currency:'EUR',travellerCountry:'DK',party:{adults:2,childAges:[10]},destination:{name:'Bangkok',supplierCode:'BKK'},from:'2027-02-12',to:'2027-02-13',interests:['food']},new AbortController().signal);
  assert.equal(captured?.url,'https://api.test.hotelbeds.com/activity-api/3.0/activities/availability');
  assert.equal(captured?.headers.get('api-key'),'activity-key');
  assert.equal(result.offers[0]?.productId,'ACT-1');
  assert.equal(result.offers[0]?.total.amountMinor,3800);
  assert.match(result.offers[0]?.expiresAt??'',/^\d{4}-\d{2}-\d{2}T/);
});

test('search validation prevents a network call without HBX destination codes',async()=>{
  let called=false;
  const adapter=createHbxSandboxAdapter({credentials,fetcher:async()=>{called=true;return Response.json({});}});
  await assert.rejects(()=>adapter.search({vertical:'activity',requestId:'req-3',locale:'en',currency:'EUR',travellerCountry:'DK',party:{adults:2,childAges:[]},destination:{name:'Bangkok'},from:'2027-02-12',to:'2027-02-13',interests:['food']},new AbortController().signal),/destination supplier code/);
  assert.equal(called,false);
});

test('activity availability reads nested rateDetails and supplier currency',async()=>{
 const adapter=createHbxSandboxAdapter({credentials,fetcher:async()=>Response.json({activities:[{code:'REAL-SHAPE',name:'Bangkok tour',currency:'THB',content:{media:{images:[{urls:[{sizeType:'LARGE',resource:'https://media.activitiesbank.com/tour.jpg'}]}]}},modalities:[{name:'Guided tour',rates:[{rateCode:'STANDARD',rateDetails:[{rateKey:'nested-rate',totalAmount:{amount:2100}}]}]}]}]})});
 const result=await adapter.search({vertical:'activity',requestId:'nested',locale:'en',currency:'EUR',travellerCountry:'DK',party:{adults:2,childAges:[]},destination:{name:'Bangkok',supplierCode:'BKK'},from:'2027-02-10',to:'2027-02-10',interests:[]},new AbortController().signal);
 assert.equal(result.offers[0]?.productId,'REAL-SHAPE');assert.equal(result.offers[0]?.total.amountMinor,210000);assert.equal(result.offers[0]?.total.currency,'THB');assert.equal(result.offers[0]?.imageUrl,'https://media.activitiesbank.com/tour.jpg');
});

test('production searches require explicit approval and the exact official production host',async()=>{
 const {createConfiguredHbxAdapter}=await import('../src/lib/suppliers/hbx');
 const env={HBX_HOTEL_API_KEY:'h',HBX_HOTEL_SECRET:'s',HBX_ACTIVITY_API_KEY:'a',HBX_ACTIVITY_SECRET:'s',HBX_TRANSFER_API_KEY:'t',HBX_TRANSFER_SECRET:'s',HBX_ENVIRONMENT:'production' as const};
 assert.throws(()=>createConfiguredHbxAdapter(env),/not been approved/);
 assert.throws(()=>createConfiguredHbxAdapter({...env,HBX_PRODUCTION_APPROVED:'true',HBX_API_BASE_URL:'https://api.test.hotelbeds.com'}),/official HTTPS/);
 let captured='';const adapter=createConfiguredHbxAdapter({...env,HBX_PRODUCTION_APPROVED:'true'},async(url)=>{captured=String(url);return Response.json({hotels:{hotels:[]}})});
 await adapter.search({vertical:'accommodation',requestId:'approved',locale:'en',currency:'EUR',travellerCountry:'DK',party:{adults:2,childAges:[]},destination:{name:'Chiang Mai',latitude:18.7904,longitude:98.985},checkIn:'2027-02-10',checkOut:'2027-02-14',rooms:[{adults:2,childAges:[]}]},new AbortController().signal);
 assert.equal(captured,'https://api.hotelbeds.com/hotel-api/1.0/hotels');assert.equal(adapter.capability.searchOnly,true);assert.equal(adapter.capability.status,'production-ready');
});

test('batches exact hotel IDs and caches successful photographs without mixing products',async()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'caches');const saved=new Map<string,Response>();let calls=0;
 Object.defineProperty(globalThis,'caches',{configurable:true,value:{default:{match:async(r:Request)=>saved.get(r.url)?.clone(),put:async(r:Request,response:Response)=>{assert.match(response.headers.get('cache-control')!,/604800/);saved.set(r.url,response.clone())}}}});
 try{
  const adapter=createHbxSandboxAdapter({credentials,fetcher:async(input)=>{calls++;const url=new URL(String(input));assert.equal(url.pathname,'/hotel-content-api/1.0/hotels');assert.equal(url.searchParams.get('codes'),'101,202');return Response.json({hotels:[{code:202,address:{content:'Hue'},images:[{path:'02/202.jpg'}]},{code:101,address:{content:'Ninh Binh'},images:[{path:'01/101.jpg'}]},{code:999,images:[{path:'09/999.jpg'}]}]})}});
  const content=await adapter.hotelContents(['101','202','101','bad'],AbortSignal.timeout(1000));
  assert.match(content.get('101')!.imageUrl!,/101.jpg/);assert.equal(content.get('202')!.address,'Hue');assert.equal(content.has('999'),false);
  assert.match((await adapter.hotelContent('202',AbortSignal.timeout(1000)))!.imageUrl!,/202.jpg/);assert.equal(calls,1);
 }finally{if(previous)Object.defineProperty(globalThis,'caches',previous);else Reflect.deleteProperty(globalThis,'caches')}
});
