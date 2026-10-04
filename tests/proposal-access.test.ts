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

test('real storage enforces expiry and revocation before rendering the route',async()=>{
 const {database}=await import('./dashboard/support');const {hashToken}=await import('../functions/_lib/proposals');const {adapter,sqlite}=database();
 sqlite.prepare('INSERT INTO proposals (id,token_hash,manage_token_hash,traveller_name,traveller_email,locale,title,summary,payload_json,status,created_at,updated_at,expires_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').run('expiry-test',await hashToken(token),'manage','Synthetic','fixture@example.invalid','en','Tokyo','Private',row.payload_json,'ready','2026-01-01','2026-01-01','2020-01-01');
 const context={params:{token},env:{PROPOSALS_DB:adapter} as ProposalEnv,request:new Request(`https://proposal.waytoasia.com/proposal/${token}`)};
 assert.equal((await onRequestGet(context)).status,404);
 sqlite.prepare("UPDATE proposals SET expires_at='2099-01-01',revoked_at='2026-01-01'").run();assert.equal((await onRequestGet(context)).status,404);
 sqlite.prepare('UPDATE proposals SET revoked_at=NULL').run();assert.equal((await onRequestGet(context)).status,200);sqlite.close();
});
