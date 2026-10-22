interface GuardEnv { REQUEST_GUARD?: { fetch(request: Request): Promise<Response> } }
export async function protectRequest(request: Request, env: GuardEnv, max: number, allowOpaque = false): Promise<Request | Response> {
 const error=(message:string,status:number)=>new Response(message,{status,headers:{'Cache-Control':'no-store',...(status===429?{'Retry-After':'60'}:{})}});
 const origin=request.headers.get('Origin');
 if(origin && !(allowOpaque && origin === "null")){try{if(new URL(origin).origin!==new URL(request.url).origin)return error('Invalid request origin.',403)}catch{return error('Invalid request origin.',403)}}
 if(Number(request.headers.get('Content-Length'))>max)return error('Request is too large.',413);
 if(!env.REQUEST_GUARD)return error('Please try again shortly.',503);
 try{
  const rate=await env.REQUEST_GUARD.fetch(new Request('https://request-guard.internal/',{method:'POST',headers:{'X-Rate-Key':new URL(request.url).hostname+':'+new URL(request.url).pathname.replace(/\/api\/proposals\/[^/]+/,'/api/proposals/token')+':'+(request.headers.get('CF-Connecting-IP')||'unknown')}}));
  if(rate.status!==204)return error(rate.status===429?'Too many requests. Please try again shortly.':'Please try again shortly.',rate.status===429?429:503);
 }catch{return error('Please try again shortly.',503)}
 const reader=request.body?.getReader(); const chunks:Uint8Array[]=[];let size=0;
 if(reader){try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();return error('Request is too large.',413)}chunks.push(value)}}catch{return error('Invalid request.',400)}finally{reader.releaseLock()}}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
 const headers=new Headers(request.headers);headers.delete('Content-Length');
 return new Request(request,{headers,body:bytes});
}
