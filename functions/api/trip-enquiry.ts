interface Env { RESEND_API_KEY?:string;LEAD_TO_EMAIL?:string }
interface PagesContext {request:Request;env:Env}

const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const clean=(value:unknown,max:number)=>typeof value==='string'?value.trim().slice(0,max):'';
const cleanScalar=(value:unknown,max:number)=>typeof value==='string'||typeof value==='number'?String(value).trim().slice(0,max):'';

export const onRequestPost=async({request,env}:PagesContext):Promise<Response>=>{
  const length=Number(request.headers.get('content-length')||0);
  if(length>60_000)return json({error:'Enquiry is too large.'},413);
  const origin=request.headers.get('origin');
  if(origin&&new URL(origin).hostname!==new URL(request.url).hostname)return json({error:'Invalid request origin.'},403);
  if(!request.headers.get('content-type')?.toLowerCase().includes('application/json'))return json({error:'Expected a JSON request.'},415);
  let raw:unknown;
  try{raw=await request.json()}catch{return json({error:'Invalid JSON request.'},400)}
  if(!raw||typeof raw!=='object')return json({error:'Invalid enquiry.'},400);
  const input=raw as Record<string,unknown>;
  if(clean(input.website,100))return json({ok:true});
  const name=clean(input.name,160);
  const email=clean(input.email,240);
  const phone=clean(input.phone,100);
  const message=clean(input.message,1600);
  const consent=input.consent===true;
  const locale=/^(en|es|it|fr|nl|hu|sv|da|no)$/.test(clean(input.locale,5))?clean(input.locale,5):'en';
  const suggestion=input.suggestion&&typeof input.suggestion==='object'?input.suggestion as Record<string,unknown>:{};
  const profile=input.profile&&typeof input.profile==='object'?input.profile as Record<string,unknown>:{};
  const title=clean(suggestion.title,180);
  const summary=clean(suggestion.summary,1200);
  const duration=clean(suggestion.recommendedDuration,100);
  const route=Array.isArray(suggestion.route)?suggestion.route.slice(0,8).flatMap(item=>{
    if(!item||typeof item!=='object')return [];
    const stop=item as Record<string,unknown>;
    const days=clean(stop.days,50),place=clean(stop.place,160),plan=clean(stop.plan||stop.focus,800),onward=clean(stop.onwardTravel,350);
    const highlights=Array.isArray(stop.highlights)?stop.highlights.slice(0,4).map(value=>clean(value,220)).filter(Boolean):[];
    return days&&place&&plan?[`${days} — ${place}\n${plan}${highlights.length?`\nHighlights: ${highlights.join('; ')}`:''}${onward?`\nNext leg: ${onward}`:''}`]:[];
  }):[];
  if(!name||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!consent||!title||!summary||route.length<2)return json({error:'Please complete your details and include a valid itinerary.'},400);
  if(!env.RESEND_API_KEY||!env.LEAD_TO_EMAIL)return json({error:'The consultant email service is not configured.'},503);
  const destinations=Array.isArray(profile.destinations)?profile.destinations.map(value=>clean(value,80)).filter(Boolean).join(', '):'';
  const interests=Array.isArray(profile.interests)?profile.interests.map(value=>clean(value,80)).filter(Boolean).join(', '):'';
  const brief=[
    clean(profile.destinationIdeas,180)||destinations||'Open to ideas',
    `${cleanScalar(profile.durationDays,30)||duration} days · ${cleanScalar(profile.adults,3)||'2'} adult(s) · ${cleanScalar(profile.children,3)||'0'} child(ren)`,
    `Travel month: ${clean(profile.travelMonth,30)||'Flexible'}`,
    `Comfort: ${clean(profile.budget,40)||'Not specified'} · Pace: ${clean(profile.pace,40)||'Not specified'}`,
    interests?`Priorities: ${interests}`:'',
    clean(profile.notes,1000)?`Original notes: ${clean(profile.notes,1000)}`:'',
  ].filter(Boolean);
  const text=[`Traveller: ${name}`,`Email: ${email}`,phone?`Phone: ${phone}`:'',`Language: ${locale}`,message?`Traveller note: ${message}`:'','',`ORIGINAL TRAVEL BRIEF`,...brief,'',`JOURNEY DESIGN: ${title}`,duration,summary,'',...route].filter(Boolean).join('\n');
  const sent=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:'Way to Asia <journeys@waytoasia.com>',to:[env.LEAD_TO_EMAIL],reply_to:email,subject:`Journey Designer enquiry: ${title} · ${name}`,text}),signal:AbortSignal.timeout(12000)});
  if(!sent.ok){console.error('Trip enquiry email failed',{status:sent.status});return json({error:'We could not send the enquiry just now. Please try again.'},502)}
  return json({ok:true});
};

export const onRequestGet=()=>json({error:'Method not allowed.'},405);
