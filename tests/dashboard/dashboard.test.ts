import test from 'node:test';
import assert from 'node:assert/strict';
import {Webhook} from 'svix';
import {database,identity} from './support';
import {captureEnquiry,type DashboardEnv} from '../../functions/_lib/dashboard';
import {onRequest} from '../../functions/staff/[[path]]';
import {onRequestPost as webhook,matchReply} from '../../functions/api/webhooks/resend';
import {onRequestPost as lead} from '../../functions/api/lead';
const auth=await identity();
function setup(){const {adapter,sqlite}=database();const env:DashboardEnv={PROPOSALS_DB:adapter,ACCESS_TEAM_DOMAIN:'preview.invalid',ACCESS_AUD:'local-preview',LOCAL_ACCESS_JWK:JSON.stringify(auth.publicJwk),RESEND_WEBHOOK_SECRET:'whsec_'+Buffer.from('dashboard-test-secret').toString('base64'),RESEND_RECEIVING_API_KEY:'test-receiving',RESEND_API_KEY:'test-only',DASHBOARD_CAPTURE:'true'};sqlite.prepare('INSERT INTO staff_users (email,name,role,enabled,created_at) VALUES (?,?,?,?,?)').run('journeys@waytoasia.com','Preview administrator','admin',1,new Date().toISOString());sqlite.prepare('INSERT INTO staff_users (email,name,role,enabled,created_at) VALUES (?,?,?,?,?)').run('staff@example.invalid','Preview staff','staff',1,new Date().toISOString());return {env,sqlite}}
async function call(env:DashboardEnv,path:string,body?:unknown,email='journeys@waytoasia.com',token?:string){const headers:Record<string,string>={'Cf-Access-Jwt-Assertion':token||await auth.token(email)};if(body!==undefined){headers['Content-Type']='application/json';headers.Origin='http://localhost:8788'}return onRequest({env,request:new Request(`http://localhost:8788/staff/${path}`,{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:JSON.stringify(body)})})}
const client={name:'Synthetic traveller',email:'client@example.invalid',phone:'123',source:'Test',message:'Private client request',requirements:{destinations:'Japan'}};
test('pages, APIs and attachments reject missing, forged, expired, wrong-audience and non-MFA tokens',async()=>{
  const {env}=setup();for(const path of ['','api/enquiries','attachments/a'])assert.equal((await onRequest({env,request:new Request(`http://localhost/staff/${path}`)})).status,401);
  for(const token of ['forged',await auth.token(client.email),await auth.token(undefined,false),await auth.token(undefined,true,{aud:'wrong'}),await auth.token(undefined,true,{expired:true})])assert.ok([401,403].includes((await call(env,'api/enquiries',undefined,undefined,token)).status));
  const prod=await onRequest({env,request:new Request('https://example.invalid/staff',{headers:{'Cf-Access-Jwt-Assertion':await auth.token()}})});assert.equal(prod.status,401);
  env.ACCESS_REQUIRE_MFA='false';assert.equal((await call(env,'api/me',undefined,undefined,await auth.token(undefined,false))).status,200);
});
test('roles, immediate disable and CSRF enforced on direct API calls',async()=>{
  const {env,sqlite}=setup();for(const path of ['api/staff','api/audit'])assert.equal((await call(env,path,path==='api/staff'?{}:undefined,'staff@example.invalid')).status,403);
  const e=await captureEnquiry(env,client);assert.equal((await call(env,`api/enquiries/${e.id}/delete-client`,{confirm:client.email},'staff@example.invalid')).status,403);
  assert.equal((await call(env,`api/enquiries/${e.id}/export`,undefined,'staff@example.invalid')).status,403);
  const csrf=await onRequest({env,request:new Request('http://localhost:8788/staff/api/enquiries',{method:'POST',headers:{'Cf-Access-Jwt-Assertion':await auth.token(),'Content-Type':'application/json',Origin:'https://evil.invalid'},body:'{}'})});assert.equal(csrf.status,403);
  sqlite.prepare('UPDATE staff_users SET enabled=0 WHERE email=?').run('staff@example.invalid');assert.equal((await call(env,'api/enquiries',undefined,'staff@example.invalid')).status,403);
});
test('one client has separate durable enquiries, indexed filters, proposal history and private notes',async()=>{
  const {env,sqlite}=setup();const a=await captureEnquiry(env,client),b=await captureEnquiry(env,{...client,message:'Second request'});assert.notEqual(a.id,b.id);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM clients').get()!.n,1);
  assert.equal((await call(env,`api/enquiries/${a.id}/note`,{body:'NEVER SEND THIS'})).status,200);
  for(const title of ['First','Revision'])assert.equal((await call(env,`api/enquiries/${a.id}/proposal`,{title,url:'https://proposal.waytoasia.com/test',status:'Sent'})).status,200);
  const d=await (await call(env,`api/enquiries/${a.id}`)).json() as {proposals:{version:number;status:string}[];related:unknown[]};assert.equal(d.proposals.length,2);assert.equal(d.proposals[0].version,2);assert.equal(d.proposals[1].status,'Superseded');assert.equal(d.related.length,2);
  assert.equal((await call(env,`api/enquiries/${a.id}/proposal`,{title:'Bad',url:'javascript:alert(1)',status:'Sent'})).status,400);
  await call(env,`api/enquiries/${a.id}/edit`,{status:'In progress',followUp:'2020-01-01'});const rows=await(await call(env,'api/enquiries?overdue=1')).json() as {rows:unknown[]};assert.equal(rows.rows.length,1);
});
test('incoming replies use identifiers and references, ambiguity queues safely and webhooks deduplicate',async()=>{
  const {env,sqlite}=setup();const a=await captureEnquiry(env,client),b=await captureEnquiry(env,client);
  sqlite.prepare("INSERT INTO activities (id,enquiry_id,kind,actor,body,created_at,message_id) VALUES (?,?,'outgoing','Test','hello',?,?)").run('sent-a',a.id,new Date().toISOString(),'<thread-a@example.invalid>');
  const email={id:'inbound-1',from:client.email,to:['journeys@waytoasia.com'],subject:'Re: Journey',text:'Reply body',html:null,created_at:new Date().toISOString(),message_id:'<reply-a@example.invalid>',headers:{'In-Reply-To':'<thread-a@example.invalid>'}};
  assert.equal(await matchReply(env,email),a.id);assert.equal(await matchReply(env,{...email,subject:b.reference}),null);assert.equal(await matchReply(env,{...email,headers:{}}),null);
  const original=globalThis.fetch;globalThis.fetch=async()=>Response.json(email);
  try{
    const event=JSON.stringify({type:'email.received',data:{email_id:'inbound-1'},created_at:email.created_at}),id='event-1',timestamp=new Date(),signer=new Webhook(env.RESEND_WEBHOOK_SECRET!);
    const request=()=>new Request('https://preview.invalid/api/webhooks/resend',{method:'POST',body:event,headers:{'svix-id':id,'svix-timestamp':String(Math.floor(timestamp.getTime()/1000)),'svix-signature':signer.sign(id,timestamp,event)}});
    assert.equal((await webhook({env,request:request()})).status,200);assert.equal((await webhook({env,request:request()})).status,200);
    const row=sqlite.prepare('SELECT * FROM activities WHERE provider_id=?').get('inbound-1');assert.equal(row!.enquiry_id,a.id);assert.equal(row!.unread,1);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM activities WHERE provider_id=?').get('inbound-1')!.n,1);
    assert.equal((await webhook({env,request:new Request('https://preview.invalid/api/webhooks/resend',{method:'POST',body:event})})).status,401);
  }finally{globalThis.fetch=original}
});
test('outgoing email retries use idempotency, preserve client recipient and exclude internal notes',async()=>{
  const {env,sqlite}=setup();env.EMAIL_SEND_ENABLED='true';env.REPLY_DOMAIN='replies.example.invalid';const e=await captureEnquiry(env,client);await call(env,`api/enquiries/${e.id}/note`,{body:'SECRET INTERNAL'});
  let sent=0;const original=globalThis.fetch;globalThis.fetch=async(_url,init)=>{sent++;const payload=JSON.parse(String(init!.body));assert.equal(payload.text,'Hello client');assert.equal(JSON.stringify(payload).includes('SECRET INTERNAL'),false);assert.deepEqual(payload.to,[client.email]);assert.ok(payload.reply_to.includes(e.reference));return Response.json({id:'sent-provider-1'})};
  try{const message={subject:'Your journey',body:'Hello client',key:crypto.randomUUID()};assert.equal((await call(env,`api/enquiries/${e.id}/send`,message)).status,200);assert.equal((await call(env,`api/enquiries/${e.id}/send`,message)).status,200);assert.equal(sent,1);assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM activities WHERE kind='outgoing'").get()!.n,1)}finally{globalThis.fetch=original}
});
test('contact form persists enquiry before provider notification failure',async()=>{
  const {env,sqlite}=setup();const form=new FormData();for(const key of ['firstName','lastName','phone','residence','preferredContact','destination','departureDate','dateFlexibility','duration','adults','rooms','departureAirport','budgetCurrency','budgetPerPerson','accommodation','consent'])form.set(key,'Test');form.set('email',client.email);
  const original=globalThis.fetch;globalThis.fetch=async()=>new Response('',{status:502});try{assert.equal((await lead({env:{...env,LEAD_TO_EMAIL:'staff@example.invalid'},request:new Request('http://localhost/api/lead',{method:'POST',body:form})})).status,502);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM enquiries').get()!.n,1)}finally{globalThis.fetch=original}
});
test('administrator deletion removes all client enquiries, audit remains without message bodies',async()=>{
  const {env,sqlite}=setup();const a=await captureEnquiry(env,client);await captureEnquiry(env,client);sqlite.prepare("UPDATE activities SET provider_id='deleted-provider-1' WHERE enquiry_id=?").run(a.id);assert.equal((await call(env,`api/enquiries/${a.id}/delete-client`,{confirm:client.email})).status,200);for(const table of ['clients','enquiries','activities','enquiry_proposals'])assert.equal(sqlite.prepare(`SELECT COUNT(*) n FROM ${table}`).get()!.n,0);assert.ok(sqlite.prepare("SELECT * FROM audit_log WHERE action='client.deleted'").get());
  const event=JSON.stringify({type:'email.received',data:{email_id:'deleted-provider-1'}}),eventId='retry-after-deletion',now=new Date();
  const retried=await webhook({env,request:new Request('https://preview.invalid/api/webhooks/resend',{method:'POST',body:event,headers:{'svix-id':eventId,'svix-timestamp':String(Math.floor(now.getTime()/1000)),'svix-signature':new Webhook(env.RESEND_WEBHOOK_SECRET!).sign(eventId,now,event)}})});assert.equal(retried.status,200);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM activities').get()!.n,0);
});

test('inbound files are privately stored and authenticated downloads never render active content',async()=>{
  const {env,sqlite}=setup();const e=await captureEnquiry(env,client),objects=new Map<string,ArrayBuffer>();
  env.PRIVATE_ATTACHMENTS={async put(key:string,bytes:ArrayBuffer){objects.set(key,bytes)},async get(key:string){const bytes=objects.get(key);return bytes?{body:new Response(bytes).body}:null},async delete(key:string){objects.delete(key)}} as unknown as DashboardEnv['PRIVATE_ATTACHMENTS'];
  const email={id:'file-email',from:client.email,to:[`${e.reference}@replies.example.invalid`],subject:'Document',text:'Attached',created_at:new Date().toISOString(),attachments:[{id:'file-1',filename:'itinerary.pdf',size:4,content_type:'application/pdf'},{id:'file-2',filename:'unsafe.html',size:20,content_type:'text/html'}]};
  const original=globalThis.fetch;globalThis.fetch=async url=>String(url).includes('/attachments/')?Response.json({download_url:'https://attachments.example.invalid/file'}):String(url).includes('attachments.example.invalid')?new Response('file'):Response.json(email);
  try{const body=JSON.stringify({type:'email.received',data:{email_id:'file-email'},created_at:email.created_at}),id='files-event',now=new Date();const request=new Request('https://preview.invalid/api/webhooks/resend',{method:'POST',body,headers:{'svix-id':id,'svix-timestamp':String(Math.floor(now.getTime()/1000)),'svix-signature':new Webhook(env.RESEND_WEBHOOK_SECRET!).sign(id,now,body)}});assert.equal((await webhook({env,request})).status,200);assert.equal(objects.size,1);
    const attachment=sqlite.prepare("SELECT id FROM attachments WHERE filename='itinerary.pdf'").get()!;const downloaded=await onRequest({env,request:new Request(`http://localhost/staff/attachments/${attachment.id}`,{headers:{'Cf-Access-Jwt-Assertion':await auth.token()}})});assert.equal(downloaded.status,200);assert.equal(downloaded.headers.get('content-type'),'application/octet-stream');assert.equal(await downloaded.text(),'file');assert.ok(downloaded.headers.get('content-disposition')!.includes('attachment'));
    const blocked=sqlite.prepare("SELECT id FROM attachments WHERE filename LIKE '[Blocked file]%'").get()!;assert.equal((await call(env,`attachments/${blocked.id}`)).status,404);
  }finally{globalThis.fetch=original}
});

test('Journey Designer capture is atomic, customer email archived and consultant revisions retain snapshots',async()=>{
  const {onRequestPost:trip}=await import('../../functions/api/trip-enquiry');const {onRequestPost:manage,onRequestGet:manageGet}=await import('../../functions/proposal/manage/[token]');
  const {env,sqlite}=setup();let manageToken='';let counter=0;const original=globalThis.fetch;
  globalThis.fetch=async(_url,init)=>{const message=JSON.parse(String(init!.body));const found=String(message.text).match(/\/proposal\/manage\/([a-zA-Z0-9_-]{43})/);if(found)manageToken=found[1];return Response.json({id:`provider-${++counter}`})};
  try{
    const fullEnv={...env,LEAD_TO_EMAIL:'staff@example.invalid',HBX_API_BASE_URL:'https://api.test.hotelbeds.com' as const,PROPOSAL_ORIGIN:'https://proposal.waytoasia.com' as const};
    const result=await trip({env:fullEnv,request:new Request('http://localhost/api/trip-enquiry',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:client.name,email:client.email,consent:true,profile:{adults:2},suggestion:{title:'Japan journey',summary:'A thoughtful trip',route:[{days:'1–3',place:'Tokyo',plan:'City'},{days:'4–6',place:'Kyoto',plan:'Culture'}]}})})});assert.equal(result.status,200);const publicResult=await result.json() as {proposalUrl:string};
    assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM enquiries').get()!.n,1);assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM activities WHERE kind='outgoing' AND provider_id IS NOT NULL").get()!.n,1);assert.equal(manageToken.length,43);
    assert.equal((await manageGet({env:fullEnv,params:{token:manageToken},request:new Request(`http://localhost/proposal/manage/${manageToken}`)})).status,401);
    const form=new FormData();for(const [key,value] of Object.entries({title:'Revised Japan journey',summary:'Revised summary',status:'in_review',route_days_0:'1–4',route_place_0:'Tokyo',route_plan_0:'City revisited',route_days_1:'5–7',route_place_1:'Kyoto',route_plan_1:'Culture revisited'}))form.set(key,value);
    const revised=await manage({env:fullEnv,params:{token:manageToken},request:new Request(`http://localhost/proposal/manage/${manageToken}`,{method:'POST',headers:{Origin:'http://localhost','Cf-Access-Jwt-Assertion':await auth.token()},body:form})});assert.equal(revised.status,303);
    const history=sqlite.prepare('SELECT * FROM enquiry_proposals ORDER BY version').all();assert.equal(history.length,2);assert.equal(history[0].status,'Superseded');assert.equal(history[0].url,history[1].url);assert.ok(String(history[0].snapshot_json).includes('Japan journey'));assert.ok(String(history[1].snapshot_json).includes('Revised Japan journey'));
    assert.equal((await call(env,`api/enquiries/${history[1].enquiry_id}/flights-save`,{offerId:'sample',proposalId:history[1].id})).status,200);
    const flightRow=sqlite.prepare('SELECT * FROM proposals').get()!;
    assert.equal(JSON.parse(String(flightRow.payload_json)).builderChoices.flightItinerary.source,'sample');
    const {renderProposalPage}=await import('../../functions/_lib/proposals');
    assert.ok(renderProposalPage(flightRow as never,'test','').includes('Sample airline'));
    assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM enquiry_proposals').get()!.n,3);
    const {onRequestPost:respond}=await import('../../functions/api/proposals/[token]/response');const publicToken=new URL(publicResult.proposalUrl).pathname.split('/').pop()!;
    assert.equal((await respond({env:fullEnv,params:{token:publicToken},request:new Request(`http://localhost/api/proposals/${publicToken}/response`,{method:'POST',headers:{'Content-Type':'application/json',Origin:'http://localhost'},body:JSON.stringify({action:'approve',note:'Looks great'})})})).status,303);
    assert.equal(sqlite.prepare("SELECT unread FROM activities WHERE body LIKE 'Customer approved%'").get()!.unread,1);assert.equal(sqlite.prepare('SELECT status FROM enquiry_proposals ORDER BY version DESC LIMIT 1').get()!.status,'Accepted');
  }finally{globalThis.fetch=original}
});


test('client export includes every linked request and oversized requests fail without trusting headers',async()=>{
  const {env}=setup();const a=await captureEnquiry(env,client);await captureEnquiry(env,client);
  const exported=await (await call(env,`api/enquiries/${a.id}/export-client`)).json() as {enquiries:unknown[]};assert.equal(exported.enquiries.length,2);
  assert.equal((await call(env,`api/enquiries/${a.id}/export-client`,undefined,'staff@example.invalid')).status,403);
  assert.equal((await call(env,'api/enquiries',{name:'x'.repeat(100001),email:client.email})).status,413);
});

test('administrators provision sales users, change roles and revoke access without self-lockout',async()=>{
  const {env,sqlite}=setup();const email='sales@example.invalid';
  assert.equal((await call(env,'api/staff',{email,name:'New sales user',role:'staff',enabled:true})).status,200);
  assert.equal((await call(env,'api/enquiries',undefined,email)).status,200);
  assert.equal((await call(env,'api/audit',undefined,email)).status,403);
  assert.equal((await call(env,'api/staff',{email,name:'New administrator',role:'admin',enabled:true})).status,200);
  assert.equal((await call(env,'api/audit',undefined,email)).status,200);
  assert.equal((await call(env,'api/staff',{email,name:'Disabled administrator',role:'admin',enabled:false})).status,200);
  assert.equal((await call(env,'api/enquiries',undefined,email)).status,403);
  assert.equal((await call(env,'api/staff',{email:'journeys@waytoasia.com',name:'Owner',role:'staff',enabled:true})).status,400);
  assert.equal((await call(env,'api/staff',{email:'journeys@waytoasia.com',name:'Owner',role:'admin',enabled:false})).status,400);
  assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM audit_log WHERE action='staff.access_changed'").get()!.n,3);
});

test('Back-Office, Finance and View only permissions apply to direct API requests',async()=>{
  const {env}=setup();const e=await captureEnquiry(env,client);
  for(const role of ['backoffice','finance','viewer']){
    const email=`${role}@example.invalid`;
    assert.equal((await call(env,'api/staff',{email,name:role,role,enabled:true})).status,200);
    assert.equal((await call(env,`api/enquiries/${e.id}`,undefined,email)).status,200);
    for(const path of ['api/enquiries',`api/enquiries/${e.id}/edit`,`api/enquiries/${e.id}/note`,`api/enquiries/${e.id}/call`,`api/enquiries/${e.id}/read`,'api/unmatched/assign']){
      const result=await call(env,path,{},email);assert.equal(role==='backoffice'?result.status!==403:result.status===403,true,`${role}: ${path}`);
    }
    assert.equal((await call(env,`api/enquiries/${e.id}/proposal`,{},email)).status,403);
    assert.equal((await call(env,'api/staff',{email,name:role,role:'admin',enabled:true},email)).status,403);
    assert.equal((await call(env,'api/audit',undefined,email)).status,403);
    const me=await (await call(env,'api/me',undefined,email)).json() as {staff:{role:string};permissions:{edit:boolean;proposals:boolean}};
    assert.equal(me.staff.role,role);assert.equal(me.permissions.edit,role==='backoffice');assert.equal(me.permissions.proposals,false);
  }
});

test('dashboard alias uses the same signed identity, active staff and role checks',async()=>{
  const {env,sqlite}=setup();env.ACCESS_REQUIRE_MFA='cloudflare';
  const request=(token?:string)=>new Request('http://localhost:8788/dashboard/api/me',{headers:token?{'Cf-Access-Jwt-Assertion':token}:{}});
  assert.equal((await onRequest({env,request:request()})).status,401);
  assert.equal((await onRequest({env,request:request('forged')})).status,401);
  assert.equal((await onRequest({env,request:request(await auth.token(undefined,false,{aud:'wrong'}))})).status,401);
  assert.equal((await onRequest({env,request:request(await auth.token(undefined,false))})).status,200);
  sqlite.prepare('UPDATE staff_users SET enabled=0').run();
  assert.equal((await onRequest({env,request:request(await auth.token(undefined,false))})).status,403);
});

test('incoming message text is captured when attachment storage is unavailable',async()=>{
 const {env,sqlite}=setup();const e=await captureEnquiry(env,client);const event=JSON.stringify({type:'email.received',data:{email_id:'no-storage'}}),eventId='no-storage-event',now=new Date();const original=globalThis.fetch;
 globalThis.fetch=async(_url,init)=>{assert.equal(new Headers(init?.headers).get('Authorization'),'Bearer test-receiving');return Response.json({id:'no-storage',from:client.email,to:[`${e.reference}@replies.example.invalid`],subject:'Reply',text:'Customer reply with attachment',created_at:now.toISOString(),attachments:[{id:'file-1',filename:'plan.pdf',size:20,content_type:'application/pdf'}]})};
 try{const result=await webhook({env,request:new Request('https://preview.invalid/api/webhooks/resend',{method:'POST',body:event,headers:{'svix-id':eventId,'svix-timestamp':String(Math.floor(now.getTime()/1000)),'svix-signature':new Webhook(env.RESEND_WEBHOOK_SECRET!).sign(eventId,now,event)}})});assert.equal(result.status,200);assert.equal(sqlite.prepare("SELECT body FROM activities WHERE provider_id='no-storage'").get()!.body,'Customer reply with attachment');assert.match(String(sqlite.prepare('SELECT filename FROM attachments').get()!.filename),/Download unavailable/)}finally{globalThis.fetch=original}
});

test('flight sample persists on enquiry, can be removed, and requires proposal editor',async()=>{
 const {env,sqlite}=setup();const e=await captureEnquiry(env,client);
 assert.equal((await call(env,`api/enquiries/${e.id}/flights-search`,{sample:true})).status,200);
 assert.equal((await call(env,`api/enquiries/${e.id}/flights-save`,{offerId:'sample'})).status,200);
 let requirements=JSON.parse(String(sqlite.prepare('SELECT requirements_json FROM enquiries WHERE id=?').get(e.id)!.requirements_json));assert.equal(requirements.flightItinerary.source,'sample');
 assert.equal((await call(env,`api/enquiries/${e.id}/flights-save`,{offerId:'sample',proposalId:'unrelated'})).status,409);
 sqlite.prepare("UPDATE staff_users SET access_role='backoffice' WHERE email=?").run('staff@example.invalid');
 assert.equal((await call(env,`api/enquiries/${e.id}/flights-search`,{sample:true},'staff@example.invalid')).status,403);
 assert.equal((await call(env,`api/enquiries/${e.id}/flights-remove`,{})).status,200);
 requirements=JSON.parse(String(sqlite.prepare('SELECT requirements_json FROM enquiries WHERE id=?').get(e.id)!.requirements_json));assert.equal(requirements.flightItinerary,undefined);
});
