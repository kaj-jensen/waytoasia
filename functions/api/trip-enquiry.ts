import {clean,consultantEmail,customerEmail,hashToken,manageProposalUrl,publicProposalUrl,randomToken,sendResend,type ProposalEnv,type ProposalRow,type StoredProposalPayload} from '../_lib/proposals';

interface PagesContext {request:Request;env:ProposalEnv}

const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const localeCurrency:Record<string,string>={en:'EUR',es:'EUR',it:'EUR',fr:'EUR',nl:'EUR',hu:'HUF',sv:'SEK',da:'DKK',no:'NOK'};

export const planningEstimateLabel=(suggestion:Record<string,unknown>,locale:string):string=>{
  const estimate=suggestion.priceEstimate&&typeof suggestion.priceEstimate==='object'?suggestion.priceEstimate as Record<string,unknown>:{};
  const currency=clean(estimate.currency,3);
  const low=Number(estimate.totalLow),high=Number(estimate.totalHigh);
  if(currency!==localeCurrency[locale]||!Number.isFinite(low)||!Number.isFinite(high)||low<=0||high<low||high>100_000_000)return '';
  const format=new Intl.NumberFormat(locale,{style:'currency',currency,maximumFractionDigits:0});
  return `${format.format(low)}–${format.format(high)} total · rough planning estimate`;
};

export const onRequestPost=async({request,env}:PagesContext):Promise<Response>=>{
  const length=Number(request.headers.get('content-length')||0);
  if(length>250_000)return json({error:'Enquiry is too large.'},413);
  const origin=request.headers.get('origin');
  if(origin&&new URL(origin).hostname!==new URL(request.url).hostname)return json({error:'Invalid request origin.'},403);
  if(!request.headers.get('content-type')?.toLowerCase().includes('application/json'))return json({error:'Expected a JSON request.'},415);

  let raw:unknown;
  try{raw=await request.json()}catch{return json({error:'Invalid JSON request.'},400)}
  if(!raw||typeof raw!=='object')return json({error:'Invalid enquiry.'},400);
  const input=raw as Record<string,unknown>;
  if(clean(input.website,100))return json({ok:true});

  const name=clean(input.name,160);
  const email=clean(input.email,240).toLowerCase();
  const phone=clean(input.phone,100);
  const message=clean(input.message,1600);
  const consent=input.consent===true;
  const locale=/^(en|es|it|fr|nl|hu|sv|da|no)$/.test(clean(input.locale,5))?clean(input.locale,5):'en';
  const suggestion=input.suggestion&&typeof input.suggestion==='object'?input.suggestion as Record<string,unknown>:{},profile=input.profile&&typeof input.profile==='object'?input.profile as Record<string,unknown>:{},builderChoices=input.builderChoices&&typeof input.builderChoices==='object'?input.builderChoices as Record<string,unknown>:{};
  const title=clean(suggestion.title,180),summary=clean(suggestion.summary,1200);
  const route=Array.isArray(suggestion.route)?suggestion.route.slice(0,8).filter(item=>{
    if(!item||typeof item!=='object')return false;
    const stop=item as Record<string,unknown>;
    return Boolean(clean(stop.days,50)&&clean(stop.place,160)&&clean(stop.plan||stop.focus,900));
  }):[];
  if(!name||!emailPattern.test(email)||!consent||!title||!summary||route.length<2)return json({error:'Please complete your details and include a valid itinerary.'},400);
  if(!env.RESEND_API_KEY||!env.LEAD_TO_EMAIL||!env.PROPOSALS_DB)return json({error:'The consultant proposal service is not configured.'},503);

  const [publicToken,manageToken]=[randomToken(),randomToken()];
  const [tokenHash,manageTokenHash]=await Promise.all([hashToken(publicToken),hashToken(manageToken)]);
  const id=crypto.randomUUID(),now=new Date(),expires=new Date(now.getTime()+60*24*60*60*1000);
  const payload:StoredProposalPayload={traveller:{name,email,phone,message},profile,suggestion:{...suggestion,title,summary,route},builderChoices};
  const row:ProposalRow={id,token_hash:tokenHash,manage_token_hash:manageTokenHash,traveller_name:name,traveller_email:email,locale,title,summary,estimated_price:planningEstimateLabel(suggestion,locale),consultant_note:'',payload_json:JSON.stringify(payload),status:'new',traveller_response:'',created_at:now.toISOString(),updated_at:now.toISOString(),expires_at:expires.toISOString(),revoked_at:null};

  try{
    await env.PROPOSALS_DB.prepare(`INSERT INTO proposals (id,token_hash,manage_token_hash,traveller_name,traveller_email,locale,title,summary,estimated_price,consultant_note,payload_json,status,traveller_response,created_at,updated_at,expires_at,revoked_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(row.id,row.token_hash,row.manage_token_hash,row.traveller_name,row.traveller_email,row.locale,row.title,row.summary,row.estimated_price,row.consultant_note,row.payload_json,row.status,row.traveller_response,row.created_at,row.updated_at,row.expires_at,row.revoked_at).run();
  }catch(error){
    console.error(JSON.stringify({message:'Proposal storage failed',error:error instanceof Error?error.message:String(error)}));
    return json({error:'We could not save the proposal just now. Please try again.'},502);
  }

  const proposalUrl=publicProposalUrl(request.url,publicToken,env.PROPOSAL_ORIGIN),manageUrl=manageProposalUrl(request.url,manageToken,env.PROPOSAL_ORIGIN);
  const travelStart=clean(profile.travelStartDate,10),travelEnd=clean(profile.travelEndDate,10),airport=clean(profile.departureAirport,120),flexibility=Number(profile.dateFlexibilityDays)||0;
  const travelDetails=[travelStart&&travelEnd?`Travel dates: ${travelStart} to ${travelEnd}${flexibility?` (±${flexibility} days)`:''}`:'',airport?`Departure: ${airport}`:'',message?`Traveller note: ${message}`:''].filter(Boolean).join(' · ');
  const customer=customerEmail(row,proposalUrl),consultant=consultantEmail(row,proposalUrl,manageUrl,phone,travelDetails);
  const [customerSent,consultantSent]=await Promise.all([
    sendResend(env.RESEND_API_KEY,{to:[email],subject:customer.subject,text:customer.text,html:customer.html}),
    sendResend(env.RESEND_API_KEY,{to:[env.LEAD_TO_EMAIL],replyTo:email,subject:consultant.subject,text:consultant.text,html:consultant.html}),
  ]);
  if(!customerSent||!consultantSent)return json({error:'The proposal was saved, but one of the notification emails could not be delivered. Please contact Way to Asia.'},502);
  return json({ok:true,proposalUrl,expiresAt:row.expires_at,proposalId:row.id});
};

export const onRequestGet=()=>json({error:'Method not allowed.'},405);
