import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {generateKeyPair,exportJWK,SignJWT} from 'jose';
import type {DashboardEnv} from '../../functions/_lib/dashboard';
export function database(filename=':memory:'){
  const sqlite=new DatabaseSync(filename);sqlite.exec('PRAGMA foreign_keys=ON');
  for(const file of ['0001_create_proposals.sql','0002_staff_dashboard.sql']){
    if(!sqlite.prepare("SELECT name FROM sqlite_master WHERE name=?").get(file.startsWith('0001')?'proposals':'staff_users'))sqlite.exec(readFileSync(`migrations/${file}`,'utf8'));
  }
  if(!sqlite.prepare('PRAGMA table_info(staff_users)').all().some(c=>c.name==='access_role'))sqlite.exec(readFileSync('migrations/0003_staff_roles.sql','utf8'));
  if(!sqlite.prepare('PRAGMA table_info(proposals)').all().some(c=>c.name==='response_receipt'))sqlite.exec(readFileSync('migrations/0004_proposal_response_receipt.sql','utf8'));
  if(!sqlite.prepare("SELECT name FROM sqlite_master WHERE name='finance_files'").get())sqlite.exec(readFileSync('migrations/0005_enquiry_finance.sql','utf8'));
  if(!sqlite.prepare('PRAGMA table_info(enquiries)').all().some(c=>c.name==='customer_approved_at'))sqlite.exec(readFileSync('migrations/0006_customer_approval.sql','utf8'));
  if(!sqlite.prepare("SELECT name FROM sqlite_master WHERE name='customer_records'").get())sqlite.exec(readFileSync('migrations/0007_customer_records.sql','utf8'));
  if(!sqlite.prepare('PRAGMA table_info(customer_records)').all().some(c=>c.name==='retention_until'))sqlite.exec(readFileSync('migrations/0008_customer_retention.sql','utf8'));
  function prepare(sql:string){let args:unknown[]=[];const statement={bind(...values:unknown[]){args=values;return statement},async first(){return sqlite.prepare(sql).get(...args as never[])||null},async all(){return {results:sqlite.prepare(sql).all(...args as never[])}},async run(){const result=sqlite.prepare(sql).run(...args as never[]);return {success:true,meta:{changes:result.changes}}}};return statement}
  return {sqlite,adapter:{prepare,async batch(statements:{run():Promise<unknown>}[]){sqlite.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());sqlite.exec('COMMIT');return results}catch(error){sqlite.exec('ROLLBACK');throw error}}} as unknown as DashboardEnv['PROPOSALS_DB']};
}
export async function identity(){const {publicKey,privateKey}=await generateKeyPair('RS256',{extractable:true});const publicJwk=await exportJWK(publicKey);return {publicJwk,async token(email='journeys@waytoasia.com',mfa=true,options:{aud?:string;expired?:boolean}={}){return new SignJWT({email,amr:mfa?['mfa']:['otp']}).setProtectedHeader({alg:'RS256'}).setIssuer('https://preview.invalid').setAudience(options.aud||'local-preview').setIssuedAt().setExpirationTime(options.expired?'0s':'1h').sign(privateKey)}}}
