import {duffelReady,searchFlights,type FlightItinerary} from './duffel';
export interface PlannerFlights {status:'not-connected'|'needs-details'|'unavailable'|'test-results';offers:FlightItinerary[]}
// Explicit airport aliases only. Ambiguous city names are left for the traveller to clarify.
const airports:Record<string,string>={copenhagen:'CPH',københavn:'CPH',oslo:'OSL',helsinki:'HEL',amsterdam:'AMS',frankfurt:'FRA',zurich:'ZRH',zürich:'ZRH',vienna:'VIE',wien:'VIE',budapest:'BUD',bangkok:'BKK',chiangmai:'CNX',phuket:'HKT',hanoi:'HAN',hochiminhcity:'SGN',saigon:'SGN',danang:'DAD',singapore:'SIN',seoul:'ICN',busan:'PUS',jeju:'CJU',tokyo:'HND',osaka:'KIX',beijing:'PEK',shanghai:'PVG',hongkong:'HKG',bali:'DPS',denpasar:'DPS',jakarta:'CGK',manila:'MNL',kualalumpur:'KUL',taipei:'TPE'};
export function resolveAirport(value:unknown):string {if(typeof value!=='string')return '';const explicit=value.match(/\(([A-Z]{3})\)/i);if(explicit)return explicit[1].toUpperCase();const name=value.split(':').at(-1)!.trim();const code=name.toUpperCase();if(/^[A-Z]{3}$/.test(code))return code;return airports[name.toLowerCase().replace(/[^\p{L}]/gu,'')]||'';}
export async function planFlights(token:string|undefined,profile:{departureAirport?:string;travelStartDate?:string;travelEndDate?:string;adults:number;children:number},route:Array<{place:string}>):Promise<PlannerFlights>{
 const empty=(status:PlannerFlights['status']):PlannerFlights=>({status,offers:[]});
 if(!duffelReady(token))return empty('not-connected');
 const origin=resolveAirport(profile.departureAirport),destination=resolveAirport(route[0]?.place),returnOrigin=resolveAirport(route.at(-1)?.place);
 if(!origin||!destination||!returnOrigin||!profile.travelStartDate||!profile.travelEndDate||profile.children||profile.adults>9)return empty('needs-details');
 // The brief specifies arrival in Asia. Check same-day departures and overnight travel the preceding day.
 const date=new Date(`${profile.travelStartDate}T00:00:00Z`);if(Number.isNaN(date.getTime()))return empty('needs-details');date.setUTCDate(date.getUTCDate()-1);
 const dates=[date.toISOString().slice(0,10),profile.travelStartDate].filter(v=>v>=new Date().toISOString().slice(0,10));
 try{
  const offers:FlightItinerary[]=[];
  for(const departure of dates){offers.push(...await searchFlights(token,{origin,destination,returnOrigin,departure,returnDate:profile.travelEndDate,adults:profile.adults,cabin:'economy'}));}
  const matched=offers.filter(f=>f.slices.length===2&&f.slices[0][0].origin===origin&&f.slices[0].at(-1)?.destination===destination&&f.slices[0].at(-1)?.arrival.slice(0,10)===profile.travelStartDate&&f.slices[1][0].origin===returnOrigin&&f.slices[1][0].departure.slice(0,10)===profile.travelEndDate&&f.slices[1].at(-1)?.destination===origin);
  // Prefer fewer connections, then shorter total flying time. Never use sandbox prices to assess suitability.
  const duration=(f:FlightItinerary)=>f.slices.flat().reduce((n,s)=>{const match=s.duration.match(/^PT(?:(\d+)H)?(?:(\d+)M)?$/);return n+(match?Number(match[1]||0)*60+Number(match[2]||0):100000)},0);
  matched.sort((a,b)=>a.slices.flat().length-b.slices.flat().length||duration(a)-duration(b));
  const unique=matched.filter((f,i,all)=>all.findIndex(v=>v.offerId===f.offerId)===i).slice(0,3);
  return unique.length?{status:'test-results',offers:unique}:empty('unavailable');
 }catch{return empty('unavailable')}
}
