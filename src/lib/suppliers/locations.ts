import {mapPlaces} from '../../content/mapCoordinates';
import {hbxGateways,type HbxGateway} from './availability';
const key=(s:string)=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’']/g,'').trim();
export type HbxLocation=Partial<Omit<HbxGateway,'id'>>&{id:string;name:string;country:string;latitude?:number;longitude?:number};
const points=Object.entries(mapPlaces).flatMap(([country,places])=>Object.entries(places).filter(([,p])=>!p.note?.startsWith('Representative')).map(([name,p])=>({id:`${country}:${name}`,country,name,longitude:p.coordinates[0],latitude:p.coordinates[1]})));
points.push({id:'japan:Tokyo',country:'japan',name:'Tokyo',longitude:139.6917,latitude:35.6895},{id:'japan:Hakone',country:'japan',name:'Hakone',longitude:139.1,latitude:35.233333},{id:'japan:Kyoto',country:'japan',name:'Kyoto',longitude:135.7681,latitude:35.0116});
/** Exact city names only: combined itinerary chapters need a consultant to resolve their overnight base. */
export function hotelbedsLocation(place:string,countries:string[]):HbxLocation|undefined{
 const city=key(place.split(':').at(-1)||'');const explicit=place.includes(':')?key(place.split(':')[0]):'';
 const gateway=Object.values(hbxGateways).find(g=>key(g.name)===city&&(countries.includes(g.country)||key(g.country.replaceAll('-',' '))===explicit));if(gateway)return gateway;
 const matches=points.filter(p=>key(p.name)===city&&(countries.includes(p.country)||key(p.country.replaceAll('-',' '))===explicit));return matches.length===1?matches[0]:undefined;
}
