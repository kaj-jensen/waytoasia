import {readFile,readdir} from 'node:fs/promises';
import {parse} from 'parse5';
import assert from 'node:assert/strict';
const origin='https://waytoasia.com';
const locales=['en','es','it','fr','nl','hu','sv','da','no'];
const pages=new Map();
async function walk(directory){for(const entry of await readdir(directory,{withFileTypes:true})){const path=`${directory}/${entry.name}`;if(entry.isDirectory())await walk(path);else if(entry.name.endsWith('.html')){const route=path.slice(4).replace(/index\.html$/,'');const nodes=[];function visit(node){if(node.tagName)nodes.push(node);for(const child of node.childNodes??[])visit(child);}visit(parse(await readFile(path,'utf8')));pages.set(route,nodes);}}}
await walk('dist');
const attr=(node,name)=>node.attrs?.find(attr=>attr.name===name)?.value;
let checked=0;
for(const [route,nodes] of pages){
 const locale=route.split('/')[1];
 if(!locales.includes(locale))continue;
 const canonical=nodes.find(node=>node.tagName==='link'&&attr(node,'rel')==='canonical');
 assert.equal(attr(canonical,'href'),origin+route,`${route}: canonical must match the final static URL`);
 const ogUrl=nodes.find(node=>node.tagName==='meta'&&attr(node,'property')==='og:url');assert.equal(attr(ogUrl,'content'),origin+route,`${route}: social URL must not be translated`);
 const title=nodes.find(node=>node.tagName==='title')?.childNodes?.map(node=>node.value??'').join('');
 const data=nodes.filter(node=>node.tagName==='script'&&attr(node,'type')==='application/ld+json').map(node=>JSON.parse(node.childNodes.map(child=>child.value??'').join('')));
 const webpage=data.flatMap(item=>item['@graph']??[]).find(item=>item['@type']==='WebPage');assert.equal(webpage?.url,origin+route);assert.equal(webpage?.name,title,`${route}: structured title must be localized`);
 if(/^\/(?:en|es|it|fr|nl|hu|sv|da|no)\/inspiration\/[^/]+\/$/.test(route)){const article=data.find(item=>item['@type']==='BlogPosting');assert.equal(article?.mainEntityOfPage,origin+route);assert.equal(article?.inLanguage,locale);assert.ok(article?.datePublished);}
 assert.equal(nodes.filter(node=>node.tagName==='h1').length,1,`${route}: one main heading`);
 assert.ok(nodes.some(node=>node.tagName==='meta'&&attr(node,'name')==='description'&&attr(node,'content')),`${route}: description`);
 const alternates=nodes.filter(node=>node.tagName==='link'&&attr(node,'rel')==='alternate'&&attr(node,'hreflang'));
 assert.equal(alternates.length,10,`${route}: nine locales and x-default`);
 for(const alternate of alternates){const language=attr(alternate,'hreflang');const expected=route.replace(`/${locale}/`,`/${language==='x-default'?'en':language}/`);assert.equal(attr(alternate,'href'),origin+expected,`${route}: alternate ${language}`);assert.ok(pages.has(expected),`${route}: alternate exists`);}
 for(const link of nodes.filter(node=>node.tagName==='a')){const href=attr(link,'href');if(!href?.startsWith('/')||href.startsWith('//'))continue;const target=new URL(href,origin).pathname.replace(/\/?$/,'/');if(locales.includes(target.split('/')[1]))assert.ok(pages.has(target),`${route}: internal link ${href} exists`);}
 if(/^\/(?:en|es|it|fr|nl|hu|sv|da|no)\/(?:china|south-korea|thailand|vietnam|indonesia)\/(?:tours\/)?$/.test(route))assert.equal(nodes.filter(node=>node.tagName==='article'&&(attr(node,'class')??'').split(' ').includes('card')).length,4,`${route}: all four country tours`);
 checked++;
}
const sitemap=await readFile('dist/sitemap-0.xml','utf8');const urls=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match=>match[1]);
assert.equal(urls.length,checked,'sitemap includes only canonical content pages');for(const url of urls)assert.ok(pages.has(url.slice(origin.length)));
for(const route of ['/404.html','/privacy/'])assert.ok(pages.get(route)?.some(node=>node.tagName==='meta'&&attr(node,'name')==='robots'&&attr(node,'content')?.includes('noindex')),`${route}: alias and error pages must not be indexed`);
assert.equal(pages.get('/404.html').filter(node=>node.tagName==='link'&&attr(node,'hreflang')).length,0,'404 must not advertise nonexistent translations');
console.log(`SEO checks passed: ${checked} canonical pages, reciprocal language links, internal locale links, 90 country catalogues and clean sitemap.`);
