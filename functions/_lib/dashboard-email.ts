import {auditStatement,type DashboardEnv} from './dashboard';
export async function sendLogged(env:DashboardEnv,enquiryId:string,message:{to:string;subject:string;text:string;html:string;reference:string}):Promise<boolean>{
  const id=crypto.randomUUID();
  await env.PROPOSALS_DB.batch([
    env.PROPOSALS_DB.prepare("INSERT INTO activities (id,enquiry_id,kind,actor,sender,recipients_json,subject,body,created_at,delivery) VALUES (?,?,'outgoing','Website','journeys@waytoasia.com',?,?,?,?,'pending')").bind(id,enquiryId,JSON.stringify([message.to]),message.subject,message.text,new Date().toISOString()),
    auditStatement(env,'Website','email.send_requested',enquiryId),
  ]);
  try{
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':id},body:JSON.stringify({from:'Way to Asia <journeys@waytoasia.com>',to:[message.to],reply_to:env.REPLY_DOMAIN?`${message.reference}@${env.REPLY_DOMAIN}`:undefined,subject:message.subject,text:message.text,html:message.html,tags:[{name:'wta_activity',value:id}]}),signal:AbortSignal.timeout(12000)});
    if(!response.ok)throw Error('Send rejected');const sent=await response.json() as {id:string};
    await env.PROPOSALS_DB.batch([env.PROPOSALS_DB.prepare("UPDATE activities SET provider_id=?,delivery=CASE WHEN delivery IN ('pending','failed') THEN 'sent' ELSE delivery END WHERE id=?").bind(sent.id,id),auditStatement(env,'Website','email.sent',enquiryId)]);return true;
  }catch{await env.PROPOSALS_DB.prepare("UPDATE activities SET delivery='failed' WHERE id=?").bind(id).run();return false}
}
