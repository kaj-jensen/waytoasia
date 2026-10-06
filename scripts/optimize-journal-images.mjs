import sharp from 'sharp';
import {readdir,mkdir,writeFile} from 'node:fs/promises';
const source='public/images/journal';
const output=`${source}/responsive`;
await mkdir(output,{recursive:true});
const manifest={};
for(const file of (await readdir(source)).filter(file=>file.endsWith('.jpg')).sort()){
 const image=sharp(`${source}/${file}`);const {width,height}=await image.metadata();
 const widths=[...new Set([480,768,1200,1600].map(size=>Math.min(size,width)))];
 const variants=[];
 for(const size of widths){const name=`${file.slice(0,-4)}-${size}.webp`;const info=await image.clone().resize({width:size,withoutEnlargement:true}).webp({quality:82}).toFile(`${output}/${name}`);variants.push({src:`/images/journal/responsive/${name}`,width:info.width,height:info.height});}
 manifest[`/images/journal/${file}`]={width,height,variants};
}
await writeFile('src/content/journalImageVariants.json',JSON.stringify(manifest,null,2)+'\n');
console.log(`Generated responsive versions of ${Object.keys(manifest).length} existing journal photographs.`);
