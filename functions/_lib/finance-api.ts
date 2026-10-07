import {enquiryTourPrice} from './enquiry-tour-price';
import {json,privateHeaders,auditStatement,type DashboardEnv,type Staff} from './dashboard';
import {clean,parseStoredPayload} from './proposals';
import {currencyCode,minor,rate,convert,normalizeComponents,summarize,paymentSummary,productTypes,financeStatuses,paymentKinds,csvCell,digits,type FinanceItem,type Payment} from './finance-calculations';
import type {D1PreparedStatement} from '@cloudflare/workers-types';
export function financePermissions(staff:Staff){return {read:['admin','staff','finance','backoffice'].includes(staff.role),write:['admin','staff','finance'].includes(staff.role)}}
interface File {enquiry_id:string;currency:string;status:string;revision:number;is_demo:number;updated_at:string;last_write:string}
function bad(message:string,status=400):never{throw json({error:message},status)}
const record=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const array=(v:unknown):Record<string,unknown>[]=>Array.isArray(v)?v.map(record):[];
const date=(v:unknown,required=false)=>{const s=clean(v,10);if(!s&&!required)return '';if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s))||new Date(s).toISOString().slice(0,10)!==s)bad('Enter a valid date.');return s};
async function load(env:DashboardEnv,id:string){
 const enquiry=await env.PROPOSALS_DB.prepare('SELECT e.*,c.name,c.email FROM enquiries e JOIN clients c ON c.id=e.client_id WHERE e.id=?').bind(id).first<Record<string,string>>();if(!enquiry)bad('Enquiry not found.',404);
 const [file,rawItems,payments,history]=await Promise.all([
  env.PROPOSALS_DB.prepare('SELECT * FROM finance_files WHERE enquiry_id=?').bind(id).first<File>(),
  env.PROPOSALS_DB.prepare('SELECT * FROM finance_items WHERE enquiry_id=? ORDER BY created_at,id').bind(id).all<Record<string,unknown>>(),
  env.PROPOSALS_DB.prepare('SELECT * FROM finance_payments WHERE enquiry_id=? ORDER BY date DESC,created_at DESC').bind(id).all<Payment>(),
  env.PROPOSALS_DB.prepare("SELECT id,revision,action,actor,created_at,json_extract(snapshot_json,'$.currency') currency,json_extract(snapshot_json,'$.status') status,json_extract(snapshot_json,'$.quote') quote,json_extract(snapshot_json,'$.actual') actual FROM finance_history WHERE enquiry_id=? ORDER BY revision DESC LIMIT 100").bind(id).all<Record<string,unknown>>(),
 ]);
 const items=rawItems.results.map(r=>({...r,quote:r.quote_json?JSON.parse(String(r.quote_json)):null,actual:r.actual_json?JSON.parse(String(r.actual_json)):null})) as unknown as FinanceItem[];
 const tourPrice=enquiryTourPrice(enquiry.requirements_json);
 const f=file||{enquiry_id:id,currency:tourPrice?.currency||'EUR',status:'Draft',revision:0,is_demo:0,updated_at:'',last_write:''};
 const quote=summarize(items,f.currency,'quote'),actual=summarize(items,f.currency,'actual');
 return {enquiry,tourPrice,file:f,items,payments:payments.results,history:history.results.map(h=>({id:h.id,revision:h.revision,action:h.action,actor:h.actor,created_at:h.created_at,snapshot:{currency:h.currency,status:h.status,quote:JSON.parse(String(h.quote)),actual:JSON.parse(String(h.actual))}})),quote,actual,paymentQuote:paymentSummary(payments.results,quote),paymentActual:paymentSummary(payments.results,actual)};
}
async function travelCandidates(env:DashboardEnv,id:string){
 const proposal=await env.PROPOSALS_DB.prepare('SELECT snapshot_json FROM enquiry_proposals WHERE enquiry_id=? ORDER BY version DESC LIMIT 1').bind(id).first<{snapshot_json:string}>();
 const payload=proposal&&parseStoredPayload(proposal.snapshot_json);if(!payload)return [];
 const choices=payload.builderChoices,suggestion=payload.suggestion,result:{key:string;type:string;description:string;supplier:string}[]=[];
 array(suggestion.hotelStays).forEach((stay,index)=>{const choice=record(choices.hotels)[`stay-${index}`],option=array(stay.options).find(o=>o.id===choice);result.push({key:`stay-${index}`,type:'Hotels',description:`${clean(stay.place,160)} · ${clean(option?.name,180)||'Hotel to be selected'}`,supplier:clean(option?.name,180)})});
 array(suggestion.dayPlans).forEach(day=>{const option=array(day.options).find(o=>o.id===record(choices.days)[`day-${day.day}`]);if(option)result.push({key:`day-${day.day}`,type:'Activities',description:`Day ${day.day} · ${clean(option.name,180)}`,supplier:''})});
 array(suggestion.route).slice(0,-1).forEach((stop,index)=>{const option=array(stop.transferOptions).find(o=>o.id===record(choices.transfers)[`transfer-${index}`]);result.push({key:`transfer-${index}`,type:'Transfers',description:clean(option?.name,180)||clean(stop.onwardTravel,250),supplier:''})});
 const flight=record(choices.flightItinerary);if(Array.isArray(flight.slices))flight.slices.forEach((slice,index)=>{const segments=array(slice);if(segments.length)result.push({key:`flight-${index}`,type:'Flights',description:`${clean(segments[0].origin,3)} → ${clean(segments.at(-1)?.destination,3)} · test itinerary`,supplier:[...new Set(segments.map(s=>clean(s.airline,100)))].join(', ')})});
 return result.filter(r=>r.description);
}
export async function financeGet(path:string,url:URL,env:DashboardEnv,staff:Staff):Promise<Response|null>{
 if(!path.startsWith('api/finance'))return null;
 if(!financePermissions(staff).read)bad('Financial access is not enabled for this role.',403);
 if(path==='api/finance'){
  const files=await env.PROPOSALS_DB.prepare('SELECT f.*,e.reference,e.assigned_to,e.requirements_json,e.created_at,c.name FROM finance_files f JOIN enquiries e ON e.id=f.enquiry_id JOIN clients c ON c.id=e.client_id ORDER BY f.updated_at DESC LIMIT 200').all<Record<string,unknown>>();
  const [allItems,allPayments]=await Promise.all([
   env.PROPOSALS_DB.prepare('SELECT i.* FROM finance_items i JOIN (SELECT enquiry_id FROM finance_files ORDER BY updated_at DESC LIMIT 200) f ON f.enquiry_id=i.enquiry_id').all<Record<string,unknown>>(),
   env.PROPOSALS_DB.prepare('SELECT p.* FROM finance_payments p JOIN (SELECT enquiry_id FROM finance_files ORDER BY updated_at DESC LIMIT 200) f ON f.enquiry_id=p.enquiry_id').all<Payment>()]);
  const rows=files.results.map(f=>{const items=allItems.results.filter(i=>i.enquiry_id===f.enquiry_id).map(i=>({...i,quote:i.quote_json?JSON.parse(String(i.quote_json)):null,actual:i.actual_json?JSON.parse(String(i.actual_json)):null})) as unknown as FinanceItem[];
   const quote=summarize(items,String(f.currency),'quote'),actual=summarize(items,String(f.currency),'actual');return {...f,quote:{...quote,lines:undefined},actual:{...actual,lines:undefined},payment:paymentSummary(allPayments.results.filter(p=>p.enquiry_id===f.enquiry_id),actual)};});
  return json({files:rows,limit:200,permissions:financePermissions(staff)});
 }
 const match=path.match(/^api\/finance\/([^/]+)(?:\/(csv|candidates))?$/);if(!match)return json({error:'Not found'},404);
 const data=await load(env,match[1]);if(match[2]==='candidates')return json({items:await travelCandidates(env,match[1])});
 if(match[2]==='csv'){
  const basis=url.searchParams.get('basis')==='actual'?'actual':'quote',s=data[basis],p=basis==='actual'?data.paymentActual:data.paymentQuote,c=data.file.currency;
  const money=(v:number)=>String(v/10**digits(c));
  const rows:unknown[][]=[['INTERNAL FINANCIAL REPORT',data.enquiry.reference,data.enquiry.name,c,basis,data.file.status],['Coverage',`${s.priced} priced / ${s.count} items`],['Summary','Revenue','Total cost','Commission','Additional costs','Gross earnings','Margin %'],['',money(s.revenue),money(s.cost),money(s.commission),money(s.additionalCost),money(s.earnings),s.margin??''],[],['Type','Item','Supplier','Status','Currency','Selling price','Supplier cost','Commission','Additional costs','Total cost','Earnings','Margin %','Original supplier currency','Original supplier cost','FX rate','Base customer price','Markup','Service fee','Discount','Payment cost','Other cost']];
  for(const item of s.lines){const v=item.values,x=item[basis];rows.push([item.product_type,item.description,item.supplier,item.status,c,v?money(v.revenue):'Unpriced',v?money(v.supplierCost):'',v?money(v.commission):'',v?money(v.additionalCost):'',v?money(v.cost):'',v?money(v.earnings):'',v?.margin??'',x?.costCurrency??'',x?x.supplierCost/10**digits(x.costCurrency):'',x?.fxRate??'',x?money(x.priceBase):'',x?money(x.markup):'',x?money(x.serviceFee):'',x?money(x.discount):'',x?money(x.paymentCost):'',x?money(x.otherCost):''])}
  rows.push([],['Payment summary','Invoiced','Paid','Outstanding against priced items','Supplier payments','Supplier balance'],['',money(p.invoiced),money(p.paid),money(p.outstanding),money(p.supplierPaid),money(p.supplierBalance)],[],['Payment kind','Date','Due date','Reference','Original currency','Original amount','FX rate',`Amount ${c}`,'Voided']);
  for(const payment of data.payments)rows.push([payment.kind,payment.date,payment.due_date,payment.reference,payment.currency,payment.amount_minor/10**digits(payment.currency),payment.fx_rate,money(payment.file_amount_minor),payment.voided?'Yes':'No']);
  await env.PROPOSALS_DB.batch([auditStatement(env,staff.email,'finance.export',match[1])]);
  return new Response('\uFEFF'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n'),{headers:{...privateHeaders(),'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="${data.enquiry.reference.replace(/[^A-Z0-9-]/gi,'')}-internal-finance-${basis}.csv"`}});
 }
 return json({...data,permissions:financePermissions(staff)});
}
export async function financePost(path:string,input:Record<string,unknown>,env:DashboardEnv,staff:Staff):Promise<Response|null>{
 if(!path.startsWith('api/finance'))return null;
 if(!financePermissions(staff).write)bad('Sales, finance or administrator access is required to edit financials.',403);
 try{
 if(path==='api/finance/demo')return await createDemo(env,staff);
 const match=path.match(/^api\/finance\/([^/]+)\/(settings|item|payment|void-payment|import)$/);if(!match)return json({error:'Not found'},404);
 const id=match[1],action=match[2],data=await load(env,id),f=data.file,now=new Date().toISOString();
 if(input.revision!==f.revision)bad('This file changed in another session. Reload financials before saving.',409);
 let currency=f.currency,status=f.status;const items=[...data.items],payments=[...data.payments];
 const write=crypto.randomUUID(),nextRevision=f.revision+1,db=env.PROPOSALS_DB;
 const operations:D1PreparedStatement[]=[];
 const guard='EXISTS (SELECT 1 FROM finance_files WHERE enquiry_id=? AND last_write=?)';
 const addItem=(item:FinanceItem)=>operations.push(db.prepare(`INSERT INTO finance_items (id,enquiry_id,source_key,product_type,description,supplier,travel_item_id,status,quote_json,actual_json,notes,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,? WHERE ${guard} ON CONFLICT(id) DO UPDATE SET product_type=excluded.product_type,description=excluded.description,supplier=excluded.supplier,travel_item_id=excluded.travel_item_id,status=excluded.status,quote_json=excluded.quote_json,actual_json=excluded.actual_json,notes=excluded.notes,updated_at=excluded.updated_at`).bind(item.id,id,item.source_key,item.product_type,item.description,item.supplier,item.travel_item_id,item.status,item.quote?JSON.stringify(item.quote):null,item.actual?JSON.stringify(item.actual):null,item.notes,item.created_at,now,id,write));
 if(action==='settings'){
  currency=currencyCode(input.currency);status=clean(input.status,30);if(!financeStatuses.includes(status))bad('Choose a valid financial status.');
  if(currency!==f.currency&&(items.length||payments.length))bad('File currency cannot change after items or payments exist. Record supplier currencies and exchange rates on individual items.');
 }
 if(action==='item'){
  const old=input.id?items.find(i=>i.id===input.id):undefined;if(input.id&&!old)bad('Financial item not found in this enquiry.',404);
  const product=clean(input.product_type,30),description=clean(input.description,250),itemStatus=clean(input.status,30);
  if(!productTypes.includes(product)||!description||!financeStatuses.includes(itemStatus))bad('Enter an item description, type and status.');
  const item:FinanceItem={id:old?.id||crypto.randomUUID(),enquiry_id:id,source_key:old?.source_key||null,product_type:product,description,supplier:clean(input.supplier,180),travel_item_id:clean(input.travel_item_id,160),status:itemStatus,quote:normalizeComponents(input.quote,currency),actual:normalizeComponents(input.actual,currency),notes:clean(input.notes,1500),created_at:old?.created_at||now,updated_at:now};
  if(old)items[items.indexOf(old)]=item;else {if(items.length>=250)bad('This file has reached its 250-item limit.');items.push(item)}addItem(item);
 }
 if(action==='import'){
  const candidates=await travelCandidates(env,id);let count=0;
  for(const candidate of candidates){if(items.some(i=>i.source_key===candidate.key))continue;if(items.length>=250)bad('Import would exceed the 250-item limit.');const item:FinanceItem={id:crypto.randomUUID(),enquiry_id:id,source_key:candidate.key,product_type:candidate.type,description:candidate.description,supplier:candidate.supplier,travel_item_id:candidate.key,status:'Draft',quote:null,actual:null,notes:'Imported from the selected journey. Enter verified prices and supplier costs.',created_at:now,updated_at:now};items.push(item);addItem(item);count++}
  if(!count)bad('No new selected travel items to import. Existing financial items were preserved.');
 }
 if(action==='payment'){
  const kind=clean(input.kind,30);if(!paymentKinds.includes(kind))bad('Select a payment or invoice type.');
  const paymentCurrency=currencyCode(input.currency),fx=rate(input.fx_rate,paymentCurrency,currency),amount=minor(input.amount,paymentCurrency);if(amount<=0)bad('Payment amounts must be positive. Use refund or credit note for a reversal.');
  const itemId=clean(input.item_id,80)||null;if(itemId&&!items.some(i=>i.id===itemId))bad('Select an item belonging to this file.');
  if(payments.length>=500)bad('This file has reached its 500-entry limit.');
  const payment:Payment={id:crypto.randomUUID(),enquiry_id:id,item_id:itemId,kind,amount_minor:amount,currency:paymentCurrency,fx_rate:fx,file_amount_minor:convert(amount,paymentCurrency,currency,fx),date:date(input.date,true),due_date:date(input.due_date),reference:clean(input.reference,180),notes:clean(input.notes,1000),voided:0,created_at:now,created_by:staff.email};payments.push(payment);
  operations.push(db.prepare(`INSERT INTO finance_payments (id,enquiry_id,item_id,kind,amount_minor,currency,fx_rate,file_amount_minor,date,due_date,reference,notes,voided,created_at,created_by) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,? WHERE ${guard}`).bind(payment.id,id,itemId,kind,amount,paymentCurrency,fx,payment.file_amount_minor,payment.date,payment.due_date,payment.reference,payment.notes,0,now,staff.email,id,write));
 }
 if(action==='void-payment'){
  const payment=payments.find(p=>p.id===input.id);if(!payment||payment.voided)bad('Payment not found or already voided.',404);
  const reason=clean(input.reason,500);if(!reason)bad('Enter a reason for voiding this entry.');
  payment.voided=1;payment.notes+=`\nVoided: ${reason}`;
  operations.push(db.prepare(`UPDATE finance_payments SET voided=1,notes=? WHERE id=? AND enquiry_id=? AND ${guard}`).bind(payment.notes,payment.id,id,id,write));
 }
 const quote=summarize(items,currency,'quote'),actual=summarize(items,currency,'actual');
 const snapshot=JSON.stringify({currency,status,quote:{...quote,lines:undefined},actual:{...actual,lines:undefined},paymentQuote:paymentSummary(payments,quote),paymentActual:paymentSummary(payments,actual),items,payments});
 const statements=[db.prepare("INSERT OR IGNORE INTO finance_files (enquiry_id,updated_at) VALUES (?,?)").bind(id,now),db.prepare('UPDATE finance_files SET currency=?,status=?,revision=revision+1,last_write=?,updated_at=? WHERE enquiry_id=? AND revision=?').bind(currency,status,write,now,id,f.revision),...operations,
 db.prepare(`INSERT INTO finance_history (id,enquiry_id,revision,action,actor,created_at,snapshot_json) SELECT ?,?,?,?,?,?,? WHERE ${guard}`).bind(crypto.randomUUID(),id,nextRevision,action,staff.email,now,snapshot,id,write),
 db.prepare(`INSERT INTO audit_log SELECT ?,?,?,?,? WHERE ${guard}`).bind(crypto.randomUUID(),staff.email,`finance.${action}`,id,now,id,write)];
 const result=await db.batch(statements);if(result[1].meta.changes!==1)bad('Another user saved first. Reload financials before saving.',409);
 return json({...await load(env,id),permissions:financePermissions(staff)});
 }catch(error){if(error instanceof Response)throw error;if(error instanceof Error&& !/SQL|D1|constraint/i.test(error.message))bad(error.message);throw error}
}
async function createDemo(env:DashboardEnv,staff:Staff){
 const existing=await env.PROPOSALS_DB.prepare('SELECT enquiry_id FROM finance_files WHERE is_demo=1 LIMIT 1').first<{enquiry_id:string}>();if(existing)return json({id:existing.enquiry_id});
 const id=crypto.randomUUID(),client=crypto.randomUUID(),now=new Date().toISOString(),reference=`DEMO-FINANCE-${id.slice(0,8).toUpperCase()}`;
 const examples=[['Flights','Family return flights · Copenhagen–Bangkok','Demo airline',2680,2310,2590,2375,0],['Hotels','8 nights · two family rooms','Demo Riverside Hotel',3280,2470,3240,2540,120],['Transfers','Private airport and intercity transfers','Demo Thailand Transport',460,315,460,330,0],['Activities','Cooking class and market visit · 4 guests','Demo Local Kitchen',340,220,340,228,25],['Excursions','Private heritage excursion','Demo Siam Guide',520,375,480,430,0],['Insurance','Family travel insurance','Demo Travel Cover',240,180,240,180,35],['Fees','Journey planning and support','Way to Asia',180,0,180,0,0]] as const;
 const items=examples.map(([type,description,supplier,revenue,cost,actualRevenue,actualCost,commission],index):FinanceItem=>({id:crypto.randomUUID(),enquiry_id:id,source_key:`demo-${index}`,product_type:type,description,supplier,travel_item_id:`demo-${index}`,status:'Fully booked',quote:normalizeComponents({priceBase:revenue,supplierCost:cost,commission,otherCost:0,paymentCost:Math.round(revenue*.012)},'EUR'),actual:normalizeComponents({priceBase:actualRevenue,supplierCost:actualCost,commission,otherCost:index===4?35:0,paymentCost:Math.round(actualRevenue*.014)},'EUR'),notes:'Synthetic example. Not a real supplier quote, customer booking or payment.',created_at:now,updated_at:now}));
 const quote=summarize(items,'EUR','quote'),actual=summarize(items,'EUR','actual');
 const payments:Payment[]=[['invoice',actual.revenue,new Date(Date.now()+14*86400000).toISOString().slice(0,10),'DEMO-INV-001'],['receipt',400000,'','DEMO-DEPOSIT'],['supplier_payment',220000,'','DEMO-SUPPLIER-DEPOSIT']].map(([kind,amount,due,ref])=>({id:crypto.randomUUID(),enquiry_id:id,item_id:null,kind:String(kind),amount_minor:Number(amount),currency:'EUR',fx_rate:'1',file_amount_minor:Number(amount),date:now.slice(0,10),due_date:String(due),reference:String(ref),notes:'Synthetic entry. No money was transferred.',voided:0,created_at:now,created_by:staff.email}));
 const db=env.PROPOSALS_DB;
 await db.batch([
 db.prepare('INSERT INTO clients VALUES (?,?,?,?,?)').bind(client,`finance-demo-${id}@example.invalid`,'DEMO · Morgan family holiday','',now),
 db.prepare("INSERT INTO enquiries (id,reference,client_id,source,requirements_json,original_message,status,assigned_to,created_at,updated_at) VALUES (?,?,?,'Finance demo',?,'Synthetic financial demonstration. No real customer or money.','Confirmed',?,?,?)").bind(id,reference,client,JSON.stringify({destinations:'Thailand',travellers:4,travelStartDate:'2027-04-03',travelEndDate:'2027-04-12'}),staff.email,now,now),
 db.prepare("INSERT INTO finance_files (enquiry_id,currency,status,revision,is_demo,updated_at) VALUES (?,'EUR','Fully booked',1,1,?)").bind(id,now),
 ...items.map(i=>db.prepare('INSERT INTO finance_items VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(i.id,id,i.source_key,i.product_type,i.description,i.supplier,i.travel_item_id,i.status,JSON.stringify(i.quote),JSON.stringify(i.actual),i.notes,now,now)),
 ...payments.map(p=>db.prepare('INSERT INTO finance_payments VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(p.id,id,p.item_id,p.kind,p.amount_minor,p.currency,p.fx_rate,p.file_amount_minor,p.date,p.due_date,p.reference,p.notes,0,now,staff.email)),
 db.prepare('INSERT INTO finance_history VALUES (?,?,?,?,?,?,?)').bind(crypto.randomUUID(),id,1,'demo-created',staff.email,now,JSON.stringify({currency:'EUR',status:'Fully booked',quote:{...quote,lines:undefined},actual:{...actual,lines:undefined},items,payments})),auditStatement(env,staff.email,'finance.demo_created',id)]);
 return json({id},201);
}
