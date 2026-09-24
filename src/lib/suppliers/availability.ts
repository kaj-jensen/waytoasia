import type {Money,SupplierOffer,SupplierSearchResult,SupplierVertical} from './contracts';

export const hbxGatewayIds=['beijing','seoul','bangkok','hanoi','bali'] as const;
export type HbxGatewayId=typeof hbxGatewayIds[number];

export interface HbxGateway {
  id:HbxGatewayId;
  name:string;
  country:string;
  destinationCode:string;
  airportCode:string;
  utcOffset:string;
}

export const hbxGateways:Record<HbxGatewayId,HbxGateway>={
  beijing:{id:'beijing',name:'Beijing',country:'china',destinationCode:'BJS',airportCode:'PEK',utcOffset:'+08:00'},
  seoul:{id:'seoul',name:'Seoul',country:'south-korea',destinationCode:'SEL',airportCode:'ICN',utcOffset:'+09:00'},
  bangkok:{id:'bangkok',name:'Bangkok',country:'thailand',destinationCode:'BKK',airportCode:'BKK',utcOffset:'+07:00'},
  hanoi:{id:'hanoi',name:'Hanoi',country:'vietnam',destinationCode:'HAN',airportCode:'HAN',utcOffset:'+07:00'},
  bali:{id:'bali',name:'Bali',country:'indonesia',destinationCode:'DPS',airportCode:'DPS',utcOffset:'+08:00'},
};

export interface HbxAvailabilityRequest {
  locale:string;
  gateway:HbxGatewayId;
  checkIn:string;
  nights:number;
  adults:number;
  childAges:number[];
  currency:string;
}

export interface HbxAvailabilityOffer {
  title:string;
  summary:string;
  total:Money;
  cancellation:string[];
  attributes:Record<string,string|number|boolean|string[]>;
  recheckRequired:true;
}

export interface HbxAvailabilitySection {
  vertical:SupplierVertical;
  status:'available'|'none'|'unavailable'|'skipped';
  offers:HbxAvailabilityOffer[];
  message?:string;
}

export interface HbxAvailabilityResponse {
  provider:'HBX / Hotelbeds';
  environment:'evaluation-sandbox';
  bookable:false;
  gateway:{id:HbxGatewayId;name:string};
  checkedAt:string;
  sections:HbxAvailabilitySection[];
}

const datePattern=/^\d{4}-\d{2}-\d{2}$/;
const localePattern=/^(en|es|it|fr|nl|hu|sv|da|no)$/;
const currencyPattern=/^[A-Z]{3}$/;

export function addDays(date:string,days:number):string{
  const value=new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate()+days);
  return value.toISOString().slice(0,10);
}

export function parseHbxAvailabilityRequest(value:unknown,now=new Date()):HbxAvailabilityRequest|null{
  if(!value||typeof value!=='object')return null;
  const input=value as Record<string,unknown>;
  const gateway=typeof input.gateway==='string'&&hbxGatewayIds.includes(input.gateway as HbxGatewayId)?input.gateway as HbxGatewayId:null;
  const locale=typeof input.locale==='string'&&localePattern.test(input.locale)?input.locale:'en';
  const currency=typeof input.currency==='string'&&currencyPattern.test(input.currency)?input.currency:'EUR';
  const checkIn=typeof input.checkIn==='string'&&datePattern.test(input.checkIn)?input.checkIn:'';
  const nights=Number(input.nights);
  const adults=Number(input.adults);
  const childAges=Array.isArray(input.childAges)?input.childAges.map(Number):[];
  const today=now.toISOString().slice(0,10);
  const latest=addDays(today,550);
  if(!gateway||!checkIn||checkIn<today||checkIn>latest)return null;
  if(!Number.isInteger(nights)||nights<1||nights>35)return null;
  if(!Number.isInteger(adults)||adults<1||adults>12)return null;
  if(childAges.length>8||childAges.some(age=>!Number.isInteger(age)||age<0||age>17))return null;
  return {locale,gateway,checkIn,nights,adults,childAges,currency};
}

export function publicAvailabilityOffer(offer:SupplierOffer):HbxAvailabilityOffer{
  return {
    title:offer.title,
    summary:offer.summary,
    total:offer.total,
    cancellation:offer.cancellation.map(term=>term.description).slice(0,2),
    attributes:offer.attributes,
    recheckRequired:true,
  };
}

export function availabilitySection(vertical:SupplierVertical,result:PromiseSettledResult<SupplierSearchResult>,limit=3):HbxAvailabilitySection{
  if(result.status==='rejected')return {vertical,status:'unavailable',offers:[],message:'The HBX sandbox did not return this product type.'};
  const offers=result.value.offers.slice(0,limit).map(publicAvailabilityOffer);
  return {vertical,status:offers.length?'available':'none',offers,message:offers.length?undefined:result.value.warnings[0]??'No sandbox results were returned.'};
}
