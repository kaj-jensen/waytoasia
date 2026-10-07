// Natural Earth 10m Japan, public domain; nvkelso/natural-earth-vector.
import japan from '../../src/content/geography/japan-10m.json';
import lakes from '../../src/content/geography/lakes.json';
import rivers from '../../src/content/geography/rivers.json';
import {geoMercator,geoPath,geoGraticule,geoCentroid} from 'd3-geo';
import {feature} from 'topojson-client';
import type {Topology,GeometryCollection} from 'topojson-specification';
import topology from 'world-atlas/countries-50m.json';
import {mapPlaces} from '../../src/content/mapCoordinates';

export interface RouteLocation {index:number;place:string;label:string;coordinates:[number,number]|null;issue?:string;source?:string;waypoints?:Array<{label:string;coordinates:[number,number]}>;badge?:string;subtitle?:string}
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const normalize=(s:string)=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const registry=Object.entries(mapPlaces).flatMap(([country,places])=>Object.entries(places).filter(([name,p])=>!p.note?.startsWith('Representative')&&!['Great Wall','Yunnan','Bali','Mekong','Flores','Southern islands'].includes(name)).map(([name,p])=>({country,name,key:normalize(name),coordinates:p.coordinates})));
// Hakone town centre: GSI Gazetteer of Japan 2021, 35°14′N 139°06′E.
// https://web1.gsi.go.jp/common/000238295.pdf
registry.push({country:'japan',name:'Hakone',key:'hakone',coordinates:[139.1,35.233333]},{country:'china',name:'Mutianyu',key:'mutianyu',coordinates:[116.5619,40.4380]},{country:'japan',name:'Tokyo',key:'tokyo',coordinates:[139.6917,35.6895]},{country:'japan',name:'Kyoto',key:'kyoto',coordinates:[135.7681,35.0116]});
const countries:Record<string,string[]>={china:['china','kina','chine','cina','chiny'],japan:['japan','japon','giappone'],'south-korea':['south korea','sydkorea','sydkorea','coree'],thailand:['thailand','thailande'],vietnam:['vietnam'],indonesia:['indonesia','indonesie']};
export function resolveRoute(route:unknown,context:unknown=[]):RouteLocation[]{
  const contextText=normalize(Array.isArray(context)?context.join(' '):String(context));
  return (Array.isArray(route)?route:[]).slice(0,80).map((raw,index)=>{
    const stop=raw&&typeof raw==='object'?raw as Record<string,unknown>:{};
    const place=typeof stop.place==='string'?stop.place.slice(0,160):'';const text=` ${normalize(place)} `;
    // Explicit reviewed WGS84 coordinates support places outside the curated registry.
    const coord=stop.coordinates;
    if(stop.coordinatesVerified===true&&Array.isArray(coord)&&coord.length===2&&coord.every(v=>typeof v==='number'&&Number.isFinite(v))&&Math.abs(coord[0])<=180&&Math.abs(coord[1])<85){
      return{index,place,label:place,coordinates:coord as [number,number],source:'proposal-reviewed'};
    }
    const country=Object.entries(countries).find(([,aliases])=>aliases.some(alias=>text.includes(` ${alias} `)))?.[0];
    const contextCountries=Object.entries(countries).filter(([,aliases])=>aliases.some(alias=>` ${contextText} `.includes(` ${alias} `))).map(([key])=>key);
    const scopedCountry=country||(contextCountries.length===1?contextCountries[0]:undefined);
    let matches=registry.filter(p=>(!scopedCountry||p.country===scopedCountry)&&text.includes(` ${p.key} `));
    if(matches.some(p=>p.key==='mutianyu'))matches=matches.filter(p=>p.key==='mutianyu');
    // Shaxi is ambiguous outside Yunnan; do not silently choose a Chinese namesake.
    if(matches.some(p=>p.key==='shaxi')&&!/yunnan|dali/.test(`${text} ${contextText}`))matches=[];
    // Multiple explicitly named, country-scoped places form one route chapter, not an ambiguous city.
    matches.sort((a,b)=>text.indexOf(` ${a.key} `)-text.indexOf(` ${b.key} `));
    if(matches.length>1&&scopedCountry){return{index,place,label:place,coordinates:matches[0].coordinates,source:'curated-gazetteer',waypoints:matches.map(p=>({label:p.name,coordinates:p.coordinates}))};}
    if(matches.length===1){const p=matches[0];return{index,place,label:p.name,coordinates:p.coordinates,source:p.key==='mutianyu'?'https://www.wikidata.org/wiki/Q212610':'curated-gazetteer'};}
    return{index,place,label:place,coordinates:null,issue:matches.length?'ambiguous-location':'unresolved-location'};
  });
}
const world=topology as unknown as Topology<{countries:GeometryCollection}>;
const baseLand=feature(world,world.objects.countries).features;
const land=[...baseLand.filter(f=>String(f.id)!=='392'),...japan.features as unknown as typeof baseLand];
type Bounds={west:number;east:number;south:number;north:number};
function bounds(geometry:unknown):Bounds{
 const b={west:Infinity,east:-Infinity,south:Infinity,north:-Infinity};
 const visit=(v:unknown):void=>{if(!Array.isArray(v))return;if(typeof v[0]==='number'&&typeof v[1]==='number'){b.west=Math.min(b.west,v[0]);b.east=Math.max(b.east,v[0]);b.south=Math.min(b.south,v[1]);b.north=Math.max(b.north,v[1]);}else v.forEach(visit);};
 visit((geometry as {coordinates?:unknown})?.coordinates);return b;
}
const landBounds=new Map(land.map(f=>[f,bounds(f.geometry)]));
const lakeBounds=new Map(lakes.features.map(f=>[f,bounds(f.geometry)]));
const riverBounds=new Map(rivers.features.map(f=>[f,bounds(f.geometry)]));
const cache=new Map<string,string>();
export const MAP_STYLE_VERSION='natural-earth-brochure-v4';
export function routeMap(locations:RouteLocation[],copy:{title:string;illustrative:string;detail:string;unavailable:string}):string{
  const key=JSON.stringify([MAP_STYLE_VERSION,locations,copy]);if(cache.has(key))return cache.get(key)!;
  const plotted=locations.flatMap(p=>p.waypoints?p.waypoints.map((w,i)=>({...p,...w,waypoints:undefined,badge:`${p.index+1}${String.fromCharCode(97+i)}`})):[p]);
  const valid=plotted.filter(p=>p.coordinates&&p.coordinates.every(Number.isFinite));if(!valid.length)return `<div class="map-fallback">${escape(copy.unavailable)}</div>`;
  try{
    const panels:Array<{stops:RouteLocation[];detail:boolean}>=[{stops:valid,detail:false}];
    // Nearby stops get independent geographic detail panels, including repeated destinations.
    const overview=projection(valid,780,480);
    const grouped=new Set<number>();
    for(const p of valid){if(grouped.has(p.index))continue;const a=overview(p.coordinates!)!;const group=valid.filter(q=>{const b=overview(q.coordinates!)!;return Math.hypot(a[0]-b[0],a[1]-b[1])<70});if(group.length>1){group.forEach(q=>grouped.add(q.index));panels.push({stops:group,detail:true});}}
    const svg=panels.map((panel,panelIndex)=>renderPanel(panel.stops,panel.detail?380:900,panel.detail?Math.max(250,panel.stops.length*32+80):Math.max(500,Math.ceil(panel.stops.length/2)*32+100),panelIndex,panel.detail,copy)+(panel.detail?'':renderPanel(panel.stops,380,Math.max(430,panel.stops.length*32+100),100,false,copy).replace('map-main','map-main map-mobile'))).join('');
    const result=`<div class="route-map-panels">${svg}</div>`;
    if(cache.size>=100)cache.delete(cache.keys().next().value!);cache.set(key,result);return result;
  }catch{return `<div class="map-fallback">${escape(copy.unavailable)}</div>`;}
}
function projection(stops:RouteLocation[],width:number,height:number){
  const coordinates=stops.map(p=>p.coordinates!);const lon=coordinates.map(p=>p[0]),lat=coordinates.map(p=>p[1]);
  // Use a local extent even for a single point / identical return stops.
  if(Math.max(...lon)-Math.min(...lon)<.03&&Math.max(...lat)-Math.min(...lat)<.03)coordinates.push([lon[0]-.15,lat[0]-.15],[lon[0]+.15,lat[0]+.15]);
  return geoMercator().rotate([-lon[0],0]).fitExtent([[width*.15,height*.15],[width*.85,height*.85]],{type:'MultiPoint',coordinates}).clipExtent([[0,0],[width,height]]);
}
function renderPanel(stops:RouteLocation[],width:number,height:number,id:number,detail:boolean,copy:{title:string;illustrative:string;detail:string}){
  const project=projection(stops,width,height),path=geoPath(project).digits(1);const anchors=stops.map(p=>({...p,xy:project(p.coordinates!)!}));
  const cornerA=project.invert!([0,height])!,cornerB=project.invert!([width,0])!;
  const intersects=(b:Bounds)=>b.north>=cornerA[1]&&b.south<=cornerB[1]&&(cornerB[0]<cornerA[0]||b.east>=cornerA[0]&&b.west<=cornerB[0]);
  const visibleLand=land.filter(f=>intersects(landBounds.get(f)!));
  const lakePaths=lakes.features.filter(f=>intersects(lakeBounds.get(f)!)).map(f=>`<path d="${path(f as unknown as Parameters<typeof path>[0])||''}" class="map-lake"/>`).join('');
  const water=path({type:'FeatureCollection',features:rivers.features.filter(f=>intersects(riverBounds.get(f)!))} as unknown as Parameters<typeof path>[0])||'';
  const contextOccupied:Array<[number,number]>=[];
  const contextLabels=detail?'':[{name:'Mt. Fuji',coordinates:[138.7274,35.3606] as [number,number]},{name:'Lake Biwa',coordinates:[136.08,35.25] as [number,number]},{name:'Osaka',coordinates:[135.5023,34.6937] as [number,number]},...registry].filter(p=>!stops.some(s=>s.label===p.name)).flatMap(p=>{const xy=project(p.coordinates);if(!xy||xy[0]<40||xy[0]>width-100||xy[1]<30||xy[1]>height-35||anchors.some(a=>Math.hypot(a.xy[0]-xy[0],a.xy[1]-xy[1])<22))return [];if(contextOccupied.some(p=>Math.hypot(p[0]-xy[0],p[1]-xy[1])<45))return [];contextOccupied.push(xy as [number,number]);return [`<g class="map-context"><circle cx="${xy[0]}" cy="${xy[1]}" r="2"/><text x="${xy[0]+6}" y="${xy[1]-12}">${escape(p.name)}</text></g>`]}).slice(0,12).join('');
  const countryLabels=visibleLand.flatMap(f=>{const xy=project(geoCentroid(f));if(!xy||xy[0]<30||xy[0]>width-90||xy[1]<40||xy[1]>height-30)return [];return [`<text x="${xy[0]}" y="${xy[1]}" class="map-country">${escape(String((f.properties as {name?:string})?.name||''))}</text>`]}).join('');
  const lines=anchors.slice(0,-1).map((p,i)=>{
    const q=anchors[i+1];if(q.index!==p.index&&q.index!==p.index+1)return '';
    const dx=q.xy[0]-p.xy[0],dy=q.xy[1]-p.xy[1],length=Math.hypot(dx,dy);
    if(length<24)return '';
    const ux=dx/length,uy=dy/length,bend=Math.min(32,length*.12);
    const start=[p.xy[0]+ux*13,p.xy[1]+uy*13],end=[q.xy[0]-ux*13,q.xy[1]-uy*13];
    const control=[(start[0]+end[0])/2-uy*bend,(start[1]+end[1])/2+ux*bend];
    const midpoint=[(start[0]+2*control[0]+end[0])/4,(start[1]+2*control[1]+end[1])/4];
    return `<path d="M${start.join(',')}Q${control.join(',')} ${end.join(',')}" class="map-route"/><path d="M-4,-3L0,0L-4,3" transform="translate(${midpoint.join(' ')}) rotate(${Math.atan2(dy,dx)*180/Math.PI})" class="map-chevron"/>`;
  }).join('');
  const occupied:Array<[number,number,number,number]>=[...anchors.map(p=>[p.xy[0]-14,p.xy[1]-14,p.xy[0]+14,p.xy[1]+14] as [number,number,number,number]),...contextOccupied.map(([x,y])=>[x,y-25,x+75,y-5] as [number,number,number,number])];
  const labels=anchors.map(p=>{
    const [x,y]=p.xy;const maxLabelChars=Math.floor((width-68)/7);const displayLabel=p.label.length>maxLabelChars?p.label.slice(0,maxLabelChars-1)+'…':p.label;const labelWidth=Math.min(width-30,Math.max(displayLabel.length*7,(p.subtitle?.length||0)*6)+12);let best:[number,number]=[15,15],score=Infinity;
    for(const ly of [y+4,y-28,y+36,...Array.from({length:Math.floor((height-40)/32)},(_,row)=>34+row*32)].filter(v=>v>=25&&v<height-30))for(const lx of [Math.min(width-labelWidth-15,x+22),Math.max(15,x-labelWidth-22)]){
      const collisions=occupied.filter(b=>lx<b[2]&&lx+labelWidth>b[0]&&ly-15<b[3]&&ly+(p.subtitle?25:10)>b[1]).length;
      const cost=collisions*100000+Math.hypot(lx+labelWidth/2-x,ly-y);if(cost<score){score=cost;best=[lx,ly];}
    }
    const [lx,ly]=best;occupied.push([lx,ly-15,lx+labelWidth,ly+(p.subtitle?25:10)]);
    const near=Math.abs(ly-y)<20;
    return `<a href="#destination-${p.index}" class="map-stop" data-index="${p.index+1}" data-longitude="${p.coordinates![0]}" data-latitude="${p.coordinates![1]}">${near?'':`<path d="M${x},${y}L${lx+labelWidth/2},${ly-4}" class="map-leader"/>`}<rect x="${lx-3}" y="${ly-18}" width="${labelWidth}" height="${p.subtitle?40:28}" rx="6" class="map-label-bg"/><circle cx="${x}" cy="${y}" r="11" class="map-pin"/><text x="${x}" y="${y+4}" text-anchor="middle" class="map-number">${p.badge||p.index+1}</text><text x="${lx+3}" y="${ly}" class="map-label">${escape(displayLabel)}</text>${p.subtitle?`<text x="${lx+3}" y="${ly+15}" class="map-subtitle">${escape(p.subtitle)}</text>`:''}<title>${escape(p.label)}</title></a>`;

  }).join('');
  const title=detail?copy.detail:copy.title;
  return `<figure class="map-panel ${detail?'map-detail':'map-main'}"><svg viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="map-title-${id} map-desc-${id}"><title id="map-title-${id}">${escape(title)}</title><desc id="map-desc-${id}">${escape(stops.map(p=>`${p.badge||p.index+1}. ${p.label}`).join(' → '))}. ${escape(copy.illustrative)}</desc><rect width="${width}" height="${height}" fill="#cbdfe3"/>${visibleLand.map(f=>`<path d="${path(f)||''}" class="map-land"/>`).join('')}<path d="${path(geoGraticule().step([5,5])())}" class="map-grid"/><path d="${water}" class="map-water"/>${lakePaths}${countryLabels}${contextLabels}${lines}${labels}<text x="18" y="${height-18}" class="map-compass">N ↑</text></svg>${detail?`<figcaption>${escape(copy.detail)} · ${escape(stops.map(p=>p.label).join(' / '))}</figcaption>`:''}</figure>`;
}
