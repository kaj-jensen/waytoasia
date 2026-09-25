import {clean,escapeHtml,hashToken,sendResend,validToken,type ProposalEnv,type ProposalRow} from '../../../_lib/proposals';

interface PageContext {params:{token?:string|string[]};env:ProposalEnv;request:Request}

const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});

export const onRequestPost=async({params,env,request}:PageContext):Promise<Response>=>{
  const token=typeof params.token==='string'?params.token:'';
  if(!validToken(token))return json({error:'Proposal unavailable.'},404);
  const origin=request.headers.get('origin');
  if(origin&&new URL(origin).hostname!==new URL(request.url).hostname)return json({error:'Invalid request origin.'},403);
  const row=await env.PROPOSALS_DB.prepare('SELECT * FROM proposals WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > ?').bind(await hashToken(token),new Date().toISOString()).first<ProposalRow>();
  if(!row)return json({error:'Proposal unavailable.'},404);
  const contentType=request.headers.get('content-type')?.toLowerCase()??'';
  let action:string,note:string;
  if(contentType.includes('application/json')){
    const body=await request.json().catch(()=>null) as Record<string,unknown>|null;
    action=clean(body?.action,20);note=clean(body?.note,1500);
  }else if(contentType.includes('application/x-www-form-urlencoded')||contentType.includes('multipart/form-data')){
    const form=await request.formData();action=clean(form.get('action'),20);note=clean(form.get('note'),1500);
  }else return json({error:'Unsupported request.'},415);
  if(action!=='approve'&&action!=='change')return json({error:'Choose an action.'},400);
  if(action==='change'&&!note)return json({error:'Please describe the changes you would like.'},400);
  const status=action==='approve'?'approved':'changes_requested',now=new Date().toISOString();
  await env.PROPOSALS_DB.prepare('UPDATE proposals SET status = ?, traveller_response = ?, updated_at = ? WHERE id = ?').bind(status,note,now,row.id).run();
  if(env.RESEND_API_KEY&&env.LEAD_TO_EMAIL){
    const label=action==='approve'?'approved the journey direction':'requested changes';
    const subject=`Journey proposal response · ${row.traveller_name} · ${label}`;
    const text=[`${row.traveller_name} ${label}.`,note?`Traveller note: ${note}`:'',`Proposal: ${row.title}`,`Reply to: ${row.traveller_email}`].filter(Boolean).join('\n\n');
    const html=`<!doctype html><html><body style="margin:0;background:#eee8dc;font-family:Arial,sans-serif;color:#173229"><table role="presentation" width="100%"><tr><td align="center" style="padding:30px"><table role="presentation" width="100%" style="max-width:640px;background:#fffdf8;border-top:5px solid #b44b37"><tr><td style="padding:24px 30px;background:#102d24;color:white;font-weight:700;letter-spacing:2px">WAY <i style="color:#d3ae68">to</i> ASIA</td></tr><tr><td style="padding:32px"><p style="color:#9b3f2e;font-size:12px;font-weight:700;text-transform:uppercase">Proposal response</p><h1 style="font:32px Georgia,serif">${escapeHtml(row.traveller_name)} ${escapeHtml(label)}</h1><p style="line-height:1.7;color:#50625a">${note?escapeHtml(note):'No additional note was included.'}</p><p><a href="mailto:${escapeHtml(row.traveller_email)}" style="color:#8f3828">Reply to ${escapeHtml(row.traveller_email)}</a></p></td></tr></table></td></tr></table></body></html>`;
    await sendResend(env.RESEND_API_KEY,{to:[env.LEAD_TO_EMAIL],replyTo:row.traveller_email,subject,text,html});
  }
  const suffix=action==='approve'?'approved':'changes';
  return Response.redirect(`${new URL(request.url).origin}/proposal/${encodeURIComponent(token)}?response=${suffix}`,303);
};

export const onRequestGet=()=>json({error:'Method not allowed.'},405);
