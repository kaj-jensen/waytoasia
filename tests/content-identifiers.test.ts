import assert from 'node:assert/strict';
import test from 'node:test';
import {locales,localizeContent,tr} from '../src/i18n';
import {countries,tours,articles,journeyStyles} from '../src/content/data';
import {photoSize,photoSrcSet} from '../src/lib/photoSize';
import images from '../src/content/journalImageVariants.json';

test('translated content preserves routes and filter identifiers in every locale',()=>{
 for(const locale of locales){
  for(const country of countries){const translated=localizeContent(locale,country);assert.equal(translated.slug,country.slug);assert.equal(translated.name,tr(locale,country.name));assert.equal(tours.filter(tour=>tour.country===translated.slug).length,4);}
  for(const tour of tours){const translated=localizeContent(locale,tour);assert.equal(translated.slug,tour.slug);assert.equal(translated.country,tour.country);assert.deepEqual(translated.styles,tour.styles);}
  for(const item of [...articles,...journeyStyles])assert.equal(localizeContent(locale,item).slug,item.slug);
 }
 assert.equal(localizeContent('hu',countries.find(country=>country.slug==='china')!).name,'Kína');
});

test('responsive journal images use actual dimensions and preserve photograph identity',()=>{
 for(const [source,image] of Object.entries(images)){
  const srcset=photoSrcSet(source,[480,768,1200,1600])!;
  assert.ok(srcset);
  for(const variant of image.variants){assert.ok(srcset.includes(`${variant.src} ${variant.width}w`));assert.ok(variant.src.includes(source.split('/').at(-1)!.replace('.jpg','')+'-'));assert.ok(variant.width<=image.width);}
  assert.equal(photoSize(source,768),image.variants.find(variant=>variant.width>=768)?.src??image.variants.at(-1)!.src);
 }
 const local=photoSrcSet('/images/destinations/south-korea-hero-1600.webp',[240,480,720])!;
 assert.ok(local.includes('480.webp 480w'));assert.ok(local.includes('768.webp 768w'));assert.ok(!local.includes(' 240w'));assert.equal(local.split(', ').length,2);
});
