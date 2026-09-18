import fs from 'node:fs';
import ts from 'typescript';
const load=async file=>import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64'));
const data=await load('src/content/data.ts');
const {tourOverviews}=await load('src/content/tourOverviews.ts');
const structural=new Set(['slug','country','styles','prices','image','hero','tile','gallery','code','tripCode','published','nativeName','day']);
const strings=new Set();
function collect(value,key=''){if(structural.has(key))return;if(typeof value==='string'){if(value.trim()&&!/^(https?:|\/images\/)/.test(value))strings.add(value.trim());}else if(Array.isArray(value))value.forEach(v=>collect(v,key));else if(value&&typeof value==='object')Object.entries(value).forEach(([k,v])=>collect(v,k));}
[data.countries,data.tours,data.journeyStyles,data.articles,tourOverviews].forEach(v=>collect(v));
for(const file of fs.readdirSync('src',{recursive:true}).filter(p=>/\.(astro|tsx|ts)$/.test(p))){
 const source=fs.readFileSync('src/'+file,'utf8');
 for(const m of source.matchAll(/\b(?:copy|tr)\((?:locale,)?\s*(['"])((?:\\.|(?!\1).)*)\1/g))strings.add(m[2].replaceAll("\\'","'"));
}
export const requiredStrings=[...strings].sort();
