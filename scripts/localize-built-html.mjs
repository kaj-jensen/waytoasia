import fs from 'node:fs/promises';
import path from 'node:path';
import {parse,serialize} from 'parse5';
import catalog from '../src/content/translations.generated.json' with {type:'json'};

for(const locale of Object.keys(catalog)){
  try{Object.assign(catalog[locale],JSON.parse(await fs.readFile(new URL(`../src/content/editorial/${locale}.json`,import.meta.url),'utf8')))}catch(error){if(error.code!=='ENOENT')throw error}
}

const dist=new URL('../dist/',import.meta.url);
const files=[];
async function walk(directory){for(const entry of await fs.readdir(directory,{withFileTypes:true})){const target=path.join(directory,entry.name);if(entry.isDirectory())await walk(target);else if(entry.name.endsWith('.html'))files.push(target)}}
await walk(dist.pathname);
const escapeHtml=value=>value.replaceAll('&','&amp;').replaceAll('—','&mdash;').replaceAll('–','&ndash;').replaceAll('“','&ldquo;').replaceAll('”','&rdquo;').replaceAll('’','&rsquo;');
for(const file of files){
  const relative=path.relative(dist.pathname,file);
  const locale=relative.split(path.sep)[0];
  if(locale==='en'||!catalog[locale])continue;
  let html=await fs.readFile(file,'utf8');
  const entries=Object.entries(catalog[locale]).sort(([a],[b])=>b.length-a.length);
  // Match complete words, and translate once so translated text is not processed again.
  const replacements=new Map();
  for(const [source,translation] of entries){
    if(source.includes('Way to Asia')&&source.split('Way to Asia').length!==translation.split('Way to Asia').length){
      throw new Error(`Company name must stay Way to Asia: ${locale}: ${source}`);
    }
    if(!source||source===translation)continue;
    replacements.set(source,translation);
    replacements.set(escapeHtml(source),escapeHtml(translation));
  }
  // Server-rendered translated sentences must survive this legacy HTML pass unchanged.
  // Otherwise English place names inside reviewed copy can be translated a second time.
  for(const [,translation] of entries){
    if(translation.length>20){
      replacements.set(translation,translation);
      replacements.set(escapeHtml(translation),escapeHtml(translation));
    }
  }
  // Identity matches prevent individual words within the company name from translating.
  for(const name of ['Way to Asia','WAY to ASIA','WAY TO ASIA'])replacements.set(name,name);
  const escapeRegex=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const sources=[...replacements.keys()].sort((a,b)=>b.length-a.length).map(escapeRegex);
  const pattern=new RegExp(`(?<![\\p{L}\\p{N}_])(?:${sources.join('|')})(?![\\p{L}\\p{N}_])`,'gu');
  const translate=value=>value.replace(pattern,match=>replacements.get(match));
  const document=parse(html);
  function localize(node, inherited=false){
    const protectedNode=inherited||['script','style','template','noscript'].includes(node.tagName)||node.attrs?.some(attr=>attr.name==='translate'&&attr.value==='no');
    if(protectedNode)return;
    if(node.nodeName==='#text')node.value=translate(node.value);
    for(const attr of node.attrs??[]){
      if(!['aria-label','title','placeholder','alt','content'].includes(attr.name))continue;
      if(attr.name==='content'&&/^https?:\/\//.test(attr.value))continue;
      attr.value=translate(attr.value);
    }
    for(const child of node.childNodes??[])localize(child,protectedNode);
  }
  localize(document);
  html=serialize(document);
  // Structured page metadata must describe the final reviewed, translated HTML.
  // Update only human-facing fields; identifiers, URLs and schema keys stay intact.
  let title='',description='',heading='';
  function metadata(node){
    const attr=name=>node.attrs?.find(attribute=>attribute.name===name)?.value;
    const text=node=>node.value??(node.childNodes??[]).map(text).join('');
    if(node.tagName==='title')title=text(node);
    if(node.tagName==='h1')heading=text(node);
    if(node.tagName==='meta'&&attr('name')==='description')description=attr('content');
    for(const child of node.childNodes??[])metadata(child);
  }
  metadata(parse(html));
  html=html.replace(/(<script\b[^>]*\btype="application\/ld\+json"[^>]*>)([\s\S]*?)(<\/script>)/gi,(_match,start,body,end)=>{
    const data=JSON.parse(body);
    for(const entity of data['@graph']??[]){
      if(entity['@type']==='WebPage'){entity.name=title;entity.description=description;}
    }
    if(data['@type']==='BlogPosting'){data.headline=heading;data.description=description;}
    return start+JSON.stringify(data).replaceAll('<','\\u003c')+end;
  });
  await fs.writeFile(file,html);
}
console.log(`Localized ${files.length} built HTML pages across nine languages.`);
