import test from 'node:test';
import assert from 'node:assert/strict';
import {database,identity} from './support';
import {captureEnquiry,type DashboardEnv} from '../../functions/_lib/dashboard';
import {onRequest} from '../../functions/staff/[[path]]';
import {normalizeComponents,calculate,minor,convert,summarize,paymentSummary,csvCell,type FinanceItem,type Payment} from '../../functions/_lib/finance-calculations';
const auth=await identity();
function setup(){const {adapter,sqlite}=database();const env:DashboardEnv={PROPOSALS_DB:adapter,ACCESS_TEAM_DOMAIN:'preview.invalid',ACCESS_AUD:'local-preview',LOCAL_ACCESS_JWK:JSON.stringify(auth.publicJwk)};for(const role of ['admin','staff','finance','backoffice','viewer'])sqlite.prepare('INSERT INTO staff_users (email,name,role,access_role,enabled,created_at) VALUES (?,?,?,?,?,?)').run(role+'@example.invalid',role,role==='admin'?'admin':'staff',role,1,new Date().toISOString());return {env,sqlite}}
async function call(env:DashboardEnv,path:string,body?:unknown,role='admin'){return onRequest({env,request:new Request('http://localhost:8788/dashboard/api/finance'+path,{method:body===undefined?'GET':'POST',headers:{'Cf-Access-Jwt-Assertion':await auth.token(role+'@example.invalid'),'Content-Type':'application/json',Origin:'http://localhost:8788'},body:body===undefined?undefined:JSON.stringify(body)})})}
async function enquiry(env:DashboardEnv){return captureEnquiry(env,{name:'Finance test',email:'finance-test@example.invalid',source:'Test',message:'Synthetic',requirements:{destinations:'Thailand'}})}
const components={priceBase:'1000',supplierCost:'800',commission:'50',markup:'100',discount:'25',serviceFee:'10',otherCost:'20',paymentCost:'15'};
const item=(status='Draft',quote=normalizeComponents(components,'EUR'),actual=quote)=>({id:'item',enquiry_id:'file',product_type:'Hotels',description:'Hotel',supplier:'Supplier',status,quote,actual,source_key:null,travel_item_id:'',notes:'',created_at:'',updated_at:''}) satisfies FinanceItem;
test('single calculation handles components, zero prices, negative margins and discounts',()=>{
 const v=calculate(normalizeComponents(components,'EUR')!,'EUR');assert.equal(v.revenue,108500);assert.equal(v.cost,78500);assert.equal(v.earnings,30000);assert.equal(v.margin,30000/108500*100);
 assert.equal(calculate(normalizeComponents({priceBase:0,supplierCost:20},'EUR')!,'EUR').margin,null);
 assert.equal(calculate(normalizeComponents({priceBase:100,supplierCost:120},'EUR')!,'EUR').earnings,-2000);
 assert.equal(calculate(normalizeComponents({priceBase:-100,supplierCost:-80},'EUR')!,'EUR').earnings,-2000);
 assert.throws(()=>normalizeComponents({priceBase:10,supplierCost:5,discount:-1},'EUR'));
 assert.throws(()=>normalizeComponents({priceBase:'',supplierCost:0},'EUR'));assert.throws(()=>normalizeComponents({priceBase:null,supplierCost:0},'EUR'));
});
test('ISO currency precision and explicit FX are respected',()=>{
 assert.equal(minor('1.01','EUR'),101);assert.equal(minor('125','JPY'),125);assert.equal(minor('1.234','KWD'),1234);assert.throws(()=>minor('1.01','JPY'));assert.throws(()=>minor('1.234','EUR'));
 assert.equal(convert(10000,'JPY','EUR','0.006'),6000);
 const c=normalizeComponents({...components,costCurrency:'USD',fxRate:'0.9'},'EUR')!;assert.equal(calculate(c,'EUR').supplierCost,72000);assert.equal(calculate(c,'EUR').commission,4500);
 assert.throws(()=>normalizeComponents({...components,costCurrency:'USD'},'EUR'));assert.throws(()=>normalizeComponents({...components,costCurrency:'XYZ'},'EUR'));
});
test('unpriced actuals never fall back to quote and cancelled actuals remain',()=>{
 const x=item('Cancelled');assert.equal(summarize([x],'EUR','quote').count,0);assert.equal(summarize([x],'EUR','actual').cost,78500);
 const s=summarize([item('Draft',x.quote,null)],'EUR','actual');assert.equal(s.revenue,0);assert.equal(s.unpriced,1);
});
test('refunds, supplier refunds, voids and overdue invoices reconcile',()=>{
 const entry=(kind:string,amount:number,due_date='',voided=0)=>({kind,file_amount_minor:amount,due_date,voided,item_id:null}) as Payment;
 const s=summarize([item()],'EUR','actual');const p=paymentSummary([entry('invoice',108500,'2026-01-01'),entry('receipt',80000),entry('refund',10000),entry('supplier_payment',50000),entry('supplier_refund',5000),entry('receipt',999999,'',1)],s,'2026-10-01');
 assert.equal(p.paid,70000);assert.equal(p.outstanding,38500);assert.equal(p.supplierPaid,45000);assert.equal(p.supplierBalance,30000);assert.equal(p.overdue,38500);assert.equal(p.status,'Partially paid');
 assert.equal(paymentSummary([entry('receipt',120000)],s).status,'Overpaid');
});
test('CSV neutralises spreadsheet formula text but retains negative numbers',()=>{
 for(const input of ['=cmd',' +formula','@test',' -cmd','\n=cmd'])assert.ok(csvCell(input).startsWith('"\''));assert.equal(csvCell(-12.5),'"-12.5"');assert.equal(csvCell('a"b'),'"a""b"');
});
test('persistent financial writes, revision conflicts, item ownership, ledger and history',async()=>{
 const {env,sqlite}=setup(),e=await enquiry(env),path='/'+e.id;
 let res=await call(env,path+'/item',{revision:0,description:'Test hotel',product_type:'Hotels',status:'Quoted',quote:components,actual:null},'finance');assert.equal(res.status,200,await res.clone().text());
 let d=await res.json();assert.equal(d.quote.revenue,108500);assert.equal(d.actual.unpriced,1);assert.equal(d.file.revision,1);assert.equal(d.history.length,1);assert.equal(d.permissions.write,true);
 res=await call(env,path+'/settings',{revision:0,currency:'EUR',status:'Accepted'});assert.equal(res.status,409);
 res=await call(env,path+'/settings',{revision:1,currency:'USD',status:'Accepted'});assert.equal(res.status,400);
 res=await call(env,path+'/item',{revision:1,id:d.items[0].id,description:'Test hotel',product_type:'Hotels',status:'Fully booked',quote:components,actual:components});assert.equal(res.status,200);
 res=await call(env,path+'/payment',{revision:2,kind:'receipt',currency:'EUR',amount:'500',date:'2026-10-07'});assert.equal(res.status,200,await res.clone().text());d=await res.json();assert.equal(d.paymentActual.paid,50000);assert.equal(d.paymentActual.outstanding,58500);
 res=await call(env,path+'/void-payment',{revision:3,id:d.payments[0].id,reason:'Duplicate bank record'});assert.equal(res.status,200);d=await res.json();assert.equal(d.paymentActual.paid,0);assert.equal(d.payments[0].voided,1);assert.equal(d.history.length,4);
 const other=await enquiry(env);res=await call(env,'/'+other.id+'/item',{revision:0,id:d.items[0].id,...components});assert.equal(res.status,404);
 res=await call(env,'/'+other.id+'/payment',{revision:0,item_id:d.items[0].id,kind:'receipt',currency:'EUR',amount:10,date:'2026-10-07'});assert.equal(res.status,400);
 const csv=await call(env,path+'/csv?basis=actual');assert.equal(csv.status,200);assert.match(await csv.text(),/INTERNAL FINANCIAL REPORT/);assert.match(csv.headers.get('Cache-Control')||'',/no-store/);
 assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM finance_history WHERE enquiry_id=?').get(e.id)!.n,4);
 const portfolio=await(await call(env,'')).json();assert.equal(portfolio.files.length,2);assert.equal(portfolio.files.find((f:{enquiry_id:string})=>f.enquiry_id===e.id).actual.revenue,108500);
 // Financial foreign keys follow the existing client deletion lifecycle.
 sqlite.prepare('DELETE FROM enquiries WHERE id=?').run(e.id);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM finance_files').get()!.n,0);
});
test('financial role permissions, auth and CSRF cannot be bypassed',async()=>{
 const {env}=setup(),e=await enquiry(env),path='/'+e.id;
 for(const role of ['admin','staff','finance','backoffice'])assert.equal((await call(env,path,undefined,role)).status,200);
 assert.equal((await call(env,path,undefined,'viewer')).status,403);
 for(const role of ['backoffice','viewer'])assert.equal((await call(env,path+'/settings',{revision:0,currency:'EUR',status:'Draft'},role)).status,403);
 assert.equal((await onRequest({env,request:new Request('http://localhost:8788/dashboard/api/finance')})).status,401);
 assert.equal((await onRequest({env,request:new Request('http://localhost:8788/dashboard/api/finance/demo',{method:'POST',headers:{'Cf-Access-Jwt-Assertion':await auth.token('admin@example.invalid'),'Content-Type':'application/json',Origin:'https://evil.invalid'},body:'{}'})})).status,403);
});
test('realistic demo is isolated, repeatable and does not send messages',async()=>{
 const {env,sqlite}=setup();let sent=0;const original=globalThis.fetch;globalThis.fetch=async()=>{sent++;throw Error('Unexpected network')};
 try{const res=await call(env,'/demo',{});assert.equal(res.status,201,await res.clone().text());const {id}=await res.json();assert.equal((await(await call(env,'/demo',{})).json()).id,id);const d=await(await call(env,'/'+id)).json();assert.equal(d.items.length,7);assert.equal(d.file.is_demo,1);assert.equal(d.actual.priced,7);assert.notEqual(d.actual.earnings,d.quote.earnings);assert.equal(d.payments.length,3);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM activities').get()!.n,0);assert.equal(sent,0)}finally{globalThis.fetch=original}
});
test('journey import creates linked unpriced items and never overwrites saved financials',async()=>{
 const {env,sqlite}=setup(),e=await enquiry(env),snapshot={traveller:{name:'Synthetic'},suggestion:{hotelStays:[{place:'Bangkok',options:[{id:'hotel-a',name:'Test hotel'}]}],dayPlans:[{day:1,options:[{id:'tour-a',name:'City tour'}]}],route:[{place:'Bangkok',onwardTravel:'Private transfer',transferOptions:[{id:'car-a',name:'Private car'}]},{place:'Ayutthaya'}]},builderChoices:{hotels:{'stay-0':'hotel-a'},days:{'day-1':'tour-a'},transfers:{'transfer-0':'car-a'},flightItinerary:{slices:[[{origin:'CPH',destination:'BKK',airline:'Test airline'}]]}}};
 sqlite.prepare("INSERT INTO enquiry_proposals (id,enquiry_id,title,url,version,status,created_at,snapshot_json) VALUES (?,?,'Test','https://example.invalid',1,'Draft',?,?)").run(crypto.randomUUID(),e.id,new Date().toISOString(),JSON.stringify(snapshot));
 const res=await call(env,'/'+e.id+'/import',{revision:0});assert.equal(res.status,200,await res.clone().text());const d=await res.json();assert.equal(d.items.length,4);assert.equal(d.actual.unpriced,4);assert.equal(d.actual.revenue,0);assert.equal(d.paymentActual.status,'Pricing incomplete');assert.ok(d.items.every((i:FinanceItem)=>i.source_key&&i.travel_item_id));
 assert.equal((await call(env,'/'+e.id+'/import',{revision:1})).status,400);assert.equal((await(await call(env,'/'+e.id)).json()).items.length,4);
});
test('catalogue enquiry prices use the selected tour and currency without inventing earnings',async()=>{
 const {env}=setup();const e=await captureEnquiry(env,{name:'Price test',email:'price@example.invalid',source:'Test',message:'Synthetic',requirements:{tour:'silk-and-courtyards',journey:'silk-and-courtyards',adults:'2',children:'0',budgetCurrency:'EUR'}});
 const d=await(await call(env,'/'+e.id)).json();assert.equal(d.tourPrice.perPerson,6600);assert.equal(d.tourPrice.partyTotal,13200);assert.equal(d.tourPrice.currency,'EUR');assert.equal(d.actual.priced,0);assert.equal(d.actual.earnings,0);assert.equal(d.items.length,0);
});
test('portfolio includes every enquiry without finance records and paginates beyond 200 files',async()=>{
 const {env,sqlite}=setup(),first=await enquiry(env),clientId=sqlite.prepare('SELECT client_id FROM enquiries WHERE id=?').get(first.id)!.client_id;
 for(let i=0;i<205;i++)sqlite.prepare('INSERT INTO enquiries (id,reference,client_id,source,requirements_json,original_message,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)').run('extra-'+String(i).padStart(3,'0'),'ALL-'+i,clientId,'Test',JSON.stringify({tour:'silk-and-courtyards',adults:2,children:0,budgetCurrency:'DKK'}),'Synthetic','2026-10-07','2026-10-07');
 const ids:string[]=[];let cursor='';do{const page=await(await call(env,cursor?'?cursor='+cursor:'')).json();for(const f of page.files){ids.push(f.enquiry_id);assert.equal(f.actual.revenue,0);if(f.enquiry_id!==first.id){assert.equal(f.source.catalogue.partyTotal,98400);assert.equal(f.currency,'DKK')}}cursor=page.nextCursor||''}while(cursor);
 assert.equal(ids.length,206);assert.equal(new Set(ids).size,206);
});

test("invalid commission identifies the amount field rather than blaming decimals",()=>{assert.throws(()=>normalizeComponents({priceBase:"550.00",supplierCost:"480.00",commission:"EUR"},"EUR"),/Supplier commission: Enter a numeric amount/)});

test('registered figures reconcile across reload, portfolio, balances, categories, CSV and revisions',async()=>{
 const {env,sqlite}=setup(),e=await enquiry(env),path='/'+e.id;
 const actual={priceBase:'550.00',markup:'50.00',serviceFee:'10.00',discount:'5.00',supplierCost:'480.00',commission:'20.00',costCurrency:'USD',fxRate:'0.9',otherCost:'6.00',paymentCost:'5.00'};
 const payload={description:'Reconciliation hotel',product_type:'Hotels',status:'Fully booked',quote:components,actual};
 let response=await call(env,path+'/item',{revision:0,...payload});assert.equal(response.status,200);let d=await response.json();const itemId=d.items[0].id;
 assert.equal(d.actual.revenue,60500);assert.equal(d.actual.cost,42500);assert.equal(d.actual.earnings,18000);assert.equal(d.actual.commission,1800);assert.equal(d.quote.revenue,108500);
 for(const [kind,amount] of [['receipt','200.00'],['supplier_payment','100.00'],['invoice','605.00']]){
  response=await call(env,path+'/payment',{revision:d.file.revision,kind,amount,currency:'EUR',date:'2026-10-07',due_date:kind==='invoice'?'2026-10-07':'',item_id:itemId});assert.equal(response.status,200);d=await response.json();
 }
 response=await call(env,path+'/item',{revision:d.file.revision,id:itemId,...payload,actual:{...actual,priceBase:'600.00'}});assert.equal(response.status,200);d=await response.json();
 const reloaded=await(await call(env,path)).json(),row=(await(await call(env,'')).json()).files.find((f:{enquiry_id:string})=>f.enquiry_id===e.id);
 for(const record of [d,reloaded,row]){assert.equal(record.actual.revenue,65500);assert.equal(record.actual.cost,42500);assert.equal(record.actual.earnings,23000);assert.equal(record.quote.earnings,30000);assert.equal(record.actual.categories.Hotels.earnings,23000);assert.equal(record.actual.margin,23000/65500*100)}
 assert.equal(reloaded.paymentActual.paid,20000);assert.equal(reloaded.paymentActual.outstanding,45500);assert.equal(reloaded.paymentActual.supplierPaid,10000);assert.equal(reloaded.paymentActual.supplierBalance,31400);assert.deepEqual(row.payment,reloaded.paymentActual);
 assert.equal(reloaded.history.length,5);assert.equal(reloaded.history[0].snapshot.actual.earnings,23000);assert.equal(reloaded.history[1].snapshot.actual.earnings,18000);
 const csv=await(await call(env,path+'/csv?basis=actual')).text();assert.ok(csv.includes('"655","425","18","11","230"'));assert.ok(csv.includes('"200","455","100","314"'));
 const quoted=await(await call(env,path+'/csv?basis=quote')).text();assert.ok(quoted.includes('"1085","785","50","35","300"'));
 assert.equal((await call(env,path+'/item',{revision:1,id:itemId,...payload})).status,409);assert.equal((await(await call(env,path)).json()).actual.revenue,65500);
 assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM finance_items WHERE enquiry_id=?').get(e.id)!.n,1);
});

test('adding figures to a service before import does not duplicate its price',async()=>{
 const {env,sqlite}=setup(),e=await enquiry(env);
 const snapshot={suggestion:{hotelStays:[{place:'Bangkok',options:[{id:'hotel-a',name:'Linked hotel'}]}],dayPlans:[{day:1,options:[{id:'tour-a',name:'Linked excursion'}]}]},builderChoices:{hotels:{'stay-0':'hotel-a'},days:{'day-1':'tour-a'}}};
 sqlite.prepare("INSERT INTO enquiry_proposals (id,enquiry_id,title,url,version,status,created_at,snapshot_json) VALUES (?,?,'Test','https://example.invalid',1,'Draft',?,?)").run(crypto.randomUUID(),e.id,new Date().toISOString(),JSON.stringify(snapshot));
 const source=await(await call(env,'/'+e.id)).json(),service=source.source.services.find((s:{type:string})=>s.type==='Hotels');assert.ok(service);
 let response=await call(env,'/'+e.id+'/item',{revision:0,travel_item_id:service.key,description:service.description,product_type:'Hotels',status:'Quoted',quote:components,actual:components});assert.equal(response.status,200);
 response=await call(env,'/'+e.id+'/import',{revision:1});assert.equal(response.status,200);const d=await response.json();
 assert.equal(d.items.filter((i:FinanceItem)=>i.travel_item_id===service.key).length,1);assert.equal(d.actual.revenue,108500);assert.equal(d.items.length,2);
});
