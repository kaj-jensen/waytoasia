import test from 'node:test';
import assert from 'node:assert/strict';
import {protectRequest} from '../functions/_lib/request-guard.ts';
const env={REQUEST_GUARD:{fetch:async()=>new Response(null,{status:204})}};
const request=(body='ok',headers={})=>new Request('https://example.com/api/lead',{method:'POST',headers,body});
test('bounds actual bytes even without a correct declared length',async()=>{
 for(const headers of [{},{'Content-Length':'1'}]){
  const result=await protectRequest(request('x'.repeat(33),headers),env,32);
  assert.ok(result instanceof Response);assert.equal(result.status,413);
 }
});
test('preserves valid body, type and origin for the downstream form handler',async()=>{
 const result=await protectRequest(request('name=Guest',{'Content-Type':'application/x-www-form-urlencoded',Origin:'https://example.com'}),env,100);
 assert.ok(result instanceof Request);assert.equal(await result.text(),'name=Guest');assert.equal(result.headers.get('Content-Type'),'application/x-www-form-urlencoded');
});
test('blocks wrong origins, missing service and exhausted limits',async()=>{
 assert.equal((await protectRequest(request('ok',{Origin:'https://attacker.example'}),env,100) as Response).status,403);
 assert.equal((await protectRequest(request(),{},100) as Response).status,503);
 assert.equal((await protectRequest(request(),{REQUEST_GUARD:{fetch:async()=>new Response(null,{status:429})}},100) as Response).status,429);
});
test('opaque origin is allowed only for explicitly selected private-token response routes',async()=>{
 assert.equal((await protectRequest(request('ok',{Origin:'null'}),env,100) as Response).status,403);
 assert.ok(await protectRequest(request('ok',{Origin:'null'}),env,100,true) instanceof Request);
});
