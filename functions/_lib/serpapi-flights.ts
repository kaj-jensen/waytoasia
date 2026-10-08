import type {FlightSegment} from './duffel';
const obj=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const text=(v:unknown)=>typeof v==='string'?v.slice(0,160):'';
const localTime=(v:unknown)=>{const s=text(v);if(!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(s))return '';const t=s.replace(' ','T')+':00';return Number.isNaN(Date.parse(t))?'':t;};
export function normaliseSerpFlight(value:unknown):FlightSegment[]{
 const offer=obj(value);if(!Array.isArray(offer.flights)||!offer.flights.length||offer.flights.length>6)return [];
 const segments=offer.flights.map(raw=>{const f=obj(raw),from=obj(f.departure_airport),to=obj(f.arrival_airport),minutes=Number(f.duration);return {origin:text(from.id),destination:text(to.id),departure:localTime(from.time),arrival:localTime(to.time),airline:text(f.airline),flightNumber:text(f.flight_number),duration:Number.isFinite(minutes)&&minutes>0?`PT${Math.floor(minutes)}M`:'',originName:text(from.name),destinationName:text(to.name),cabin:text(f.travel_class)||'Economy'};});
 if(segments.some(s=>!s.departure||!s.arrival||!s.duration||!s.airline||!s.flightNumber||! /^[A-Z]{3}$/.test(s.origin)||! /^[A-Z]{3}$/.test(s.destination)))return [];
 // A multi-airport connection cannot be treated as an ordinary layover.
 if(segments.some((s,i)=>i>0&&segments[i-1].destination!==s.origin))return [];
 return segments.map((segment,i)=>{
  const layover=obj(Array.isArray(offer.layovers)?offer.layovers[i]:undefined),minutes=Number(layover.duration);
  return i<segments.length-1&&layover.id===segment.destination&&Number.isFinite(minutes)&&minutes>=0?{...segment,connectionDuration:`PT${Math.floor(minutes)}M`}:segment;
 });
}
export async function searchSerpFlights(key:string,input:{origin:string;destination:string;date:string;adults:number;children:number;locale?:string;currency?:string;cabin?:string},fetcher:typeof fetch=fetch):Promise<FlightSegment[][]>{
 if(!key||! /^[A-Z]{3}$/.test(input.origin)||! /^[A-Z]{3}$/.test(input.destination)||! /^\d{4}-\d{2}-\d{2}$/.test(input.date)||input.adults<1||input.adults+input.children>9)throw Error('Invalid flight search details.');
 const url=new URL('https://serpapi.com/search.json');
 const params={engine:'google_flights',api_key:key,type:'2',departure_id:input.origin,arrival_id:input.destination,outbound_date:input.date,adults:String(input.adults),children:String(input.children),travel_class:({economy:'1',premium_economy:'2',business:'3',first:'4'}[input.cabin||'economy']||'1'),currency:input.currency||'EUR',hl:input.locale||'en',gl:'dk'};
 for(const [name,value] of Object.entries(params))url.searchParams.set(name,value);
 // Never propagate the request URL or provider error body: the URL contains a secret.
 let response:Response;try{response=await fetcher(url,{signal:AbortSignal.timeout(25000)});}catch{throw Error('Flight search did not respond.');}
 if(!response.ok)throw Error('Flight search unavailable.');
 let data:Record<string,unknown>;try{data=obj(await response.json());}catch{throw Error('Flight search unavailable.');}if(data.error)throw Error('Flight search unavailable.');
 return [...(Array.isArray(data.best_flights)?data.best_flights:[]),...(Array.isArray(data.other_flights)?data.other_flights:[])].map(normaliseSerpFlight).filter(s=>s.length&&s[0].origin===input.origin&&s.at(-1)!.destination===input.destination&&s[0].departure.slice(0,10)===input.date).slice(0,12);
}
