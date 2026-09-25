import {hashToken,renderProposalPage,validToken,type ProposalEnv,type ProposalRow} from '../_lib/proposals';

interface PageContext {params:{token?:string|string[]};env:ProposalEnv;request:Request}

const unavailable=()=>new Response('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="robots" content="noindex,nofollow"><link rel="stylesheet" href="/proposal.css"><title>Proposal unavailable — Way to Asia</title></head><body><main class="message-page"><span class="eyebrow">Way to Asia</span><h1>This private proposal is unavailable.</h1><p>The link may have expired or been replaced. Please contact your travel consultant for a fresh link.</p><a class="primary" href="mailto:journeys@waytoasia.com">Contact Way to Asia</a></main></body></html>',{status:404,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow, noarchive','Referrer-Policy':'no-referrer'}});

export const onRequestGet=async({params,env,request}:PageContext):Promise<Response>=>{
  const token=typeof params.token==='string'?params.token:'';
  if(!validToken(token))return unavailable();
  const row=await env.PROPOSALS_DB.prepare('SELECT * FROM proposals WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > ?').bind(await hashToken(token),new Date().toISOString()).first<ProposalRow>();
  if(!row)return unavailable();
  const responseState=new URL(request.url).searchParams.get('response')??'';
  return new Response(renderProposalPage(row,token,responseState),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store, max-age=0','X-Robots-Tag':'noindex, nofollow, noarchive, nosnippet','Referrer-Policy':'no-referrer','Permissions-Policy':'camera=(), microphone=(), geolocation=()'}});
};
