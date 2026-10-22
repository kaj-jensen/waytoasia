// Internal service only: no routes, workers.dev endpoint or version URLs.
export default {async fetch(request,env){
 const key=request.headers.get('X-Rate-Key');
 if(request.method!=='POST'||!key||key.length>1000)return new Response(null,{status:400});
 try{
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key));
  const opaque=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  const {success}=await env.REQUEST_LIMIT.limit({key:opaque});
  return new Response(null,{status:success?204:429,headers:{'Cache-Control':'no-store','Retry-After':'60'}});
 }catch{return new Response(null,{status:503,headers:{'Cache-Control':'no-store'}})}
}};
