import {mapPlaces} from '../../content/mapCoordinates';
import {hbxGateways,type HbxGateway} from './availability';
const key=(s:string)=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’']/g,'').trim();
export type HbxLocation=Partial<Omit<HbxGateway,'id'>>&{id:string;name:string;country:string;latitude?:number;longitude?:number};
const points=Object.entries(mapPlaces).flatMap(([country,places])=>Object.entries(places).filter(([,p])=>!p.note?.startsWith('Representative')).map(([name,p])=>({id:`${country}:${name}`,country,name,longitude:p.coordinates[0],latitude:p.coordinates[1]})));
points.push({id:'japan:Tokyo',country:'japan',name:'Tokyo',longitude:139.6917,latitude:35.6895},{id:'japan:Hakone',country:'japan',name:'Hakone',longitude:139.1,latitude:35.233333},{id:'japan:Kyoto',country:'japan',name:'Kyoto',longitude:135.7681,latitude:35.0116});
/** Exact city names only: combined itinerary chapters need a consultant to resolve their overnight base. */
export function hotelbedsLocation(place:string,countries:string[],overnightEvidence:string[]=[]):HbxLocation|undefined{
 const city=key(place.split(':').at(-1)||'');const explicit=place.includes(':')?key(place.split(':')[0]):'';
 const gateway=Object.values(hbxGateways).find(g=>key(g.name)===city&&(countries.includes(g.country)||key(g.country.replaceAll('-',' '))===explicit));if(gateway)return gateway;
 const matches=points.filter(p=>key(p.name)===city&&(countries.includes(p.country)||key(p.country.replaceAll('-',' '))===explicit));if(matches.length===1)return matches[0];
 // A chapter can include day trips. Resolve its base only when the proposed hotels identify
 // one curated city within that chapter, with no conflicting city evidence.
 const scoped=[...Object.values(hbxGateways),...points].filter(p=>!countries.length||countries.includes(p.country));
 const cities=new Map<string,HbxLocation>();
 for(const p of scoped){const id=`${p.country}:${key(p.name)}`;if(!cities.has(id))cities.set(id,p);}
 const contains=(text:string,name:string)=>new RegExp(`(?:^|[^a-z])${key(name).replace(/[.*+?^${}()|[\\]\\\\]/g,'\\$&')}(?:$|[^a-z])`).test(key(text));
 const exact=[...cities.values()].filter(p=>key(p.name)===city);
 if(!countries.length&&exact.length===1)return exact[0];
 const evidence=overnightEvidence.map(text=>[...cities.values()].filter(p=>contains(place,p.name)&&contains(text,p.name)));
 const identified=evidence.filter(found=>found.length);
 if(identified.length&&identified.every(found=>found.length===1&&found[0].id===identified[0][0]?.id))return identified[0][0];
 return undefined;
}
