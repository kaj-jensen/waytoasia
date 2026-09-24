import {createHbxSandboxAdapter,hbxCredentialsFromEnv,type HbxSecretBindings} from '../../src/lib/suppliers/hbx';
import {addDays,availabilitySection,hbxGateways,parseHbxAvailabilityRequest,type HbxAvailabilityResponse,type HbxAvailabilitySection} from '../../src/lib/suppliers/availability';

interface PagesContext {request:Request;env:HbxSecretBindings}

const json=(body:unknown,status=200,extraHeaders:Record<string,string>={})=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extraHeaders}});
const isoCountry=/^[A-Z]{2}$/;

export const onRequestPost=async({request,env}:PagesContext):Promise<Response>=>{
  const length=Number(request.headers.get('content-length')||0);
  if(length>10_000)return json({error:'Request is too large.'},413);
  const origin=request.headers.get('origin');
  if(origin&&new URL(origin).hostname!==new URL(request.url).hostname)return json({error:'Invalid request origin.'},403);
  if(!request.headers.get('content-type')?.toLowerCase().includes('application/json'))return json({error:'Expected a JSON request.'},415);

  let raw:unknown;
  try{raw=await request.json()}catch{return json({error:'Invalid JSON request.'},400)}
  const query=parseHbxAvailabilityRequest(raw);
  if(!query)return json({error:'Choose a valid gateway, future arrival date and traveller group.'},400);

  const gateway=hbxGateways[query.gateway];
  const requestId=crypto.randomUUID();
  const travellerCountry=(request.headers.get('CF-IPCountry')??'DK').toUpperCase();
  const sourceMarket=isoCountry.test(travellerCountry)?travellerCountry:'DK';
  const party={adults:query.adults,childAges:query.childAges};
  const checkOut=addDays(query.checkIn,query.nights);
  const activityTo=addDays(query.checkIn,Math.min(query.nights-1,3));

  try{
    const adapter=createHbxSandboxAdapter({credentials:hbxCredentialsFromEnv(env),baseUrl:env.HBX_API_BASE_URL});
    const signal=AbortSignal.timeout(15_000);
    const [hotelResult,activityResult]=await Promise.allSettled([
      adapter.search({vertical:'accommodation',requestId:`${requestId}-hotel`,locale:query.locale,currency:query.currency,travellerCountry:sourceMarket,party,destination:{name:gateway.name,supplierCode:gateway.destinationCode},checkIn:query.checkIn,checkOut,rooms:[{adults:query.adults,childAges:query.childAges}]},signal),
      adapter.search({vertical:'activity',requestId:`${requestId}-activity`,locale:query.locale,currency:query.currency,travellerCountry:sourceMarket,party,destination:{name:gateway.name,supplierCode:gateway.destinationCode},from:query.checkIn,to:activityTo,interests:[]},signal),
    ]);
    const sections:HbxAvailabilitySection[]=[availabilitySection('accommodation',hotelResult),availabilitySection('activity',activityResult)];
    if(hotelResult.status==='fulfilled'&&hotelResult.value.offers[0]?.productId){
      const hotel=hotelResult.value.offers[0];
      const transferResult=await Promise.allSettled([adapter.search({vertical:'transfer',requestId:`${requestId}-transfer`,locale:query.locale,currency:query.currency,travellerCountry:sourceMarket,party,pickup:{type:'airport',name:`${gateway.name} airport`,code:gateway.airportCode},dropoff:{type:'hotel',name:hotel.title,code:hotel.productId},pickupAt:`${query.checkIn}T15:00:00${gateway.utcOffset}`,returnAt:`${checkOut}T11:00:00${gateway.utcOffset}`},signal)]);
      sections.push(availabilitySection('transfer',transferResult[0]));
    }else sections.push({vertical:'transfer',status:'skipped',offers:[],message:'Transfer search needs an HBX hotel result from the same check.'});
    const response:HbxAvailabilityResponse={provider:'HBX / Hotelbeds',environment:'evaluation-sandbox',bookable:false,gateway:{id:gateway.id,name:gateway.name},checkedAt:new Date().toISOString(),sections};
    return json(response);
  }catch(error){
    console.error(JSON.stringify({message:'HBX availability orchestration failed',requestId,error:error instanceof Error?error.message:'Unknown error'}));
    return json({error:'HBX sandbox availability is temporarily unavailable.',requestId},502);
  }
};

export const onRequestGet=()=>json({error:'Method not allowed.'},405,{Allow:'POST'});
