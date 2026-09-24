import type {
  AccommodationSearch,
  ActivitySearch,
  CancellationTerm,
  Money,
  SupplierOffer,
  SupplierSearch,
  SupplierSearchAdapter,
  SupplierSearchResult,
  TransferLocation,
  TransferSearch,
} from './contracts';
import {validateSupplierSearch} from './validation';

const DEFAULT_BASE_URL='https://api.test.hotelbeds.com';
const PROVIDER='HBX / Hotelbeds';

type JsonObject=Record<string,unknown>;
type Fetcher=(input:RequestInfo|URL,init?:RequestInit)=>Promise<Response>;

export interface HbxCredentials {apiKey:string;secret:string}
export interface HbxCredentialSet {
  accommodation:HbxCredentials;
  activity:HbxCredentials;
  transfer:HbxCredentials;
}
export interface HbxSecretBindings {
  HBX_HOTEL_API_KEY?:string;
  HBX_HOTEL_SECRET?:string;
  HBX_ACTIVITY_API_KEY?:string;
  HBX_ACTIVITY_SECRET?:string;
  HBX_TRANSFER_API_KEY?:string;
  HBX_TRANSFER_SECRET?:string;
  HBX_API_BASE_URL?:string;
}
export interface HbxAdapterOptions {
  credentials:HbxCredentialSet;
  baseUrl?:string;
  fetcher?:Fetcher;
  now?:()=>number;
}

export class HbxSandboxError extends Error {
  constructor(message:string,readonly status?:number){super(message);this.name='HbxSandboxError'}
}

const isObject=(value:unknown):value is JsonObject=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const asObject=(value:unknown):JsonObject=>isObject(value)?value:{};
const asArray=(value:unknown):unknown[]=>Array.isArray(value)?value:[];
const asString=(value:unknown,fallback=''):string=>typeof value==='string'?value:fallback;
const asNumber=(value:unknown):number|undefined=>typeof value==='number'&&Number.isFinite(value)?value:typeof value==='string'&&value.trim()&&Number.isFinite(Number(value))?Number(value):undefined;
const toMinor=(value:unknown):number=>Math.round((asNumber(value)??0)*100);
const utf8=new TextEncoder();

export async function createHbxSignature(apiKey:string,secret:string,unixSeconds=Math.floor(Date.now()/1000)):Promise<string>{
  const digest=await crypto.subtle.digest('SHA-256',utf8.encode(`${apiKey}${secret}${unixSeconds}`));
  return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
}

export function hbxCredentialsFromEnv(env:HbxSecretBindings):HbxCredentialSet{
  const required={
    accommodation:{apiKey:env.HBX_HOTEL_API_KEY,secret:env.HBX_HOTEL_SECRET},
    activity:{apiKey:env.HBX_ACTIVITY_API_KEY,secret:env.HBX_ACTIVITY_SECRET},
    transfer:{apiKey:env.HBX_TRANSFER_API_KEY,secret:env.HBX_TRANSFER_SECRET},
  };
  for(const [vertical,value] of Object.entries(required)){
    if(!value.apiKey?.trim()||!value.secret?.trim())throw new HbxSandboxError(`HBX ${vertical} evaluation credentials are not configured.`);
  }
  return required as HbxCredentialSet;
}

const cancellationTerms=(raw:unknown,currency:string):CancellationTerm[]=>asArray(raw).map(item=>{
  const policy=asObject(item);
  const amount=toMinor(policy.amount);
  return {
    refundable:amount===0,
    deadline:asString(policy.from)||undefined,
    penalty:amount>0?{amountMinor:amount,currency:asString(policy.currencyId,currency)}:undefined,
    description:amount>0?`Cancellation penalty ${asString(policy.currencyId,currency)} ${(amount/100).toFixed(2)} from ${asString(policy.from,'the supplier deadline')}.`:'No supplier penalty was returned for this period.',
  };
});

const money=(amount:unknown,currency:unknown,fallback:string):Money=>({amountMinor:toMinor(amount),currency:asString(currency,fallback)});
const retrievedAt=()=>new Date().toISOString();

function hotelOffers(raw:unknown,query:AccommodationSearch):SupplierOffer[]{
  const root=asObject(raw);
  const hotelsNode=asObject(root.hotels);
  const currency=asString(hotelsNode.currency,query.currency);
  const offers:SupplierOffer[]=[];
  for(const hotelValue of asArray(hotelsNode.hotels)){
    const hotel=asObject(hotelValue);
    for(const roomValue of asArray(hotel.rooms)){
      const room=asObject(roomValue);
      for(const rateValue of asArray(room.rates)){
        const rate=asObject(rateValue);
        const rateKey=asString(rate.rateKey);
        if(!rateKey)continue;
        const roomName=asString(room.name,'Room');
        const boardName=asString(rate.boardName,'Board basis supplied by HBX');
        const amount=rate.sellingRate??rate.net;
        offers.push({
          provider:PROVIDER,vertical:'accommodation',offerId:rateKey,productId:String(hotel.code??''),
          title:asString(hotel.name,'HBX hotel'),summary:`${roomName} · ${boardName}`,
          total:money(amount,currency,query.currency),bookingMode:'agency',
          cancellation:cancellationTerms(rate.cancellationPolicies,currency),retrievedAt:retrievedAt(),
          recheckRequired:true,
          attributes:{room:roomName,board:boardName,category:asString(hotel.categoryName),rateType:asString(rate.rateType,'RECHECK')},
        });
      }
    }
  }
  return offers;
}

function activityOffers(raw:unknown,query:ActivitySearch):SupplierOffer[]{
  const root=asObject(raw);
  const offers:SupplierOffer[]=[];
  for(const activityValue of asArray(root.activities)){
    const activity=asObject(activityValue);
    for(const modalityValue of asArray(activity.modalities)){
      const modality=asObject(modalityValue);
      for(const rateValue of asArray(modality.rates)){
        const rate=asObject(rateValue);
        const rateKey=asString(rate.rateKey);
        if(!rateKey)continue;
        const amount=rate.amountFrom??rate.amount??modality.amountFrom;
        const currency=rate.currency??modality.currency??root.currency;
        offers.push({
          provider:PROVIDER,vertical:'activity',offerId:rateKey,productId:asString(activity.code),
          title:asString(activity.name,'HBX activity'),summary:asString(modality.name,'Available activity option'),
          total:money(amount,currency,query.currency),bookingMode:'agency',
          cancellation:cancellationTerms(rate.cancellationPolicies,asString(currency,query.currency)),retrievedAt:retrievedAt(),
          expiresAt:new Date(Date.now()+30*60*1000).toISOString(),recheckRequired:true,
          attributes:{modality:asString(modality.name),activityType:asString(activity.type)},
        });
      }
    }
  }
  return offers;
}

function transferOffers(raw:unknown,query:TransferSearch):SupplierOffer[]{
  const root=asObject(raw);
  return asArray(root.services).flatMap(serviceValue=>{
    const service=asObject(serviceValue);
    const rateKey=asString(service.rateKey);
    if(!rateKey)return [];
    const price=asObject(service.price);
    const vehicle=asObject(service.vehicle);
    const category=asObject(service.category);
    const currency=asString(price.currencyId,query.currency);
    const vehicleName=asString(vehicle.name,'Transfer');
    const categoryName=asString(category.name,'Standard');
    return [{
      provider:PROVIDER,vertical:'transfer' as const,offerId:rateKey,productId:String(service.serviceId??service.id??''),
      title:`${vehicleName} transfer`,summary:`${asString(service.transferType,'Transfer')} · ${categoryName}`,
      total:money(price.totalAmount,currency,query.currency),bookingMode:'agency' as const,
      cancellation:cancellationTerms(service.cancellationPolicies,currency),retrievedAt:retrievedAt(),
      recheckRequired:true as const,
      attributes:{vehicle:vehicleName,category:categoryName,direction:asString(service.direction)},
    }];
  });
}

const hbxLocation=(location:TransferLocation):{type:string;code:string}=>{
  if(location.type==='address'){
    if(location.latitude===undefined||location.longitude===undefined)throw new HbxSandboxError('HBX address transfers require latitude and longitude.');
    return {type:'GPS',code:`${location.latitude},${location.longitude}`};
  }
  const type={airport:'IATA',hotel:'ATLAS',station:'STATION',port:'PORT'}[location.type];
  if(!location.code?.trim())throw new HbxSandboxError(`HBX ${location.type} transfers require a supplier location code.`);
  return {type,code:location.code.trim()};
};

const localDateTime=(value:string):string=>value.replace(/(?:Z|[+-]\d{2}:\d{2})$/,'').slice(0,19);
const language=(locale:string):string=>locale.toLowerCase().split('-')[0]||'en';

export function createHbxSandboxAdapter(options:HbxAdapterOptions):SupplierSearchAdapter{
  const base=new URL(options.baseUrl??DEFAULT_BASE_URL);
  if(base.protocol!=='https:'||base.hostname!=='api.test.hotelbeds.com')throw new HbxSandboxError('HBX evaluation traffic must use the official HTTPS test host.');
  const fetcher=options.fetcher??fetch;
  const now=options.now??(()=>Date.now());

  const request=async(vertical:SupplierSearch['vertical'],path:string,init:RequestInit):Promise<unknown>=>{
    const allowed=vertical==='accommodation'?/^\/hotel-api\/1\.0\/(?:hotels|checkrates)$/:vertical==='activity'?/^\/activity-api\/3\.0\/activities(?:\/details)?$/:/^\/transfer-api\/1\.0\/availability\//;
    if(!allowed.test(path))throw new HbxSandboxError('Blocked non-search HBX endpoint.');
    const method=(init.method??'GET').toUpperCase();
    if(!['GET','POST'].includes(method))throw new HbxSandboxError('Blocked non-read-only HBX operation.');
    const credentials=options.credentials[vertical];
    const signature=await createHbxSignature(credentials.apiKey,credentials.secret,Math.floor(now()/1000));
    const response=await fetcher(new URL(path,base),{...init,headers:{Accept:'application/json','Accept-Encoding':'gzip','Content-Type':'application/json','Api-key':credentials.apiKey,'X-Signature':signature,...init.headers},signal:init.signal});
    if(!response.ok){
      console.error(JSON.stringify({message:'HBX sandbox request failed',vertical,status:response.status,path}));
      throw new HbxSandboxError(response.status===403?'HBX evaluation quota or authentication rejected the request.':'HBX sandbox search failed.',response.status);
    }
    return response.json();
  };

  return {
    capability:{provider:PROVIDER,verticals:['accommodation','transfer','activity'],bookingModes:['agency'],status:'sandbox-ready',searchOnly:true},
    async search(query,signal):Promise<SupplierSearchResult>{
      const errors=validateSupplierSearch(query);
      if(errors.length)throw new HbxSandboxError(errors.join(' '));
      let raw:unknown;
      let offers:SupplierOffer[];
      if(query.vertical==='accommodation'){
        if(!query.destination.supplierCode?.trim())throw new HbxSandboxError('HBX accommodation searches require a destination supplier code.');
        raw=await request('accommodation','/hotel-api/1.0/hotels',{method:'POST',signal,body:JSON.stringify({stay:{checkIn:query.checkIn,checkOut:query.checkOut},occupancies:query.rooms.map(room=>({rooms:1,adults:room.adults,children:room.childAges.length,paxes:room.childAges.map(age=>({type:'CH',age}))})),destination:{code:query.destination.supplierCode},sourceMarket:query.travellerCountry,filter:{maxHotels:25,maxRatesPerRoom:3}})});
        offers=hotelOffers(raw,query);
      }else if(query.vertical==='activity'){
        if(!query.destination.supplierCode?.trim())throw new HbxSandboxError('HBX activity searches require a destination supplier code.');
        raw=await request('activity','/activity-api/3.0/activities',{method:'POST',signal,body:JSON.stringify({filters:[{searchFilterItems:[{type:'destination',value:query.destination.supplierCode}]}],from:query.from,to:query.to,language:language(query.locale),paxes:[...Array.from({length:query.party.adults},()=>({age:30})),...query.party.childAges.map(age=>({age}))],pagination:{itemsPerPage:25,page:1},order:'DEFAULT'})});
        offers=activityOffers(raw,query);
      }else{
        const from=hbxLocation(query.pickup);const to=hbxLocation(query.dropoff);
        const infants=query.party.childAges.filter(age=>age<=2).length;
        const children=query.party.childAges.length-infants;
        const segments=[language(query.locale),'from',from.type,encodeURIComponent(from.code),'to',to.type,encodeURIComponent(to.code),localDateTime(query.pickupAt)];
        if(query.returnAt)segments.push(localDateTime(query.returnAt));
        segments.push(String(query.party.adults),String(children),String(infants));
        raw=await request('transfer',`/transfer-api/1.0/availability/${segments.join('/')}`,{method:'GET',signal});
        offers=transferOffers(raw,query);
      }
      const timestamp=retrievedAt();
      return {provider:PROVIDER,vertical:query.vertical,requestId:query.requestId,offers,warnings:offers.length?[]:['HBX returned no normalized offers for this search.'],retrievedAt:timestamp};
    },
    async recheck(offerId,query,signal):Promise<SupplierOffer>{
      if(query.vertical==='accommodation'){
        const raw=await request('accommodation','/hotel-api/1.0/checkrates',{method:'POST',signal,body:JSON.stringify({rooms:[{rateKey:offerId}]})});
        const offers=hotelOffers(raw,query);
        if(offers[0])return offers[0];
      }else{
        const result=await this.search(query,signal);
        const offer=result.offers.find(candidate=>candidate.offerId===offerId);
        if(offer)return offer;
      }
      throw new HbxSandboxError('The selected HBX offer is no longer available; run a new search.');
    },
  };
}
