import {geoMercator,geoPath,geoGraticule} from 'd3-geo';
import {line,curveCatmullRom} from 'd3-shape';
import {feature} from 'topojson-client';
import type {Topology,GeometryCollection} from 'topojson-specification';
import topology from 'world-atlas/countries-50m.json';
import detailedTopology from 'world-atlas/countries-10m.json';
import {mapCountries,mapPlaces,type CountryKey} from '../content/mapCoordinates';

const world=topology as unknown as Topology<{countries:GeometryCollection}>;
const countries=feature(world,world.objects.countries).features;
const detailedWorld=detailedTopology as unknown as Topology<{countries:GeometryCollection}>;
const detailedCountries=feature(detailedWorld,detailedWorld.objects.countries).features;
// Raw vertex extents exclude distant countries before spherical clipping. Some
// tiny-island rings in the 10m source otherwise produce a viewport-sized fill.
const vertexBounds=new Map(countries.concat(detailedCountries).map(item=>{
  let west=Infinity,east=-Infinity,south=Infinity,north=-Infinity;
  const visit=(value:unknown):void=>{
    if(!Array.isArray(value))return;
    if(typeof value[0]==='number'&&typeof value[1]==='number'){
      west=Math.min(west,value[0]);east=Math.max(east,value[0]);
      south=Math.min(south,value[1]);north=Math.max(north,value[1]);
    }else value.forEach(visit);
  };
  if(item.geometry&&'coordinates' in item.geometry)visit(item.geometry.coordinates);
  return[item,{west,east,south,north}] as const;
}));
const cache=new Map<string,ReturnType<typeof buildGeography>>();
export function journeyGeography(country:CountryKey,route:string[]){
  const key=`${country}:${route.join('|')}`;
  if(!cache.has(key))cache.set(key,buildGeography(country,route));
  return cache.get(key)!;
}
function buildGeography(country:CountryKey,route:string[]){
  const config=mapCountries[country];
  const overviewLand=countries.find(item=>String(item.id)===config.id)!;
  const places=route.map(name=>{
    const place=mapPlaces[country][name];
    if(!place)throw new Error(`Missing map coordinates: ${country}/${name}`);
    return{name,...place};
  });
  if(places.length<2)throw new Error('A journey map needs at least two stops');
  const longitudes=places.map(place=>place.coordinates[0]);
  const latitudes=places.map(place=>place.coordinates[1]);
  const span=Math.max(Math.max(...longitudes)-Math.min(...longitudes),Math.max(...latitudes)-Math.min(...latitudes));
  const visibleCountries=span<5?detailedCountries:countries;
  const land=visibleCountries.find(item=>String(item.id)===config.id)!;
  // Fit the itinerary, preserving geographical aspect ratio. Keep generous room
  // around the exact anchors for screen-stable markers and direct labels.
  const projection=geoMercator().fitExtent([[155,72],[445,340]],{
    type:'MultiPoint',coordinates:places.map(place=>place.coordinates),
  }).clipExtent([[0,0],[600,420]]);
  const path=geoPath(projection).digits(2);
  const [west,south]=projection.invert!([0,420])!;
  const [east,north]=projection.invert!([600,0])!;
  const context=visibleCountries.filter(item=>{
    const bounds=vertexBounds.get(item)!;
    return String(item.id)!==config.id&&bounds.east>=west&&bounds.west<=east&&bounds.north>=south&&bounds.south<=north;
  })
    .map(item=>path(item)).filter((value):value is string=>!!value);
  const selected=places.map(place=>{
    const [x,y]=projection(place.coordinates)!;
    return{...place,x,y};
  });
  const insetProjection=geoMercator().fitExtent([[17,18],[113,94]],overviewLand);
  const insetPath=geoPath(insetProjection).digits(2)(overviewLand)!;
  const insetRoute=line<[number,number]>().curve(curveCatmullRom.alpha(.5))(
    places.map(place=>insetProjection(place.coordinates)!));
  const graticule=path(geoGraticule().step([2,2])());
  const curvedLine=line<[number,number]>().curve(curveCatmullRom.alpha(.5));
  // Curves describe sequence only; they are not surveyed transport alignments.
  const legs=selected.slice(0,-1).map((from,index)=>{
    const to=selected[index+1];
    const dx=to.x-from.x,dy=to.y-from.y;
    const length=Math.hypot(dx,dy)||1;
    const bend=Math.min(12,length*.08);
    return curvedLine([[from.x,from.y],[(from.x+to.x)/2-dy/length*bend,(from.y+to.y)/2+dx/length*bend],[to.x,to.y]])!;
  });
  return{...config,land:path(land)!,context,selected,legs,insetPath,insetRoute,graticule};
}
