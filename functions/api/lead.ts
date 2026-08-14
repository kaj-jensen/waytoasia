interface Env { RESEND_API_KEY?: string; LEAD_TO_EMAIL?: string }
interface PagesContext {request:Request;env:Env}
export const onRequestPost = async ({request,env}:PagesContext):Promise<Response> => {
  const form=await request.formData(); const email=String(form.get('email')||'');
  if(!/^\S+@\S+\.\S+$/.test(email)) return new Response('Invalid email',{status:400});
  if(!env.RESEND_API_KEY||!env.LEAD_TO_EMAIL) return new Response('Lead service is not configured.',{status:503});
  const payload=Object.fromEntries([...form.entries()].map(([k,v])=>[k,String(v)]));
  const sent=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:'Way to Asia <journeys@waytoasia.com>',to:[env.LEAD_TO_EMAIL],reply_to:email,subject:`Way to Asia enquiry: ${payload.destination||'general'}`,text:Object.entries(payload).map(([k,v])=>`${k}: ${v}`).join('\n')})});
  if(!sent.ok) return new Response('Unable to send enquiry.',{status:502});
  return Response.redirect(new URL(`/${payload.locale||'en'}/contact?sent=1`,request.url),303);
};
