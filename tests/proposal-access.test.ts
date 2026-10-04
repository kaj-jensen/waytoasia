import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequestGet} from '../functions/proposal/[token]';
import type {ProposalEnv,ProposalRow} from '../functions/_lib/proposals';
const token='A'.repeat(43);
const row={id:'fixture',traveller_name:'Synthetic',traveller_email:'hidden@example.invalid',locale:'en',title:'Tokyo',summary:'A private trip',estimated_price:'',consultant_note:'',payload_json:JSON.stringify({traveller:{},profile:{},suggestion:{route:[{place:'Japan: Tokyo'}]}}),status:'ready',updated_at:'2026-10-04T00:00:00Z',expires_at:'2099-01-01T00:00:00Z'} as ProposalRow;
function env(value:ProposalRow|null){return{PROPOSALS_DB:{prepare(sql:string){assert.match(sql,/revoked_at IS NULL AND expires_at > \?/);return{bind(){return{first:async()=>value}}}}}} as unknown as ProposalEnv;}
test('unavailable or expired token cannot return any map geometry',async()=>{
 const res=await onRequestGet({params:{token},env:env(null),request:new Request(`https://proposal.waytoasia.com/proposal/${token}`)});assert.equal(res.status,404);assert.doesNotMatch(await res.text(),/map-stop|hidden@example/);assert.equal(res.headers.get('Cache-Control'),'no-store');
});
test('valid private token keeps maps inside protected no-store response with strict CSP',async()=>{
 const res=await onRequestGet({params:{token},env:env(row),request:new Request(`https://proposal.waytoasia.com/proposal/${token}`)});assert.equal(res.status,200);assert.match(res.headers.get('Cache-Control')||'',/private, no-store/);assert.match(res.headers.get('Content-Security-Policy')||'',/img-src 'self'/);const html=await res.text();assert.match(html,/map-stop/);assert.doesNotMatch(html,/hidden@example/);assert.doesNotMatch(html,/https:\/\/.*\/api\/.*token/);
});
