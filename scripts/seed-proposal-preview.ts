/** Produces SQL for the named isolated preview DB only; never runs against production. */
import {writeFileSync} from 'node:fs';
import {row,payload} from './proposal-fixture';
import {randomToken,hashToken} from '../functions/_lib/proposals';
const token=randomToken(),manage=randomToken();
const values={...row,id:'proposal-brochure-synthetic-v1',token_hash:await hashToken(token),manage_token_hash:await hashToken(manage),payload_json:JSON.stringify(payload)};
const quote=(s:unknown)=>s===null?'NULL':`'${String(s).replace(/'/g,"''")}'`;
writeFileSync('/tmp/waytoasia-proposal-preview.sql',`INSERT OR IGNORE INTO proposals (${Object.keys(values).join(',')}) VALUES (${Object.values(values).map(quote).join(',')});`);
writeFileSync('/tmp/waytoasia-proposal-preview-token.txt',token,{mode:0o600});
console.log('Synthetic preview SQL prepared; token stored separately. Target: waytoasia-control-panel-preview only.');
