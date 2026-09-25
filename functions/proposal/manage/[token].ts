import {clean,hashToken,parseStoredPayload,renderManagePage,validToken,type ProposalEnv,type ProposalRow} from '../../_lib/proposals';

interface PageContext {params:{token?:string|string[]};env:ProposalEnv;request:Request}

const unavailable=()=>new Response('<!doctype html><html><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><link rel="stylesheet" href="/proposal.css"><title>Workspace unavailable — Way to Asia</title></head><body><main class="message-page"><h1>This consultant workspace is unavailable.</h1></main></body></html>',{status:404,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow, noarchive'}});
const headers={'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store, max-age=0','X-Robots-Tag':'noindex, nofollow, noarchive, nosnippet','Referrer-Policy':'no-referrer'};

const getRow=async(env:ProposalEnv,token:string)=>env.PROPOSALS_DB.prepare('SELECT * FROM proposals WHERE manage_token_hash = ? AND revoked_at IS NULL AND expires_at > ?').bind(await hashToken(token),new Date().toISOString()).first<ProposalRow>();

export const onRequestGet=async({params,env,request}:PageContext):Promise<Response>=>{
  const token=typeof params.token==='string'?params.token:'';
  if(!validToken(token))return unavailable();
  const row=await getRow(env,token);
  if(!row)return unavailable();
  return new Response(renderManagePage(row,new URL(request.url).searchParams.get('saved')==='1'),{headers});
};

export const onRequestPost=async({params,env,request}:PageContext):Promise<Response>=>{
  const token=typeof params.token==='string'?params.token:'';
  if(!validToken(token))return unavailable();
  const origin=request.headers.get('origin');
  if(origin&&new URL(origin).hostname!==new URL(request.url).hostname)return new Response('Invalid request origin.',{status:403});
  const row=await getRow(env,token);
  if(!row)return unavailable();
  const payload=parseStoredPayload(row.payload_json);
  if(!payload)return unavailable();
  const form=await request.formData();
  const title=clean(form.get('title'),180),summary=clean(form.get('summary'),1200),estimatedPrice=clean(form.get('estimated_price'),120),consultantNote=clean(form.get('consultant_note'),1600),status=clean(form.get('status'),30);
  if(!title||!summary||!['new','in_review','ready','approved','changes_requested','closed'].includes(status))return new Response('Please complete the required proposal fields.',{status:400});
  const currentRoute=Array.isArray(payload.suggestion.route)?payload.suggestion.route:[];
  const route=currentRoute.slice(0,8).map((raw,index)=>{
    const stop=raw&&typeof raw==='object'?raw as Record<string,unknown>:{};
    const days=clean(form.get(`route_days_${index}`),50),place=clean(form.get(`route_place_${index}`),160),plan=clean(form.get(`route_plan_${index}`),900);
    return {...stop,days,place,plan,focus:plan};
  });
  if(route.length<2||route.some(stop=>!stop.days||!stop.place||!stop.plan))return new Response('Every route chapter needs days, place and plan.',{status:400});
  payload.suggestion={...payload.suggestion,title,summary,route};
  await env.PROPOSALS_DB.prepare('UPDATE proposals SET title = ?, summary = ?, estimated_price = ?, consultant_note = ?, payload_json = ?, status = ?, updated_at = ? WHERE id = ?').bind(title,summary,estimatedPrice,consultantNote,JSON.stringify(payload),status,new Date().toISOString(),row.id).run();
  return Response.redirect(`${new URL(request.url).origin}/proposal/manage/${encodeURIComponent(token)}?saved=1`,303);
};
