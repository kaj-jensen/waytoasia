import fs from 'node:fs/promises';
import path from 'node:path';
import catalog from '../src/content/translations.generated.json' with {type:'json'};

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
  // Protect the complete wordmark, including text split by italic/span tags.
  const protectedNames=[];
  html=html.replace(/<([a-z][\w-]*)\b(?=[^>]*\btranslate="no")[^>]*>[\s\S]*?<\/\1>/gi,block=>{
    const token=`__WTA_PROTECTED_${protectedNames.length}__`;
    protectedNames.push(block);
    return token;
  });
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
  // Identity matches prevent individual words within the company name from translating.
  for(const name of ['Way to Asia','WAY to ASIA','WAY TO ASIA'])replacements.set(name,name);
  const escapeRegex=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const sources=[...replacements.keys()].sort((a,b)=>b.length-a.length).map(escapeRegex);
  const pattern=new RegExp(`(?<![\\p{L}\\p{N}_])(?:${sources.join('|')})(?![\\p{L}\\p{N}_])`,'gu');
  const translate=value=>value.replace(pattern,match=>replacements.get(match));
  html=html.replace(/(<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>)|>([^<]+)</gi,(_match,protectedBlock,text)=>protectedBlock??`>${translate(text)}<`);
  html=html.replace(/\b(aria-label|title|placeholder|alt|content)=("[^"]*"|'[^']*')/gi,(_match,name,quoted)=>`${name}=${quoted[0]}${translate(quoted.slice(1,-1))}${quoted[0]}`);
  protectedNames.forEach((block,index)=>{html=html.replace(`__WTA_PROTECTED_${index}__`,block)});
  await fs.writeFile(file,html);
}
console.log(`Localized ${files.length} built HTML pages across nine languages.`);
