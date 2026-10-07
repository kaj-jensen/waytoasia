import {searchSerpFlights} from './serpapi-flights';
import {routeGateway,airportLabel,type AirportStop} from './airport-routing';
import {duffelReady,searchFlights,type FlightItinerary} from './duffel';
export interface PlannerFlights {provider?:'serpapi';status:'not-connected'|'needs-details'|'unavailable'|'test-results'|'search-results';offers:FlightItinerary[];issues?:string[];transfers?:Array<{place:string;airport:string;airportName?:string}>}
// Explicit airport aliases only. Ambiguous city names are left for the traveller to clarify.
const airports:Record<string,string>={copenhagen:'CPH',københavn:'CPH',oslo:'OSL',helsinki:'HEL',amsterdam:'AMS',frankfurt:'FRA',zurich:'ZRH',zürich:'ZRH',vienna:'VIE',wien:'VIE',budapest:'BUD',bangkok:'BKK',chiangmai:'CNX',phuket:'HKT',hanoi:'HAN',hochiminhcity:'SGN',saigon:'SGN',danang:'DAD',singapore:'SIN',seoul:'ICN',busan:'PUS',jeju:'CJU',tokyo:'HND',osaka:'KIX',beijing:'PEK',shanghai:'PVG',hongkong:'HKG',bali:'DPS',denpasar:'DPS',jakarta:'CGK',manila:'MNL',kualalumpur:'KUL',taipei:'TPE'};
export function resolveAirport(value:unknown):string {if(typeof value!=='string')return '';const explicit=value.match(/\(([A-Z]{3})\)/i);if(explicit)return explicit[1].toUpperCase();const name=value.split(':').at(-1)!.trim();const code=name.toUpperCase();if(/^[A-Z]{3}$/.test(code))return code;return airports[name.toLowerCase().replace(/[^\p{L}]/gu,'')]||'';}
// Gateways for places without a suitable international airport. Transfers are shown explicitly.
const gateways:Record<string,string>={mekongdelta:'SGN',hoian:'DAD',ninhbinh:'HAN',halongbay:'HAN',ubud:'DPS',seogwipo:'CJU'};
export function resolveRouteAirport(value:string):{airport:string;transfer:boolean}{
 const exact=resolveAirport(value);if(exact)return {airport:exact,transfer:false};
 const name=value.split(':').at(-1)!.toLowerCase().normalize('NFD').replace(/\p{M}/gu,'');
 const compact=name.replace(/[^\p{L}]/gu,'');
 for(const [place,airport] of Object.entries(gateways))if(compact===place||name.includes(place.replace('mekongdelta','mekong delta')))return {airport,transfer:true};
 const candidates=Object.entries(airports).filter(([alias])=>{
  const words=alias==='hochiminhcity'?'ho chi minh city':alias==='chiangmai'?'chiang mai':alias==='danang'?'da nang':alias==='hongkong'?'hong kong':alias==='kualalumpur'?'kuala lumpur':alias;
  return new RegExp(`(^|[^\\p{L}])${words}([^\\p{L}]|$)`,'u').test(name);
 }).map(([,airport])=>airport);
 const unique=[...new Set(candidates)];
 return unique.length===1?{airport:unique[0],transfer:false}:unique.length>1?{airport:'',transfer:false}:routeGateway({place:value},'return');
}
export async function planFlights(token:string|undefined,profile:{departureAirport?:string;travelStartDate?:string;travelEndDate?:string;adults:number;children:number;childAges?:number[]},route:AirportStop[],serpKey?:string,fetcher:typeof fetch=fetch):Promise<PlannerFlights>{
 const empty=(status:PlannerFlights['status']):PlannerFlights=>({status,offers:[],...(serpKey?{provider:'serpapi' as const}:{})});
 if(!serpKey&&!duffelReady(token))return empty('not-connected');
 const pick=(stop:AirportStop|undefined,position:'arrival'|'return')=>{if(!stop)return {airport:'',transfer:false};const legacy=resolveRouteAirport(stop.place);return stop.airportCode?routeGateway(stop,position):legacy.airport?routeGateway({...stop,airportCode:legacy.airport,airportTransfer:legacy.transfer},position):routeGateway(stop,position);};
 const first=pick(route[0],'arrival'),last=pick(route.at(-1),'return');
 const origin=resolveAirport(profile.departureAirport)||routeGateway({place:profile.departureAirport||''},'arrival').airport,destination=first.airport,returnOrigin=last.airport;
 const transfers=[...(first.transfer?[{place:route[0].place,airport:destination,airportName:airportLabel(destination)}]:[]),...(last.transfer?[{place:route.at(-1)!.place,airport:returnOrigin,airportName:airportLabel(returnOrigin)}]:[])];
 const issues=[...(!origin?['departure']:[]),...(!destination?['arrival']:[]),...(!returnOrigin?['return']:[]),...(!profile.travelStartDate||!profile.travelEndDate?['dates']:[]),...((!serpKey&&profile.children)||profile.adults+profile.children>9||(serpKey&&profile.children>0&&(profile.childAges?.length!==profile.children||profile.childAges.some(age=>!Number.isInteger(age)||age<2||age>17)))?['party']:[])];
 if(issues.length)return {...empty('needs-details'),issues};
 // The brief specifies arrival in Asia. Check same-day departures and overnight travel the preceding day.
 const date=new Date(`${profile.travelStartDate}T00:00:00Z`);if(Number.isNaN(date.getTime()))return empty('needs-details');date.setUTCDate(date.getUTCDate()-1);
 const dates=[date.toISOString().slice(0,10),profile.travelStartDate!].filter(v=>v>=new Date().toISOString().slice(0,10));
 if(serpKey){
  const adults=profile.adults+(profile.childAges??[]).filter(age=>age>=12).length,children=(profile.childAges??[]).filter(age=>age<12).length;
  // Bounded pilot: two possible outbound dates plus one homebound search.
  // Independent one-way searches never create a combined fare or ticket claim.
  const results=await Promise.allSettled([...dates.map(day=>searchSerpFlights(serpKey,{origin,destination,date:day,adults,children},fetcher)),searchSerpFlights(serpKey,{origin:returnOrigin,destination:origin,date:profile.travelEndDate!,adults,children},fetcher)]);
  const inbound=results.at(-1)!;const home=inbound.status==='fulfilled'?inbound.value:[];
  const out=results.slice(0,-1).flatMap(r=>r.status==='fulfilled'?r.value:[]).filter(s=>s.at(-1)!.arrival.slice(0,10)===profile.travelStartDate);
  if(!out.length||!home.length)console.warn('Flight schedule search returned no complete journey',{searches:results.map(r=>r.status==='fulfilled'?{status:'complete',count:r.value.length}:{status:'failed'}),outboundMatches:out.length,homeboundMatches:home.length});
  const duration=(s:import('./duffel').FlightSegment[])=>s.reduce((n,v)=>n+Number(v.duration.match(/^PT(\d+)M$/)?.[1]||100000),0);
  out.sort((a,b)=>a.length-b.length||duration(a)-duration(b));home.sort((a,b)=>a.length-b.length||duration(a)-duration(b));
  const offers:FlightItinerary[]=out.slice(0,3).flatMap((slice,i)=>home.length?[{source:'serpapi-google-flights' as const,offerId:`serpapi-${crypto.randomUUID()}`,retrievedAt:new Date().toISOString(),slices:[slice,home[Math.min(i,home.length-1)]],transfers}]:[]);
  return offers.length?{status:'search-results',provider:'serpapi',offers,transfers}:empty('unavailable');
 }
 try{
  // Search both departure dates concurrently; one failed search must not discard the other's offers.
  const results=await Promise.allSettled(dates.map(departure=>searchFlights(token,{origin,destination,returnOrigin,departure,returnDate:profile.travelEndDate,adults:profile.adults,cabin:'economy'})));
  const offers=results.flatMap(result=>result.status==='fulfilled'?result.value:[]);
  const matched=offers.filter(f=>f.slices.length===2&&f.slices[0][0].origin===origin&&f.slices[0].at(-1)?.destination===destination&&f.slices[0].at(-1)?.arrival.slice(0,10)===profile.travelStartDate&&f.slices[1][0].origin===returnOrigin&&f.slices[1][0].departure.slice(0,10)===profile.travelEndDate&&f.slices[1].at(-1)?.destination===origin);
  // Prefer fewer connections, then shorter total flying time. Never use sandbox prices to assess suitability.
  const duration=(f:FlightItinerary)=>f.slices.flat().reduce((n,s)=>{const match=s.duration.match(/^PT(?:(\d+)H)?(?:(\d+)M)?$/);return n+(match?Number(match[1]||0)*60+Number(match[2]||0):100000)},0);
  matched.sort((a,b)=>a.slices.flat().length-b.slices.flat().length||duration(a)-duration(b));
  const unique=matched.filter((f,i,all)=>all.findIndex(v=>v.offerId===f.offerId)===i).slice(0,3);
  return unique.length?{status:'test-results',offers:unique.map(f=>({...f,transfers})),transfers}:empty('unavailable');
 }catch{return empty('unavailable')}
}
