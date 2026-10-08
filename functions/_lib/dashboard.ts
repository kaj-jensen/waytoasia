import {customerApprovedStatus} from './enquiry-status';
import type {D1Database, R2Bucket, D1PreparedStatement} from '@cloudflare/workers-types';
import {createRemoteJWKSet, importJWK, jwtVerify, type JWK} from 'jose';
import {clean, escapeHtml} from './proposals';
export interface DashboardEnv {
  CUSTOMER_RECORDS_KEY?: string;
  DUFFEL_TEST_TOKEN?: string;
  PROPOSALS_DB: D1Database;
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
  ACCESS_REQUIRE_MFA?: string;
  LOCAL_ACCESS_JWK?: string;
  DASHBOARD_CAPTURE?: string;
  RESEND_API_KEY?: string;
  RESEND_RECEIVING_API_KEY?: string;
  RESEND_WEBHOOK_SECRET?: string;
  REPLY_DOMAIN?: string;
  EMAIL_SEND_ENABLED?: string;
  PRIVATE_ATTACHMENTS?: R2Bucket;
}
export interface Staff {email:string; name:string; role:'admin'|'staff'|'backoffice'|'finance'|'viewer'; enabled:number}
export const statuses=['New','In progress','Awaiting client','Proposal sent',customerApprovedStatus,'Confirmed','Closed'];
export const json=(data:unknown,status=200)=>Response.json(data,{status,headers:privateHeaders()});
export function privateHeaders():Record<string,string>{return {'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow, noarchive','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; style-src 'self'; script-src 'self'; connect-src 'self'; img-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"}}
const keysets=new Map<string,ReturnType<typeof createRemoteJWKSet>>();
function signInRequired(request:Request):Response{
 const message='Your dashboard session could not be verified. Please sign in again.';
 if(!request.headers.get('Accept')?.includes('text/html'))return json({error:message},401);
 return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Sign in again · Way to Asia</title><link rel="stylesheet" href="/staff.css"></head><body><main><section class="panel"><h1>Sign in again</h1><p>${message}</p><p><a class="button primary" href="/cdn-cgi/access/logout">Reset sign-in session</a></p><p>After resetting, <a href="/dashboard">return to the dashboard</a> and sign in with your authorised email address.</p></section></main></body></html>`,{status:401,headers:{...privateHeaders(),'Content-Type':'text/html; charset=utf-8'}});
}
export async function authenticate(request:Request,env:DashboardEnv):Promise<Staff>{
  const token=request.headers.get('Cf-Access-Jwt-Assertion');
  if(!token||!env.ACCESS_TEAM_DOMAIN||!env.ACCESS_AUD)throw signInRequired(request);
  let email:string;
  try{
    const issuer=`https://${env.ACCESS_TEAM_DOMAIN}`;
    let keys=keysets.get(issuer);
    if(!keys){keys=createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));keysets.set(issuer,keys)}
    const local=['localhost','127.0.0.1'].includes(new URL(request.url).hostname)&&env.LOCAL_ACCESS_JWK;
    const {payload}=await jwtVerify(token,local?await importJWK(JSON.parse(env.LOCAL_ACCESS_JWK!) as JWK,'RS256'):keys,{issuer,audience:env.ACCESS_AUD,algorithms:['RS256'],maxTokenAge:'1h'});
    // Independent MFA is enforced by the dedicated Access application before issuance.
    // IdP MFA mode additionally checks its signed authentication-method claim.
    if((!['false','cloudflare'].includes(env.ACCESS_REQUIRE_MFA||'')&&(!Array.isArray(payload.amr)||!payload.amr.includes('mfa')))||typeof payload.email!=='string')throw new Error('MFA required');
    email=payload.email.toLowerCase();
  }catch(error){
    const code=error&&typeof error==='object'&&'code' in error?String(error.code):'VERIFICATION_FAILED';
    console.warn('Dashboard authentication failed',/^[A-Z_]+$/.test(code)?code:'VERIFICATION_FAILED');
    throw signInRequired(request);
  }
  const staff=await env.PROPOSALS_DB.prepare('SELECT email,name,COALESCE(access_role,role) role,enabled FROM staff_users WHERE email=? AND enabled=1').bind(email).first<Staff>();
  if(!staff)throw new Response('Staff access denied.',{status:403,headers:privateHeaders()});
  return staff;
}
export function requireAdmin(staff:Staff){if(staff.role!=='admin')throw new Response('Administrator access required.',{status:403,headers:privateHeaders()})}
export function auditStatement(env:DashboardEnv,actor:string,action:string,target:string){return env.PROPOSALS_DB.prepare('INSERT INTO audit_log VALUES (?,?,?,?,?)').bind(crypto.randomUUID(),actor,action,target,new Date().toISOString())}
export async function audit(env:DashboardEnv,actor:string,action:string,target:string){await auditStatement(env,actor,action,target).run()}
export function activityStatement(env:DashboardEnv,enquiry:string,kind:string,body:string,actor:string,unread=false){return env.PROPOSALS_DB.prepare('INSERT INTO activities (id,enquiry_id,kind,actor,body,created_at,unread) VALUES (?,?,?,?,?,?,?)').bind(crypto.randomUUID(),enquiry,kind,actor,body,new Date().toISOString(),unread?1:0)}
export interface Capture {name:string;email:string;phone?:string;source:string;message:string;requirements:Record<string,unknown>}
export async function captureEnquiry(env:DashboardEnv,input:Capture,extra?:{id:string;title:string;url:string;snapshot:string},initial?:D1PreparedStatement):Promise<{id:string;reference:string}>{
  const id=crypto.randomUUID(),client=crypto.randomUUID(),now=new Date().toISOString();
  const reference=`WTA-${now.slice(0,10).replaceAll('-','')}-${id.replaceAll('-','').slice(0,12).toUpperCase()}`;
  const email=input.email.toLowerCase().trim();
  const statements=[
    ...(initial?[initial]:[]),
    env.PROPOSALS_DB.prepare('INSERT INTO clients (id,email,name,phone,created_at) VALUES (?,?,?,?,?) ON CONFLICT(email) DO NOTHING').bind(client,email,input.name,input.phone||'',now),
    env.PROPOSALS_DB.prepare('INSERT INTO enquiries (id,reference,client_id,source,requirements_json,original_message,created_at,updated_at) SELECT ?,?,id,?,?,?,?,? FROM clients WHERE email=?').bind(id,reference,input.source,JSON.stringify(input.requirements),input.message,now,now,email),
    activityStatement(env,id,'incoming',input.message,email),auditStatement(env,email,'enquiry.created',id),
  ];
  if(extra)statements.push(env.PROPOSALS_DB.prepare("INSERT INTO enquiry_proposals (id,enquiry_id,legacy_id,title,url,version,status,snapshot_json,created_at) VALUES (?,?,?,?,?,1,'Draft',?,?)").bind(crypto.randomUUID(),id,extra.id,extra.title,extra.url,extra.snapshot,now));
  await env.PROPOSALS_DB.batch(statements);
  return {id,reference};
}
export function safeUrl(value:unknown):string{
  const url=new URL(clean(value,2000));
  if(url.protocol!=='https:'||url.username||url.password)throw new Error('Proposal URL must use HTTPS.');
  return url.toString();
}
export const html=escapeHtml;

/** Bound streamed requests/downloads even when Content-Length is absent or untrusted. */
export async function readBytes(message:Request|Response,maximum:number):Promise<Uint8Array<ArrayBuffer>>{
  const reader=message.body?.getReader();if(!reader)return new Uint8Array(0);
  const chunks:Uint8Array[]= [];let size=0;
  try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maximum){await reader.cancel();throw json({error:'Content exceeds the allowed size'},413)}chunks.push(value)}}finally{reader.releaseLock()}
  const output=new Uint8Array(size);let offset=0;for(const chunk of chunks){output.set(chunk,offset);offset+=chunk.byteLength}return output;
}

export function permissions(staff:Staff){return {edit:['admin','staff','backoffice'].includes(staff.role),proposals:['admin','staff'].includes(staff.role),admin:staff.role==='admin'}}
export function requireEditor(staff:Staff){if(!permissions(staff).edit)throw json({error:'This role has read-only access.'},403)}
export function requireProposalEditor(staff:Staff){if(!permissions(staff).proposals)throw json({error:'Sales or administrator access required for proposals.'},403)}
