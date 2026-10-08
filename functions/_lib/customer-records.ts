import {auditStatement,json,requireAdmin,type DashboardEnv,type Staff} from './dashboard';
const encoder=new TextEncoder();
function bad(message:string,status=400):never{throw json({error:message},status)}
const bytes=(value:string)=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
const base64=(value:Uint8Array)=>btoa(String.fromCharCode(...value));
async function key(env:DashboardEnv){
 try{const raw=bytes(env.CUSTOMER_RECORDS_KEY||'');if(raw.length!==32)throw Error('Invalid key');return await crypto.subtle.importKey('raw',raw,'AES-GCM',false,['encrypt','decrypt'])}
 catch{bad('Protected records are locked: encryption is not configured.',503)}
}
export async function sealCustomerRecord(env:DashboardEnv,id:string,value:unknown){
 const k=await key(env),iv=crypto.getRandomValues(new Uint8Array(12));
 const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode('wta-customer:v1:'+id)},k,encoder.encode(JSON.stringify(value)));
 return JSON.stringify({v:1,iv:base64(iv),data:base64(new Uint8Array(ciphertext))});
}
export async function openCustomerRecord(env:DashboardEnv,id:string,value:string){
 const k=await key(env);
 try{const data=JSON.parse(value);if(data.v!==1)throw Error('Unknown version');const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(data.iv),additionalData:encoder.encode('wta-customer:v1:'+id)},k,bytes(data.data));return JSON.parse(new TextDecoder().decode(plain))}
 catch{bad('Protected record could not be authenticated. No personal data was returned.',503)}
}
export interface CustomerRecord {contact:{name:string;email:string;phone:string;address:string;postalCode:string;city:string;country:string};passengers:{name:string;dateOfBirth:string;nationality:string}[]}
const text=(v:unknown,max:number)=>{if(typeof v!=='string'||v.length>max||[...v].some(c=>c.charCodeAt(0)<32&&![9,10,13].includes(c.charCodeAt(0))))bad('Invalid customer field.');return v.trim()};
export function validateCustomerRecord(input:Record<string,unknown>):CustomerRecord{
 const c=input.contact;if(!c||typeof c!=='object'||Array.isArray(c))bad('Contact details are required.');
 const contact=Object.fromEntries(Object.entries({name:160,email:240,phone:80,address:500,postalCode:30,city:120,country:80}).map(([k,n])=>[k,text((c as Record<string,unknown>)[k]??'',n)])) as CustomerRecord['contact'];
 if(!contact.name)bad('Enter the customer name.');if(contact.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email))bad('Enter a valid contact email.');
 if(!Array.isArray(input.passengers)||input.passengers.length>12)bad('A maximum of 12 passengers is supported.');
 const passengers=input.passengers.map(p=>{if(!p||typeof p!=='object'||Array.isArray(p))bad('Invalid passenger.');const name=text(p.name??'',160),dateOfBirth=text(p.dateOfBirth??'',10),nationality=text(p.nationality??'',80);if(!name)bad('Enter each passenger’s full name.');if(dateOfBirth&&(!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)||!Number.isFinite(Date.parse(dateOfBirth))||new Date(dateOfBirth).toISOString().slice(0,10)!==dateOfBirth||dateOfBirth>new Date().toISOString().slice(0,10)))bad('Enter a valid passenger birth date.');return {name,dateOfBirth,nationality}});
 return {contact,passengers};
}
async function authorised(env:DashboardEnv,id:string,staff:Staff){
 const row=await env.PROPOSALS_DB.prepare('SELECT e.id,e.client_id,e.assigned_to,c.name,c.email,c.phone FROM enquiries e JOIN clients c ON c.id=e.client_id WHERE e.id=?').bind(id).first<{id:string;client_id:string;assigned_to:string;name:string;email:string;phone:string}>();
 if(!row)bad('Enquiry not found.',404);
 if(!['admin','staff','backoffice'].includes(staff.role))bad('Only administrators, sales and back-office can access passenger records.',403);
 return row;
}
export async function customerRecordsGet(path:string,env:DashboardEnv,staff:Staff):Promise<Response|null>{
 const match=path.match(/^api\/enquiries\/([^/]+)\/customer-records$/);if(!match)return null;
 const row=await authorised(env,match[1],staff);await key(env);
 const saved=await env.PROPOSALS_DB.prepare('SELECT * FROM customer_records WHERE enquiry_id=?').bind(row.id).first<{ciphertext:string;revision:number;updated_at:string}>();
 const record=saved?await openCustomerRecord(env,row.id,saved.ciphertext):{contact:{name:row.name,email:row.email,phone:row.phone,address:'',postalCode:'',city:'',country:''},passengers:[]};
 await env.PROPOSALS_DB.batch([auditStatement(env,staff.email,'customer_records.viewed',row.id)]);
 return json({record,revision:saved?.revision||0,updatedAt:saved?.updated_at||'',canAnonymize:staff.role==='admin',removed:row.email.endsWith('@anonymized.invalid')});
}
export async function customerRecordsPost(path:string,input:Record<string,unknown>,env:DashboardEnv,staff:Staff):Promise<Response|null>{
 const match=path.match(/^api\/enquiries\/([^/]+)\/(customer-records|anonymize-customer)$/);if(!match)return null;
 const row=await authorised(env,match[1],staff);
 if(match[2]==='anonymize-customer'){
  requireAdmin(staff);if(input.confirm!=='REMOVE CUSTOMER IDENTITY')bad('Type REMOVE CUSTOMER IDENTITY to confirm.');
  return removeCustomerIdentity(env,row.client_id,staff);
 }
 if(row.email.endsWith('@anonymized.invalid'))bad('Identity has been removed. Create a new enquiry for a new customer relationship.',409);
 const record=validateCustomerRecord(input),ciphertext=await sealCustomerRecord(env,row.id,record),revision=input.revision;
 if(!Number.isSafeInteger(revision)||Number(revision)<0)bad('A valid record revision is required.');
 const now=new Date().toISOString(),db=env.PROPOSALS_DB;
 // Atomic optimistic lock: the audit is committed only for the winning write.
 const result=await db.batch([
 db.prepare(`INSERT INTO customer_records (enquiry_id,ciphertext,revision,updated_at,updated_by) SELECT ?,?,1,?,? WHERE (?=0 OR EXISTS (SELECT 1 FROM customer_records WHERE enquiry_id=? AND revision=?)) AND EXISTS (SELECT 1 FROM enquiries e JOIN clients c ON c.id=e.client_id WHERE e.id=? AND c.email NOT LIKE '%@anonymized.invalid') ON CONFLICT(enquiry_id) DO UPDATE SET ciphertext=excluded.ciphertext,revision=customer_records.revision+1,updated_at=excluded.updated_at,updated_by=excluded.updated_by WHERE customer_records.revision=?`).bind(row.id,ciphertext,now,staff.email,revision,row.id,revision,row.id,revision),
 db.prepare('INSERT INTO audit_log SELECT ?,?,?,?,? WHERE changes()=1').bind(crypto.randomUUID(),staff.email,'customer_records.saved',row.id,now)]);
 if(result[0].meta.changes!==1)bad('This record changed in another session. Reopen it before saving.',409);
 return json({ok:true,revision:Number(revision)+1,updatedAt:now});
}
async function removeCustomerIdentity(env:DashboardEnv,clientId:string,staff:Staff){
 const db=env.PROPOSALS_DB,now=new Date().toISOString();
 const client=await db.prepare('SELECT email FROM clients WHERE id=?').bind(clientId).first<{email:string}>();
 const files=await db.prepare('SELECT id FROM enquiries WHERE client_id=?').bind(clientId).all<{id:string}>();
 const linked=await db.prepare('SELECT p.id legacy_id FROM proposals p WHERE p.traveller_email=? OR EXISTS (SELECT 1 FROM enquiry_proposals ep JOIN enquiries e ON e.id=ep.enquiry_id WHERE ep.legacy_id=p.id AND e.client_id=?)').bind(client?.email||'',clientId).all<{legacy_id:string}>();
 for(const p of linked.results){const shared=await db.prepare('SELECT 1 FROM enquiry_proposals ep JOIN enquiries e ON e.id=ep.enquiry_id WHERE ep.legacy_id=? AND e.client_id<>? LIMIT 1').bind(p.legacy_id,clientId).first();if(shared)bad('A proposal is shared with another customer. Resolve the shared record before removing identity.',409)}
 const attachments=await db.prepare("SELECT t.object_key FROM attachments t JOIN activities a ON a.id=t.activity_id LEFT JOIN enquiries e ON e.id=a.enquiry_id WHERE (e.client_id=? OR (a.enquiry_id IS NULL AND a.sender=?)) AND t.object_key NOT LIKE 'blocked/%'").bind(clientId,client?.email||'').all<{object_key:string}>();
 if(attachments.results.length&&!env.PRIVATE_ATTACHMENTS)bad('Attachment storage unavailable. Identity removal has not completed.',503);
 for(const file of attachments.results)await env.PRIVATE_ATTACHMENTS!.delete(file.object_key);
 const operations=[db.prepare('INSERT OR IGNORE INTO message_tombstones SELECT provider_id,? FROM activities WHERE enquiry_id IS NULL AND sender=? AND provider_id IS NOT NULL').bind(now,client?.email||''),db.prepare('DELETE FROM activities WHERE enquiry_id IS NULL AND sender=?').bind(client?.email||'')];
 for(const file of files.results){
  operations.push(db.prepare('INSERT OR IGNORE INTO message_tombstones SELECT provider_id,? FROM activities WHERE enquiry_id=? AND provider_id IS NOT NULL').bind(now,file.id),
   db.prepare('DELETE FROM customer_records WHERE enquiry_id=?').bind(file.id),db.prepare('DELETE FROM activities WHERE enquiry_id=?').bind(file.id),db.prepare('DELETE FROM enquiry_proposals WHERE enquiry_id=?').bind(file.id),
   db.prepare("UPDATE enquiries SET requirements_json='{}',original_message='',source='Identity removed',status='Closed',follow_up=NULL,customer_approved_at=NULL,updated_at=? WHERE id=?").bind(now,file.id),
   db.prepare("UPDATE finance_items SET description='Retained financial item',supplier='',travel_item_id='',source_key=NULL,notes='' WHERE enquiry_id=?").bind(file.id),
   db.prepare("UPDATE finance_payments SET reference='',notes='' WHERE enquiry_id=?").bind(file.id),
   // Historical amounts remain, but narrative copies of customer data are removed.
   db.prepare("UPDATE finance_history SET snapshot_json=json_remove(snapshot_json,'$.items','$.payments') WHERE enquiry_id=?").bind(file.id));
 }
 for(const p of linked.results)operations.push(db.prepare('DELETE FROM proposals WHERE id=? AND NOT EXISTS (SELECT 1 FROM enquiry_proposals WHERE legacy_id=?)').bind(p.legacy_id,p.legacy_id));
 operations.push(db.prepare("UPDATE clients SET name='Customer identity removed',email=?,phone='' WHERE id=?").bind(clientId+'@anonymized.invalid',clientId),db.prepare("UPDATE audit_log SET actor='Customer identity removed' WHERE actor=?").bind(client?.email||''),auditStatement(env,staff.email,'customer.identity_removed',clientId));
 await db.batch(operations);
 return json({ok:true,files:files.results.length,notice:'Identity removed from active customer files. Financial amounts retained. Email-provider copies, backups and external exports require separate retention handling.'});
}
