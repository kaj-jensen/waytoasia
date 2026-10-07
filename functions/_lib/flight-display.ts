import type {FlightItinerary} from './duffel';
const escape=(value:unknown)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const headings:Record<string,string[]>={en:['Airline','Date','Departure','Time','Arrival','Time','Flight','Class','Duration'],da:['Flyselskab','Dato','Afgang','Tid','Ankomst','Tid','Fly','Klasse','Rejsetid'],sv:['Flygbolag','Datum','Avgång','Tid','Ankomst','Tid','Flyg','Klass','Restid'],no:['Flyselskap','Dato','Avgang','Tid','Ankomst','Tid','Fly','Klasse','Reisetid'],nl:['Airline','Datum','Vertrek','Tijd','Aankomst','Tijd','Vlucht','Klasse','Reistijd'],fr:['Compagnie','Date','Départ','Heure','Arrivée','Heure','Vol','Classe','Durée'],es:['Aerolínea','Fecha','Salida','Hora','Llegada','Hora','Vuelo','Clase','Duración'],it:['Compagnia','Data','Partenza','Ora','Arrivo','Ora','Volo','Classe','Durata'],hu:['Légitársaság','Dátum','Indulás','Idő','Érkezés','Idő','Járat','Osztály','Időtartam']};
const airports:Record<string,string>={CPH:'Copenhagen',BKK:'Bangkok, Suvarnabhumi',CNX:'Chiang Mai',AMS:'Amsterdam, Schiphol',NRT:'Tokyo, Narita',LHR:'London, Heathrow'};
function date(value:string,locale:string){const d=new Date(value.slice(0,10)+'T12:00:00Z');return Number.isNaN(d.getTime())?'—':new Intl.DateTimeFormat(locale==='en'?'en-GB':locale,{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(d)}
function duration(value:string){const m=/^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(value);return m?`${Number(m[1]||0)*24+Number(m[2]||0)}h ${Number(m[3]||0)}m`:'—'}
export function flightTable(f:FlightItinerary,locale='en'){
 const h=headings[locale.split('-')[0]]||headings.en;
 return `<div class="flight-table-wrap"><table class="flight-table"><thead><tr>${h.map(x=>`<th scope="col">${x}</th>`).join('')}</tr></thead><tbody>${f.slices.flatMap(slice=>slice.map(s=>{
 const airport=(code:string,city?:string,name?:string)=>`<strong>${escape(city||airports[code]||code)}</strong><small>${escape(name&&name!==city?name+' ': '')}(${escape(code)})</small>`;
 const cabins:Record<string,string>={economy:'Economy',premium_economy:'Premium economy',business:'Business',first:'First'};
 const values=[`${escape(s.airline)}${s.operatingAirline&&s.operatingAirline!==s.airline?`<small>${escape(s.operatingAirline)}</small>`:''}`,date(s.departure,locale),airport(s.origin,s.originCity,s.originName),`<strong>${escape(s.departure.slice(11,16))}</strong>`,airport(s.destination,s.destinationCity,s.destinationName),`<strong>${escape(s.arrival.slice(11,16))}</strong><small>${escape(date(s.arrival,locale))}</small>`,escape(s.flightNumber),escape(cabins[s.cabin||'']||s.cabin||'—'),duration(s.duration)];
 return `<tr>${values.map((x,i)=>`<td data-label="${escape(i===3?h[2]+' · '+h[3]:i===5?h[4]+' · '+h[5]:h[i])}">${x}</td>`).join('')}</tr>`;
 })).join('')}</tbody></table></div>`;
}
