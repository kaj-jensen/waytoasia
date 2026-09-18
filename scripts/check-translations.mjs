import fs from 'node:fs';
import {requiredStrings} from './translation-inventory.mjs';
const generated=JSON.parse(fs.readFileSync(new URL('../src/content/translations.generated.json',import.meta.url),'utf8'));
const placeholders=value=>(value.match(/\{\w+\}/g)??[]).sort().join('|');
const failures=[];
for(const locale of Object.keys(generated).filter(locale=>locale!=='en')){
 const editorial=JSON.parse(fs.readFileSync(new URL(`../src/content/editorial/${locale}.json`,import.meta.url),'utf8'));
 const catalog={...generated[locale],...editorial};
 for(const source of requiredStrings){
  const translation=catalog[source];
  if(!translation?.trim())failures.push(`${locale}: Missing: ${source}`);
  else if(source===translation&&source.length>35&&/[a-z]{3} [a-z]{3}/i.test(source))failures.push(`${locale}: English fallback: ${source}`);
 }
 for(const [source,translation]of Object.entries(catalog)){
  if(placeholders(source)!==placeholders(translation))failures.push(`${locale}: Changed placeholders: ${source}`);
  if(source.split('Way to Asia').length!==translation.split('Way to Asia').length)failures.push(`${locale}: Changed brand: ${source}`);
 }
}
if(failures.length)throw new Error(`Translation validation failed:\n${failures.join('\n')}`);
console.log(`Translation coverage passed: ${requiredStrings.length} active content strings in all eight translated locales; placeholders and brand preserved.`);
