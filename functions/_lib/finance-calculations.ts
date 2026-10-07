/** All values are integer minor units. FX means file-currency units per source-currency unit. */
export const productTypes=['Tours','Flights','Hotels','Car rental','Transfers','Activities','Excursions','Insurance','Trains','Cruises','Guides','Fees','Discounts','Other'];
export const financeStatuses=['Draft','Quoted','Accepted','Partially booked','Fully booked','Completed','Cancelled'];
export const paymentKinds=['invoice','credit_note','receipt','refund','supplier_payment','supplier_refund'];
export interface Components {costCurrency:string;fxRate:string;priceBase:number;markup:number;serviceFee:number;discount:number;supplierCost:number;commission:number;otherCost:number;paymentCost:number}
export interface FinanceItem {id:string;enquiry_id:string;source_key:string|null;product_type:string;description:string;supplier:string;travel_item_id:string;status:string;quote:Components|null;actual:Components|null;notes:string;created_at:string;updated_at:string}
export interface Payment {id:string;enquiry_id:string;item_id:string|null;kind:string;amount_minor:number;currency:string;fx_rate:string;file_amount_minor:number;date:string;due_date:string;reference:string;notes:string;voided:number;created_at:string;created_by:string}
export function currencyCode(value:unknown):string {const code=String(value||'').toUpperCase();if(!Intl.supportedValuesOf('currency').includes(code))throw Error('Select a recognised ISO currency.');return code}
export function digits(currency:string):number{return new Intl.NumberFormat('en',{style:'currency',currency}).resolvedOptions().maximumFractionDigits!}
export function minor(value:unknown,currency:string):number {
 const text=String(value??'').trim(),places=digits(currency);
 if(!new RegExp(`^-?\\d{1,9}(?:\\.\\d{1,${places||1}})?$`).test(text)||(places===0&&text.includes('.')))throw Error(`Enter an amount with at most ${places} decimal places for ${currency}.`);
 const n=Math.round(Number(text)*10**places);if(!Number.isSafeInteger(n)||Math.abs(n)>1e12)throw Error('Amount is outside the supported range.');return n;
}
export function rate(value:unknown,source:string,target:string):string {if(source===target)return '1';const s=String(value??'');if(!/^\d{1,8}(?:\.\d{1,8})?$/.test(s)||Number(s)<=0||Number(s)>1e6)throw Error('Enter an explicit positive exchange rate for this currency.');return s}
export function convert(amount:number,source:string,target:string,fx:string):number {const result=Math.round(amount*Number(fx)*10**digits(target)/10**digits(source));if(!Number.isSafeInteger(result)||Math.abs(result)>1e14)throw Error('Converted amount is outside the supported range.');return result}
export function normalizeComponents(value:unknown,currency:string):Components|null {
 if(value===null||value===undefined)return null;
 if(typeof value!=='object'||Array.isArray(value))throw Error('Invalid financial components.');
 const v=value as Record<string,unknown>,costCurrency=currencyCode(v.costCurrency||currency),fxRate=rate(v.fxRate,costCurrency,currency);
 const result={costCurrency,fxRate} as Components;
 for(const key of ['priceBase','supplierCost','markup','serviceFee','discount','commission','otherCost','paymentCost'] as const){
  if((key==='priceBase'||key==='supplierCost')&&(v[key]===''||v[key]===undefined||v[key]===null))throw Error('Enter both the base customer price and supplier cost, or leave this version unpriced.');
  result[key]=minor(v[key]??'0',['supplierCost','commission'].includes(key)?costCurrency:currency);
 }
 if(result.discount<0||result.paymentCost<0||result.otherCost<0)throw Error('Discount and additional costs must be zero or positive. Use a negative price or supplier cost for credits.');
 return result;
}
export function calculate(c:Components,currency:string){
 const supplierCost=convert(c.supplierCost,c.costCurrency,currency,c.fxRate),commission=convert(c.commission,c.costCurrency,currency,c.fxRate);
 const revenue=c.priceBase+c.markup+c.serviceFee-c.discount,additionalCost=c.otherCost+c.paymentCost,cost=supplierCost-commission+additionalCost,earnings=revenue-cost;
 return {revenue,supplierCost,commission,additionalCost,cost,earnings,margin:revenue>0?earnings/revenue*100:null};
}
export function summarize(items:FinanceItem[],currency:string,basis:'quote'|'actual'){
 const active=items.filter(i=>basis==='actual'||i.status!=='Cancelled');
 const totals={revenue:0,supplierCost:0,commission:0,additionalCost:0,cost:0,earnings:0};
 const categories:Record<string,typeof totals & {count:number;margin:number|null}>={};
 const lines=active.map(item=>{const c=item[basis],values=c?calculate(c,currency):null;if(values){const group=categories[item.product_type]??={...totals,revenue:0,supplierCost:0,commission:0,additionalCost:0,cost:0,earnings:0,count:0,margin:null};for(const key of Object.keys(totals) as (keyof typeof totals)[]){totals[key]+=values[key];if(!Number.isSafeInteger(totals[key]))throw Error('Financial total exceeds the supported range.');group[key]+=values[key]}group.count++;group.margin=group.revenue>0?group.earnings/group.revenue*100:null}return {...item,values}});
 return {...totals,margin:totals.revenue>0?totals.earnings/totals.revenue*100:null,unpriced:lines.filter(i=>!i.values).length,priced:lines.filter(i=>i.values).length,count:active.length,categories,lines};
}
export function paymentSummary(payments:Payment[],summary:ReturnType<typeof summarize>,today=new Date().toISOString().slice(0,10)){
 const active=payments.filter(p=>!p.voided),sum=(kind:string)=>active.filter(p=>p.kind===kind).reduce((n,p)=>{const total=n+p.file_amount_minor;if(!Number.isSafeInteger(total))throw Error('Payment total exceeds the supported range.');return total},0);
 const invoiced=sum('invoice')-sum('credit_note'),paid=sum('receipt')-sum('refund'),supplierPaid=sum('supplier_payment')-sum('supplier_refund');
 const invoiceBalance=invoiced-paid,outstanding=summary.revenue-paid,supplierBalance=summary.supplierCost-summary.commission-supplierPaid;
 const overdueInvoices=active.filter(p=>p.kind==='invoice'&&p.due_date&&p.due_date<today).sort((a,b)=>a.due_date.localeCompare(b.due_date));
 const overdue=Math.max(0,Math.min(invoiceBalance,overdueInvoices.reduce((n,p)=>n+p.file_amount_minor,0)-Math.max(0,paid)-Math.max(0,sum('credit_note'))));
 return {invoiced,paid,outstanding,supplierPaid,supplierBalance,invoiceBalance,overdue,status:summary.unpriced||!summary.count?'Pricing incomplete':paid>summary.revenue?'Overpaid':summary.revenue>0&&paid>=summary.revenue?'Paid':paid>0?'Partially paid':'Unpaid',unallocatedSupplierPayments:active.filter(p=>p.kind.startsWith('supplier_')&&!p.item_id).length};
}
export function csvCell(value:unknown){let text=String(value??'');if(/^(?:\s*[=+@]|[\t\r\n])/.test(text)||(/^\s*-/.test(text)&&!/^-[0-9]+(?:\.[0-9]+)?$/.test(text)))text="'"+text;return '"'+text.replaceAll('"','""')+'"'}
