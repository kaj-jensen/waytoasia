import {renderFlights} from './duffel';
import {serviceCopy} from './proposal-services';
import {proposalMedia} from './proposal-media';
import {resolveRoute,routeMap} from './proposal-map';
import {proposalCopy,proposalStatus,proposalPrice,proposalDuration} from './proposal-copy';
export interface ProposalRow {
  id:string;
  token_hash:string;
  manage_token_hash:string;
  traveller_name:string;
  traveller_email:string;
  locale:string;
  title:string;
  summary:string;
  estimated_price:string;
  consultant_note:string;
  payload_json:string;
  status:'new'|'in_review'|'ready'|'approved'|'changes_requested'|'closed';
  traveller_response:string;
  created_at:string;
  updated_at:string;
  expires_at:string;
  revoked_at:string|null;
}

export interface ProposalEnv extends Env {
  DASHBOARD_CAPTURE?:string;
  REPLY_DOMAIN?:string;
  ACCESS_TEAM_DOMAIN?:string;
  ACCESS_AUD?:string;
  ACCESS_REQUIRE_MFA?:string;
  LOCAL_ACCESS_JWK?:string;
  RESEND_API_KEY?:string;
  EMAIL_SEND_ENABLED?:string;
  LEAD_TO_EMAIL?:string;
}

export interface StoredProposalPayload {
  traveller:{name:string;email:string;phone:string;message:string};
  profile:Record<string,unknown>;
  suggestion:Record<string,unknown>;
  builderChoices:Record<string,unknown>;
}

const encoder=new TextEncoder();
export const clean=(value:unknown,max:number):string=>typeof value==='string'?value.trim().slice(0,max):'';
const cleanScalar=(value:unknown,max:number):string=>typeof value==='string'||typeof value==='number'?String(value).trim().slice(0,max):'';
export const escapeHtml=(value:unknown):string=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]??char));

export function randomToken():string{
  const bytes=new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

export async function hashToken(token:string):Promise<string>{
  const digest=await crypto.subtle.digest('SHA-256',encoder.encode(token));
  return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
}

export const validToken=(token:string):boolean=>/^[A-Za-z0-9_-]{43}$/.test(token);

export function parseStoredPayload(value:string):StoredProposalPayload|null{
  try{
    const parsed=JSON.parse(value) as unknown;
    if(!parsed||typeof parsed!=='object')return null;
    const input=parsed as Record<string,unknown>;
    if(!input.traveller||typeof input.traveller!=='object'||!input.suggestion||typeof input.suggestion!=='object')return null;
    return {
      traveller:input.traveller as StoredProposalPayload['traveller'],
      profile:input.profile&&typeof input.profile==='object'?input.profile as Record<string,unknown>:{},
      suggestion:input.suggestion as Record<string,unknown>,
      builderChoices:input.builderChoices&&typeof input.builderChoices==='object'?input.builderChoices as Record<string,unknown>:{},
    };
  }catch{return null}
}

export function publicProposalUrl(requestUrl:string,token:string,proposalOrigin?:string):string{
  const url=new URL(proposalOrigin||requestUrl);
  return `${url.origin}/proposal/${token}`;
}

export function manageProposalUrl(requestUrl:string,token:string,proposalOrigin?:string):string{
  const url=new URL(proposalOrigin||requestUrl);
  return `${url.origin}/proposal/manage/${token}`;
}

const statusLabels:Record<ProposalRow['status'],string>={
  new:'Received',in_review:'Consultant review',ready:'Proposal ready',approved:'Direction approved',changes_requested:'Changes requested',closed:'Closed',
};

const valueRecord=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const valueArray=(value:unknown):unknown[]=>Array.isArray(value)?value:[];

// Derive overnight stays from complete, consecutive route chapters, excluding departure day.
export function plannedStayNights(payload:StoredProposalPayload):number[]{
 const stays=valueArray(payload.suggestion.hotelStays).map(valueRecord),route=valueArray(payload.suggestion.route).map(valueRecord);
 const start=clean(payload.profile.travelStartDate,20),end=clean(payload.profile.travelEndDate,20);
 const span=/^\d{4}-\d{2}-\d{2}$/.test(start)&&/^\d{4}-\d{2}-\d{2}$/.test(end)?(Date.parse(end)-Date.parse(start))/86400000:NaN;
 const ranges=route.map(r=>dayRange(clean(r.days,50)));
 if(Number.isInteger(span)&&span>0&&stays.length===route.length&&ranges.every((r,i)=>r.length===2&&r[0]===(i?ranges[i-1][1]+1:1)&&r[1]>=r[0])&&ranges.at(-1)?.[1]===span+1){return ranges.map(([a,b])=>Math.max(0,Math.min(b,span)-a+1));}
 return stays.map(s=>Number(s.nights));
}
export function hotelSourceMatches(name:string,raw:unknown):boolean{
 const r=valueRecord(raw),text=(`${clean(r.title,300)} ${clean(r.url,1000)}`).toLowerCase().replace(/[^a-z0-9]+/g,' ');
 const words=name.toLowerCase().replace(/[^a-z0-9]+/g,' ').split(' ').filter(w=>w.length>2&&!['hotel','the','and'].includes(w));
 return words.length>=2&&words.every(w=>text.split(' ').includes(w));
}

function selectedHotels(payload:StoredProposalPayload):Array<{place:string;name:string;detail:string;stayIndex:number}>{
  const selections=valueRecord(payload.builderChoices.hotels);
  const notes=valueRecord(payload.builderChoices.hotelNotes);
  return valueArray(payload.suggestion.hotelStays).flatMap((raw,index)=>{
    const stay=valueRecord(raw),place=clean(stay.place,160),selected=clean(selections[`stay-${index}`],80);
    if(!place||!selected)return [];
    if(selected==='custom')return [{place,stayIndex:index,name:'Traveller preference',detail:clean(notes[`stay-${index}`],500)||'To discuss with the consultant'}];
    const option=valueArray(stay.options).map(valueRecord).find(item=>clean(item.id,80)===selected);
    return option?[{place,stayIndex:index,name:clean(option.name,180),detail:[clean(option.standard,80),clean(option.roomGuidance,360)].filter(Boolean).join(' · ')}]:[];
  });
}

function selectedDays(payload:StoredProposalPayload):Array<{day:number;place:string;name:string;detail:string}>{
  const selections=valueRecord(payload.builderChoices.days);
  const notes=valueRecord(payload.builderChoices.dayNotes);
  return valueArray(payload.suggestion.dayPlans).flatMap(raw=>{
    const day=valueRecord(raw),number=Number(day.day),place=clean(day.place,160),selected=clean(selections[`day-${number}`],80);
    if(!Number.isInteger(number))return [];
    if(!selected)return [{day:number,place,name:'Open for the consultant',detail:'Shape this day during the personal proposal.'}];
    if(selected==='open')return [{day:number,place,name:'Open for the consultant',detail:'Shape this day during the personal proposal.'}];
    if(selected==='custom')return [{day:number,place,name:'Traveller idea',detail:clean(notes[`day-${number}`],500)||'To discuss with the consultant'}];
    const option=valueArray(day.options).map(valueRecord).find(item=>clean(item.id,80)===selected);
    return option?[{day:number,place,name:clean(option.name,180),detail:clean(option.description,500)}]:[];
  });
}

function renderRoute(payload:StoredProposalPayload,editable=false):string{
  return valueArray(payload.suggestion.route).slice(0,8).map((raw,index)=>{
    const stop=valueRecord(raw),days=clean(stop.days,50),place=clean(stop.place,160),plan=clean(stop.plan||stop.focus,900);
    const highlights=valueArray(stop.highlights).slice(0,4).map(item=>clean(item,220)).filter(Boolean);
    if(editable)return `<fieldset class="manage-route"><legend>Chapter ${index+1}</legend><div class="manage-two"><label>Days<input name="route_days_${index}" value="${escapeHtml(days)}" maxlength="50" required></label><label>Place<input name="route_place_${index}" value="${escapeHtml(place)}" maxlength="160" required></label></div><label>Plan<textarea name="route_plan_${index}" rows="4" maxlength="900" required>${escapeHtml(plan)}</textarea></label></fieldset>`;
    return `<article class="route-chapter"><div class="route-index">${String(index+1).padStart(2,'0')}</div><div><span>${escapeHtml(days)}</span><h3>${escapeHtml(place)}</h3><p>${escapeHtml(plan)}</p>${highlights.length?`<ul>${highlights.map(item=>`<li>${escapeHtml(item)}</li>`).join('')}</ul>`:''}</div></article>`;
  }).join('');
}

const labelsFlight=(locale:string)=>({en:'Flights',da:'Fly',sv:'Flyg',no:'Fly',fr:'Vols',es:'Vuelos',it:'Voli',nl:'Vluchten',hu:'Repülőjáratok'}[locale]||'Flights');

function shell(title:string,body:string,options:{description:string;locale:string;manage?:boolean}):string{
  return `<!doctype html><html lang="${escapeHtml(options.locale)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive,nosnippet"><meta name="referrer" content="no-referrer"><meta name="description" content="${escapeHtml(options.description)}"><meta name="theme-color" content="#102d24"><link rel="stylesheet" href="/proposal.css?v=programme-1"><link rel="stylesheet" href="/flights.css"><title>${escapeHtml(title)} — Way to Asia</title></head><body class="${options.manage?'manage-view':'proposal-view'}"><a class="skip" href="#proposal-content">Skip to journey</a><header class="proposal-nav"><a class="proposal-brand" href="/" translate="no">WAY <i>to</i> ASIA</a><span>${options.manage?'Consultant workspace':'Private journey design'}</span></header>${body}<footer class="proposal-footer"><span translate="no">Way to Asia</span><p>A personal journey design, prepared with care. Availability and prices are confirmed separately.</p><a href="mailto:journeys@waytoasia.com">journeys@waytoasia.com</a></footer></body></html>`;
}

export function renderProposalPage(row:ProposalRow,token:string,responseState:string):string{
  const payload=parseStoredPayload(row.payload_json);
  if(!payload)return shell('Proposal unavailable','<main class="message-page"><h1>This proposal could not be displayed.</h1></main>',{description:'Private Way to Asia proposal',locale:'en'});
  const c=proposalCopy(row.locale),sc=serviceCopy(row.locale),profile=payload.profile;
  const stayNights=plannedStayNights(payload);
  const scope=valueRecord(payload.builderChoices.serviceScope);
  const scopeItems=(key:string)=>valueArray(scope[key]).map(v=>clean(v,300)).filter(Boolean).slice(0,30);
  const list=(items:string[])=>`<ul>${items.map(v=>`<li>${escapeHtml(v)}</li>`).join('')}</ul>`;
  const scopeSection=`<section id="services" class="services-section"><div class="brochure-heading"><h2>${sc.title}</h2><p>${sc.help}</p></div><div class="card-grid"><article class="choice-card"><h3>${sc.included}</h3>${scopeItems('included').length?list(scopeItems('included')):`<p>${sc.empty}</p>`}</article><article class="choice-card"><h3>${sc.excluded}</h3>${scopeItems('excluded').length?list(scopeItems('excluded')):`<p>${sc.flights}</p>`}</article><article class="choice-card"><h3>${sc.pending}</h3>${list(scopeItems('pending').length?scopeItems('pending'):sc.pendingItems)}</article></div></section>`;
  const route=valueArray(payload.suggestion.route),locations=resolveRoute(route,[...valueArray(profile.destinations),...route.map(s=>clean(valueRecord(s).place,160))]);
  const hotels=selectedHotels(payload),days=selectedDays(payload);
  const date=(value:string,short=false)=>{try{return new Date(value).toLocaleDateString(row.locale,{day:'numeric',month:short?'short':'long',year:'numeric',timeZone:'UTC'})}catch{return value}};
  const duration=proposalDuration(row.locale,clean(payload.suggestion.recommendedDuration,100))||[cleanScalar(profile.durationDays,30),c.day].filter(Boolean).join(' ');
  const status=proposalStatus(row.locale,row.status);
  const localPrice=proposalPrice(row.locale,row.estimated_price);
  const banner=responseState==='approved'?c.thanksApprove:responseState==='changes'?c.thanksChange:'';
  const sourceLink=(url:unknown,label:string)=>{try{const u=new URL(String(url));return u.protocol==='https:'?`<a href="${escapeHtml(u.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)} ↗</a>`:''}catch{return ''}};
  const sourceLinks=(raw:unknown)=>valueArray(raw).slice(0,3).map(v=>{const r=valueRecord(v);return sourceLink(r.url,clean(r.title,100)||c.sources)}).join(' ');
  const photos=valueArray(payload.suggestion.proposalImages).map(valueRecord).filter(p=>p.approved===true&&typeof p.src==='string'&&/^\/images\/proposals\/[a-z0-9/-]+\.(webp|jpg|png)$/.test(p.src)&&clean(p.alt,180)&&clean(p.source,500));
  const photo=(place:string,hero=false)=>{const p=photos.find(p=>p.place===place);if(!p)return '';return `<figure class="destination-photo"><img src="${escapeHtml(p.src)}" width="1600" height="1000" alt="${escapeHtml(p.alt)}" loading="${hero?'eager':'lazy'}" ${hero?'fetchpriority="high"':''}><figcaption>${sourceLink(p.source,clean(p.credit,160)||c.sources)}</figcaption></figure>`};
  const registeredPhoto=(label:string,hero=false)=>{const image=proposalMedia[label];if(!image)return '';return `<figure class="destination-photo"><img src="${image.src}" width="1600" height="1000" alt="${escapeHtml(image.alt)}" loading="${hero?'eager':'lazy'}" ${hero?'fetchpriority="high"':''}><figcaption>${sourceLink(image.source,image.credit)} · ${sourceLink(image.license,image.license.includes('zero')?'CC0':'CC BY-SA')} · ${row.locale==='sv'?'Beskuren visning':'Cropped display'}</figcaption></figure>`};
  const openingLocation=locations.find(p=>p.label==='Mutianyu')||locations.find(p=>proposalMedia[p.label]);
  const heroPhoto=photo(locations[0]?.place||'',true)||(openingLocation?registeredPhoto(openingLocation.label,true):'');
  const facts=[[c.dates,clean(profile.travelStartDate,20)&&clean(profile.travelEndDate,20)?`${date(clean(profile.travelStartDate,20),true)} – ${date(clean(profile.travelEndDate,20),true)}${Number(profile.dateFlexibilityDays)>0?` · ± ${Number(profile.dateFlexibilityDays)}`:''}`:cleanScalar(profile.travelMonth,100)||c.flexible],[c.duration,duration],[c.travellers,[profile.adults?`${cleanScalar(profile.adults,3)} ${c.adults}`:'',Number(profile.children)?`${cleanScalar(profile.children,3)} ${c.children}`:''].filter(Boolean).join(' · ')],[c.departure,cleanScalar(profile.departureAirport,120)]].filter(([,value])=>value);
  const price=localPrice?`<div class="overview-price"><span class="eyebrow">${c.estimate}</span><strong>${escapeHtml(localPrice)}</strong><small>${c.disclaimer}</small></div>`:'';
  const routeList=locations.map(p=>{const stop=valueRecord(route[p.index]);const matchingStays=valueArray(payload.suggestion.hotelStays).map(valueRecord).filter(stay=>resolveRoute([{place:stay.place}],valueArray(profile.destinations))[0]?.label===p.label);const nights=stayNights.length===route.length?stayNights[p.index]:Number(stop.nights??(matchingStays.length===1?matchingStays[0].nights:undefined));const link=p.coordinates?sourceLink(`https://www.openstreetmap.org/?mlat=${p.coordinates[1]}&mlon=${p.coordinates[0]}#map=12/${p.coordinates[1]}/${p.coordinates[0]}`,c.mapLink):`<small class="review-issue">${c.review}</small>`;return `<li><b>${p.index+1}</b><div><a href="#destination-${p.index}">${escapeHtml(p.place)}</a><small>${escapeHtml(clean(stop.days,50))}${Number.isInteger(nights)&&nights>0?` · ${nights} ${c.nights}`:''}</small>${link}</div></li>`}).join('');
  const chapters=route.map((raw,index)=>{const stop=valueRecord(raw),place=clean(stop.place,160),location=locations[index];return `<article class="destination-chapter" id="destination-${index}">${photo(place)||(location?.label!==openingLocation?.label?registeredPhoto(location?.label||''):'')}<div class="chapter-copy"><span class="eyebrow">${String(index+1).padStart(2,'0')} · ${escapeHtml(clean(stop.days,50))}</span><h3>${escapeHtml(place)}</h3><p>${escapeHtml(clean(stop.plan||stop.focus,900))}</p><ul>${valueArray(stop.highlights).slice(0,6).map(h=>`<li>${escapeHtml(clean(h,220))}</li>`).join('')}</ul><a href="#${days.some(d=>d.day===(dayRange(clean(stop.days,50))[0]||index+1))?`day-${dayRange(clean(stop.days,50))[0]||index+1}`:'itinerary'}">${c.itinerary} ↓</a>${sourceLinks(stop.mapLinks)}${clean(stop.onwardTravel,500)?`<p class="onward-travel">${escapeHtml(clean(stop.onwardTravel,500))}</p>`:''}</div></article>`}).join('');
  const selectedName=(name:string)=>({'Traveller preference':c.preference,'To discuss with the consultant':c.discuss,'Open for the consultant':c.open,'Traveller idea':c.idea,'Shape this day during the personal proposal.':c.discuss}[name]||name);
  const dayLabels:Record<string,string[]>={
    en:['Day-by-day programme','Programme & excursions','Overnight stay','Selected plan · inclusion to be confirmed','Departure day · no overnight stay','Stay to be confirmed'],
    da:['Program dag for dag','Program og udflugter','Overnatning','Valgt plan · inkludering skal bekræftes','Afrejsedag · ingen overnatning','Overnatning skal bekræftes'],
    sv:['Program dag för dag','Program och utflykter','Övernattning','Vald plan · inkludering ska bekräftas','Avresedag · ingen övernattning','Boende ska bekräftas'],
    no:['Program dag for dag','Program og utflukter','Overnatting','Valgt plan · inkludering må bekreftes','Avreisedag · ingen overnatting','Overnatting må bekreftes'],
    fr:['Programme jour par jour','Programme et excursions','Hébergement pour la nuit','Programme choisi · inclusion à confirmer','Jour de départ · sans nuitée','Hébergement à confirmer'],
    es:['Programa día a día','Programa y excursiones','Alojamiento nocturno','Plan elegido · inclusión por confirmar','Día de salida · sin alojamiento nocturno','Alojamiento por confirmar'],
    it:['Programma giorno per giorno','Programma ed escursioni','Pernottamento','Programma scelto · inclusione da confermare','Giorno di partenza · nessun pernottamento','Alloggio da confermare'],
    nl:['Programma per dag','Programma en excursies','Overnachting','Gekozen plan · inbegrepen diensten te bevestigen','Vertrekdag · geen overnachting','Verblijf te bevestigen'],
    hu:['Napi program','Program és kirándulások','Éjszakai szállás','Kiválasztott terv · szolgáltatások megerősítésre várnak','Indulás napja · nincs éjszakai szállás','Szállás megerősítésre vár'],
  };
  const dc=dayLabels[row.locale]||dayLabels.en;
  const placeKey=(place:string)=>resolveRoute([{place}],valueArray(profile.destinations))[0]?.label||place.split(':').at(-1)?.trim().toLowerCase();
  const daily=days.map(item=>{
    const start=clean(profile.travelStartDate,20),end=clean(profile.travelEndDate,20);
    const parsed=/^\d{4}-\d{2}-\d{2}$/.test(start)?new Date(`${start}T12:00:00Z`):null;
    if(parsed)parsed.setUTCDate(parsed.getUTCDate()+item.day-1);
    const departureDay=Boolean(parsed&&parsed.toISOString().slice(0,10)===end);
    const chapter=route.map(valueRecord).find(stop=>{const range=dayRange(clean(stop.days,50));return range.length===2&&item.day>=range[0]&&item.day<=range[1]});
    const matching=hotels.filter(hotel=>placeKey(hotel.place)===placeKey(clean(chapter?.place,160)||item.place));
    const hotel=matching.length===1?matching[0]:undefined;
    const stay=departureDay?`<p>${dc[4]}</p>`:hotel?`<h4>${escapeHtml(selectedName(hotel.name))}</h4><p>${escapeHtml(selectedName(hotel.detail))}</p><small>${dc[3]}</small>`:`<p>${dc[5]}</p>`;
    return `<article class="programme-day" id="day-${item.day}"><header><span class="day-number">${c.day} ${item.day}${parsed?`<small>${escapeHtml(date(parsed.toISOString(),true))}</small>`:''}</span><h3>${escapeHtml(item.place)}</h3></header><div class="programme-columns"><section><span class="programme-label">${dc[1]}</span><h4>${escapeHtml(selectedName(item.name))}</h4><p>${escapeHtml(selectedName(item.detail))}</p><small>${dc[3]}</small></section><section><span class="programme-label">${dc[2]}</span>${stay}</section></div></article>`;
  }).join('');
  const flights=renderFlights(payload.builderChoices.flightItinerary,row.locale);
  const body=`<main id="proposal-content">${banner?`<div class="notice success" role="status">${banner}</div>`:''}<section class="brochure-hero ${heroPhoto?'with-photo':''}" id="overview"><div class="opening-copy"><span class="eyebrow">${c.prepared} ${escapeHtml(row.traveller_name)}</span><h1>${escapeHtml(row.title)}</h1><p>${escapeHtml(row.summary)}</p><div class="opening-meta">${escapeHtml(status)} · ${c.updated} ${escapeHtml(date(row.updated_at,true))}</div></div>${heroPhoto}</section><nav class="section-navigation" aria-label="${c.overview}">${[[c.overview,'overview'],[c.route,'route'],...(flights?[[labelsFlight(row.locale),'flights']]:[]),[c.itinerary,'itinerary'],[c.stays,'stays'],[sc.title,'services'],[c.response,'response']].map(([label,id])=>`<a href="#${id}">${label}</a>`).join('')}<button type="button" data-print>${c.print}</button></nav><section class="trip-facts"><dl>${facts.map(([label,value])=>`<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl>${price}</section><section id="route" class="journey-overview"><div class="brochure-heading"><span class="eyebrow">01 · ${c.route}</span><h2>${c.glance}</h2></div><div class="map-layout"><div>${routeMap(locations,{title:c.glance,illustrative:c.illustrative,detail:c.detail,unavailable:c.unavailable})}<p class="map-caption">${c.illustrative}</p><p class="map-attribution"><a href="https://www.naturalearthdata.com/about/" target="_blank" rel="noopener noreferrer">Natural Earth</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a> · GeoNames / Wikidata</p></div><ol class="overview-stops">${routeList}</ol></div></section>${flights}${row.consultant_note?`<aside class="consultant-note"><span>${c.consultant}</span><p>${escapeHtml(row.consultant_note)}</p></aside>`:''}<section class="destination-sequence"><div class="brochure-heading"><span class="eyebrow">02 · ${c.route}</span><h2>${c.chapters}</h2></div>${chapters}</section><section id="itinerary" class="daily-itinerary"><div class="brochure-heading"><span class="eyebrow">03 · ${c.itinerary}</span><h2>${dc[0]}</h2></div>${daily||`<p>${c.discuss}</p>`}</section><section id="stays" class="stays-section"><div class="brochure-heading"><span class="eyebrow">04 · ${c.stays}</span><h2>${c.selectedStays}</h2></div><div class="card-grid">${hotels.map(item=>{const stay=valueRecord(valueArray(payload.suggestion.hotelStays)[item.stayIndex]),opts=valueArray(stay.options).map(valueRecord),selected=opts.find(o=>o.name===item.name);return `<article class="choice-card"><span>${escapeHtml(item.place)}</span><h3>${escapeHtml(selectedName(item.name))}</h3><p>${escapeHtml(selectedName(item.detail))}</p>${stayNights[item.stayIndex]>0?`<small>${stayNights[item.stayIndex]} ${c.nights} · ${sc.nights}</small>`:''}<div class="source-links">${sourceLinks(valueArray(selected?.sources).filter(v=>hotelSourceMatches(item.name,v)))||`<small>${sc.source}</small>`}</div></article>`}).join('')||`<p>${c.discuss}</p>`}</div></section>${scopeSection}<section id="response" class="response-panel"><div><span class="eyebrow">${c.continue}</span><h2>${c.question}</h2><p>${c.responseHelp}</p></div><form method="post" action="/api/proposals/${encodeURIComponent(token)}/response" data-response-form data-required-message="${c.changesRequired}"><label>${c.notes}<textarea name="note" rows="4" maxlength="1500" placeholder="${c.placeholder}">${escapeHtml(row.traveller_response)}</textarea></label><div><button name="action" value="approve" class="primary">${c.approve}</button><button name="action" value="change" class="secondary">${c.change}</button></div><p class="response-feedback" role="status" data-sending="${c.sending}"></p></form></section><p class="private-note">${c.expiry} ${escapeHtml(date(row.expires_at))}</p></main>`;
  return shell(row.title,body,{description:row.summary,locale:row.locale}).replace('<span>Private journey design</span>',`<span>${c.private}</span>`).replace('Skip to journey',c.skip).replace('A personal journey design, prepared with care. Availability and prices are confirmed separately.',c.footer).replace('</head>','<script src="/proposal.js" defer></script></head>');
}
export function dayRange(value:string):number[]{return (value.match(/\d+/g)||[]).map(Number).slice(0,2);}

export function renderManagePage(row:ProposalRow,saved:boolean):string{
  const payload=parseStoredPayload(row.payload_json);
  if(!payload)return shell('Proposal unavailable','<main class="message-page"><h1>This proposal could not be displayed.</h1></main>',{description:'Way to Asia consultant workspace',locale:'en',manage:true});
  const body=`<main id="proposal-content" class="manage-main">${saved?'<div class="notice success">Proposal updated. The customer link now shows these changes.</div>':''}<header class="manage-header"><span class="eyebrow">Consultant workspace</span><h1>${escapeHtml(row.title)}</h1><p>Update this saved proposal. Every save updates the same private customer link. When the staff dashboard is enabled, previous versions are preserved as internal snapshots.</p></header><form method="post" class="manage-form"><section><h2>Presentation</h2><label>Journey title<input name="title" value="${escapeHtml(row.title)}" maxlength="180" required></label><label>Summary<textarea name="summary" rows="5" maxlength="1200" required>${escapeHtml(row.summary)}</textarea></label><div class="manage-two"><label>Estimated price<input name="estimated_price" value="${escapeHtml(row.estimated_price)}" maxlength="120" placeholder="For example: From €6,850 per person"></label><label>Status<select name="status">${Object.entries(statusLabels).map(([value,label])=>`<option value="${value}"${row.status===value?' selected':''}>${escapeHtml(label)}</option>`).join('')}</select></label></div><label>Personal note shown to the customer<textarea name="consultant_note" rows="5" maxlength="1600">${escapeHtml(row.consultant_note)}</textarea></label></section><section><h2>Service scope</h2><p>Confirm only services covered by the quoted price. One item per line. Leave unconfirmed services in the final field.</p>${['included','excluded','pending'].map(key=>`<label>${key}<textarea name="services_${key}" rows="4" maxlength="6000">${escapeHtml(valueArray(valueRecord(payload.builderChoices.serviceScope)[key]).join('\n'))}</textarea></label>`).join('')}</section><section><h2>Route chapters</h2>${renderRoute(payload,true)}${resolveRoute(payload.suggestion.route,[...valueArray(payload.profile.destinations),...valueArray(payload.suggestion.route).map(v=>clean(valueRecord(v).place,160))]).filter(p=>p.issue).map(p=>`<p class="notice">Map review: ${escapeHtml(p.place)} — ${escapeHtml(p.issue)}. Confirm the specific location before plotting.</p>`).join('')}</section><div class="manage-actions"><button class="primary">Save changes</button></div></form></main>`;
  return shell(`Manage ${row.title}`,body,{description:'Way to Asia consultant workspace',locale:row.locale,manage:true});
}

const emailShell=(preheader:string,content:string)=>`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Way to Asia</title></head><body style="margin:0;background:#eee8dc;font-family:Arial,sans-serif;color:#173229"><div style="display:none;max-height:0;overflow:hidden">${escapeHtml(preheader)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eee8dc"><tr><td align="center" style="padding:28px 14px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#fffdf8;border-top:5px solid #b44b37"><tr><td style="padding:24px 32px;background:#102d24;color:#fff"><div style="font:700 17px Georgia,serif;letter-spacing:2px">WAY <i style="color:#d3ae68">to</i> ASIA</div></td></tr><tr><td style="padding:34px 32px">${content}</td></tr><tr><td style="padding:20px 32px;background:#f1eadc;color:#66736c;font-size:12px;line-height:1.6">This is a personal travel design, not a booking or payment confirmation.<br>Way to Asia · <a href="mailto:journeys@waytoasia.com" style="color:#8f3828">journeys@waytoasia.com</a></td></tr></table></td></tr></table></body></html>`;

const button=(label:string,url:string)=>`<a href="${escapeHtml(url)}" style="display:inline-block;padding:15px 22px;background:#b44b37;color:#fff;text-decoration:none;font-weight:700;font-size:14px">${escapeHtml(label)} →</a>`;

export function customerEmail(row:Pick<ProposalRow,'traveller_name'|'title'|'summary'|'expires_at'>,url:string):{subject:string;text:string;html:string}{
  const expiry=new Date(row.expires_at).toLocaleDateString('en',{day:'numeric',month:'long',year:'numeric'});
  const subject=`Your Way to Asia journey: ${row.title}`;
  const text=`Hello ${row.traveller_name},\n\nYour personal journey design is ready to review:\n${url}\n\n${row.summary}\n\nThe private link expires ${expiry}. This is an enquiry, not a booking or payment confirmation.\n\nWay to Asia`;
  const html=emailShell(`Your personal Way to Asia journey is ready.`,`<p style="margin:0 0 10px;color:#9b3f2e;font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase">Your private journey design</p><h1 style="margin:0 0 18px;font:36px/1.1 Georgia,serif;color:#173229">${escapeHtml(row.title)}</h1><p style="margin:0 0 22px;color:#50625a;font-size:16px;line-height:1.65">Hello ${escapeHtml(row.traveller_name)},</p><p style="margin:0 0 24px;color:#50625a;font-size:16px;line-height:1.65">${escapeHtml(row.summary)}</p><p style="margin:0 0 26px">${button('View my journey',url)}</p><p style="margin:0;color:#718078;font-size:12px;line-height:1.6">This private link is not indexed by search engines and expires ${escapeHtml(expiry)}.</p>`);
  return {subject,text,html};
}

export function consultantEmail(row:Pick<ProposalRow,'traveller_name'|'traveller_email'|'title'|'summary'>,publicUrl:string,manageUrl:string,phone:string,message:string):{subject:string;text:string;html:string}{
  const subject=`New Journey Designer enquiry · ${row.traveller_name} · ${row.title}`;
  const details=[`Traveller: ${row.traveller_name}`,`Email: ${row.traveller_email}`,phone?`Phone: ${phone}`:'',message?`Note: ${message}`:'',`Journey: ${row.title}`,row.summary,`Customer preview: ${publicUrl}`,`Consultant workspace: ${manageUrl}`].filter(Boolean).join('\n');
  const html=emailShell(`New Journey Designer enquiry from ${row.traveller_name}.`,`<p style="margin:0 0 10px;color:#9b3f2e;font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase">New consultant handoff</p><h1 style="margin:0 0 18px;font:34px/1.1 Georgia,serif;color:#173229">${escapeHtml(row.title)}</h1><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;background:#f1eadc"><tr><td style="padding:18px;color:#50625a;font-size:14px;line-height:1.7"><b style="color:#173229">${escapeHtml(row.traveller_name)}</b><br><a href="mailto:${escapeHtml(row.traveller_email)}" style="color:#8f3828">${escapeHtml(row.traveller_email)}</a>${phone?`<br>${escapeHtml(phone)}`:''}${message?`<br><br>${escapeHtml(message)}`:''}</td></tr></table><p style="margin:0 0 22px;color:#50625a;font-size:15px;line-height:1.65">${escapeHtml(row.summary)}</p><p style="margin:0 0 12px">${button('Open consultant workspace',manageUrl)}</p><p style="margin:0;font-size:12px"><a href="${escapeHtml(publicUrl)}" style="color:#8f3828">Open the customer preview</a></p>`);
  return {subject,text:details,html};
}

export async function sendResend(apiKey:string,message:{from?:string;to:string[];replyTo?:string;subject:string;text:string;html:string}):Promise<boolean>{
  try{
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({from:message.from??'Way to Asia <journeys@waytoasia.com>',to:message.to,reply_to:message.replyTo,subject:message.subject,text:message.text,html:message.html}),signal:AbortSignal.timeout(12000)});
    if(!response.ok)console.error(JSON.stringify({message:'Resend email failed',status:response.status}));
    return response.ok;
  }catch(error){
    console.error(JSON.stringify({message:'Resend email request failed',error:error instanceof Error?error.message:String(error)}));
    return false;
  }
}
