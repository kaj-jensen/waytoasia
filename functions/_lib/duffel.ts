import {escapeHtml} from './proposals';
export interface FlightSegment {origin:string;destination:string;departure:string;arrival:string;airline:string;flightNumber:string;duration:string}
export interface FlightItinerary {source:'duffel-test'|'sample';offerId:string;retrievedAt:string;slices:FlightSegment[][]}
export class FlightError extends Error {constructor(message:string,public status=400){super(message)}}
export const duffelReady=(token?:string)=>Boolean(token?.startsWith('duffel_test_'));
const record=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const text=(v:unknown)=>typeof v==='string'?v.slice(0,160):'';
export function normaliseOffer(value:unknown):FlightItinerary {
 const offer=record(value);if(offer.live_mode!==false)throw new FlightError('Only test flight offers are allowed.',502);
 const slices=(Array.isArray(offer.slices)?offer.slices:[]).slice(0,6).map(raw=>{
  const segments=record(raw).segments;if(!Array.isArray(segments)||!segments.length||segments.length>6)throw new FlightError('Flight itinerary is incomplete.',502);
  return segments.map(raw=>{const s=record(raw),airline=record(s.marketing_carrier);const leg={origin:text(record(s.origin).iata_code),destination:text(record(s.destination).iata_code),departure:text(s.departing_at),arrival:text(s.arriving_at),airline:text(airline.name),flightNumber:`${text(airline.iata_code)} ${text(s.marketing_carrier_flight_number)}`.trim(),duration:text(s.duration)};
   if(!/^[A-Z]{3}$/.test(leg.origin)||!/^[A-Z]{3}$/.test(leg.destination)||!/^\d{4}-\d{2}-\d{2}T/.test(leg.departure)||!/^\d{4}-\d{2}-\d{2}T/.test(leg.arrival))throw new FlightError('Flight itinerary is incomplete.',502);return leg;});
 });
 if(!slices.length)throw new FlightError('Flight itinerary is incomplete.',502);
 return {source:'duffel-test',offerId:text(offer.id),retrievedAt:new Date().toISOString(),slices};
}
async function request(token:string|undefined,path:string,data?:unknown):Promise<Record<string,unknown>>{
 if(!duffelReady(token))throw new FlightError('Create a Duffel account and configure DUFFEL_TEST_TOKEN in Cloudflare to search test flights.',503);
 let response:Response;try{response=await fetch(`https://api.duffel.com/air/${path}`,{method:data?'POST':'GET',headers:{Authorization:`Bearer ${token}`,'Duffel-Version':'v2','Content-Type':'application/json',Accept:'application/json'},body:data?JSON.stringify({data}):undefined,signal:AbortSignal.timeout(25000)})}catch{throw new FlightError('Duffel did not respond. Please try again.',502)}
 if(!response.ok)throw new FlightError(response.status===429?'Duffel test limit reached. Try again later.':'Duffel test search failed. Check the test token or try different dates.',502);
 const result=record(await response.json());return record(result.data);
}
export async function searchFlights(token:string|undefined,input:Record<string,unknown>){
 const origin=text(input.origin).toUpperCase(),destination=text(input.destination).toUpperCase(),departure=text(input.departure),returnDate=text(input.returnDate),returnOrigin=text(input.returnOrigin).toUpperCase()||destination,adults=Number(input.adults),cabin=text(input.cabin)||'economy';
 const validDate=(v:string)=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v&&v>=new Date().toISOString().slice(0,10);
 if(!/^[A-Z]{3}$/.test(origin)||!/^[A-Z]{3}$/.test(destination)||origin===destination||!/^[A-Z]{3}$/.test(returnOrigin)||!validDate(departure)||returnDate&&(!validDate(returnDate)||returnDate<departure)||!Number.isInteger(adults)||adults<1||adults>9||!['economy','premium_economy','business','first'].includes(cabin))throw new FlightError('Enter different three-letter airport codes, valid future dates and 1–9 adults.');
 const slices=[{origin,destination,departure_date:departure},...(returnDate?[{origin:returnOrigin,destination:origin,departure_date:returnDate}]:[])];
 const result=await request(token,'offer_requests?return_offers=true',{slices,passengers:Array.from({length:adults},()=>({type:'adult'})),cabin_class:cabin,supplier_timeout:20000});
 if(result.live_mode!==false)throw new FlightError('Only test flight offers are allowed.',502);
 return (Array.isArray(result.offers)?result.offers:[]).slice(0,12).map(normaliseOffer);
}
export async function getFlight(token:string|undefined,id:unknown){if(typeof id!=='string'||!/^off_[A-Za-z0-9]+$/.test(id)||id.length>100)throw new FlightError('Select a valid test flight offer.');return normaliseOffer(await request(token,`offers/${id}`));}
export function sampleFlight():FlightItinerary{return {source:'sample',offerId:'sample',retrievedAt:new Date().toISOString(),slices:[[{origin:'CPH',destination:'BKK',departure:'2027-02-10T14:00:00',arrival:'2027-02-11T06:00:00',airline:'Sample airline',flightNumber:'DEMO 101',duration:'PT10H'}],[{origin:'BKK',destination:'CPH',departure:'2027-02-24T12:00:00',arrival:'2027-02-24T18:00:00',airline:'Sample airline',flightNumber:'DEMO 102',duration:'PT12H'}]]};}
const labels:Record<string,[string,string,string]>={en:['Flight itinerary','Test itinerary — sample schedules, not confirmed flights. Arrange flights separately.','Times are local to each airport.'],da:['Flyrejseplan','Testrejseplan — eksempeltider, ikke bekræftede fly. Fly bestilles separat.','Tiderne er lokale for hver lufthavn.'],sv:['Flygresplan','Testresplan — exempeltider, inga bekräftade flyg. Flyg bokas separat.','Tiderna är lokala för varje flygplats.'],no:['Flyreiseplan','Testreiseplan — eksempeltider, ikke bekreftede fly. Fly bestilles separat.','Tidene er lokale for hver flyplass.'],fr:['Itinéraire aérien','Itinéraire de test — horaires fictifs, vols non confirmés. Réservez les vols séparément.','Les heures sont locales pour chaque aéroport.'],es:['Itinerario de vuelos','Itinerario de prueba — horarios de ejemplo, vuelos sin confirmar. Reserve los vuelos por separado.','Las horas son locales para cada aeropuerto.'],it:['Itinerario dei voli','Itinerario di prova — orari di esempio, voli non confermati. Prenotate i voli separatamente.','Gli orari sono locali per ogni aeroporto.'],nl:['Vluchtschema','Testschema — voorbeeldtijden, geen bevestigde vluchten. Boek vluchten afzonderlijk.','De tijden zijn lokaal voor elke luchthaven.'],hu:['Repülési útiterv','Tesztútiterv — példa menetrend, nem megerősített járatok. A repülőjegyek külön foglalhatók.','Az időpontok az adott repülőtér helyi idejét mutatják.']};
export function renderFlights(value:unknown,locale='en'):string{
 const f=record(value);if(!['sample','duffel-test'].includes(String(f.source))||!Array.isArray(f.slices))return '';
 const c=labels[locale.split('-')[0]]||labels.en;
 return `<section id="flights" class="stays-section"><div class="brochure-heading"><h2>${c[0]}</h2><p>${c[1]}</p><small>${c[2]}</small></div><div class="card-grid">${f.slices.slice(0,6).map(slice=>`<article class="choice-card">${(Array.isArray(slice)?slice:[]).slice(0,6).map(raw=>{const s=record(raw);return `<h3>${escapeHtml(s.origin)} → ${escapeHtml(s.destination)}</h3><p>${escapeHtml(s.airline)} · ${escapeHtml(s.flightNumber)}</p><p>${escapeHtml(s.departure)} → ${escapeHtml(s.arrival)}</p>`}).join('')}</article>`).join('')}</div></section>`;
}
