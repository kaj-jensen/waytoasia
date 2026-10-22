import {protectRequest} from '../_lib/request-guard';
interface Context { request:Request; env:{REQUEST_GUARD?:{fetch(request:Request):Promise<Response>}}; next(request?:Request):Promise<Response> }
export const onRequest=async({request,env,next}:Context):Promise<Response>=>{
 const path=new URL(request.url).pathname;
 const max=path==='/api/lead'?50000:path==='/api/trip-enquiry'?250000:path==='/api/trip-suggestion'?100000:path==='/api/supplier-availability'?10000:/^\/api\/proposals\/[^/]+\/response\/?$/.test(path)?20000:0;
 if(request.method!=='POST'||!max)return next();
 const protectedRequest=await protectRequest(request,env,max,/^\/api\/proposals\/[^/]+\/response\/?$/.test(path));
 if(protectedRequest instanceof Response)return protectedRequest;
 return next(protectedRequest);
};
