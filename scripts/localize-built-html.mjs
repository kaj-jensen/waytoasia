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
  const entries=Object.entries(catalog[locale]).sort(([a],[b])=>b.length-a.length);
  const translate=value=>{for(const [source,translation] of entries){if(!source||source===translation)continue;value=value.replaceAll(source,translation).replaceAll(escapeHtml(source),escapeHtml(translation))}return value};
  html=html.replace(/(<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>)|>([^<]+)</gi,(_match,protectedBlock,text)=>protectedBlock??`>${translate(text)}<`);
  html=html.replace(/\b(aria-label|title|placeholder|alt|content)=("[^"]*"|'[^']*')/gi,(_match,name,quoted)=>`${name}=${quoted[0]}${translate(quoted.slice(1,-1))}${quoted[0]}`);
  await fs.writeFile(file,html);
}
console.log(`Localized ${files.length} built HTML pages across nine languages.`);
