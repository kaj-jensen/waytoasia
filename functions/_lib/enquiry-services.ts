import {tours} from '../../src/content/data';
import {enquiryTourPrice} from './enquiry-tour-price';
const obj=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const list=(v:unknown):Record<string,unknown>[]=>Array.isArray(v)?v.map(obj):[];
const str=(v:unknown)=>typeof v==='string'?v.slice(0,500):'';
const parse=(v:string)=>{try{return obj(JSON.parse(v))}catch{return {}}};
export interface ServicePrice {currency:string;low:number;high:number;basis:string}
export interface EnquiryService {key:string;type:string;description:string;supplier:string;status:string;price:ServicePrice|null;detail:string}
const price=(currency:unknown,low:unknown,high:unknown,basis:string):ServicePrice|null=>{const c=str(currency),l=Number(low),h=Number(high);return /^[A-Z]{3}$/.test(c)&&Intl.supportedValuesOf('currency').includes(c)&&Number.isFinite(l)&&Number.isFinite(h)&&l>0&&h>=l&&h<=1e8?{currency:c,low:l,high:h,basis}:null};
/** Reads saved sources without treating package components, estimates or test fares as booked revenue. */
export function enquiryServices(requirements:string,snapshot='',proposalPrice=''){
 const req=parse(requirements),saved=parse(snapshot),payload=obj(saved.payload||saved),suggestion=obj(payload.suggestion),choices=obj(payload.builderChoices);
 const catalogue=enquiryTourPrice(requirements),tour=tours.find(t=>t.slug===catalogue?.slug),services:EnquiryService[]=[];
 const add=(key:string,type:string,description:string,status:string,detail='',supplier='',p:ServicePrice|null=null)=>{if(description)services.push({key,type,description,supplier,status,detail,price:p})};
 if(tour&&catalogue){
  add('tour:'+tour.slug,'Tours',tour.name,'Published guide',catalogue.partyNote,'',price(catalogue.currency,catalogue.partyTotal??catalogue.perPerson,catalogue.partyTotal??catalogue.perPerson,catalogue.partyTotal!==null?'party total · from':'per person · from'));
  for(const [i,stay] of (tour.accommodation||[]).entries())add('catalogue-hotel:'+i,'Hotels',`${stay.place} · ${stay.style}`,'Included in package',`${stay.nights} nights · No separate hotel price is published.`);
  if(!services.some(s=>s.type==='Hotels')&&tour.includes.some(s=>/accommodation|hotel/i.test(s)))add('catalogue-hotels','Hotels','Accommodation in the tour','Included in package','Hotel names and separate rates require a supplier quote.');
  for(const [i,entry] of tour.includes.entries())if(!/accommodation|hotel/i.test(entry))add('catalogue-included:'+i,/transport|transfer/i.test(entry)?'Transfers':/guide/i.test(entry)?'Guides':/tour|excursion|activit/i.test(entry)?'Activities':'Other',entry,'Included in package','Already covered by the tour guide price; not an extra charge.');
  for(const [i,entry] of tour.excludes.entries())add('catalogue-excluded:'+i,/flight/i.test(entry)?'Flights':/insurance/i.test(entry)?'Insurance':'Other',entry,'Excluded from package','Arrange and price separately if required.');
 }
 for(const [i,stay] of list(suggestion.hotelStays).entries()){
  const selected=obj(choices.hotels)[`stay-${i}`],option=list(stay.options).find(o=>o.id===selected);
  add(`stay-${i}`,'Hotels',`${str(stay.place)} · ${str(option?.name)|| (selected==='custom'?'Traveller hotel preference':'Hotel to be selected')}`,'Price needed',`${Number(stay.nights)||'?'} nights · ${str(obj(choices.hotelNotes)[`stay-${i}`])}`,str(option?.name));
 }
 for(const day of list(suggestion.dayPlans)){
  const key=`day-${day.day}`,selected=obj(choices.days)[key],option=list(day.options).find(o=>o.id===selected);
  if(option)add(key,/excursion|tour/i.test(str(option.type))?'Excursions':'Activities',`Day ${day.day} · ${str(option.name)}`,'Price needed',str(day.place));
  else add(key,'Activities',`Day ${day.day} · ${str(day.place)}`,selected==='custom'?'Price needed':'Not selected',str(obj(choices.dayNotes)[key])||'Day programme to confirm.');
 }
 const route=list(suggestion.route).length?list(suggestion.route):list(req.route);
 route.slice(0,-1).forEach((stop,i)=>{const selected=obj(choices.transfers)[`transfer-${i}`],option=list(stop.transferOptions).find(o=>o.id===selected);add(`transfer-${i}`,'Transfers',str(option?.name)||str(stop.onwardTravel)||`${str(stop.place)} → ${str(route[i+1].place)}`,'Price needed',str(option?.description))});
 const flight=obj(choices.flightItinerary||req.flightItinerary),slices=Array.isArray(flight.slices)?flight.slices:[];
 if(slices.length){const paths=slices.map(s=>list(s).map((seg,i)=>`${i===0?str(seg.origin)+' → ':''}${str(seg.destination)}`).join(' → '));const p=price(flight.totalCurrency,flight.totalAmount,flight.totalAmount,'test offer · all flights / passengers');add('flight-offer','Flights',paths.join(' / '),p?'Test fare':'Test itinerary · price not saved','Test data only. Never included in booked revenue. '+(p?`Retrieved ${str(flight.retrievedAt)}`:'Search again to retrieve a test fare.'),[...new Set(slices.flatMap(s=>list(s).map(seg=>str(seg.airline))))].join(', '),p)}
 const estimate=obj(suggestion.priceEstimate),planning=price(estimate.currency,estimate.totalLow,estimate.totalHigh,'planning range · whole party');
 const label=str(saved.estimatedPrice)||proposalPrice;
 return {services,planning,proposalPrice:label,proposalTitle:str(saved.title)||str(suggestion.title),hasProposal:Boolean(snapshot&&Object.keys(payload).length),catalogue};
}
