import {tours} from '../content/data';

export const tripPlannerDestinations = ['china','south-korea','thailand','vietnam','indonesia'] as const;
export const tripPlannerInterests = ['food','history','nature','art','active','wellness','family','celebration'] as const;
export const tripPlannerPaces = ['slow','balanced','active'] as const;
export const tripPlannerBudgets = ['value','comfort','premium','luxury','unsure'] as const;

export type TripPlannerDestination = typeof tripPlannerDestinations[number];
export type TripPlannerInterest = typeof tripPlannerInterests[number];
export type TripPlannerPace = typeof tripPlannerPaces[number];
export type TripPlannerBudget = typeof tripPlannerBudgets[number];

export interface TripPlannerRequest {
  locale: string;
  destinations: TripPlannerDestination[];
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
  focus: string;
}

export interface TripSuggestionDraft {
  title: string;
  summary: string;
  recommendedDuration: string;
  route: SuggestedRouteStop[];
  fitReasons: string[];
  practicalNotes: string[];
  matchedJourneySlugs: string[];
  closing: string;
}

export interface TripSuggestion extends Omit<TripSuggestionDraft,'matchedJourneySlugs'> {
  id: string;
  generatedAt: string;
  availability: 'not-connected';
  pricing: 'illustrative-only';
  matchedJourneys: Array<{
    slug: string;
    name: string;
    country: string;
    duration: number;
    href: string;
    prices: Record<string,number>;
  }>;
}

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
  const interests = uniqueAllowed(input.interests,tripPlannerInterests,5);
  const travelMonth = typeof input.travelMonth === 'string' && monthPattern.test(input.travelMonth) ? input.travelMonth : 'flexible';
  const durationDays = integerBetween(input.durationDays,5,35,12);
  const adults = integerBetween(input.adults,1,12,2);
  const children = integerBetween(input.children,0,8,0);
  const budget = tripPlannerBudgets.includes(input.budget as TripPlannerBudget) ? input.budget as TripPlannerBudget : 'unsure';
  const pace = tripPlannerPaces.includes(input.pace as TripPlannerPace) ? input.pace as TripPlannerPace : 'balanced';
  const notes = typeof input.notes === 'string' ? input.notes.trim().slice(0,1000) : '';
  if (!interests.length) return null;
  return {locale,destinations,travelMonth,durationDays,adults,children,budget,interests,pace,notes};
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

export function normalizeTripSuggestion(value: unknown, locale: string, now = new Date()): TripSuggestion | null {
  if (!value || typeof value !== 'object') return null;
  const draft = value as Record<string,unknown>;
  const rawRoute = Array.isArray(draft.route) ? draft.route : [];
  const route = rawRoute.map(item=>{
    const stop = item && typeof item === 'object' ? item as Record<string,unknown> : {};
    return {days:text(stop.days,40),place:text(stop.place,100),focus:text(stop.focus,260)};
  }).filter(stop=>stop.days && stop.place && stop.focus).slice(0,8);
  const requestedSlugs = textArray(draft.matchedJourneySlugs,4,100);
  const matchedJourneys = requestedSlugs.flatMap(slug=>{
    const tour = tours.find(item=>item.slug===slug);
    return tour ? [{slug:tour.slug,name:tour.name,country:tour.country,duration:tour.duration,href:`/${locale}/${tour.country}/tours/${tour.slug}`,prices:tour.prices}] : [];
  });
  const suggestion = {
    id:crypto.randomUUID(),
    generatedAt:now.toISOString(),
    title:text(draft.title,160),
    summary:text(draft.summary,900),
    recommendedDuration:text(draft.recommendedDuration,80),
    route,
    fitReasons:textArray(draft.fitReasons,5),
    practicalNotes:textArray(draft.practicalNotes,5),
    closing:text(draft.closing,500),
    availability:'not-connected' as const,
    pricing:'illustrative-only' as const,
    matchedJourneys,
  };
  return suggestion.title && suggestion.summary && suggestion.recommendedDuration && suggestion.route.length >= 2 && suggestion.fitReasons.length >= 2 ? suggestion : null;
}

export const tripSuggestionJsonSchema = {
  type:'object',
  additionalProperties:false,
  properties:{
    title:{type:'string'},
    summary:{type:'string'},
    recommendedDuration:{type:'string'},
    route:{type:'array',minItems:2,maxItems:8,items:{type:'object',additionalProperties:false,properties:{days:{type:'string'},place:{type:'string'},focus:{type:'string'}},required:['days','place','focus']}},
    fitReasons:{type:'array',minItems:2,maxItems:5,items:{type:'string'}},
    practicalNotes:{type:'array',minItems:2,maxItems:5,items:{type:'string'}},
    matchedJourneySlugs:{type:'array',maxItems:4,items:{type:'string'}},
    closing:{type:'string'},
  },
  required:['title','summary','recommendedDuration','route','fitReasons','practicalNotes','matchedJourneySlugs','closing'],
} as const;
