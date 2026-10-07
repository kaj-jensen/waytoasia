import {tours,type PriceMap} from '../../src/content/data';
/** Published guide price is context, never booked revenue or an assumed supplier cost. */
export function enquiryTourPrice(raw:string){
 let r:Record<string,unknown>;try{r=JSON.parse(raw)}catch{return null}
 if(!r||typeof r!=='object')return null;
 const tour=(tours.find(t=>t.slug===r.tour)??tours.find(t=>t.slug===r.journey));if(!tour)return null;
 const requested=String(r.budgetCurrency||'EUR').toUpperCase();const currency=(Object.hasOwn(tour.prices,requested)?requested:'EUR') as keyof PriceMap;
 const perPerson=tour.prices[currency];if(!Number.isFinite(perPerson)||perPerson<=0)return null;
 const adults=Number(r.adults),children=Number(r.children||0);
 const adultParty=Number.isInteger(adults)&&adults>0&&adults<=100&&children===0;
 return {slug:tour.slug,name:tour.name,currency,perPerson,partyTotal:adultParty?perPerson*adults:null,adults:adultParty?adults:null,qualifier:tour.country==='south-korea'?'Illustrative price':'Guide price from',basis:'per person',note:tour.priceNote||'Final price depends on dates and accommodation.',includes:tour.includes,excludes:tour.excludes,url:`/en/${tour.country}/tours/${tour.slug}`,source:'Current published tour price',partyNote:adultParty?`Based on ${adults} adult${adults===1?'':'s'} at the published per-person rate.`:'Party total needs confirmation of traveller numbers and any child pricing.'};
}
