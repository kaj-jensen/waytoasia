import {tours} from '../content/data';

export const tripPlannerDestinations = ['china','south-korea','thailand','vietnam','indonesia'] as const;
export const tripPlannerInterests = ['food','history','nature','art','active','wellness','family','celebration'] as const;
export const tripPlannerPaces = ['slow','balanced','active'] as const;
export const tripPlannerBudgets = ['value','comfort','premium','luxury','unsure'] as const;

export type TripPlannerDestination = typeof tripPlannerDestinations[number];
export type TripPlannerInterest = typeof tripPlannerInterests[number];
export type TripPlannerPace = typeof tripPlannerPaces[number];
export type TripPlannerBudget = typeof tripPlannerBudgets[number];

export const hotelStandardForBudget=(budget:TripPlannerBudget):'Value'|'Comfort'|'Premium'|'Luxury'=>budget==='unsure'?'Comfort':budget==='value'?'Value':budget==='premium'?'Premium':budget==='luxury'?'Luxury':'Comfort';
export const hotelStandardMatches=(standard:string,budget:TripPlannerBudget):boolean=>standard.trim().toLowerCase()===hotelStandardForBudget(budget).toLowerCase();

export interface TripPlannerRequest {
  locale: string;
  destinations: TripPlannerDestination[];
  /** Free-form destinations or regions. This deliberately allows Asia beyond the website catalogue. */
  destinationIdeas: string;
  travelMonth: string;
  durationDays: number;
  adults: number;
  children: number;
  budget: TripPlannerBudget;
  interests: TripPlannerInterest[];
  pace: TripPlannerPace;
  notes: string;
}

export interface SuggestedRouteStop {
  days: string;
  place: string;
  plan: string;
  /** Compatibility alias for the current UI while route prose is generated as plan. */
  focus: string;
  highlights: string[];
  onwardTravel: string;
}

export interface ResearchLink {title:string;url:string;domain:string}

export interface SuggestedHotelOption {
  id:string;
  name:string;
  area:string;
  standard:string;
  whyFit:string;
  roomGuidance:string;
  reviewSignal:string;
  sources:ResearchLink[];
}

export interface SuggestedHotelStay {
  place:string;
  nights:number;
  options:SuggestedHotelOption[];
}

export interface SuggestedDayOption {
  id:string;
  name:string;
  type:string;
  description:string;
  whyFit:string;
  interestTags:string[];
  sources:ResearchLink[];
}

export interface SuggestedDayPlan {
  day:number;
  place:string;
  theme:string;
  options:SuggestedDayOption[];
}

export interface TripSuggestionDraft {
  title: string;
  summary: string;
  recommendedDuration: string;
  route: SuggestedRouteStop[];
  hotelStays: Array<Omit<SuggestedHotelStay,'options'>&{options:Array<Omit<SuggestedHotelOption,'sources'>&{sourceUrls:string[]}>}>;
  dayPlans: Array<Omit<SuggestedDayPlan,'options'>&{options:Array<Omit<SuggestedDayOption,'sources'>&{sourceUrls:string[]}>}>;
  fitReasons: string[];
  practicalNotes: string[];
  travellerInsights: Array<{insight:string;sourceUrls:string[]}>;
  matchedJourneySlugs: string[];
  closing: string;
}

export interface TripSuggestion extends Omit<TripSuggestionDraft,'matchedJourneySlugs'|'travellerInsights'|'hotelStays'|'dayPlans'> {
  id: string;
  generatedAt: string;
  availability: 'not-connected';
  pricing: 'illustrative-only';
  travellerResearch: 'live-sources'|'not-connected';
  travellerInsights: Array<{insight:string;sources:Array<{title:string;url:string;domain:string}>}>;
  hotelStays: SuggestedHotelStay[];
  dayPlans: SuggestedDayPlan[];
  matchedJourneys: Array<{
    slug: string;
    name: string;
    country: string;
    duration: number;
    href: string;
    prices: Record<string,number>;
  }>;
}

export interface TravellerResearchSource {id:string;title:string;url:string;domain:string;excerpt:string}

const localePattern = /^(en|es|it|fr|nl|hu|sv|da|no)$/;
const monthPattern = /^(flexible|\d{4}-(0[1-9]|1[0-2]))$/;

const uniqueAllowed = <T extends string>(value: unknown, allowed: readonly T[], limit: number): T[] => {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is T => typeof item === 'string' && allowed.includes(item as T)))].slice(0,limit);
};

const integerBetween = (value: unknown, min: number, max: number, fallback: number): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
};

export function parseTripPlannerRequest(value: unknown): TripPlannerRequest | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string,unknown>;
  const locale = typeof input.locale === 'string' && localePattern.test(input.locale) ? input.locale : 'en';
  const destinations = uniqueAllowed(input.destinations,tripPlannerDestinations,3);
  const destinationIdeas = typeof input.destinationIdeas === 'string' ? input.destinationIdeas.trim().slice(0,180) : '';
  const interests = uniqueAllowed(input.interests,tripPlannerInterests,5);
  const travelMonth = typeof input.travelMonth === 'string' && monthPattern.test(input.travelMonth) ? input.travelMonth : 'flexible';
  const durationDays = integerBetween(input.durationDays,5,35,12);
  const adults = integerBetween(input.adults,1,12,2);
  const children = integerBetween(input.children,0,8,0);
  const budget = tripPlannerBudgets.includes(input.budget as TripPlannerBudget) ? input.budget as TripPlannerBudget : 'comfort';
  const pace = tripPlannerPaces.includes(input.pace as TripPlannerPace) ? input.pace as TripPlannerPace : 'balanced';
  const notes = typeof input.notes === 'string' ? input.notes.trim().slice(0,1000) : '';
  if (!interests.length && !destinationIdeas && !notes) return null;
  return {locale,destinations,destinationIdeas,travelMonth,durationDays,adults,children,budget,interests,pace,notes};
}

export function tripCatalogForAgent() {
  return tours.map(tour=>({
    slug:tour.slug,
    name:tour.name,
    country:tour.country,
    duration:tour.duration,
    route:tour.route ?? tour.itinerary.map(item=>item.title),
    styles:tour.styles,
    teaser:tour.teaser,
    departures:tour.departures,
    pace:tour.pace ?? null,
    bestFor:tour.bestFor ?? null,
    highlights:tour.highlights ?? [],
  }));
}

const text = (value: unknown, max = 500): string => typeof value === 'string' ? value.trim().slice(0,max) : '';
const textArray = (value: unknown, limit: number, max = 240): string[] => Array.isArray(value) ? value.map(item=>text(item,max)).filter(Boolean).slice(0,limit) : [];
const asRoute=(value:unknown):SuggestedRouteStop[]=>Array.isArray(value)?value.map(item=>{
  const stop=item&&typeof item==='object'?item as Record<string,unknown>:{};
  const plan=text(stop.plan,700)||text(stop.focus,700);
  return {days:text(stop.days,40),place:text(stop.place,120),plan,focus:plan,highlights:textArray(stop.highlights,4,180),onwardTravel:text(stop.onwardTravel,300)};
}).filter(stop=>stop.days&&stop.place&&stop.plan&&stop.highlights.length>=2).slice(0,8):[];

const sourcesForUrls=(value:unknown,researchSources:TravellerResearchSource[]):ResearchLink[]=>textArray(value,3,1000).flatMap(url=>{
  const source=researchSources.find(candidate=>candidate.url===url);
  return source?[{title:source.title,url:source.url,domain:source.domain}]:[];
});

const asHotelStays=(value:unknown,researchSources:TravellerResearchSource[]):SuggestedHotelStay[]=>{
  if(!Array.isArray(value))return [];
  const seen=new Set<string>();
  return value.map(item=>{
    const stay=item&&typeof item==='object'?item as Record<string,unknown>:{},rawOptions=Array.isArray(stay.options)?stay.options:[];
    const options=rawOptions.map(raw=>{
      const option=raw&&typeof raw==='object'?raw as Record<string,unknown>:{};
      return {id:text(option.id,80),name:text(option.name,180),area:text(option.area,180),standard:text(option.standard,80),whyFit:text(option.whyFit,500),roomGuidance:text(option.roomGuidance,360),reviewSignal:text(option.reviewSignal,360),sources:sourcesForUrls(option.sourceUrls,researchSources)};
    }).filter(option=>option.id&&option.name&&option.whyFit&&option.roomGuidance).slice(0,3);
    return {place:text(stay.place,160),nights:integerBetween(stay.nights,1,34,1),options};
  }).filter(stay=>{
    if(!stay.place||stay.options.length<2)return false;
    const key=stay.place.toLocaleLowerCase();
    if(seen.has(key))return false;
    seen.add(key);
    return true;
  }).slice(0,10);
};

const asDayPlans=(value:unknown,researchSources:TravellerResearchSource[]):SuggestedDayPlan[]=>Array.isArray(value)?value.map(item=>{
  const day=item&&typeof item==='object'?item as Record<string,unknown>:{},rawOptions=Array.isArray(day.options)?day.options:[];
  const options=rawOptions.map(raw=>{
    const option=raw&&typeof raw==='object'?raw as Record<string,unknown>:{};
    return {id:text(option.id,80),name:text(option.name,180),type:text(option.type,80),description:text(option.description,500),whyFit:text(option.whyFit,360),interestTags:textArray(option.interestTags,4,50),sources:sourcesForUrls(option.sourceUrls,researchSources)};
  }).filter(option=>option.id&&option.name&&option.description&&option.whyFit).slice(0,3);
  return {day:integerBetween(day.day,1,35,0),place:text(day.place,160),theme:text(day.theme,180),options};
}).filter(day=>day.day&&day.place&&day.theme&&day.options.length>=2).slice(0,35):[];

const durationCopy:Record<string,(days:number)=>string>={
  en:days=>`${days} days / ${Math.max(1,days-1)} nights`,
  da:days=>`${days} dage / ${Math.max(1,days-1)} nætter`,
  es:days=>`${days} días / ${Math.max(1,days-1)} noches`,
  it:days=>`${days} giorni / ${Math.max(1,days-1)} notti`,
  fr:days=>`${days} jours / ${Math.max(1,days-1)} nuits`,
  nl:days=>`${days} dagen / ${Math.max(1,days-1)} nachten`,
  hu:days=>`${days} nap / ${Math.max(1,days-1)} éjszaka`,
  sv:days=>`${days} dagar / ${Math.max(1,days-1)} nätter`,
  no:days=>`${days} dager / ${Math.max(1,days-1)} netter`,
};

const routeCoversDuration=(route:SuggestedRouteStop[],durationDays:number):boolean=>{
  let expectedStart=1;
  for(const stop of route){
    const numbers=stop.days.match(/\d+/g)?.map(Number)??[];
    if(!numbers.length)return false;
    const start=numbers[0];
    const end=numbers[1]??start;
    if(start!==expectedStart||end<start)return false;
    expectedStart=end+1;
  }
  return expectedStart===durationDays+1;
};

const routeStopLength=(days:string):number=>{
  const numbers=days.match(/\d+/g)?.map(Number)??[];
  if(!numbers.length)return 0;
  return Math.max(0,(numbers[1]??numbers[0])-numbers[0]+1);
};

const requestedCountries=(profile:TripPlannerRequest):Array<{name:string;pattern:RegExp}>=>{
  const brief=`${profile.destinationIdeas} ${profile.destinations.join(' ')}`.toLowerCase();
  const candidates:Array<{name:string;pattern:RegExp;requestPattern:RegExp}>=[
    {name:'Japan',pattern:/\bjapan\b/i,requestPattern:/\bjapan\b/i},
    {name:'South Korea',pattern:/\b(?:south )?korea\b/i,requestPattern:/\b(?:south[ -])?korea\b/i},
    {name:'Taiwan',pattern:/\btaiwan\b/i,requestPattern:/\btaiwan\b/i},
    {name:'China',pattern:/\bchina\b/i,requestPattern:/\bchina\b/i},
    {name:'Thailand',pattern:/\bthailand\b/i,requestPattern:/\bthailand\b/i},
    {name:'Vietnam',pattern:/\bvietnam\b/i,requestPattern:/\bvietnam\b/i},
    {name:'Indonesia',pattern:/\bindonesia\b/i,requestPattern:/\bindonesia\b/i},
    {name:'Laos',pattern:/\blaos\b/i,requestPattern:/\blaos\b/i},
    {name:'Cambodia',pattern:/\bcambodia\b/i,requestPattern:/\bcambodia\b/i},
    {name:'Malaysia',pattern:/\bmalaysia\b/i,requestPattern:/\bmalaysia\b/i},
    {name:'Singapore',pattern:/\bsingapore\b/i,requestPattern:/\bsingapore\b/i},
    {name:'Philippines',pattern:/\bphilippines\b/i,requestPattern:/\bphilippines\b/i},
    {name:'India',pattern:/\bindia\b/i,requestPattern:/\bindia\b/i},
    {name:'Sri Lanka',pattern:/\bsri lanka\b/i,requestPattern:/\bsri lanka\b/i},
    {name:'Nepal',pattern:/\bnepal\b/i,requestPattern:/\bnepal\b/i},
    {name:'Bhutan',pattern:/\bbhutan\b/i,requestPattern:/\bbhutan\b/i},
  ];
  return candidates.filter(country=>country.requestPattern.test(brief));
};

export function assessTripSuggestionQuality(value:unknown,profile:TripPlannerRequest,researchSources:TravellerResearchSource[]=[]):string[]{
  if(!value||typeof value!=='object')return ['The response is not an itinerary object.'];
  const draft=value as Record<string,unknown>;
  const route=asRoute(draft.route);
  const issues:string[]=[];
  const rawHotelStays=Array.isArray(draft.hotelStays)?draft.hotelStays:[];
  const rawDayPlans=Array.isArray(draft.dayPlans)?draft.dayPlans:[];
  if(route.length<(profile.durationDays>=14?4:profile.durationDays>=10?3:2))issues.push('Use enough itinerary chapters for the trip length.');
  if(!routeCoversDuration(route,profile.durationDays))issues.push(`Cover Days 1–${profile.durationDays} exactly once with no gaps or overlaps.`);
  if(route.some(stop=>stop.plan.length<55||stop.plan.toLowerCase()===stop.place.toLowerCase()))issues.push('Every chapter plan must be a concrete 1–2 sentence narrative about the base, rhythm and purpose, not a label or fragment.');
  if(route.slice(0,-1).some(stop=>!stop.onwardTravel)||route.at(-1)?.onwardTravel)issues.push('Give every non-final chapter a real onward journey and leave the final onwardTravel empty.');
  const unsupportedTravelTime=/\b(?:about|around|approximately|approx\.?|≈|~)?\s*\d+(?:[.,]\d+)?\s*(?:h|hr|hrs|hour|hours|minute|minutes|min)\b/i;
  if(route.some(stop=>unsupportedTravelTime.test(stop.onwardTravel)))issues.push('Remove unverified journey times; describe the recommended transport and connection without a duration.');
  const practical=textArray(draft.practicalNotes,5,300);
  const scheduleClaim=/\b(?:daily|every day|several (?:times|services|departures)|multiple (?:times|services|departures)|non-?stop)\b/i;
  if([...route.map(stop=>stop.onwardTravel),...practical].some(copy=>scheduleClaim.test(copy)))issues.push('Remove flight and ferry frequency or nonstop claims because live schedules are not connected.');
  const unjustifiedDomesticFlight=route.slice(0,-1).some((stop,index)=>{
    const next=route[index+1];
    const country=stop.place.split(':')[0].trim().toLowerCase();
    const nextCountry=next.place.split(':')[0].trim().toLowerCase();
    const combined=`${stop.place} ${stop.plan} ${stop.onwardTravel} ${next.place}`;
    const clearRailCorridor=/\b(?:seoul.*busan|busan.*seoul|tokyo.*(?:kyoto|osaka)|(?:kyoto|osaka).*tokyo|kyoto.*osaka|osaka.*kyoto)\b/i.test(combined);
    return country===nextCountry&&clearRailCorridor&&/\bfl(?:y|ight)\b/i.test(stop.onwardTravel)&&!/\b(?:island|archipelago|remote|jeju|okinawa|hokkaido|bali|borneo|sulawesi|palawan)\b/i.test(combined);
  });
  if(unjustifiedDomesticFlight)issues.push('Replace an unjustified domestic flight with the most direct rail or road connection, or explicitly explain the island or remote geography that makes flying sensible.');
  if(profile.pace!=='active'&&route.some(stop=>routeStopLength(stop.days)===1&&/[&,/]/.test(stop.place.split(':').slice(1).join(':'))))issues.push('Do not combine multiple places into a single day at a balanced or slow pace; keep one base or remove the extra stop.');
  const countries=requestedCountries(profile);
  if(countries.length>=2&&profile.durationDays>=12){
    const minimumDays=Math.max(3,Math.ceil(profile.durationDays*0.28));
    const underweighted=countries.filter(country=>route.reduce((total,stop)=>total+(country.pattern.test(stop.place)?routeStopLength(stop.days):0),0)<minimumDays);
    if(underweighted.length)issues.push(`Give each requested country a meaningful share of the trip (at least ${minimumDays} days here); rebalance ${underweighted.map(country=>country.name).join(' and ')}.`);
  }
  const boilerplate=/check (the )?(weather|visa)|research (any )?vaccinations|ensure (that )?(all )?(necessary )?documents|book(ing)? accommodations? in advance|cost-effective (train|rail) pass/i;
  if(practical.length<3||practical.some(note=>boilerplate.test(note)))issues.push('Replace generic booking, visa, vaccine, weather or pass advice with route-specific transport, season and pace trade-offs.');
  if(practical.some(note=>/\bpass\b/i.test(note)&&!/compare|calculate|current point-to-point|individual fares/i.test(note)))issues.push('Never tell the traveller to buy a rail pass without a current fare comparison; advise comparing it with individual tickets instead.');
  if(researchSources.length){
    const supportedInsights=(Array.isArray(draft.travellerInsights)?draft.travellerInsights:[]).filter(item=>{
      if(!item||typeof item!=='object')return false;
      const insight=item as Record<string,unknown>;
      return text(insight.insight,360).length>=40&&textArray(insight.sourceUrls,3,1000).some(url=>researchSources.some(source=>source.url===url));
    });
    if(supportedInsights.length<2)issues.push('Use at least two specific traveller insights supported by the verified research source URLs.');
  }
  if(rawHotelStays.length){
    const hotels=asHotelStays(rawHotelStays,researchSources);
    if(hotels.length<route.length)issues.push('Give a researched hotel shortlist for every overnight route base.');
    if(hotels.some(stay=>stay.options.length<2))issues.push('Give at least two genuinely distinct hotel choices for each stay.');
    if(hotels.some(stay=>stay.options.some(option=>!hotelStandardMatches(option.standard,profile.budget))))issues.push(`Every hotel must match the requested ${hotelStandardForBudget(profile.budget)} standard; do not substitute a higher or lower tier.`);
    if(researchSources.length&&hotels.some(stay=>stay.options.some(option=>!option.sources.length)))issues.push('Cite at least one exact verified research URL for every hotel choice.');
    if(/japan/i.test(`${profile.destinationIdeas} ${profile.destinations.join(' ')} ${route.map(stop=>stop.place).join(' ')}`)&&hotels.some(stay=>/japan|tokyo|kyoto|osaka|hiroshima|hakone|nikko|nara/i.test(stay.place)&&stay.options.some(option=>!/(?:m²|m2|square metre|square meter|room size|spacious|twin)/i.test(option.roomGuidance))))issues.push('For every Japan hotel, state a concrete room-size or room-category safeguard suitable for Western travellers.');
  }
  if(rawDayPlans.length){
    const days=asDayPlans(rawDayPlans,researchSources);
    if(days.length!==profile.durationDays||days.some((day,index)=>day.day!==index+1))issues.push(`Give selectable experience choices for every day from 1 to ${profile.durationDays}, with no gaps.`);
    if(days.some(day=>day.options.length<2))issues.push('Give at least two distinct, interest-matched experience choices for every day.');
    if(researchSources.length&&days.some(day=>day.options.some(option=>!option.sources.length)))issues.push('Cite at least one exact verified research URL for every daily experience choice.');
    if(profile.interests.length&&!days.some(day=>day.options.some(option=>option.interestTags.some(tag=>profile.interests.includes(tag as TripPlannerInterest)))))issues.push('Connect the daily experience choices explicitly to the traveller interests.');
  }
  return issues;
}

export function normalizeTripSuggestion(value: unknown, locale: string, now = new Date(), requestedDurationDays?:number, researchSources:TravellerResearchSource[]=[]): TripSuggestion | null {
  if (!value || typeof value !== 'object') return null;
  const draft = value as Record<string,unknown>;
  const route=asRoute(draft.route);
  const hotelStays=asHotelStays(draft.hotelStays,researchSources);
  const dayPlans=asDayPlans(draft.dayPlans,researchSources);
  const requestedSlugs = textArray(draft.matchedJourneySlugs,4,100);
  const matchedJourneys = requestedSlugs.flatMap(slug=>{
    const tour = tours.find(item=>item.slug===slug);
    return tour ? [{slug:tour.slug,name:tour.name,country:tour.country,duration:tour.duration,href:`/${locale}/${tour.country}/tours/${tour.slug}`,prices:tour.prices}] : [];
  });
  const rawInsights=Array.isArray(draft.travellerInsights)?draft.travellerInsights:[];
  const travellerInsights=rawInsights.flatMap(item=>{
    if(!item||typeof item!=='object')return [];
    const entry=item as Record<string,unknown>;
    const insight=text(entry.insight,360);
    const sourceUrls=textArray(entry.sourceUrls,3,1000);
    const sources=sourceUrls.flatMap(url=>{
      const source=researchSources.find(candidate=>candidate.url===url);
      return source?[{title:source.title,url:source.url,domain:source.domain}]:[];
    });
    return insight&&sources.length?[{insight,sources}]:[];
  }).slice(0,4);
  const suggestion = {
    id:crypto.randomUUID(),
    generatedAt:now.toISOString(),
    title:text(draft.title,160),
    summary:text(draft.summary,900),
    recommendedDuration:requestedDurationDays?(durationCopy[locale]??durationCopy.en)(requestedDurationDays):text(draft.recommendedDuration,80),
    route,
    hotelStays,
    dayPlans,
    fitReasons:textArray(draft.fitReasons,5),
    practicalNotes:textArray(draft.practicalNotes,5),
    closing:text(draft.closing,500),
    availability:'not-connected' as const,
    pricing:'illustrative-only' as const,
    travellerResearch:researchSources.length?'live-sources' as const:'not-connected' as const,
    travellerInsights,
    matchedJourneys,
  };
  const coversDuration=!requestedDurationDays||routeCoversDuration(route,requestedDurationDays);
  const builderComplete=(!Array.isArray(draft.hotelStays)&&!Array.isArray(draft.dayPlans))||(hotelStays.length>=route.length&&(!requestedDurationDays||dayPlans.length===requestedDurationDays));
  return suggestion.title && suggestion.summary.length>=120 && suggestion.recommendedDuration && suggestion.route.length >= 2 && suggestion.fitReasons.length >= 2 && suggestion.practicalNotes.length>=3 && coversDuration&&builderComplete ? suggestion : null;
}

export interface TripPlannerRefinement {
  instruction:string;
  currentSuggestion:TripSuggestionDraft;
}

/** Keep only the plan fields the model needs; never echo client-owned links, prices or supplier data. */
export function parseTripPlannerRefinement(value:unknown):TripPlannerRefinement|null{
  if(!value||typeof value!=='object')return null;
  const input=value as Record<string,unknown>;
  const instruction=text(input.refinement,700);
  const raw=input.currentSuggestion;
  if(!instruction||!raw||typeof raw!=='object')return null;
  const plan=raw as Record<string,unknown>;
  const route=asRoute(plan.route);
  const currentSuggestion:TripSuggestionDraft={
    title:text(plan.title,160),
    summary:text(plan.summary,900),
    recommendedDuration:text(plan.recommendedDuration,80),
    route,
    hotelStays:[],
    dayPlans:[],
    fitReasons:textArray(plan.fitReasons,5),
    practicalNotes:textArray(plan.practicalNotes,5),
    travellerInsights:[],
    matchedJourneySlugs:[],
    closing:text(plan.closing,500),
  };
  return currentSuggestion.title&&currentSuggestion.summary&&route.length>=2?{instruction,currentSuggestion}:null;
}

export const tripSuggestionJsonSchema = {
  type:'object',
  additionalProperties:false,
  properties:{
    title:{type:'string'},
    summary:{type:'string'},
    recommendedDuration:{type:'string'},
    route:{type:'array',minItems:2,maxItems:8,items:{type:'object',additionalProperties:false,properties:{days:{type:'string',description:'Exact consecutive day range, for example Days 1–3.'},place:{type:'string',description:'Country and named overnight base or sensible paired places.'},plan:{type:'string',minLength:55,description:'A full 1–2 sentence narrative explaining the base, daily rhythm and why this chapter works. Never repeat only the place name.'},highlights:{type:'array',minItems:2,maxItems:4,items:{type:'string',description:'A named place, neighbourhood, landscape or specific experience.'}},onwardTravel:{type:'string',description:'The real transport leg to the next chapter; empty only for the final chapter.'}},required:['days','place','plan','highlights','onwardTravel']}},
    hotelStays:{type:'array',minItems:2,maxItems:10,items:{type:'object',additionalProperties:false,properties:{place:{type:'string'},nights:{type:'integer',minimum:1,maximum:34},options:{type:'array',minItems:2,maxItems:3,items:{type:'object',additionalProperties:false,properties:{id:{type:'string',description:'Stable short ID unique within the itinerary.'},name:{type:'string'},area:{type:'string',description:'Neighbourhood or district and why it is practical.'},standard:{type:'string',description:'The hotel tier and how it matches the requested comfort level.'},whyFit:{type:'string'},roomGuidance:{type:'string',description:'A specific room category or minimum room-size safeguard; especially important in Japan.'},reviewSignal:{type:'string',description:'A careful summary of current review strengths and cautions. Never invent a rating.'},sourceUrls:{type:'array',minItems:1,maxItems:3,items:{type:'string',description:'An exact hotel/review URL returned by web research.'}}},required:['id','name','area','standard','whyFit','roomGuidance','reviewSignal','sourceUrls']}}},required:['place','nights','options']}},
    dayPlans:{type:'array',minItems:5,maxItems:35,items:{type:'object',additionalProperties:false,properties:{day:{type:'integer',minimum:1,maximum:35},place:{type:'string'},theme:{type:'string'},options:{type:'array',minItems:2,maxItems:3,items:{type:'object',additionalProperties:false,properties:{id:{type:'string',description:'Stable short ID unique within the itinerary.'},name:{type:'string'},type:{type:'string',description:'For example culinary, nature, heritage, active, wellness or free time.'},description:{type:'string'},whyFit:{type:'string'},interestTags:{type:'array',minItems:1,maxItems:4,items:{type:'string',enum:['food','history','nature','art','active','wellness','family','celebration']}},sourceUrls:{type:'array',minItems:1,maxItems:3,items:{type:'string',description:'An exact excursion, attraction, forum or review URL returned by web research.'}}},required:['id','name','type','description','whyFit','interestTags','sourceUrls']}}},required:['day','place','theme','options']}},
    fitReasons:{type:'array',minItems:2,maxItems:5,items:{type:'string'}},
    practicalNotes:{type:'array',minItems:3,maxItems:5,items:{type:'string'}},
    travellerInsights:{type:'array',maxItems:4,items:{type:'object',additionalProperties:false,properties:{insight:{type:'string'},sourceUrls:{type:'array',minItems:1,maxItems:3,items:{type:'string',description:'An exact URL returned by web research.'}}},required:['insight','sourceUrls']}},
    matchedJourneySlugs:{type:'array',maxItems:4,items:{type:'string'}},
    closing:{type:'string'},
  },
  required:['title','summary','recommendedDuration','route','hotelStays','dayPlans','fitReasons','practicalNotes','travellerInsights','matchedJourneySlugs','closing'],
} as const;
