import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequestPost} from '../functions/api/proposals/[token]/response';
import type {ProposalEnv,ProposalRow} from '../functions/_lib/proposals';

const token='A'.repeat(43);
const row:ProposalRow={id:'proposal-1',token_hash:'hash',manage_token_hash:'manage-hash',traveller_name:'Test Traveller',traveller_email:'test@example.com',locale:'en',title:'Japan in spring',summary:'A considered route.',estimated_price:'',consultant_note:'',payload_json:'{}',status:'ready',traveller_response:'',created_at:'2026-09-25T08:00:00.000Z',updated_at:'2026-09-25T09:00:00.000Z',expires_at:'2027-11-24T08:00:00.000Z',revoked_at:null};

function context(origin:string,action='change',note='Please add another night in Kyoto'){
  let update:unknown[]|null=null;
  const db={prepare(sql:string){return {bind(...values:unknown[]){return {first:async()=>row,run:async()=>{if(sql.startsWith('UPDATE'))update=values;return {success:true}}}}}}};
  const request=new Request(`https://proposal.waytoasia.com/api/proposals/${token}/response`,{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({action,note})});
  return {context:{params:{token},env:{PROPOSALS_DB:db} as unknown as ProposalEnv,request},updated:()=>update};
}

test('an opaque browser origin can save a proposal response without throwing',async()=>{
  const fixture=context('null');
  const response=await onRequestPost(fixture.context);
  assert.equal(response.status,303);
  assert.equal(response.headers.get('location'),`https://proposal.waytoasia.com/proposal/${token}?response=changes`);
  assert.deepEqual(fixture.updated()?.slice(0,2),['changes_requested','Please add another night in Kyoto']);
});

test('a genuine foreign origin is rejected before the proposal changes',async()=>{
  const fixture=context('https://example.com');
  const response=await onRequestPost(fixture.context);
  assert.equal(response.status,403);
  assert.equal(fixture.updated(),null);
});

test('an unexpected storage error becomes a controlled response instead of a Worker exception',async()=>{
  const db={prepare(){throw new Error('temporary storage failure')}};
  const request=new Request(`https://proposal.waytoasia.com/api/proposals/${token}/response`,{method:'POST',headers:{Accept:'text/html',Origin:'null','Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({action:'change',note:'Please change this'})});
  const response=await onRequestPost({params:{token},env:{PROPOSALS_DB:db} as unknown as ProposalEnv,request});
  assert.equal(response.status,500);
  assert.match(await response.text(),/Your response was not saved/);
});

test('identical retry is acknowledged without a second update',async()=>{
  const original={...row};
  try{row.status='changes_requested';row.traveller_response='Please add another night in Kyoto';const fixture=context('null');assert.equal((await onRequestPost(fixture.context)).status,303);assert.equal(fixture.updated(),null);}finally{Object.assign(row,original)}
});

test('concurrent stale update sends no notification and is acknowledged',async()=>{
 let mails=0;const oldFetch=globalThis.fetch;
 globalThis.fetch=async()=>{mails++;return new Response('{}')};
 try{
  const db={prepare(){return{bind(){return{first:async()=>row,run:async()=>({success:true,meta:{changes:0}})}}}}};
  const request=new Request(`https://proposal.waytoasia.com/api/proposals/${token}/response`,{method:'POST',headers:{Origin:'null','Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({action:'approve',note:''})});
  const response=await onRequestPost({params:{token},env:{PROPOSALS_DB:db,RESEND_API_KEY:'test-only',LEAD_TO_EMAIL:'test@example.invalid'} as unknown as ProposalEnv,request});assert.equal(response.status,409);assert.equal(mails,0);
 }finally{globalThis.fetch=oldFetch}
});

test('customer approval atomically updates the active enquiry and notifies its assigned consultant',async()=>{
 const statements:Array<{sql:string;values:unknown[]}>=[];let sent:Record<string,unknown>|undefined;
 const db={prepare(sql:string){return {bind(...values:unknown[]){const statement={sql,values,first:async()=>sql.startsWith('SELECT ep.')?{enquiry_id:'enquiry-1',assigned_email:'agent@example.invalid'}:row};return statement}}},async batch(items:Array<{sql:string;values:unknown[]}>){statements.push(...items);return items.map(()=>({meta:{changes:1}}))}};
 const oldFetch=globalThis.fetch;globalThis.fetch=async(_url,init)=>{sent=JSON.parse(String(init?.body));return Response.json({id:'test-mail'})};
 try{
 const request=new Request(`https://proposal.waytoasia.com/api/proposals/${token}/response`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'approve'})});
 const response=await onRequestPost({params:{token},env:{PROPOSALS_DB:db,DASHBOARD_CAPTURE:'true',RESEND_API_KEY:'test',LEAD_TO_EMAIL:'fallback@example.invalid'} as unknown as ProposalEnv,request});
 assert.equal(response.status,303);const update=statements.find(s=>s.sql.startsWith('UPDATE enquiries '))!;
 assert.match(String(update.values[0]),/^\d{4}-/);assert.match(update.sql,/NOT IN \('Confirmed','Closed'\)/);assert.match(update.sql,/MAX\(version\)/);assert.match(update.sql,/response_receipt/);
 assert.deepEqual(sent?.to,['agent@example.invalid']);assert.match(String(sent?.text),/awaiting confirmation/);
 }finally{globalThis.fetch=oldFetch}
});
