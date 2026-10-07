import {mapPlaces,type CountryKey} from '../../src/content/mapCoordinates';
import {hotelOptionMatchesBudget,hotelStandardForBudget,tripPlannerCurrencyForLocale,type SuggestedHotelStay,type SuggestedHotelOption,type TripPlannerRequest} from '../../src/lib/tripPlanner';
const codes:Record<string,string>={china:'CN','south-korea':'KR',thailand:'TH',vietnam:'VN',indonesia:'ID',japan:'JP',taiwan:'TW',laos:'LA',cambodia:'KH',malaysia:'MY',singapore:'SG',philippines:'PH',india:'IN','sri-lanka':'LK',nepal:'NP',bhutan:'BT'};
const normalize=(s:string)=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
export function hotelLocation(place:string, destinations:string[]){
 const [prefix,...parts]=place.split(':');
 const country=parts.length?normalize(prefix).replace(/\s+/g,'-'):destinations.length===1?destinations[0]:'';
 const city=(parts.length?parts.join(':'):place).trim();
 const places=mapPlaces[country as CountryKey];
 const match=places&&Object.entries(places).find(([name])=>normalize(name)===normalize(city));
 if(match)return {latitude:match[1].coordinates[1],longitude:match[1].coordinates[0],radius:15000};
 return codes[country]&&city&&!/[&/]/.test(city)?{countryCode:codes[country],cityName:city}:null;
}
type Obj=Record<string,unknown>;
const obj=(v:unknown):Obj=>v&&typeof v==='object'&&!Array.isArray(v)?v as Obj:{};
const arr=(v:unknown):unknown[]=>Array.isArray(v)?v:[];
const text=(v:unknown)=>typeof v==='string'?v.replace(/<[^>]*>/g,'').trim().slice(0,350):'';
export function hotelPhoto(v:unknown){try{const u=new URL(text(v));return u.protocol==='https:'&&u.hostname==='static.cupid.travel'?u.href:undefined}catch{return undefined}}
export function mapHotelRates(payload:unknown,profile:TripPlannerRequest,checkin:string,checkout:string):SuggestedHotelOption[]{
 const body=obj(payload),hotels=arr(body.hotels).map(obj),seen=new Set<string>();
 const currency=tripPlannerCurrencyForLocale[profile.locale]??'EUR';
 return arr(body.data).flatMap(raw=>{
  const result=obj(raw),id=text(result.hotelId),hotel=hotels.find(h=>h.id===id);
  if(!hotel||seen.has(id))return [];
  seen.add(id);
  const offers=arr(result.roomTypes).map(obj).filter(o=>o.rateType==='standard');
  const offer=offers.find(o=>{const price=obj(o.offerRetailRate);return price.currency===currency&&Number(price.amount)>0});
  if(!offer)return [];
  const rates=arr(offer.rates).map(obj),rate=rates[0],price=obj(offer.offerRetailRate);
  if(!rate)return [];
  const option:SuggestedHotelOption={id:`liteapi-${id}`,name:text(hotel.name),area:text(hotel.address),standard:hotelStandardForBudget(profile.budget),whyFit:'Supplier hotel option for this overnight stop. Room and availability require confirmation before travel.',roomGuidance:rates.map(r=>text(r.name)).join(' · '),reviewSignal:Number(hotel.rating)>0?`Supplier review score: ${Number(hotel.rating)}/10`:'No supplier review score available.',sources:[],imageUrl:hotelPhoto(hotel.main_photo),supplierQuote:{provider:'LiteAPI',mode:'sandbox',hotelId:id,checkin,checkout,amount:Number(price.amount),currency,board:text(rate.boardName),basis:`Test search: ${profile.adults} adults across ${Math.ceil(profile.adults/2)} room(s); Denmark guest nationality assumed for demo only.`}};
  return hotelOptionMatchesBudget(option,profile.budget)?[option]:[];
 }).slice(0,2);
}
export async function enrichHotelStays(key:string|undefined,profile:TripPlannerRequest,stays:SuggestedHotelStay[],fetcher:typeof fetch=fetch):Promise<SuggestedHotelStay[]>{
 if(!key?.startsWith('sand_'))return stays;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(profile.travelStartDate)||!Number.isFinite(Date.parse(profile.travelStartDate))||profile.children>0||profile.adults<1||profile.adults>8)return stays.map(stay=>({...stay,supplierNote:"Researched recommendations. Demo rates need exact dates and an adult-only party of up to eight; family rooms require child ages."}));
 let offset=0;
 const requests=stays.map(stay=>{const start=new Date(`${profile.travelStartDate}T12:00:00Z`);start.setUTCDate(start.getUTCDate()+offset);offset+=stay.nights;const end=new Date(start);end.setUTCDate(end.getUTCDate()+stay.nights);return {stay,checkin:start.toISOString().slice(0,10),checkout:end.toISOString().slice(0,10)}});
 const output:SuggestedHotelStay[]=[];
 // Two searches at a time keep this request below the sandbox rate limit.
 for(let i=0;i<requests.length;i+=2){output.push(...await Promise.all(requests.slice(i,i+2).map(async({stay,checkin,checkout})=>{
  const fallback={...stay,supplierNote:"Researched recommendations. Two matching supplier demo options were not available for this stop."};
  const location=hotelLocation(stay.place,profile.destinations);if(!location)return fallback;
  try{
   const occupancies=Array.from({length:Math.ceil(profile.adults/2)},(_,i)=>({rooms:1,adults:Math.min(2,profile.adults-i*2)}));
   const response=await fetcher('https://api.liteapi.travel/v3.0/hotels/rates',{method:'POST',headers:{'X-API-Key':key,'Content-Type':'application/json'},signal:AbortSignal.timeout(11000),body:JSON.stringify({...location,occupancies,currency:tripPlannerCurrencyForLocale[profile.locale]??'EUR',guestNationality:'DK',checkin,checkout,timeout:6,limit:8,maxRatesPerHotel:1,includeHotelData:true,starRating:profile.budget==='value'?[3,3.5]:profile.budget==='comfort'||profile.budget==='unsure'?[4,4.5]:[5]})});
   if(!response.ok)return fallback;
   const options=mapHotelRates(await response.json(),profile,checkin,checkout);
   return options.length===2?{...stay,options,supplierNote:"LiteAPI hotel demo · sample prices, not confirmed availability. Your trip start date is used as the first hotel check-in."}:fallback;
  }catch{return fallback}
 })));}
 return output;
}
