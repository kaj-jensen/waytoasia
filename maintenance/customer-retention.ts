import type {D1Database} from '@cloudflare/workers-types';
export interface RetentionEnv {PROPOSALS_DB:D1Database}
export async function expireCustomerRecords(env:RetentionEnv,now=new Date().toISOString()){
 const result=await env.PROPOSALS_DB.prepare('DELETE FROM customer_records WHERE retention_until IS NOT NULL AND retention_until<=?').bind(now).run();
 return result.meta.changes;
}
export default {async scheduled(_event:unknown,env:RetentionEnv){const count=await expireCustomerRecords(env);console.log('Expired protected records removed:',count)},fetch(){return new Response('Not found',{status:404})}};
