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
  assert.equal(captured?.url,'https://api.test.hotelbeds.com/activity-api/3.0/activities');
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
