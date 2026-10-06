import assert from 'node:assert/strict';
import test from 'node:test';
import {onRequest} from '../functions/_middleware';

const policy="default-src 'self'; script-src 'self'; object-src 'none'";
test('conditional HTML reloads get matching fresh nonces while asset caching and private headers survive',async()=>{
 Object.assign(globalThis,{HTMLRewriter:class {
  handler?:{element(element:{setAttribute(name:string,value:string):void}):void};
  on(_selector:string,handler:typeof this.handler){this.handler=handler;return this;}
  async transform(response:Response){const body=(await response.text()).replace(/<script\b/g,()=>{let nonce='';this.handler!.element({setAttribute:(_name,value)=>{nonce=value;}});return `<script nonce="${nonce}"`;});return new Response(body,response);}
 }});
 try{
  const request=new Request('https://waytoasia.com/en/',{headers:{'if-none-match':'"old"','if-modified-since':'Mon, 05 Oct 2026 12:00:00 GMT',accept:'text/html'}});
  async function load(cache='public, max-age=0, must-revalidate'){
   return onRequest({request,next:async forwarded=>{
    const incoming=forwarded??request;
    if(incoming.headers.has('if-none-match'))return new Response(null,{status:304,headers:{'content-security-policy':policy}});
    assert.equal(incoming.headers.has('if-modified-since'),false);
    return new Response('<script>window.example=true</script><script type="application/ld+json">{}</script>',{headers:{'content-type':'text/html','content-security-policy':policy,etag:'"old"','last-modified':'Mon, 05 Oct 2026 12:00:00 GMT','cache-control':cache}});
   }});
  }
  const nonces=[];
  for(let i=0;i<2;i++){
   const response=await load();assert.equal(response.status,200);assert.equal(response.headers.has('etag'),false);assert.equal(response.headers.has('last-modified'),false);
   const nonce=response.headers.get('content-security-policy')!.match(/'nonce-([^']+)'/)![1];nonces.push(nonce);
   const scriptNonces=[...(await response.text()).matchAll(/<script\b[^>]*\bnonce="([^"]+)"/g)].map(match=>match[1]);
   assert.deepEqual(scriptNonces,[nonce,nonce]);
  }
  assert.notEqual(nonces[0],nonces[1]);
  assert.equal((await load('private, no-store')).headers.get('cache-control'),'private, no-store');
  const asset=new Request('https://waytoasia.com/_astro/example.js',{headers:{'if-none-match':'"asset"'}});
  const response=await onRequest({request:asset,next:async forwarded=>{assert.equal((forwarded??asset).headers.get('if-none-match'),'"asset"');return new Response(null,{status:304,headers:{etag:'"asset"','cache-control':'public, max-age=31536000, immutable'}});}});
  assert.equal(response.status,304);assert.equal(response.headers.get('etag'),'"asset"');assert.match(response.headers.get('cache-control')!,/immutable/);
 }finally{Reflect.deleteProperty(globalThis,'HTMLRewriter');}
});


test('public proposal hostname isolates private website pages without breaking proposal routes or assets',async()=>{
 for(const path of ['/', '/en/', '/en/inspiration/', '/staff/', '/sitemap-index.xml', '/api/trip-suggestion', '//external.invalid/']){
  const response=await onRequest({request:new Request(`https://proposal.waytoasia.com${path}?private=value`),next:async()=>{throw new Error('Private website must not be served on public alias');}});
  assert.equal(response.status,302);assert.equal(response.headers.get('location'),`https://waytoasia.com${path}`);assert.equal(response.headers.get('cache-control'),'no-store');
 }
 const blocked=await onRequest({request:new Request('https://proposal.waytoasia.com/api/trip-suggestion',{method:'POST',body:'sensitive'}),next:async()=>{throw new Error('Unexpected website API dispatch');}});
 assert.equal(blocked.status,404);assert.equal(blocked.headers.has('location'),false);
 for(const path of ['/proposal/example', '/proposal/manage/example', '/api/proposals/example/response', '/proposal.css', '/proposal.js', '/images/proposals/beijing.jpg']){
  let called=false;const response=await onRequest({request:new Request(`https://proposal.waytoasia.com${path}`),next:async()=>{called=true;return new Response('fixture',{headers:{'content-type':'text/plain','cache-control':'private, no-store'}});}});
  assert.equal(called,true);assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');
 }
});


test('Pages default hostname redirects cannot change the destination host',async()=>{
 const response=await onRequest({request:new Request('https://waytoasia.pages.dev//external.invalid/?lang=en'),next:async()=>{throw new Error('Default host must redirect');}});
 assert.equal(response.status,308);assert.equal(response.headers.get('location'),'https://waytoasia.com//external.invalid/?lang=en');
});
