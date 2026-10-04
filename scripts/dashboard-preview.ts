/** Loopback-only preview with synthetic fixtures; never deploy this Node server. */
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {database,identity} from '../tests/dashboard/support';
import {captureEnquiry,type DashboardEnv} from '../functions/_lib/dashboard';
import {onRequest} from '../functions/staff/[[path]]';
const {adapter,sqlite}=database('.wrangler/dashboard-preview.sqlite');
const auth=await identity();
const env:DashboardEnv={PROPOSALS_DB:adapter,ACCESS_TEAM_DOMAIN:'preview.invalid',ACCESS_AUD:'local-preview',LOCAL_ACCESS_JWK:JSON.stringify(auth.publicJwk),ACCESS_REQUIRE_MFA:'false',EMAIL_SEND_ENABLED:'false'};
sqlite.prepare('INSERT OR IGNORE INTO staff_users (email,name,role,enabled,created_at) VALUES (?,?,?,?,?)').run('journeys@waytoasia.com','Preview administrator','admin',1,new Date().toISOString());
sqlite.prepare('INSERT OR IGNORE INTO staff_users (email,name,role,enabled,created_at) VALUES (?,?,?,?,?)').run('consultant@example.invalid','Demo consultant','staff',1,new Date().toISOString());
if(!sqlite.prepare('SELECT id FROM enquiries LIMIT 1').get()){
  const a=await captureEnquiry(env,{name:'Alex Morgan (demo)',email:'alex@example.invalid',phone:'+00 123 456',source:'Synthetic preview fixture',message:'We would love a two-week trip to Japan with culture, small hotels and a few days in Kyoto.',requirements:{destinations:'Tokyo, Kyoto, Hakone',dates:'April 2027',travellers:2,budget:'€9,000 total',requirements:'Vegetarian meals; relaxed pace'}});
  await captureEnquiry(env,{name:'Alex Morgan (demo)',email:'alex@example.invalid',source:'Synthetic preview fixture',message:'A separate family trip to Vietnam later in the year.',requirements:{destinations:'Vietnam',dates:'October 2027',travellers:4}});
  const b=await captureEnquiry(env,{name:'Sam Taylor (demo)',email:'sam@example.invalid',source:'Synthetic preview fixture',message:'Please help us plan a cultural journey through China.',requirements:{destinations:'China',travellers:2}});
  sqlite.prepare("UPDATE enquiries SET status='Awaiting client',assigned_to='consultant@example.invalid',follow_up='2026-10-01' WHERE id=?").run(a.id);
  sqlite.prepare("INSERT INTO enquiry_proposals (id,enquiry_id,title,url,version,status,created_at,sent_at,sent_by) VALUES (?,?,'Japan · first direction','https://proposal.waytoasia.com/demo',1,'Superseded',?,?,?)").run(crypto.randomUUID(),a.id,new Date().toISOString(),new Date().toISOString(),'consultant@example.invalid');
  sqlite.prepare("INSERT INTO enquiry_proposals (id,enquiry_id,title,url,version,status,created_at,sent_at,sent_by) VALUES (?,?,'Japan · revised journey','https://proposal.waytoasia.com/demo-revision',2,'Sent',?,?,?)").run(crypto.randomUUID(),a.id,new Date().toISOString(),new Date().toISOString(),'consultant@example.invalid');
  sqlite.prepare("INSERT INTO activities (id,enquiry_id,kind,actor,body,created_at) VALUES (?,?,'note','Demo consultant','PRIVATE DEMO NOTE: confirm vegetarian accommodation options.',?)").run(crypto.randomUUID(),a.id,new Date().toISOString());
  sqlite.prepare("INSERT INTO activities (id,enquiry_id,kind,actor,sender,subject,body,created_at,unread) VALUES (?,?,'incoming','Alex Morgan','alex@example.invalid','Re: Japan itinerary','Could we add one more night in Kyoto?',?,1)").run(crypto.randomUUID(),a.id,new Date().toISOString());
  sqlite.prepare("INSERT INTO activities (id,enquiry_id,kind,actor,sender,subject,body,created_at,unread) VALUES (?,NULL,'incoming','Demo client','unmatched@example.invalid','Travel question','This synthetic message has no confident enquiry match.',?,1)").run(crypto.randomUUID(),new Date().toISOString());
  sqlite.prepare("UPDATE enquiries SET status='In progress' WHERE id=?").run(b.id);
}
const token=await auth.token(undefined,false);
createServer(async(req,res)=>{
  try{
    const url=new URL(req.url||'/','http://127.0.0.1:8788');
    if(url.pathname==='/preview-login'){res.writeHead(303,{'Set-Cookie':`preview_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600`,Location:'/staff','Cache-Control':'no-store'});res.end();return}
    if(url.pathname==='/cdn-cgi/access/logout'){res.writeHead(303,{'Set-Cookie':'preview_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0',Location:'/staff'});res.end();return}
    if(['/staff.js','/staff.css'].includes(url.pathname)){res.writeHead(200,{'Content-Type':url.pathname.endsWith('js')?'application/javascript':'text/css'});res.end(readFileSync(`public${url.pathname}`));return}
    if(!url.pathname.startsWith('/staff')&&!url.pathname.startsWith('/dashboard')){res.writeHead(404);res.end('Local dashboard preview');return}
    const chunks:Buffer[]=[];for await(const chunk of req){chunks.push(Buffer.from(chunk));if(chunks.reduce((n,b)=>n+b.length,0)>100000){res.writeHead(413);res.end();return}}
    const headers=new Headers();for(const [key,value] of Object.entries(req.headers)){if(value)headers.set(key,Array.isArray(value)?value.join(','):value)}
    const session=req.headers.cookie?.match(/(?:^|;\s*)preview_session=([^;]+)/)?.[1];if(session)headers.set('Cf-Access-Jwt-Assertion',session);
    const response=await onRequest({env,request:new Request(url,{method:req.method,headers,body:req.method==='POST'?Buffer.concat(chunks):undefined})});
    res.writeHead(response.status,Object.fromEntries(response.headers));let output=Buffer.from(await response.arrayBuffer());
    if(response.headers.get('content-type')?.includes('text/html'))output=Buffer.from(output.toString().replace('<main>','<main><div class="panel"><strong>Local preview · synthetic data only</strong><br>Email delivery is disabled. This local session simulates the planned email-code login; it does not verify your mailbox.</div>'));
    res.end(output);
  }catch{res.writeHead(500);res.end('Preview operation failed')}
}).listen(8788,'127.0.0.1',()=>console.log('Synthetic dashboard preview: http://127.0.0.1:8788/preview-login'));
