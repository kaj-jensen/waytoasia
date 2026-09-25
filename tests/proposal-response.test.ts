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
