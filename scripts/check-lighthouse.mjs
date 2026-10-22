// Preserve the existing Lighthouse thresholds without Lighthouse CI's archive-extraction dependency.
import {createServer} from 'node:http';
import {readFile,mkdir,stat} from 'node:fs/promises';
import path from 'node:path';
import lighthouse from 'lighthouse';
import {launch} from 'chrome-launcher';
const config=JSON.parse(await readFile(new URL('../lighthouserc.json',import.meta.url)));
const root=path.resolve('dist');
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.avif':'image/avif','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  let target=path.resolve(root,'.'+pathname);
  if(!target.startsWith(root+path.sep)&&target!==root)throw new Error('Invalid path');
  if((await stat(target)).isDirectory())target=path.join(target,'index.html');
  res.setHeader('Content-Type',mime[path.extname(target)]??'application/octet-stream');res.end(await readFile(target));
 }catch{res.writeHead(404);res.end('Not found')}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const port=server.address().port;
let chrome;let failures=0;
try{
 chrome=await launch({chromeFlags:['--headless','--no-sandbox']});
 await mkdir('.lighthouseci',{recursive:true});
 for(const [index,original] of config.ci.collect.url.entries()){
  const url=new URL(original);url.hostname='127.0.0.1';url.port=String(port);
  const result=await lighthouse(url.href,{port:chrome.port,output:'json',onlyCategories:['performance','accessibility','seo'],logLevel:'error'});
  if(!result||result.lhr.runtimeError)throw new Error('Lighthouse did not complete: '+JSON.stringify(result?.lhr.runtimeError));
  await import('node:fs/promises').then(fs=>fs.writeFile(`.lighthouseci/report-${index}.json`,result.report));
  for(const [name,[severity,threshold]] of Object.entries(config.ci.assert.assertions)){
   const actual=name.startsWith('categories:')?result.lhr.categories[name.split(':')[1]]?.score:result.lhr.audits[name]?.numericValue;
   const pass=typeof actual==='number'&&(threshold.minScore===undefined||actual>=threshold.minScore)&&(threshold.maxNumericValue===undefined||actual<=threshold.maxNumericValue);
   console.log(`${pass?'PASS':severity.toUpperCase()} ${url.pathname} ${name}: ${actual}`);
   if(!pass&&severity==='error')failures++;
  }
 }
}finally{if(chrome)await chrome.kill();await new Promise(resolve=>server.close(resolve))}
if(failures)process.exitCode=1;
