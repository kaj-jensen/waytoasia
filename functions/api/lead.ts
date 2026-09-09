interface Env { RESEND_API_KEY?: string; LEAD_TO_EMAIL?: string }
interface PagesContext {request:Request;env:Env}
export const onRequestPost = async ({request,env}:PagesContext):Promise<Response> => {
  const length=Number(request.headers.get('content-length')||0);
  if(length>50000) return new Response('Enquiry is too large.',{status:413});
  const origin=request.headers.get('origin');
  if(origin&&new URL(origin).hostname!==new URL(request.url).hostname) return new Response('Invalid request origin.',{status:403});
  const form=await request.formData();
  if(String(form.get('website')||'')) return Response.redirect(new URL('/en/contact?sent=1',request.url),303);
  const email=String(form.get('email')||'').trim();
  if(!/^\S+@\S+\.\S+$/.test(email)) return new Response('Invalid email',{status:400});
  const required=['firstName','lastName','phone','residence','preferredContact','destination','departureDate','dateFlexibility','duration','adults','rooms','departureAirport','budgetCurrency','budgetPerPerson','accommodation','consent'];
  if(required.some(key=>!String(form.get(key)||'').trim())) return new Response('Please complete all required fields.',{status:400});
  if(!env.RESEND_API_KEY||!env.LEAD_TO_EMAIL) return new Response('Lead service is not configured.',{status:503});
  const allowed=['locale','tour','journey','title','firstName','lastName','email','phone','residence','preferredContact','destination','departureDate','dateFlexibility','duration','adults','children','childrenAges','rooms','departureAirport','flightsStatus','budgetCurrency','budgetPerPerson','accommodation','interests','pace','roomArrangement','requirements','message','consent'];
  const payload=Object.fromEntries(allowed.map(key=>[key,form.getAll(key).map(value=>String(value).slice(0,2000)).join(', ')]));
  const labels:Record<string,string>={firstName:'First name',lastName:'Last name',preferredContact:'Preferred contact',departureDate:'Earliest departure',dateFlexibility:'Date flexibility',childrenAges:'Children ages',departureAirport:'Departure airport/city',flightsStatus:'International flights',budgetCurrency:'Budget currency',budgetPerPerson:'Budget per person',roomArrangement:'Room arrangement'};
  const text=allowed.filter(key=>payload[key]).map(key=>`${labels[key]||key.replace(/([A-Z])/g,' $1')}: ${payload[key]}`).join('\n');
  const sent=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:'Way to Asia <journeys@waytoasia.com>',to:[env.LEAD_TO_EMAIL],reply_to:email,subject:`Way to Asia proposal enquiry: ${payload.destination||'general'} · ${payload.firstName} ${payload.lastName}`,text})});
  if(!sent.ok) return new Response('Unable to send enquiry.',{status:502});
  return Response.redirect(new URL(`/${payload.locale||'en'}/contact?sent=1`,request.url),303);
};
