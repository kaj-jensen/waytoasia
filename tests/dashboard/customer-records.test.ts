import test from 'node:test';
import assert from 'node:assert/strict';
import {database,identity} from './support';
import {captureEnquiry,type DashboardEnv} from '../../functions/_lib/dashboard';
import {onRequest} from '../../functions/staff/[[path]]';
import {sealCustomerRecord,openCustomerRecord} from '../../functions/_lib/customer-records';
const auth=await identity(),secret=Buffer.alloc(32,9).toString('base64');
async function setup(){const {adapter,sqlite}=database();const env:DashboardEnv={PROPOSALS_DB:adapter,CUSTOMER_RECORDS_KEY:secret,ACCESS_TEAM_DOMAIN:'preview.invalid',ACCESS_AUD:'local-preview',LOCAL_ACCESS_JWK:JSON.stringify(auth.publicJwk)};for(const role of ['admin','staff','backoffice','finance','viewer'])sqlite.prepare('INSERT INTO staff_users (email,name,role,access_role,enabled,created_at) VALUES (?,?,?,?,1,?)').run(role+'@example.invalid',role,role==='admin'?'admin':'staff',role,new Date().toISOString());const e=await captureEnquiry(env,{name:'Synthetic customer',email:'person@example.invalid',source:'Test',message:'Private original message',requirements:{name:'Synthetic customer'}});return {env,sqlite,id:e.id}}
async function call(env:DashboardEnv,id:string,body?:unknown,role='admin',action='customer-records'){return onRequest({env,request:new Request(`http://localhost:8788/dashboard/api/enquiries/${id}/${action}`,{method:body?'POST':'GET',headers:{'Cf-Access-Jwt-Assertion':await auth.token(role+'@example.invalid'),Origin:'http://localhost:8788','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined})})}
const record={contact:{name:'Sensitive Person',email:'private@example.invalid',phone:'+4512345678',address:'Secret Street 12',postalCode:'1000',city:'Copenhagen',country:'Denmark'},passengers:[{name:'Private Child',dateOfBirth:'2014-01-02',nationality:'Danish'}]};
test('AES-GCM is randomized, authenticated, bound to the enquiry and fails closed',async()=>{
 const {env,id}=await setup(),a=await sealCustomerRecord(env,id,record),b=await sealCustomerRecord(env,id,record);assert.notEqual(a,b);assert.ok(!a.includes('Sensitive'));assert.deepEqual(await openCustomerRecord(env,id,a),record);
 await assert.rejects(()=>openCustomerRecord(env,'another-id',a));const altered=JSON.parse(a);altered.data=(altered.data[0]==='A'?'B':'A')+altered.data.slice(1);await assert.rejects(()=>openCustomerRecord(env,id,JSON.stringify(altered)));await assert.rejects(()=>sealCustomerRecord({...env,CUSTOMER_RECORDS_KEY:undefined},id,record));
});
test('authorized saves persist only ciphertext, reject stale writes, audit access without PII and export securely',async()=>{
 const {env,sqlite,id}=await setup();for(const role of ['finance','viewer']){assert.equal((await call(env,id,undefined,role)).status,403);assert.equal((await call(env,id,{revision:0,...record},role)).status,403)}
 assert.equal((await call({...env,CUSTOMER_RECORDS_KEY:undefined},id)).status,503);
 for(const role of ['admin','staff','backoffice'])assert.equal((await call(env,id,undefined,role)).status,200);
 let response=await call(env,id,{revision:0,...record},'staff');assert.equal(response.status,200,await response.clone().text());
 response=await call(env,id,{revision:1,...record,contact:{...record.contact,city:'Aarhus'}},'backoffice');assert.equal(response.status,200,await response.clone().text());
 assert.equal((await call(env,id,{revision:1,...record})).status,409);const saved=await(await call(env,id)).json();assert.equal(saved.revision,2);assert.equal(saved.record.contact.city,'Aarhus');
 const raw=JSON.stringify(sqlite.prepare('SELECT * FROM customer_records').all());for(const value of ['Sensitive Person','private@example.invalid','Private Child','Secret Street'])assert.ok(!raw.includes(value));
 const audit=JSON.stringify(sqlite.prepare('SELECT * FROM audit_log').all());assert.ok(!audit.includes('Private Child'));assert.ok(!audit.includes('Secret Street'));assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM audit_log WHERE action='customer_records.saved'").get()!.n,2);
 const exportResponse=await call(env,id,undefined,'admin','export-client');assert.equal(exportResponse.status,200);assert.equal((await exportResponse.json()).protectedRecords[0].record.contact.city,'Aarhus');assert.match(exportResponse.headers.get('Cache-Control')||'',/no-store/);
});
test('identity removal is administrator-only, clears active personal copies and preserves money',async()=>{
 const {env,sqlite,id}=await setup();await call(env,id,{revision:0,...record});
 const client=sqlite.prepare('SELECT client_id FROM enquiries WHERE id=?').get(id)!.client_id;
 const now=new Date().toISOString();sqlite.prepare('INSERT INTO finance_files (enquiry_id,updated_at) VALUES (?,?)').run(id,now);
 sqlite.prepare("INSERT INTO finance_items (id,enquiry_id,product_type,description,quote_json,actual_json,notes,created_at,updated_at) VALUES (?,?,'Hotels',?,?,?,?,?,?)").run('item',id,'Sensitive Person hotel',JSON.stringify({priceBase:10000,supplierCost:7000,markup:0,serviceFee:0,discount:0,commission:0,otherCost:0,paymentCost:0,costCurrency:'EUR',fxRate:'1'}),JSON.stringify({priceBase:10000,supplierCost:7000,markup:0,serviceFee:0,discount:0,commission:0,otherCost:0,paymentCost:0,costCurrency:'EUR',fxRate:'1'}),'Private Child',now,now);
 for(const role of ['staff','backoffice'])assert.equal((await call(env,id,{confirm:'REMOVE CUSTOMER IDENTITY'},role,'anonymize-customer')).status,403);
 assert.equal((await call(env,id,{confirm:'wrong'},'admin','anonymize-customer')).status,400);
 const res=await call(env,id,{confirm:'REMOVE CUSTOMER IDENTITY'},'admin','anonymize-customer');assert.equal(res.status,200,await res.clone().text());
 assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM customer_records').get()!.n,0);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM activities').get()!.n,0);assert.equal(sqlite.prepare('SELECT name FROM clients WHERE id=?').get(client)!.name,'Customer identity removed');assert.equal(sqlite.prepare('SELECT original_message FROM enquiries WHERE id=?').get(id)!.original_message,'');
 const finance=sqlite.prepare('SELECT * FROM finance_items').get()!;assert.equal(finance.notes,'');assert.equal(JSON.parse(String(finance.actual_json)).priceBase,10000);
 assert.equal((await call(env,id,{revision:0,...record})).status,409);assert.equal((await(await call(env,id)).json()).removed,true);
});

test('late replies cannot restore personal content to an identity-removed file',async()=>{
 const {env,sqlite,id}=await setup();const reference=String(sqlite.prepare('SELECT reference FROM enquiries WHERE id=?').get(id)!.reference);
 await call(env,id,{confirm:'REMOVE CUSTOMER IDENTITY'},'admin','anonymize-customer');
 const {Webhook}=await import('svix');const {onRequestPost}=await import('../../functions/api/webhooks/resend');
 env.RESEND_WEBHOOK_SECRET='whsec_'+Buffer.from('synthetic-webhook-secret').toString('base64');env.RESEND_RECEIVING_API_KEY='synthetic';
 const original=globalThis.fetch;globalThis.fetch=async()=>Response.json({id:'late-reply',from:'person@example.invalid',to:['journeys@example.invalid'],subject:reference,text:'Sensitive late reply',attachments:[],created_at:new Date().toISOString()});
 try{const event=JSON.stringify({type:'email.received',data:{email_id:'late-reply'}}),eventId='late-event',now=new Date();const res=await onRequestPost({env,request:new Request('https://example.invalid/api/webhooks/resend',{method:'POST',body:event,headers:{'svix-id':eventId,'svix-timestamp':String(Math.floor(now.getTime()/1000)),'svix-signature':new Webhook(env.RESEND_WEBHOOK_SECRET).sign(eventId,now,event)}})});assert.equal(res.status,200);assert.equal((await res.json()).suppressed,true);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM activities').get()!.n,0)}finally{globalThis.fetch=original}
});
