import test from 'node:test';
import assert from 'node:assert/strict';
import guard from '../workers/request-guard/index.mjs';
test('internal guard counts only opaque keys and fails closed',async()=>{
 const request=new Request('https://guard.internal/',{method:'POST',headers:{'X-Rate-Key':'example.com:/api/lead:192.0.2.1'}});
 const ok=await guard.fetch(request,{REQUEST_LIMIT:{limit:async({key})=>{assert.match(key,/^[a-f0-9]{64}$/);return {success:true}}}});
 assert.equal(ok.status,204);
 assert.equal((await guard.fetch(request,{REQUEST_LIMIT:{limit:async()=>({success:false})}})).status,429);
 assert.equal((await guard.fetch(request,{})).status,503);
});
