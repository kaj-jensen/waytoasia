/** Synthetic loopback fixtures; does not read or write production proposals. */
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {renderProposalPage} from '../functions/_lib/proposals';
import {payload,row} from './proposal-fixture';
createServer((req,res)=>{
 const url=new URL(req.url||'/','http://127.0.0.1:8790');
 if(url.pathname.startsWith('/images/proposals/')||['/proposal.css','/proposal.js'].includes(url.pathname)){
  if(!/^\/(?:proposal\.(css|js)|images\/proposals\/[a-z0-9-]+\.jpg)$/.test(url.pathname)){res.writeHead(404);res.end();return;}
  try{res.setHeader('Content-Type',url.pathname.endsWith('css')?'text/css':url.pathname.endsWith('js')?'application/javascript':'image/jpeg');res.end(readFileSync(`public${url.pathname}`));}catch{res.writeHead(404);res.end();}return;
 }
 if(req.method==='POST'){res.writeHead(303,{Location:`/?response=${url.searchParams.get('response')||'approved'}`});res.end();return;}
 const variant=url.searchParams.get('variant'),p=structuredClone(payload);const r={...row,locale:url.searchParams.get('locale')||'sv'};
 if(variant==='japan'){p.profile.destinations=['japan'];p.suggestion.route=['Tokyo','Hakone','Kyoto'].map((place,i)=>({place:`Japan: ${place}`,nights:[3,1,3][i]}));p.suggestion.hotelStays=[];r.title='Japan map preview';}
 if(variant==='missing'){p.suggestion.route=[{place:'Unresolved region',days:'Day 1–2',plan:'Ask the consultant to confirm.'}];}
 if(variant==='return'){p.suggestion.route=[{place:'Japan: Tokyo'},{place:'Japan: Kyoto'},{place:'Japan: Tokyo'}];p.profile.destinations=['japan'];r.title='A return journey through Japan';}
 r.payload_json=JSON.stringify(p);res.setHeader('Content-Type','text/html');res.end(renderProposalPage(r,'A'.repeat(43),url.searchParams.get('response')||''));
}).listen(8790,'127.0.0.1',()=>console.log('Proposal preview: http://127.0.0.1:8790'));
