import fs from 'node:fs';
import {parse} from 'parse5';
const credits=new Set(['Joseph Gonzalez / Unsplash','Hunters Race / Unsplash']);
function texts(html){
 const result=[];
 function walk(node){
  if(['script','style','svg'].includes(node.tagName)||node.attrs?.some(a=>a.name==='translate'&&a.value==='no'))return;
  if(node.nodeName==='#text'){const value=node.value.replace(/\s+/g,' ').trim();if(value)result.push(value);}
  for(const attr of node.attrs??[])if(['alt','aria-label','placeholder','content','title'].includes(attr.name)&&!/^https?:/.test(attr.value))result.push(attr.value);
  for(const child of node.childNodes??[])walk(child);
 }
 walk(parse(html));return result;
}
const files=fs.readdirSync('dist/en',{recursive:true}).filter(p=>p.endsWith('.html'));
const failures=[];
for(const locale of ['es','it','fr','nl','hu','sv','da','no'])for(const file of files){
 const path=`dist/${locale}/${file}`;
 if(!fs.existsSync(path)){failures.push(`Missing page: ${path}`);continue;}
 const english=texts(fs.readFileSync(`dist/en/${file}`,'utf8'));
 const translated=new Set(texts(fs.readFileSync(path,'utf8')));
 for(const text of english)if(text.length>22&&/[a-zA-Z]{3} [a-zA-Z]{3}/.test(text)&&translated.has(text)&&!credits.has(text)&&!/^(USD|EUR|HUF|SEK|DKK|NOK)/.test(text))failures.push(`${locale}/${file}: English text: ${text}`);
 for(const text of translated)if(/\{(?:country|duration|day)\}/.test(text))failures.push(`${locale}/${file}: Unresolved placeholder: ${text}`);
}
if(failures.length)throw new Error(`Rendered translation checks failed:\n${failures.join('\n')}`);
console.log(`Rendered translation checks passed for ${files.length*8} localized pages, including metadata and accessible labels.`);
