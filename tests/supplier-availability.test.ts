import assert from 'node:assert/strict';
import test from 'node:test';
import {onRequestPost} from '../functions/api/supplier-availability';
import {addDays,parseHbxAvailabilityRequest} from '../src/lib/suppliers/availability';

const env={
  HBX_HOTEL_API_KEY:'hotel-key',HBX_HOTEL_SECRET:'hotel-secret',
  HBX_ACTIVITY_API_KEY:'activity-key',HBX_ACTIVITY_SECRET:'activity-secret',
  HBX_TRANSFER_API_KEY:'transfer-key',HBX_TRANSFER_SECRET:'transfer-secret',
  HBX_API_BASE_URL:'https://api.test.hotelbeds.com',
};

test('validates bounded future sandbox searches',()=>{
  const now=new Date('2026-09-24T12:00:00Z');
  assert.deepEqual(parseHbxAvailabilityRequest({locale:'da',gateway:'bangkok',checkIn:'2026-11-10',nights:8,adults:2,childAges:[7],currency:'DKK'},now),{locale:'da',gateway:'bangkok',checkIn:'2026-11-10',nights:8,adults:2,childAges:[7],currency:'DKK'});
  assert.equal(parseHbxAvailabilityRequest({gateway:'bangkok',checkIn:'2026-09-23',nights:8,adults:2,childAges:[]},now),null);
  assert.equal(addDays('2026-11-10',8),'2026-11-18');
});

test('orchestrates three read-only HBX checks and strips rate keys from the response',async()=>{
  const originalFetch=globalThis.fetch;
  const calls:string[]=[];
  globalThis.fetch=async(input)=>{
    const url=String(input);calls.push(url);
    if(url.endsWith('/hotel-api/1.0/hotels'))return Response.json({hotels:{currency:'EUR',hotels:[{code:321,name:'Bangkok Test Hotel',categoryName:'4 STARS',rooms:[{name:'River room',rates:[{rateKey:'secret-hotel-rate',net:'500',boardName:'BREAKFAST',cancellationPolicies:[]}]}]}]}});
    if(url.endsWith('/activity-api/3.0/activities/availability'))return Response.json({activities:[{activityCode:'ACT-1',content:{name:'Bangkok food walk'},modalities:[{name:'Evening tour',currency:'EUR',rates:[{rateKey:'secret-activity-rate',amountFrom:40,cancellationPolicies:[]}]}]}]});
    if(url.includes('/transfer-api/1.0/availability/'))return Response.json({services:[{serviceId:'T-1',vehicle:{name:'Car'},category:{name:'Standard'},price:{totalAmount:30,currencyId:'EUR'},rateKey:'secret-transfer-rate',cancellationPolicies:[]}]});
    return Response.json({}, {status:404});
  };
  try{
    const request=new Request('https://waytoasia.com/api/supplier-availability',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://waytoasia.com','CF-IPCountry':'DK'},body:JSON.stringify({locale:'en',gateway:'bangkok',checkIn:'2027-02-12',nights:7,adults:2,childAges:[],currency:'EUR'})});
    const response=await onRequestPost({request,env});
    assert.equal(response.status,200);
    const body=await response.json() as Record<string,unknown>;
    assert.equal(body.bookable,false);
    assert.equal(body.environment,'evaluation-sandbox');
    assert.equal(calls.length,3);
    assert.match(calls[2],/from\/IATA\/BKK\/to\/ATLAS\/321/);
    const serialized=JSON.stringify(body);
    assert.doesNotMatch(serialized,/secret-(?:hotel|activity|transfer)-rate/);
    assert.match(serialized,/Bangkok Test Hotel/);
    assert.match(serialized,/Bangkok food walk/);
  }finally{globalThis.fetch=originalFetch}
});
