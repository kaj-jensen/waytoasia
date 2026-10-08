import {customerRecordsGet,customerRecordsPost,openCustomerRecord} from '../_lib/customer-records';
import {customerApprovedStatus,enquiryStatusSql,displayEnquiryStatus} from '../_lib/enquiry-status';
import {tours} from '../../src/content/data';
import {financeGet,financePost,financePermissions} from '../_lib/finance-api';
import {duffelReady,searchFlights,getFlight,sampleFlight,FlightError} from '../_lib/duffel';
import {authenticate,requireAdmin,requireEditor,requireProposalEditor,permissions,json,privateHeaders,statuses,audit,auditStatement,activityStatement,captureEnquiry,safeUrl,readBytes,type DashboardEnv,type Staff} from '../_lib/dashboard';
import {clean,parseStoredPayload,type ProposalRow} from '../_lib/proposals';
import {renderDashboard} from '../_lib/dashboard-view';
interface Context {request:Request;env:DashboardEnv}
const fail=(message:string,status=400)=>{throw json({error:message},status)};
export async function onRequest({request,env}:Context):Promise<Response>{
  try{
    const staff=await authenticate(request,env);
    if(!['GET','POST'].includes(request.method))return json({error:'Method not allowed'},405);
    const url=new URL(request.url),path=url.pathname.replace(/^\/(?:staff|dashboard)\/?/,'');
    if(request.method==='GET'&&!path)return new Response(renderDashboard(staff),{headers:{...privateHeaders(),'Content-Type':'text/html; charset=utf-8'}});
    if(request.method==='GET'&&path==='api/me')return json({staff,permissions:{...permissions(staff),finance:financePermissions(staff).read,financeWrite:financePermissions(staff).write},emailSending:env.EMAIL_SEND_ENABLED==='true'&&Boolean(env.RESEND_API_KEY&&env.REPLY_DOMAIN&&env.RESEND_WEBHOOK_SECRET&&env.RESEND_RECEIVING_API_KEY),attachments:Boolean(env.PRIVATE_ATTACHMENTS),flightTesting:duffelReady(env.DUFFEL_TEST_TOKEN)});
    if(request.method==='GET'&&path.startsWith('attachments/')){
      const row=await env.PROPOSALS_DB.prepare('SELECT * FROM attachments WHERE id=?').bind(path.slice(12)).first<{object_key:string;filename:string}>();
      if(!row||!env.PRIVATE_ATTACHMENTS)return json({error:'Attachment unavailable'},404);
      const object=await env.PRIVATE_ATTACHMENTS.get(row.object_key);if(!object)return json({error:'Attachment unavailable'},404);
      await audit(env,staff.email,'attachment.download',path.slice(12));
      return new Response(object.body as unknown as ReadableStream,{headers:{...privateHeaders(),'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename="${row.filename.replace(/[^a-zA-Z0-9._-]/g,'_')}"`}});
    }
    if(request.method==='GET')return await get(path,url,env,staff);
    if(request.headers.get('origin')!==url.origin)return json({error:'Invalid request origin'},403);
    if(!request.headers.get('content-type')?.includes('application/json'))return json({error:'Expected JSON'},415);
    const text=new TextDecoder().decode(await readBytes(request,100000));
    let input:Record<string,unknown>;try{input=JSON.parse(text);if(!input||typeof input!=='object'||Array.isArray(input))throw 0}catch{return json({error:'Invalid JSON'},400)}
    return await post(path,input,env,staff);
  }catch(error){if(error instanceof Response)return error;if(error instanceof FlightError)return json({error:error.message},error.status);console.error('Dashboard operation failed');return json({error:'Operation could not be completed. Check configuration or retry.'},500)}
}
async function get(path:string,url:URL,env:DashboardEnv,staff:Staff):Promise<Response>{
  const protectedRecord=await customerRecordsGet(path,env,staff);if(protectedRecord)return protectedRecord;
  const financial=await financeGet(path,url,env,staff);if(financial)return financial;
  const db=env.PROPOSALS_DB;
  if(path==='api/staff')return json((await db.prepare('SELECT email,name,COALESCE(access_role,role) role,enabled FROM staff_users ORDER BY name').all()).results);
  if(path==='api/audit'){requireAdmin(staff);return json((await db.prepare('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 200').all()).results)}
  if(path==='api/unmatched')return json((await db.prepare("SELECT * FROM activities WHERE enquiry_id IS NULL AND kind='incoming' ORDER BY created_at DESC LIMIT 100").all()).results);
  if(path==='api/enquiries'){
    const conditions:string[]=[],args:unknown[]=[];
    const search=(url.searchParams.get('q')||'').slice(0,160);
    if(search){conditions.push('(c.name LIKE ? OR c.email LIKE ? OR e.reference LIKE ?)');args.push(...Array(3).fill(`%${search}%`))}
    for(const [param,column] of [['status',enquiryStatusSql('e.')],['assigned','e.assigned_to']]){const value=url.searchParams.get(param);if(value){conditions.push(`${column}=?`);args.push(value)}}
    for(const [param,op] of [['from','>='],['to','<=']]){const value=url.searchParams.get(param);if(value&&/^\d{4}-\d{2}-\d{2}$/.test(value)){conditions.push(`substr(e.created_at,1,10) ${op} ?`);args.push(value)}}
    if(url.searchParams.get('overdue')==='1'){conditions.push("e.follow_up < ? AND e.status NOT IN ('Closed','Confirmed')");args.push(new Date().toISOString().slice(0,10))}
    const where=conditions.length?` WHERE ${conditions.join(' AND ')}`:'',page=Math.max(1,Math.min(100000,Number(url.searchParams.get('page'))||1));
    const order=url.searchParams.get('sort')==='oldest'?'e.created_at ASC':url.searchParams.get('sort')==='followup'?'e.follow_up IS NULL,e.follow_up ASC':'e.created_at DESC';
    const base=' FROM enquiries e JOIN clients c ON c.id=e.client_id';
    const [rows,total,counts,overdue,unmatched]=await Promise.all([
      db.prepare(`SELECT e.*,c.name,c.email,(SELECT COUNT(*) FROM activities a WHERE a.enquiry_id=e.id AND a.unread=1) unread${base}${where} ORDER BY ${order} LIMIT 25 OFFSET ?`).bind(...args,(page-1)*25).all(),
      db.prepare(`SELECT COUNT(*) total${base}${where}`).bind(...args).first(),
      db.prepare(`SELECT ${enquiryStatusSql()} status,COUNT(*) count FROM enquiries GROUP BY ${enquiryStatusSql()}`).all(),
      db.prepare("SELECT COUNT(*) count FROM enquiries WHERE follow_up < ? AND status NOT IN ('Closed','Confirmed')").bind(new Date().toISOString().slice(0,10)).first(),
      db.prepare("SELECT COUNT(*) count FROM activities WHERE enquiry_id IS NULL AND kind='incoming'").first(),
    ]);
    return json({rows:rows.results.map(e=>({...e,status:displayEnquiryStatus(e)})),total,counts:counts.results,overdue,unmatched,page});
  }
  const match=path.match(/^api\/enquiries\/([^/]+)(\/(?:export|export-client))?$/);
  if(match){
    const enquiry=await db.prepare(`SELECT e.*,c.name,c.email,c.phone FROM enquiries e JOIN clients c ON c.id=e.client_id WHERE e.id=?`).bind(match[1]).first();if(!enquiry)return json({error:'Enquiry not found'},404);
    if(match[2])requireAdmin(staff);
    if(match[2]==='/export-client'){
      const enquiries=await db.prepare('SELECT * FROM enquiries WHERE client_id=? ORDER BY created_at').bind(enquiry.client_id).all();
      const [activities,proposals,attachments]=await Promise.all([
        db.prepare('SELECT a.* FROM activities a JOIN enquiries e ON e.id=a.enquiry_id WHERE e.client_id=? ORDER BY a.created_at').bind(enquiry.client_id).all(),
        db.prepare('SELECT p.* FROM enquiry_proposals p JOIN enquiries e ON e.id=p.enquiry_id WHERE e.client_id=? ORDER BY p.created_at').bind(enquiry.client_id).all(),
        db.prepare('SELECT t.* FROM attachments t JOIN activities a ON a.id=t.activity_id JOIN enquiries e ON e.id=a.enquiry_id WHERE e.client_id=?').bind(enquiry.client_id).all(),
      ]);
      const protectedRows=await db.prepare('SELECT r.enquiry_id,r.ciphertext FROM customer_records r JOIN enquiries e ON e.id=r.enquiry_id WHERE e.client_id=?').bind(enquiry.client_id).all<{enquiry_id:string;ciphertext:string}>();
      const protectedRecords=await Promise.all(protectedRows.results.map(async r=>({enquiryId:r.enquiry_id,record:await openCustomerRecord(env,r.enquiry_id,r.ciphertext)})));
      await audit(env,staff.email,'client.export',String(enquiry.client_id));
      return json({protectedRecords,client:{id:enquiry.client_id,name:enquiry.name,email:enquiry.email,phone:enquiry.phone},enquiries:enquiries.results,activities:activities.results,proposals:proposals.results,attachments:attachments.results});
    }
    const [activities,proposals,attachments,related]=await Promise.all([
      db.prepare('SELECT * FROM activities WHERE enquiry_id=? ORDER BY created_at,id').bind(match[1]).all(),
      db.prepare('SELECT * FROM enquiry_proposals WHERE enquiry_id=? ORDER BY version DESC').bind(match[1]).all(),
      db.prepare('SELECT t.* FROM attachments t JOIN activities a ON a.id=t.activity_id WHERE a.enquiry_id=?').bind(match[1]).all(),
      db.prepare(`SELECT id,reference,${enquiryStatusSql()} status FROM enquiries WHERE client_id=? ORDER BY created_at DESC`).bind(enquiry.client_id).all(),
    ]);
    if(match[2])await audit(env,staff.email,'enquiry.export',match[1]);
    let tourSlug='';try{const r=JSON.parse(String(enquiry.requirements_json));tourSlug=r.tour||r.journey||''}catch{/* Legacy requirements may be unstructured. */}
    const tour=tours.find(t=>t.slug===tourSlug);
    const catalogueTrip=tour?{name:tour.name,itinerary:tour.itinerary,accommodation:tour.accommodation||[],route:tour.route||[],transport:tour.transport||[],includes:tour.includes,excludes:tour.excludes}:null;
    return json({enquiry:{...enquiry,status:displayEnquiryStatus(enquiry)},catalogueTrip,activities:activities.results,proposals:proposals.results,attachments:attachments.results,related:related.results});
  }
  return json({error:'Not found'},404);
}
async function post(path:string,input:Record<string,unknown>,env:DashboardEnv,staff:Staff):Promise<Response>{
  const protectedRecord=await customerRecordsPost(path,input,env,staff);if(protectedRecord)return protectedRecord;
  const financial=await financePost(path,input,env,staff);if(financial)return financial;
  const db=env.PROPOSALS_DB,now=new Date().toISOString();
  if(path==='api/staff'){
    requireAdmin(staff);const email=clean(input.email,240).toLowerCase(),name=clean(input.name,160),role=input.role,enabled=input.enabled===true?1:0;
    if(!/^\S+@\S+\.\S+$/.test(email)||!name||!['admin','staff','backoffice','finance','viewer'].includes(String(role)))fail('Valid email, name and role required');
    // Administrators cannot remove their own access, including the last administrator.
    if(email===staff.email&&(role!=='admin'||!enabled))fail('You cannot revoke your own administrator access.');
    await db.batch([db.prepare('INSERT INTO staff_users (email,name,role,enabled,created_at,access_role) VALUES (?,?,?,?,?,?) ON CONFLICT(email) DO UPDATE SET name=excluded.name,role=excluded.role,enabled=excluded.enabled,access_role=excluded.access_role').bind(email,name,role==='admin'?'admin':'staff',enabled,now,role),auditStatement(env,staff.email,'staff.access_changed',email)]);return json({ok:true});
  }
  requireEditor(staff);
  if(path==='api/enquiries'){
    const name=clean(input.name,160),email=clean(input.email,240).toLowerCase();if(!name||!/^\S+@\S+\.\S+$/.test(email))fail('Client name and valid email required.');
    const captured=await captureEnquiry(env,{name,email,phone:clean(input.phone,100),source:clean(input.source,80)||'Manual',message:clean(input.message,10000),requirements:{dates:clean(input.dates,160),destinations:clean(input.destinations,500),travellers:clean(input.travellers,80),budget:clean(input.budget,160),requirements:clean(input.requirements,5000)}});
    await audit(env,staff.email,'enquiry.manual_created',captured.id);return json(captured,201);
  }
  if(path==='api/unmatched/assign'){
    const id=clean(input.id,80),enquiry=clean(input.enquiry,80);
    if(!await db.prepare('SELECT id FROM enquiries WHERE id=?').bind(enquiry).first())fail('Enquiry not found',404);
    await db.batch([db.prepare("UPDATE activities SET enquiry_id=?,unread=1 WHERE id=? AND enquiry_id IS NULL AND kind='incoming'").bind(enquiry,id),auditStatement(env,staff.email,'message.assigned',id)]);return json({ok:true});
  }
  const match=path.match(/^api\/enquiries\/([^/]+)(?:\/(edit|note|call|proposal|send|read|delete-client|flights-search|flights-save|flights-remove))?$/);
  if(!match)return json({error:'Not found'},404);
  const id=match[1],action=match[2];
  const enquiry=await db.prepare('SELECT e.*,c.email,c.name FROM enquiries e JOIN clients c ON c.id=e.client_id WHERE e.id=?').bind(id).first<Record<string,string>>();if(!enquiry)fail('Enquiry not found',404);
  if(enquiry!.email.endsWith('@anonymized.invalid')&&['note','call','proposal','flights-search','flights-save','flights-remove'].includes(action||''))fail('Customer identity has been removed. Create a new enquiry before adding personal content.',409);
  if(action?.startsWith('flights-')){
    requireProposalEditor(staff);
    if(action==='flights-search')return json({offers:input.sample===true?[sampleFlight()]:await searchFlights(env.DUFFEL_TEST_TOKEN,input)});
    const flight=action==='flights-remove'?null:input.offerId==='sample'?sampleFlight():await getFlight(env.DUFFEL_TEST_TOKEN,input.offerId);
    const requirements=JSON.parse(enquiry!.requirements_json||'{}');
    if(flight)requirements.flightItinerary=flight;else delete requirements.flightItinerary;
    const statements=[db.prepare('UPDATE enquiries SET requirements_json=?,updated_at=? WHERE id=?').bind(JSON.stringify(requirements),now,id)];
    const proposalId=clean(input.proposalId,80);
    if(proposalId){
      const linked=await db.prepare("SELECT * FROM enquiry_proposals WHERE enquiry_id=? ORDER BY version DESC LIMIT 1").bind(id).first<{id:string;legacy_id:string;title:string;url:string}>();
      if(!linked||linked.id!==proposalId||!linked.legacy_id)fail('Select the current linked journey proposal.',409);
      const row=await db.prepare('SELECT * FROM proposals WHERE id=? AND revoked_at IS NULL AND expires_at>?').bind(linked!.legacy_id,now).first<ProposalRow>();
      const payload=row&&parseStoredPayload(row.payload_json);if(!row||!payload)fail('Journey proposal unavailable.',404);
      if(flight)payload!.builderChoices.flightItinerary=flight;else delete payload!.builderChoices.flightItinerary;
      statements.push(db.prepare("UPDATE proposals SET payload_json=?,status='in_review',updated_at=? WHERE id=?").bind(JSON.stringify(payload),now,row!.id),
        db.prepare("UPDATE enquiry_proposals SET status='Superseded' WHERE enquiry_id=?").bind(id),
        db.prepare("INSERT INTO enquiry_proposals (id,enquiry_id,legacy_id,title,url,version,status,snapshot_json,created_at) SELECT ?,?,?,?,?,COALESCE(MAX(version),0)+1,'Draft',?,? FROM enquiry_proposals WHERE enquiry_id=?").bind(crypto.randomUUID(),id,row!.id,row!.title,linked!.url,JSON.stringify({payload,title:row!.title,summary:row!.summary,estimatedPrice:row!.estimated_price,consultantNote:row!.consultant_note,status:'in_review'}),now,id));
    }
    statements.push(activityStatement(env,id,'proposal',flight?`Test flight itinerary saved${proposalId?' to the linked journey proposal':''}. Flights are not booked or confirmed.`:'Test flight itinerary removed.',staff.email),auditStatement(env,staff.email,`flights.${flight?'saved':'removed'}`,id));
    await db.batch(statements);return json({ok:true});
  }
  if(action==='read'){await db.prepare('UPDATE activities SET unread=0 WHERE enquiry_id=?').bind(id).run();return json({ok:true})}
  if(action==='edit'){
    const status=clean(input.status,80),assigned=clean(input.assigned,240).toLowerCase(),followup=clean(input.followUp,10);
    if(!statuses.includes(status)||followup&&!/^\d{4}-\d{2}-\d{2}$/.test(followup))fail('Invalid status or follow-up date');
    if(assigned&&!await db.prepare('SELECT email FROM staff_users WHERE email=? AND enabled=1').bind(assigned).first())fail('Assignee must be an active staff member');
    await db.batch([db.prepare('UPDATE enquiries SET status=?,assigned_to=?,follow_up=?,updated_at=?,customer_approved_at=? WHERE id=?').bind(status===customerApprovedStatus?'In progress':status,assigned||null,followup||null,now,status===customerApprovedStatus?(enquiry!.customer_approved_at||now):null,id),activityStatement(env,id,'status',`${enquiry!.status} → ${status}; assigned: ${assigned||'Unassigned'}; follow-up: ${followup||'None'}`,staff.email),auditStatement(env,staff.email,'enquiry.updated',id)]);return json({ok:true});
  }
  if(action==='note'||action==='call'){
    const body=clean(input.body,10000);if(!body)fail('A message is required');await db.batch([activityStatement(env,id,action,body,staff.email),auditStatement(env,staff.email,`enquiry.${action}`,id)]);return json({ok:true});
  }
  if(action==='proposal'){
    requireProposalEditor(staff);
    const title=clean(input.title,180);if(!title)fail('Proposal title required');let url:string;try{url=safeUrl(input.url)}catch{fail('A valid HTTPS proposal URL is required')}
    const status=clean(input.status,30);if(!['Draft','Sent','Accepted'].includes(status))fail('Invalid proposal status');
    // MAX(version)+1 is evaluated in the same atomic batch as history preservation.
    await db.batch([
      db.prepare("UPDATE enquiry_proposals SET status='Superseded' WHERE enquiry_id=? AND status!='Superseded'").bind(id),
      db.prepare('INSERT INTO enquiry_proposals (id,enquiry_id,title,url,version,status,created_at,sent_at,sent_by) SELECT ?,?,?,?,COALESCE(MAX(version),0)+1,?,?,?,? FROM enquiry_proposals WHERE enquiry_id=?').bind(crypto.randomUUID(),id,title,url!,status,now,status==='Sent'?now:null,status==='Sent'?staff.email:null,id),
      activityStatement(env,id,'proposal',`${title}\n${url!}\n${status} (manually recorded)`,staff.email),auditStatement(env,staff.email,'proposal.created',id),
    ]);return json({ok:true});
  }
  if(action==='send'){
    if(enquiry!.email.endsWith('@anonymized.invalid'))fail('Customer identity has been removed. Email sending is disabled for this file.',409);
    if(env.EMAIL_SEND_ENABLED!=='true'||!env.RESEND_API_KEY||!env.REPLY_DOMAIN||!env.RESEND_WEBHOOK_SECRET||!env.RESEND_RECEIVING_API_KEY)fail('Email sending is disabled until preview verification and receiving-domain setup.',503);
    const subject=clean(input.subject,250),body=clean(input.body,20000),key=clean(input.key,80),reply=clean(input.replyTo,80);
    if(!subject||!body||!/^[-a-zA-Z0-9]{16,80}$/.test(key))fail('Subject, message and idempotency key required');
    const activity=`send-${id}-${key}`;
    const previous=await db.prepare('SELECT * FROM activities WHERE id=?').bind(activity).first<Record<string,string>>();
    if(previous&&(previous.body!==body||previous.subject!==`[${enquiry!.reference}] ${subject}`||previous.recipients_json!==JSON.stringify([enquiry!.email])))fail('This send key has already been used for another message',409);
    if(previous?.provider_id)return json({ok:true,delivery:previous.delivery});
    if(previous&&Date.now()-Date.parse(previous.created_at)>23*60*60*1000)fail('The safe retry window has expired. Verify provider delivery before creating a new send.',409);
    const recent=await db.prepare("SELECT COUNT(*) count FROM activities WHERE kind='outgoing' AND actor=? AND created_at>?").bind(staff.email,new Date(Date.now()-60000).toISOString()).first<{count:number}>();
    if((recent?.count||0)>=10)fail('Email rate limit reached. Retry in a minute.',429);
    let thread:string|undefined;
    if(reply){const parent=await db.prepare("SELECT message_id FROM activities WHERE id=? AND enquiry_id=? AND kind IN ('incoming','outgoing')").bind(reply,id).first<{message_id:string}>();if(!parent?.message_id)fail('Reply message must belong to this enquiry');thread=parent!.message_id}
    const fullSubject=`[${enquiry!.reference}] ${subject}`;
    await db.batch([db.prepare("INSERT OR IGNORE INTO activities (id,enquiry_id,kind,actor,sender,recipients_json,subject,body,created_at,delivery) VALUES (?,?,'outgoing',?,'journeys@waytoasia.com',?,?,?,?, 'pending')").bind(activity,id,staff.email,JSON.stringify([enquiry!.email]),fullSubject,body,now),auditStatement(env,staff.email,'email.send_requested',id)]);
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':activity},body:JSON.stringify({from:'Way to Asia <journeys@waytoasia.com>',to:[enquiry!.email],reply_to:`${enquiry!.reference}@${env.REPLY_DOMAIN}`,subject:fullSubject,text:body,tags:[{name:'wta_activity',value:activity}],headers:thread?{'In-Reply-To':thread,References:thread}:undefined}),signal:AbortSignal.timeout(12000)});
    if(!response.ok){await db.prepare("UPDATE activities SET delivery='failed' WHERE id=?").bind(activity).run();fail('Email provider rejected the message; it is recorded as failed.',502)}
    const sent=await response.json() as {id:string};
    const proposals=await db.prepare("SELECT id,url FROM enquiry_proposals WHERE enquiry_id=? AND status='Draft'").bind(id).all<{id:string;url:string}>();
    const included=proposals.results.filter(p=>body.includes(p.url));
    await db.batch([db.prepare("UPDATE activities SET provider_id=?,delivery=CASE WHEN delivery IN ('pending','failed') THEN 'sent' ELSE delivery END WHERE id=?").bind(sent.id,activity),...included.map(p=>db.prepare("UPDATE enquiry_proposals SET status='Sent',sent_at=?,sent_by=? WHERE id=?").bind(now,staff.email,p.id)),...(included.length?[db.prepare("UPDATE enquiries SET status='Proposal sent',customer_approved_at=NULL,updated_at=? WHERE id=?").bind(now,id),activityStatement(env,id,'status','Proposal sent',staff.email)]:[]),auditStatement(env,staff.email,'email.sent',id)]);return json({ok:true});
  }
  if(action==='delete-client'){
    requireAdmin(staff);if(input.confirm!==enquiry!.email)fail('Confirm deletion with the client email');
    const links=await db.prepare('SELECT p.legacy_id FROM enquiry_proposals p JOIN enquiries e ON e.id=p.enquiry_id WHERE e.client_id=? AND p.legacy_id IS NOT NULL').bind(enquiry!.client_id).all<{legacy_id:string}>();
    const files=await db.prepare("SELECT t.object_key FROM attachments t JOIN activities a ON a.id=t.activity_id JOIN enquiries e ON e.id=a.enquiry_id WHERE e.client_id=? AND t.object_key NOT LIKE 'blocked/%'").bind(enquiry!.client_id).all<{object_key:string}>();
    // Remove private objects first; failed deletions leave database records available for retry.
    if(files.results.length&&!env.PRIVATE_ATTACHMENTS)fail('Attachment storage unavailable',503);
    for(const file of files.results)await env.PRIVATE_ATTACHMENTS!.delete(file.object_key);
    await db.batch([
      db.prepare('INSERT OR IGNORE INTO message_tombstones SELECT a.provider_id,? FROM activities a JOIN enquiries e ON e.id=a.enquiry_id WHERE e.client_id=? AND a.provider_id IS NOT NULL').bind(now,enquiry!.client_id),
      db.prepare('DELETE FROM enquiries WHERE client_id=?').bind(enquiry!.client_id),
      ...links.results.map(p=>db.prepare('DELETE FROM proposals WHERE id=?').bind(p.legacy_id)),
      db.prepare('DELETE FROM clients WHERE id=?').bind(enquiry!.client_id),db.prepare("UPDATE audit_log SET actor='Deleted client' WHERE actor=?").bind(enquiry!.email),auditStatement(env,staff.email,'client.deleted',enquiry!.client_id),
    ]);return json({ok:true});
  }
  return json({error:'Not found'},404);
}
