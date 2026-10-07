import registry from './airports.generated.json';
import {mapPlaces} from '../../src/content/mapCoordinates';
const normal=(value:string)=>value.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[’']/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const byCode=new Map(registry.map(a=>[a.code,a]));
const countries=[...new Set(registry.map(a=>a.country))];
const names=new Map<string,string>();
for(const locale of ['en','da','sv','no','fr','es','it','nl','hu']){const display=new Intl.DisplayNames([locale],{type:'region'});for(const code of countries)names.set(normal(display.of(code)||code),code);}
names.set('south korea','KR');names.set('korea','KR');names.set('taiwan','TW');
const countryFor=(place:string)=>names.get(normal(place.split(':')[0]))||'';
const placeCountries:Record<string,string>={china:'CN',thailand:'TH',vietnam:'VN',indonesia:'ID','south-korea':'KR'};
const places=Object.entries(mapPlaces).flatMap(([country,entries])=>Object.entries(entries).map(([name,p])=>({name:normal(name),country:placeCountries[country],lon:p.coordinates[0],lat:p.coordinates[1],representative:p.note?.startsWith('Representative')===true})));
const distance=(a:{lat:number;lon:number},b:{lat:number;lon:number})=>{const rad=Math.PI/180,dlat=(b.lat-a.lat)*rad,dlon=(b.lon-a.lon)*rad;return 6371*2*Math.asin(Math.sqrt(Math.sin(dlat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dlon/2)**2));};
export interface AirportStop {place:string;airportCode?:string;airportCountry?:string;airportTransfer?:boolean}
export function routeGateway(stop:AirportStop,position:'arrival'|'return'):{airport:string;transfer:boolean}{
 const country=countryFor(stop.place),text=` ${normal(stop.place.split(':').at(-1)||stop.place).replace('luang prabang','luang phabang')} `;
 let matched=places.filter(p=>(!country||p.country===country)&&text.includes(` ${p.name} `)).sort((a,b)=>text.indexOf(` ${a.name} `)-text.indexOf(` ${b.name} `));
 if(matched.some(p=>!p.representative))matched=matched.filter(p=>!p.representative);
 const point=position==='arrival'?matched[0]:matched.at(-1);
 const selected=byCode.get((stop.airportCode||'').toUpperCase());
 // Model-selected gateways must exist, have scheduled service and agree with the known geography.
 if(selected&&(!country||selected.country===country)&&(!stop.airportCountry||selected.country===stop.airportCountry.toUpperCase())&&(!point||selected.country===point.country&&distance(point,selected)<200))return {airport:selected.code,transfer:stop.airportTransfer===true||Boolean(point&&!(` ${normal(selected.city)} `).includes(` ${point.name} `))};
 const cityMatches=registry.filter(a=>(!country||a.country===country)&&a.city&&(text.includes(` ${normal(a.city)} `)||normal(a.city)==='new delhi'&&text.includes(' delhi ')));
 const cityNames=[...new Set(cityMatches.map(a=>normal(a.city)))].sort((a,b)=>text.indexOf(` ${a} `)-text.indexOf(` ${b} `));
 const city=position==='arrival'?cityNames[0]:cityNames.at(-1);
 const sameCity=cityMatches.filter(a=>normal(a.city)===city).sort((a,b)=>Number(b.large)-Number(a.large)||a.code.localeCompare(b.code));
 if(sameCity.length)return {airport:sameCity[0].code,transfer:false};
 if(point){const nearby=registry.filter(a=>a.country===point.country&&distance(point,a)<200).sort((a,b)=>distance(point,a)-distance(point,b));if(nearby[0])return {airport:nearby[0].code,transfer:true};}
 return {airport:'',transfer:false};
}

export const airportLabel=(code:string)=>{const airport=byCode.get(code);return airport?`${airport.city} · ${airport.name}`:code};
