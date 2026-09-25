export interface ProposalRow {
  id:string;
  token_hash:string;
  manage_token_hash:string;
  traveller_name:string;
  traveller_email:string;
  locale:string;
  title:string;
  summary:string;
  estimated_price:string;
  consultant_note:string;
  payload_json:string;
  status:'new'|'in_review'|'ready'|'approved'|'changes_requested'|'closed';
  traveller_response:string;
  created_at:string;
  updated_at:string;
  expires_at:string;
  revoked_at:string|null;
}

export interface ProposalEnv extends Env {
  RESEND_API_KEY?:string;
  LEAD_TO_EMAIL?:string;
}

export interface StoredProposalPayload {
  traveller:{name:string;email:string;phone:string;message:string};
  profile:Record<string,unknown>;
  suggestion:Record<string,unknown>;
  builderChoices:Record<string,unknown>;
}

const encoder=new TextEncoder();
export const clean=(value:unknown,max:number):string=>typeof value==='string'?value.trim().slice(0,max):'';
const cleanScalar=(value:unknown,max:number):string=>typeof value==='string'||typeof value==='number'?String(value).trim().slice(0,max):'';
export const escapeHtml=(value:unknown):string=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]??char));

export function randomToken():string{
  const bytes=new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

export async function hashToken(token:string):Promise<string>{
  const digest=await crypto.subtle.digest('SHA-256',encoder.encode(token));
  return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
}

export const validToken=(token:string):boolean=>/^[A-Za-z0-9_-]{43}$/.test(token);

export function parseStoredPayload(value:string):StoredProposalPayload|null{
  try{
    const parsed=JSON.parse(value) as unknown;
    if(!parsed||typeof parsed!=='object')return null;
    const input=parsed as Record<string,unknown>;
    if(!input.traveller||typeof input.traveller!=='object'||!input.suggestion||typeof input.suggestion!=='object')return null;
    return {
      traveller:input.traveller as StoredProposalPayload['traveller'],
      profile:input.profile&&typeof input.profile==='object'?input.profile as Record<string,unknown>:{},
      suggestion:input.suggestion as Record<string,unknown>,
      builderChoices:input.builderChoices&&typeof input.builderChoices==='object'?input.builderChoices as Record<string,unknown>:{},
    };
  }catch{return null}
}

export function publicProposalUrl(requestUrl:string,token:string,proposalOrigin?:string):string{
  const url=new URL(proposalOrigin||requestUrl);
  return `${url.origin}/proposal/${token}`;
}

export function manageProposalUrl(requestUrl:string,token:string,proposalOrigin?:string):string{
  const url=new URL(proposalOrigin||requestUrl);
  return `${url.origin}/proposal/manage/${token}`;
}

const statusLabels:Record<ProposalRow['status'],string>={
  new:'Received',in_review:'Consultant review',ready:'Proposal ready',approved:'Direction approved',changes_requested:'Changes requested',closed:'Closed',
};

const valueRecord=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const valueArray=(value:unknown):unknown[]=>Array.isArray(value)?value:[];

function selectedHotels(payload:StoredProposalPayload):Array<{place:string;name:string;detail:string}>{
  const selections=valueRecord(payload.builderChoices.hotels);
  const notes=valueRecord(payload.builderChoices.hotelNotes);
  return valueArray(payload.suggestion.hotelStays).flatMap((raw,index)=>{
    const stay=valueRecord(raw),place=clean(stay.place,160),selected=clean(selections[`stay-${index}`],80);
    if(!place||!selected)return [];
    if(selected==='custom')return [{place,name:'Traveller preference',detail:clean(notes[`stay-${index}`],500)||'To discuss with the consultant'}];
    const option=valueArray(stay.options).map(valueRecord).find(item=>clean(item.id,80)===selected);
    return option?[{place,name:clean(option.name,180),detail:[clean(option.standard,80),clean(option.roomGuidance,360)].filter(Boolean).join(' · ')}]:[];
  });
}

function selectedDays(payload:StoredProposalPayload):Array<{day:number;place:string;name:string;detail:string}>{
  const selections=valueRecord(payload.builderChoices.days);
  const notes=valueRecord(payload.builderChoices.dayNotes);
  return valueArray(payload.suggestion.dayPlans).flatMap(raw=>{
    const day=valueRecord(raw),number=Number(day.day),place=clean(day.place,160),selected=clean(selections[`day-${number}`],80);
    if(!Number.isInteger(number)||!selected)return [];
    if(selected==='open')return [{day:number,place,name:'Open for the consultant',detail:'Shape this day during the personal proposal.'}];
    if(selected==='custom')return [{day:number,place,name:'Traveller idea',detail:clean(notes[`day-${number}`],500)||'To discuss with the consultant'}];
    const option=valueArray(day.options).map(valueRecord).find(item=>clean(item.id,80)===selected);
    return option?[{day:number,place,name:clean(option.name,180),detail:clean(option.description,500)}]:[];
  });
}

function renderRoute(payload:StoredProposalPayload,editable=false):string{
  return valueArray(payload.suggestion.route).slice(0,8).map((raw,index)=>{
    const stop=valueRecord(raw),days=clean(stop.days,50),place=clean(stop.place,160),plan=clean(stop.plan||stop.focus,900);
    const highlights=valueArray(stop.highlights).slice(0,4).map(item=>clean(item,220)).filter(Boolean);
    if(editable)return `<fieldset class="manage-route"><legend>Chapter ${index+1}</legend><div class="manage-two"><label>Days<input name="route_days_${index}" value="${escapeHtml(days)}" maxlength="50" required></label><label>Place<input name="route_place_${index}" value="${escapeHtml(place)}" maxlength="160" required></label></div><label>Plan<textarea name="route_plan_${index}" rows="4" maxlength="900" required>${escapeHtml(plan)}</textarea></label></fieldset>`;
    return `<article class="route-chapter"><div class="route-index">${String(index+1).padStart(2,'0')}</div><div><span>${escapeHtml(days)}</span><h3>${escapeHtml(place)}</h3><p>${escapeHtml(plan)}</p>${highlights.length?`<ul>${highlights.map(item=>`<li>${escapeHtml(item)}</li>`).join('')}</ul>`:''}</div></article>`;
  }).join('');
}

function shell(title:string,body:string,options:{description:string;locale:string;manage?:boolean}):string{
  return `<!doctype html><html lang="${escapeHtml(options.locale)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive,nosnippet"><meta name="referrer" content="no-referrer"><meta name="description" content="${escapeHtml(options.description)}"><meta name="theme-color" content="#102d24"><link rel="stylesheet" href="/proposal.css"><title>${escapeHtml(title)} — Way to Asia</title></head><body class="${options.manage?'manage-view':'proposal-view'}"><a class="skip" href="#proposal-content">Skip to journey</a><header class="proposal-nav"><a class="proposal-brand" href="/" translate="no">WAY <i>to</i> ASIA</a><span>${options.manage?'Consultant workspace':'Private journey design'}</span></header>${body}<footer class="proposal-footer"><span translate="no">Way to Asia</span><p>A personal journey design, prepared with care. Availability and prices are confirmed separately.</p><a href="mailto:journeys@waytoasia.com">journeys@waytoasia.com</a></footer></body></html>`;
}

export function renderProposalPage(row:ProposalRow,token:string,responseState:string):string{
  const payload=parseStoredPayload(row.payload_json);
  if(!payload)return shell('Proposal unavailable','<main class="message-page"><h1>This proposal could not be displayed.</h1></main>',{description:'Private Way to Asia proposal',locale:'en'});
  const profile=payload.profile;
  const routeStops=valueArray(payload.suggestion.route).slice(0,8).map(raw=>clean(valueRecord(raw).place,160)).filter(Boolean);
  const hotels=selectedHotels(payload),days=selectedDays(payload);
  const duration=clean(payload.suggestion.recommendedDuration,100)||`${cleanScalar(profile.durationDays,30)} days`;
  const date=new Date(row.expires_at).toLocaleDateString(row.locale,{day:'numeric',month:'long',year:'numeric'});
  const updated=new Date(row.updated_at).toLocaleDateString(row.locale,{day:'numeric',month:'short',year:'numeric'});
  const responseBanner=responseState==='approved'?'<div class="notice success">Thank you. Your consultant has received your approval.</div>':responseState==='changes'?'<div class="notice success">Thank you. Your requested changes have been sent to your consultant.</div>':'';
  const customerNote=row.consultant_note?`<section class="consultant-note"><span>From your travel consultant</span><p>${escapeHtml(row.consultant_note)}</p></section>`:'';
  const price=row.estimated_price?`<div class="price-card"><span>Current estimate</span><strong>${escapeHtml(row.estimated_price)}</strong><small>Subject to availability and final confirmation</small></div>`:'';
  const body=`<main id="proposal-content">${responseBanner}<section class="proposal-hero"><div><span class="eyebrow">Prepared for ${escapeHtml(row.traveller_name)}</span><h1>${escapeHtml(row.title)}</h1><p>${escapeHtml(row.summary)}</p><div class="hero-meta"><span>${escapeHtml(duration)}</span><span>${escapeHtml(statusLabels[row.status])}</span><span>Updated ${escapeHtml(updated)}</span></div></div><aside><span>Your route</span><ol>${routeStops.map((place,index)=>`<li><b>${index+1}</b>${escapeHtml(place)}</li>`).join('')}</ol></aside></section>${customerNote}<div class="proposal-grid"><section><div class="section-title"><span>01</span><div><p>Journey flow</p><h2>Your route, chapter by chapter</h2></div></div>${renderRoute(payload)}</section><aside><div class="brief-card"><span>Travel brief</span><dl><div><dt>Travellers</dt><dd>${escapeHtml(cleanScalar(profile.adults,3)||'2')} adults${Number(profile.children)?` · ${escapeHtml(cleanScalar(profile.children,3))} children`:''}</dd></div><div><dt>Travel month</dt><dd>${escapeHtml(cleanScalar(profile.travelMonth,30)||'Flexible')}</dd></div><div><dt>Comfort</dt><dd>${escapeHtml(cleanScalar(profile.budget,40)||'Comfort')}</dd></div><div><dt>Pace</dt><dd>${escapeHtml(cleanScalar(profile.pace,40)||'Balanced')}</dd></div></dl></div>${price}</aside></div>${hotels.length?`<section class="proposal-section"><div class="section-title"><span>02</span><div><p>Accommodation direction</p><h2>Your selected stays</h2></div></div><div class="card-grid">${hotels.map(item=>`<article class="choice-card"><span>${escapeHtml(item.place)}</span><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.detail)}</p></article>`).join('')}</div></section>`:''}${days.length?`<section class="proposal-section day-section"><div class="section-title"><span>03</span><div><p>Experience direction</p><h2>Your chosen days</h2></div></div><div class="day-grid">${days.map(item=>`<article><b>Day ${item.day}</b><span>${escapeHtml(item.place)}</span><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.detail)}</p></article>`).join('')}</div></section>`:''}<section class="response-panel"><div><span class="eyebrow">Continue together</span><h2>How does this direction feel?</h2><p>Approve the direction or tell your consultant what you would like changed. This is still an enquiry—not a booking or payment.</p></div><form method="post" action="/api/proposals/${encodeURIComponent(token)}/response"><label>Notes for your consultant<textarea name="note" rows="4" maxlength="1500" placeholder="What would make this journey feel more like yours?"></textarea></label><div><button name="action" value="approve" class="primary">Approve this direction</button><button name="action" value="change" class="secondary">Request changes</button></div></form></section><p class="private-note">Private link · Not indexed by search engines · Expires ${escapeHtml(date)}</p></main>`;
  return shell(row.title,body,{description:row.summary,locale:row.locale});
}

export function renderManagePage(row:ProposalRow,saved:boolean):string{
  const payload=parseStoredPayload(row.payload_json);
  if(!payload)return shell('Proposal unavailable','<main class="message-page"><h1>This proposal could not be displayed.</h1></main>',{description:'Way to Asia consultant workspace',locale:'en',manage:true});
  const body=`<main id="proposal-content" class="manage-main">${saved?'<div class="notice success">Proposal updated. The customer link now shows these changes.</div>':''}<header class="manage-header"><span class="eyebrow">Consultant workspace</span><h1>${escapeHtml(row.title)}</h1><p>Update this saved proposal. Every save updates the same private customer link, so there is never a second version to reconcile.</p></header><form method="post" class="manage-form"><section><h2>Presentation</h2><label>Journey title<input name="title" value="${escapeHtml(row.title)}" maxlength="180" required></label><label>Summary<textarea name="summary" rows="5" maxlength="1200" required>${escapeHtml(row.summary)}</textarea></label><div class="manage-two"><label>Estimated price<input name="estimated_price" value="${escapeHtml(row.estimated_price)}" maxlength="120" placeholder="For example: From €6,850 per person"></label><label>Status<select name="status">${Object.entries(statusLabels).map(([value,label])=>`<option value="${value}"${row.status===value?' selected':''}>${escapeHtml(label)}</option>`).join('')}</select></label></div><label>Personal note shown to the customer<textarea name="consultant_note" rows="5" maxlength="1600">${escapeHtml(row.consultant_note)}</textarea></label></section><section><h2>Route chapters</h2>${renderRoute(payload,true)}</section><div class="manage-actions"><button class="primary">Save changes</button></div></form></main>`;
  return shell(`Manage ${row.title}`,body,{description:'Way to Asia consultant workspace',locale:row.locale,manage:true});
}

const emailShell=(preheader:string,content:string)=>`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Way to Asia</title></head><body style="margin:0;background:#eee8dc;font-family:Arial,sans-serif;color:#173229"><div style="display:none;max-height:0;overflow:hidden">${escapeHtml(preheader)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eee8dc"><tr><td align="center" style="padding:28px 14px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#fffdf8;border-top:5px solid #b44b37"><tr><td style="padding:24px 32px;background:#102d24;color:#fff"><div style="font:700 17px Georgia,serif;letter-spacing:2px">WAY <i style="color:#d3ae68">to</i> ASIA</div></td></tr><tr><td style="padding:34px 32px">${content}</td></tr><tr><td style="padding:20px 32px;background:#f1eadc;color:#66736c;font-size:12px;line-height:1.6">This is a personal travel design, not a booking or payment confirmation.<br>Way to Asia · <a href="mailto:journeys@waytoasia.com" style="color:#8f3828">journeys@waytoasia.com</a></td></tr></table></td></tr></table></body></html>`;

const button=(label:string,url:string)=>`<a href="${escapeHtml(url)}" style="display:inline-block;padding:15px 22px;background:#b44b37;color:#fff;text-decoration:none;font-weight:700;font-size:14px">${escapeHtml(label)} →</a>`;

export function customerEmail(row:Pick<ProposalRow,'traveller_name'|'title'|'summary'|'expires_at'>,url:string):{subject:string;text:string;html:string}{
  const expiry=new Date(row.expires_at).toLocaleDateString('en',{day:'numeric',month:'long',year:'numeric'});
  const subject=`Your Way to Asia journey: ${row.title}`;
  const text=`Hello ${row.traveller_name},\n\nYour personal journey design is ready to review:\n${url}\n\n${row.summary}\n\nThe private link expires ${expiry}. This is an enquiry, not a booking or payment confirmation.\n\nWay to Asia`;
  const html=emailShell(`Your personal Way to Asia journey is ready.`,`<p style="margin:0 0 10px;color:#9b3f2e;font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase">Your private journey design</p><h1 style="margin:0 0 18px;font:36px/1.1 Georgia,serif;color:#173229">${escapeHtml(row.title)}</h1><p style="margin:0 0 22px;color:#50625a;font-size:16px;line-height:1.65">Hello ${escapeHtml(row.traveller_name)},</p><p style="margin:0 0 24px;color:#50625a;font-size:16px;line-height:1.65">${escapeHtml(row.summary)}</p><p style="margin:0 0 26px">${button('View my journey',url)}</p><p style="margin:0;color:#718078;font-size:12px;line-height:1.6">This private link is not indexed by search engines and expires ${escapeHtml(expiry)}.</p>`);
  return {subject,text,html};
}

export function consultantEmail(row:Pick<ProposalRow,'traveller_name'|'traveller_email'|'title'|'summary'>,publicUrl:string,manageUrl:string,phone:string,message:string):{subject:string;text:string;html:string}{
  const subject=`New Journey Designer enquiry · ${row.traveller_name} · ${row.title}`;
  const details=[`Traveller: ${row.traveller_name}`,`Email: ${row.traveller_email}`,phone?`Phone: ${phone}`:'',message?`Note: ${message}`:'',`Journey: ${row.title}`,row.summary,`Customer preview: ${publicUrl}`,`Consultant workspace: ${manageUrl}`].filter(Boolean).join('\n');
  const html=emailShell(`New Journey Designer enquiry from ${row.traveller_name}.`,`<p style="margin:0 0 10px;color:#9b3f2e;font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase">New consultant handoff</p><h1 style="margin:0 0 18px;font:34px/1.1 Georgia,serif;color:#173229">${escapeHtml(row.title)}</h1><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;background:#f1eadc"><tr><td style="padding:18px;color:#50625a;font-size:14px;line-height:1.7"><b style="color:#173229">${escapeHtml(row.traveller_name)}</b><br><a href="mailto:${escapeHtml(row.traveller_email)}" style="color:#8f3828">${escapeHtml(row.traveller_email)}</a>${phone?`<br>${escapeHtml(phone)}`:''}${message?`<br><br>${escapeHtml(message)}`:''}</td></tr></table><p style="margin:0 0 22px;color:#50625a;font-size:15px;line-height:1.65">${escapeHtml(row.summary)}</p><p style="margin:0 0 12px">${button('Open consultant workspace',manageUrl)}</p><p style="margin:0;font-size:12px"><a href="${escapeHtml(publicUrl)}" style="color:#8f3828">Open the customer preview</a></p>`);
  return {subject,text:details,html};
}

export async function sendResend(apiKey:string,message:{from?:string;to:string[];replyTo?:string;subject:string;text:string;html:string}):Promise<boolean>{
  try{
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({from:message.from??'Way to Asia <journeys@waytoasia.com>',to:message.to,reply_to:message.replyTo,subject:message.subject,text:message.text,html:message.html}),signal:AbortSignal.timeout(12000)});
    if(!response.ok)console.error(JSON.stringify({message:'Resend email failed',status:response.status}));
    return response.ok;
  }catch(error){
    console.error(JSON.stringify({message:'Resend email request failed',error:error instanceof Error?error.message:String(error)}));
    return false;
  }
}
