import {createHbxSandboxAdapter,hbxCredentialsFromEnv,type HbxSecretBindings} from '../../src/lib/suppliers/hbx';
import {addDays,hbxGateways} from '../../src/lib/suppliers/availability';
import {hotelOptionMatchesBudget,hotelStandardForBudget,tripPlannerCurrencyForLocale,type TripPlannerRequest,type TripSuggestion,type SuggestedHotelOption} from '../../src/lib/tripPlanner';

const normalized=(value:string)=>value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').trim();
export function hotelbedsGateway(place:string,destinations:string[]){
 const city=normalized(place.split(':').at(-1)||'');
 // Exact bases only. Do not map a region or composite chapter to the capital.
 return Object.values(hbxGateways).find(g=>destinations.includes(g.country)&&normalized(g.name)===city);
}
export async function enrichWithHotelbeds(env:HbxSecretBindings,profile:TripPlannerRequest,suggestion:TripSuggestion,fetcher:typeof fetch=fetch):Promise<TripSuggestion>{
 const note='Hotelbeds test suggestions only. Prices and services require consultant confirmation; no reservation is made.';
 let adapter:ReturnType<typeof createHbxSandboxAdapter>;
 try{adapter=createHbxSandboxAdapter({credentials:hbxCredentialsFromEnv(env),baseUrl:env.HBX_API_BASE_URL,fetcher});}catch{return {...suggestion,supplierPlanningNote:'Hotelbeds is not configured. These are researched suggestions, not supplier availability.'};}
 if(profile.children>0||profile.adults<1||profile.adults>8)return {...suggestion,supplierPlanningNote:'Hotelbeds needs child ages for family searches. These remain researched suggestions; a consultant will check supplier options.'};
 const totalNights=Math.round((Date.parse(profile.travelEndDate)-Date.parse(profile.travelStartDate))/86400000);
 if(!Number.isInteger(totalNights)||totalNights<1||suggestion.hotelStays.reduce((n,s)=>n+s.nights,0)!==totalNights)return {...suggestion,supplierPlanningNote:'Hotelbeds searches need confirmed overnight dates. The suggested nights do not yet match the travel dates.'};
 const result:TripSuggestion={...suggestion,hotelStays:suggestion.hotelStays.map(s=>({...s,options:[...s.options]})),dayPlans:suggestion.dayPlans.map(d=>({...d,options:[...d.options]})),airportTransfers:[],supplierPlanningNote:note};
 const currency=tripPlannerCurrencyForLocale[profile.locale]||'EUR';
 const context={requestId:crypto.randomUUID(),locale:profile.locale,currency,travellerCountry:'DK',party:{adults:profile.adults,childAges:[]}};
 const signal=AbortSignal.timeout(20000);
 let offset=0,searches=0;
 for(const stay of result.hotelStays){
  const checkIn=addDays(profile.travelStartDate,offset),checkOut=addDays(checkIn,stay.nights);offset+=stay.nights;
  const gateway=hotelbedsGateway(stay.place,profile.destinations);
  if(!gateway||searches>=3){stay.supplierNote='Researched recommendations. Hotelbeds destination coverage has not been verified for this stop.';continue;}
  searches++;
  const destination={name:gateway.name,supplierCode:gateway.destinationCode};
  const hotelQuery={...context,vertical:'accommodation' as const,destination,checkIn,checkOut,rooms:[{adults:profile.adults,childAges:[]}]};
  try{
   const hotels=await adapter.search(hotelQuery,signal);
   const seen=new Set<string>();
   const candidates=hotels.offers.filter(o=>{if(!o.productId||seen.has(o.productId)||o.total.amountMinor<=0)return false;seen.add(o.productId);return true;}).slice(0,6);
   const options:SuggestedHotelOption[]=[];
   for(const offer of candidates){
    const category=String(offer.attributes.category||'');
    const stars=Number(category.match(/(?:^|\s)([1-5])(?:\s|$)/)?.[1]);
    const required=profile.budget==='value'?3:profile.budget==='luxury'?5:4;
    if(stars!==required)continue;
    const standard=hotelStandardForBudget(profile.budget);
    const option:SuggestedHotelOption={id:`hotelbeds-${offer.productId}`,name:offer.title,area:gateway.name,standard,whyFit:'Hotelbeds supplier option for these overnight dates. Room and availability require confirmation.',roomGuidance:offer.summary,reviewSignal:'No independently verified review score supplied.',sources:[],supplierQuote:{provider:'Hotelbeds',mode:'sandbox',hotelId:offer.productId,checkin:checkIn,checkout:checkOut,amount:offer.total.amountMinor/100,currency:offer.total.currency,board:String(offer.attributes.board||''),basis:'Evaluation rate for the stated party in one room; Denmark source market assumed for testing.'}};
    if(!hotelOptionMatchesBudget(option,profile.budget))continue;
    try{const content=await adapter.hotelContent(offer.productId,signal);if(content){option.imageUrl=content.imageUrl;option.area=content.address||gateway.name;}}catch{/* Keep an accurate text card if content fails. */}
    options.push(option);if(options.length===2)break;
   }
   if(options.length){stay.options=options;stay.supplierNote=note;
    // Arrival time is a labelled search assumption, not an inferred flight arrival.
    try{if(checkIn===profile.travelStartDate){const transfers=await adapter.search({...context,vertical:'transfer',pickup:{type:'airport',name:gateway.airportCode,code:gateway.airportCode},dropoff:{type:'hotel',name:options[0].name,code:options[0].supplierQuote!.hotelId},pickupAt:`${checkIn}T15:00:00${gateway.utcOffset}`},signal);
     if(transfers.offers.length)result.airportTransfers!.push({place:stay.place,hotel:options[0].name,date:checkIn,offers:transfers.offers.slice(0,2).map(o=>({productId:o.productId,name:o.title,description:`${gateway.airportCode} → ${options[0].name} · ${o.summary}. Provisional 15:00 pickup; consultant must match the selected hotel and actual flight.`,imageUrl:o.imageUrl,amount:o.total.amountMinor/100,currency:o.total.currency}))});}
    }catch{/* Missing transfers never suppress hotels. */}
   }else stay.supplierNote='No Hotelbeds hotel matching the requested standard was returned. Researched suggestions remain available.';
  }catch{stay.supplierNote='Hotelbeds hotel search was unavailable. Researched suggestions remain available.';}
  // One exact-day tour search per base keeps the evaluation quota bounded.
  const day=result.dayPlans.find(d=>hotelbedsGateway(d.place,profile.destinations)?.id===gateway.id&&addDays(profile.travelStartDate,d.day-1)>=checkIn&&addDays(profile.travelStartDate,d.day-1)<checkOut);
  if(!day)continue;
  const date=addDays(profile.travelStartDate,day.day-1);
  try{const activities=await adapter.search({...context,vertical:'activity',destination,from:date,to:date,interests:profile.interests},signal);
   const seen=new Set<string>();
   const offers=activities.offers.filter(o=>{if(!o.productId||seen.has(o.productId))return false;seen.add(o.productId);return true;}).slice(0,2);
   if(offers.length)day.options=[...offers.map(o=>({id:`hotelbeds-${o.productId}`,name:o.title,type:'Activity',description:String(o.attributes.description||o.summary),whyFit:'Hotelbeds activity option for this destination and day. The consultant will confirm suitability and inclusions.',interestTags:[],sources:[],imageUrl:o.imageUrl,supplierProductId:o.productId,supplierNote:note})),...day.options];
  }catch{/* Keep researched excursions when the supplier cannot respond. */}
 }
 return result;
}
