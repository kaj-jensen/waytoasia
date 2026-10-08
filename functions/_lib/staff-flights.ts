import {SignJWT,jwtVerify} from 'jose';
import {searchSerpFlights} from './serpapi-flights';
import {FlightError,type FlightItinerary} from './duffel';
const secret=(key:string)=>new TextEncoder().encode(key);
export async function searchStaffFlights(key:string|undefined,enquiry:string,input:Record<string,unknown>){
 if(!key)throw new FlightError('Configure SERPAPI_API_KEY in Cloudflare to enable flight searches.',503);
 const origin=String(input.origin||'').toUpperCase(),destination=String(input.destination||'').toUpperCase(),departure=String(input.departure||''),returnDate=String(input.returnDate||''),adults=Number(input.adults),cabin=String(input.cabin||'economy');
 const valid=(date:string)=>/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date))&&new Date(date).toISOString().slice(0,10)===date&&date>=new Date().toISOString().slice(0,10);
 if(!/^[A-Z]{3}$/.test(origin)||!/^[A-Z]{3}$/.test(destination)||origin===destination||!valid(departure)||(returnDate&&(!valid(returnDate)||returnDate<departure))||!Number.isInteger(adults)||adults<1||adults>9||!['economy','premium_economy','business','first'].includes(cabin))throw new FlightError('Enter different airport codes, valid future dates and 1–9 adults.');
 try{
 const out=await searchSerpFlights(key,{origin,destination,date:departure,adults,children:0,cabin});
 const home=returnDate?await searchSerpFlights(key,{origin:destination,destination:origin,date:returnDate,adults,children:0,cabin}):[];
 if(returnDate&&!home.length)return [];
 return Promise.all(out.slice(0,3).map(async(slice,i)=>{const flight:FlightItinerary={source:'serpapi-google-flights',offerId:'serpapi-'+crypto.randomUUID(),retrievedAt:new Date().toISOString(),slices:[slice,...(returnDate?[home[Math.min(i,home.length-1)]]:[])]};const selection=await new SignJWT({flight}).setProtectedHeader({alg:'HS256'}).setAudience(enquiry).setIssuer('waytoasia-staff-flights').setIssuedAt().setExpirationTime('30m').sign(secret(key));return {...flight,selection}}));
 }catch{throw new FlightError('SerpApi flight search unavailable. Please try again.',502)}
}
export async function selectedStaffFlight(key:string|undefined,enquiry:string,selection:unknown):Promise<FlightItinerary>{
 if(!key||typeof selection!=='string'||selection.length>50000)throw new FlightError('Search again to select a flight itinerary.');
 try{const {payload}=await jwtVerify(selection,secret(key),{algorithms:['HS256'],audience:enquiry,issuer:'waytoasia-staff-flights'});return payload.flight as FlightItinerary}catch{throw new FlightError('Flight selection expired or is invalid. Search again.');}
}
