import 'maplibre-gl/dist/maplibre-gl.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import type {Map as LibreMap, GeoJSONSource} from 'maplibre-gl';

type Point=[number,number];
const root=document.querySelector<HTMLElement>('.tour-product');
if(root){
 const config=JSON.parse(root.dataset.mapConfig!) as {paths:Point[][];points:Point[];stops:{name:string;point:Point;day:number;note:string}[];labels:string[];whole:string;expand:string;collapse:string;open:string;close:string;error:string;show:string};
 const {paths,stops}=config;
 const card=root.querySelector<HTMLElement>('.map-card')!;
 const status=root.querySelector<HTMLElement>('.map-status')!;
 const title=root.querySelector<HTMLElement>('[data-map-title]')!;
 const days=[...root.querySelectorAll<HTMLDetailsElement>('.day')];
 let map:LibreMap|undefined,active=0,loading=false;
 let markers:HTMLElement[]=[];
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const line=(points:Point[])=>({type:'Feature' as const,properties:{},geometry:{type:'LineString' as const,coordinates:points}});
 function focusMap(){
  if(!map?.getSource('active-route'))return;
  const points=active?paths[active-1]:config.points;
  (map.getSource('active-route') as GeoJSONSource)?.setData({type:'FeatureCollection',features:points.length>1?[line(points)]:[]});
  markers.forEach((el,i)=>el.classList.toggle('active',active>0&&paths[active-1].some(p=>p[0]===stops[i].point[0]&&p[1]===stops[i].point[1])));
  if(points.length===1)map.flyTo({center:points[0],zoom:active===11?12:11,duration:reduced?0:1000});
  else {
   const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
   map.fitBounds([[Math.min(...xs),Math.min(...ys)],[Math.max(...xs),Math.max(...ys)]],{padding:55,maxZoom:12,duration:reduced?0:1000});
  }
 }
 function selectDay(n:number,open=true){
  active=n;
  card.dataset.activeDay=String(n);
  title.textContent=n?config.labels[n-1]:config.whole;
  if(open&&n){days.forEach((d,i)=>d.open=i===n-1);root!.querySelector('[data-expand-all]')!.textContent=config.expand;}
  const url=new URL(location.href);if(n)url.searchParams.set('day',String(n));else url.searchParams.delete('day');history.replaceState(null,'',url);
  focusMap();
 }
 days.forEach((day,i)=>day.querySelector('summary')!.addEventListener('click',()=>{if(!day.open){selectDay(i+1,false);days.forEach(other=>{if(other!==day)other.open=false;});}}));
 root.querySelectorAll<HTMLButtonElement>('[data-show-day]').forEach(button=>button.addEventListener('click',()=>{selectDay(Number(button.dataset.showDay));if(window.innerWidth<=620)card.scrollIntoView({behavior:reduced?'instant':'smooth',block:'center'});}));
 root.querySelector('[data-expand-all]')!.addEventListener('click',e=>{const expand=days.some(d=>!d.open);days.forEach(d=>d.open=expand);(e.currentTarget as HTMLElement).textContent=expand?config.collapse:config.expand;});
 root.querySelector('[data-map-overview]')!.addEventListener('click',()=>selectDay(0,false));
 root.querySelector('[data-map-prev]')!.addEventListener('click',()=>selectDay(active<=1?days.length:active-1));
 root.querySelector('[data-map-next]')!.addEventListener('click',()=>selectDay(active>=days.length?1:active+1));
 const expand=root.querySelector<HTMLButtonElement>('[data-map-expand]')!;
 function closeExpanded(){card.classList.remove('expanded');document.body.style.overflow='';expand.setAttribute('aria-label',config.open);map?.resize();expand.focus();}
 expand.addEventListener('click',async()=>{
  if(document.fullscreenElement){await document.exitFullscreen();return;}
  if(card.classList.contains('expanded')){closeExpanded();return;}
  if(card.requestFullscreen){try{await card.requestFullscreen();}catch{card.classList.add('expanded');document.body.style.overflow='hidden';}}
  else{card.classList.add('expanded');document.body.style.overflow='hidden';}
  expand.setAttribute('aria-label',config.close);map?.resize();
 });
 document.addEventListener('fullscreenchange',()=>{map?.resize();expand.setAttribute('aria-label',document.fullscreenElement?config.close:config.open);});
 card.addEventListener('keydown',e=>{if(!card.classList.contains('expanded'))return;if(e.key==='Escape')closeExpanded();if(e.key==='Tab'){const buttons=[...card.querySelectorAll<HTMLElement>('button,a[href],canvas[tabindex]')];const first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
 async function loadMap(){
  if(loading)return;loading=true;
  try{
   const {Map,NavigationControl,Marker,setWorkerUrl}=await import('maplibre-gl');
   setWorkerUrl(workerUrl);
   map=new Map({container:'journey-live-map',style:'https://tiles.openfreemap.org/styles/liberty',center:config.points[0],zoom:5,attributionControl:{compact:true},scrollZoom:false});
   map.addControl(new NavigationControl({showCompass:false}),'top-right');
   map.on('error',()=>{if(!card.dataset.ready)status.textContent=config.error;});
   map.on('style.load',()=>{
    card.dataset.ready='true';
    for(const layer of map!.getStyle().layers){
     if(layer.type==='fill'&&'source-layer' in layer&&layer['source-layer']==='water')map!.setPaintProperty(layer.id,'fill-color','#ccdfdc');
     if(layer.type==='line'&&'source-layer' in layer&&layer['source-layer']==='transportation')map!.setPaintProperty(layer.id,'line-color','#c9bea9');
    }
    map!.addSource('whole-route',{type:'geojson',data:{type:'FeatureCollection',features:[line(config.points)]}});
    map!.addLayer({id:'whole-route',type:'line',source:'whole-route',paint:{'line-color':'#647c6f','line-width':2,'line-dasharray':[2,2],'line-opacity':.7}});
    map!.addSource('active-route',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
    map!.addLayer({id:'active-route',type:'line',source:'active-route',paint:{'line-color':'#b74430','line-width':3,'line-dasharray':[2,1.5]}});
    markers=stops.map((stop,i)=>{const el=document.createElement('button');el.type='button';el.className='itinerary-marker';el.textContent=String(i+1);el.setAttribute('aria-label',`${stop.name}: ${config.show}`);el.title=stop.name+(stop.note?` · ${stop.note}`:'');el.addEventListener('click',()=>selectDay(stop.day));new Marker({element:el}).setLngLat(stop.point).addTo(map!);return el;});
    focusMap();
   });
  }catch{status.textContent=config.error;}
 }
 new IntersectionObserver((entries,observer)=>{if(entries.some(e=>e.isIntersecting)){void loadMap();observer.disconnect();}},{rootMargin:'350px'}).observe(card);
 const initial=Number(new URL(location.href).searchParams.get('day'));if(Number.isInteger(initial)&&initial>=1&&initial<=days.length)selectDay(initial);
 const navLinks=[...root.querySelectorAll<HTMLAnchorElement>('.section-links a')];
 // Observe all sections with one shared observer so keyboard and scroll navigation agree.
 const sectionObserver=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting)navLinks.forEach(a=>{if(a.hash===`#${entry.target.id}`)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});}},{rootMargin:'-135px 0px -55% 0px'});
 root.querySelectorAll('.tour-section').forEach(section=>sectionObserver.observe(section));
}