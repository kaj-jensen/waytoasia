import type {D1PreparedStatement} from '@cloudflare/workers-types';
import {Webhook} from 'svix';
import {json,readBytes,type DashboardEnv} from '../../_lib/dashboard';
interface Received {id:string;from:string;to:string[];cc?:string[];subject:string;text:string|null;html:string|null;created_at:string;message_id?:string;headers?:Record<string,string>;attachments?:{id:string;filename:string;size:number;content_type:string}[]}
interface Event {type:string;created_at:string;data:{email_id:string;message_id?:string;tags?:Record<string,string>}}
export async function matchReply(env:DashboardEnv,email:Received):Promise<string|null>{
  const candidates=new Set<string>();
  const headers=Object.fromEntries(Object.entries(email.headers||{}).map(([k,v])=>[k.toLowerCase(),v]));
  const ids=[headers['in-reply-to'],headers.references].filter(Boolean).join(' ').match(/<[^<>\s]+>/g)||[];
  for(const id of ids){const rows=await env.PROPOSALS_DB.prepare('SELECT DISTINCT enquiry_id FROM activities WHERE message_id=? AND enquiry_id IS NOT NULL').bind(id).all<{enquiry_id:string}>();for(const row of rows.results)candidates.add(row.enquiry_id)}
  const references=[...email.to,email.subject].join(' ').toUpperCase().match(/WTA-\d{8}-(?:[A-F0-9]{32}|[A-F0-9]{12})/g)||[];
  for(const reference of references){const row=await env.PROPOSALS_DB.prepare('SELECT id FROM enquiries WHERE reference=?').bind(reference).first<{id:string}>();if(row)candidates.add(row.id)}
  // Contradictory thread/reference signals are never resolved by email-address guessing.
  return candidates.size===1?[...candidates][0]:null;
}
async function provider(env:DashboardEnv,path:string){const response=await fetch(`https://api.resend.com/${path}`,{headers:{Authorization:`Bearer ${env.RESEND_RECEIVING_API_KEY||env.RESEND_API_KEY}`},signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('Provider retrieval failed');return response.json()}
export async function onRequestPost({request,env}:{request:Request;env:DashboardEnv}):Promise<Response>{
  if(!env.RESEND_WEBHOOK_SECRET||!(env.RESEND_RECEIVING_API_KEY||env.RESEND_API_KEY))return json({error:'Webhook not configured'},503);
  let body:string;try{body=new TextDecoder().decode(await readBytes(request,1000000))}catch(error){if(error instanceof Response)return error;return json({error:'Invalid body'},400)}
  const eventId=request.headers.get('svix-id')||'';let event:Event;
  try{new Webhook(env.RESEND_WEBHOOK_SECRET).verify(body,{'svix-id':eventId,'svix-timestamp':request.headers.get('svix-timestamp')||'','svix-signature':request.headers.get('svix-signature')||''});event=JSON.parse(body) as Event}catch{return json({error:'Invalid webhook signature'},401)}
  if(!event.data||!/^[-a-zA-Z0-9]+$/.test(event.data.email_id))return json({error:'Invalid email event'},400);
  const db=env.PROPOSALS_DB;
  try{
    if(await db.prepare('SELECT id FROM webhook_events WHERE id=?').bind(eventId).first())return json({ok:true,duplicate:true});
    const eventStatement=db.prepare('INSERT OR IGNORE INTO webhook_events VALUES (?,?)').bind(eventId,new Date().toISOString());
    if(await db.prepare('SELECT provider_id FROM message_tombstones WHERE provider_id=?').bind(event.data.email_id).first()){await eventStatement.run();return json({ok:true,suppressed:true})}
    if(event.type==='email.received'){
      const email=await provider(env,`emails/receiving/${event.data.email_id}`) as Received;
      if(!email||typeof email.from!=='string'||!Array.isArray(email.to))throw Error('Invalid provider payload');
      const enquiry=await matchReply(env,email),activity=`received-${event.data.email_id}`;
      const existing=await db.prepare('SELECT id FROM activities WHERE provider_id=?').bind(event.data.email_id).first();
      if(existing){await eventStatement.run();return json({ok:true,duplicate:true})}
      const files=email.attachments||[];if(files.length>20)throw Error('Too many attachments');

      const attachments:D1PreparedStatement[]=[];
      for(const file of files){
        const id=`${activity}-${file.id}`,key=`incoming/${event.data.email_id}/${file.id}`;
        if(!/^[-a-zA-Z0-9]+$/.test(file.id))throw Error('Invalid attachment ID');
        const allowed=Boolean(env.PRIVATE_ATTACHMENTS)&&['application/pdf','image/jpeg','image/png','text/plain'].includes(file.content_type)&&file.size<=10*1024*1024;
        if(allowed){
          const metadata=await provider(env,`emails/receiving/${event.data.email_id}/attachments/${file.id}`) as {download_url:string};
          const url=new URL(metadata.download_url);if(url.protocol!=='https:')throw Error('Invalid attachment URL');
          const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('Attachment download failed');
          const bytes=await readBytes(response,10*1024*1024);
          await env.PRIVATE_ATTACHMENTS!.put(key,bytes,{httpMetadata:{contentType:'application/octet-stream'}});
        }
        attachments.push(db.prepare('INSERT OR IGNORE INTO attachments VALUES (?,?,?,?,?,?)').bind(id,activity,`${allowed?'':env.PRIVATE_ATTACHMENTS?'[Blocked file] ':'[Download unavailable: storage not configured] '}${file.filename}`,(allowed?'':'blocked/')+key,file.size,file.content_type));
      }
      await db.batch([
        db.prepare("INSERT OR IGNORE INTO activities (id,enquiry_id,kind,actor,sender,recipients_json,subject,body,created_at,provider_id,message_id,reply_to_id,delivery,unread) VALUES (?,?,'incoming',?,?,?,?,?,?,?,?,?,'received',1)").bind(activity,enquiry,email.from,email.from,JSON.stringify([...email.to,...(email.cc||[])]),email.subject||'',email.text||email.html||'',email.created_at,event.data.email_id,email.message_id||null,email.headers?.['in-reply-to']||null),
        ...attachments,eventStatement,
      ]);
    }else if(['email.sent','email.delivered','email.bounced','email.failed','email.delivery_delayed','email.complained'].includes(event.type)){
      const tagged=event.data.tags?.wta_activity;
      if(tagged){
        await db.prepare("UPDATE activities SET provider_id=COALESCE(provider_id,?) WHERE id=? AND kind='outgoing'").bind(event.data.email_id,tagged).run();
      }
      if(!await db.prepare('SELECT id FROM activities WHERE provider_id=?').bind(event.data.email_id).first()){
        const pending=await db.prepare("SELECT id FROM activities WHERE kind='outgoing' AND delivery='pending' LIMIT 1").first();
        if(pending)return json({error:'Outgoing message not yet persisted; retry delivery'},503);
        await eventStatement.run();return json({ok:true,untracked:true});
      }
      const sent=await provider(env,`emails/${event.data.email_id}`) as {headers?:Record<string,string>;message_id?:string};
      // Status events may arrive out of order. Preserve a terminal delivery result over a later sent event.
      await db.batch([db.prepare("UPDATE activities SET delivery=CASE WHEN delivery IN ('delivered','bounced','failed','complained') AND ? IN ('sent','delivery_delayed') THEN delivery ELSE ? END,message_id=COALESCE(?,message_id) WHERE provider_id=?").bind(event.type.slice(6),event.type.slice(6),sent.message_id||event.data.message_id||null,event.data.email_id),eventStatement]);
    }else await eventStatement.run();
    return json({ok:true});
  }catch{console.error('Email webhook processing failed');return json({error:'Processing failed; retry delivery'},503)}
}
