import type {Tour} from '../content/data';
import {getRouteModes} from '../content/routeTransport';
import {mapPlaces} from '../content/mapCoordinates';
export type Point=[number,number];
const groups:Record<string,number[][]>={
 'silk-and-courtyards':[[0],[1],[2,3,4]],'vietnam-long-table':[[0],[1,2],[3,4]],'islands-of-fire-and-water':[[0,1],[2],[3]],'mountains-and-east-sea':[[0],[1,2],[3]],'kingdoms-of-siam':[[0],[1,2],[3]],'central-coast-by-rail':[[0],[1],[2,3]],'java-volcano-line':[[0],[1],[2,3]],'bali-beyond-the-obvious':[[0],[1,2],[3]]
};
export function tourPresentation(tour:Tour){
 const route=tour.route!;
 const points=route.map(name=>{const p=mapPlaces[tour.country][name];if(!p)throw Error(`Missing map location: ${name}`);return p.coordinates;});
 const stageGroups=groups[tour.slug]??tour.itinerary.map((_,i)=>[i]);
 const entries=tour.dailyItinerary?tour.dailyItinerary.map(day=>({range:String(day.day),location:day.location,title:day.title,summary:day.summary,activities:day.activities,overnight:day.overnight,meals:day.meals,transport:day.transport??'',points:[mapPlaces[tour.country][day.location].coordinates]})):tour.itinerary.map((stage,i)=>({range:stage.day,location:stageGroups[i].map(index=>route[index]).join(' · '),title:stage.title,summary:stage.copy,activities:[] as string[],overnight:'',meals:'',transport:'',points:stageGroups[i].map(index=>points[index])}));
 // A transfer day shows both the previous base and the destination.
 if(tour.dailyItinerary)entries.forEach((entry,i)=>{
  const previous=i?mapPlaces[tour.country][tour.dailyItinerary![i-1].location].coordinates:null;
  if(previous&&previous!==entry.points[0])entry.points=[previous,entry.points[0]];
 });
 if(!tour.dailyItinerary)entries.forEach((entry,i)=>{if(i){const previous=entries[i-1].points.at(-1)!;if(previous!==entry.points[0])entry.points=[previous,...entry.points];}});
 const legs=route.slice(1).map((name,i)=>({points:[points[i],points[i+1]],modes:getRouteModes(route[i],name)}));
 const stops=route.map((name,i)=>({name,point:points[i],day:tour.dailyItinerary?tour.dailyItinerary.findIndex(day=>day.location===name)+1:stageGroups.findIndex(group=>group.includes(i))+1,note:mapPlaces[tour.country][name].note??''}));
 return {route,points,entries,stops,legs};
}
