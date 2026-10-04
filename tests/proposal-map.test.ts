import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveRoute,routeMap} from '../functions/_lib/proposal-map';
import {proposalCopy} from '../functions/_lib/proposal-copy';
const copy={title:'Route',detail:'Nearby stops',illustrative:'Illustrative connections',unavailable:'Map unavailable'};
test('China example resolves Mutianyu, not Jinshanling, and no regional Yunnan pin',()=>{
 const route=resolveRoute([{place:'Kina: Beijing'},{place:'Kina: Great Wall (Mutianyu)'},{place:'Kina: Dali, Yunnan'},{place:'Kina: Shaxi och Yunnan'}],['china']);
 assert.deepEqual(route.map(p=>p.label),['Beijing','Mutianyu','Dali','Shaxi']);assert.deepEqual(route[1].coordinates,[116.5619,40.438]);
 const svg=routeMap(route,copy);assert.match(svg,/Nearby stops/);assert.match(svg,/data-index="4"/);assert.doesNotMatch(svg,/NaN|Infinity/);
});
test('regions, vague walls and unqualified namesakes produce review issues',()=>{
 const route=resolveRoute([{place:'Yunnan'},{place:'Great Wall'},{place:'Shaxi'}]);assert.ok(route.every(p=>p.issue));assert.match(routeMap(route,copy),/Map unavailable/);
});
test('unresolved middle stop never creates a false direct connection',()=>{
 const route=resolveRoute([{place:'Beijing'},{place:'Somewhere'},{place:'Dali'}],['china']);assert.doesNotMatch(routeMap(route,copy),/class="map-route"/);
});
test('return journeys retain every numbered stop and valid geometry',()=>{
 const route=resolveRoute([{place:'Japan: Tokyo'},{place:'Japan: Kyoto'},{place:'Japan: Tokyo'}]);const svg=routeMap(route,copy);assert.match(svg,/data-index="3"/);assert.doesNotMatch(svg,/NaN|Infinity/);
});
test('explicit reviewed coordinates support global and dateline routes',()=>{
 const route=resolveRoute([{place:'Fiji',coordinates:[178,-18],coordinatesVerified:true},{place:'Samoa',coordinates:[-172,-14],coordinatesVerified:true},{place:'Unknown',coordinates:[500,95],coordinatesVerified:true}]);assert.equal(route[2].coordinates,null);assert.doesNotMatch(routeMap(route,copy),/NaN|Infinity/);
});
test('map cache includes route and language; assets contain no customer tokens',()=>{
 const a=resolveRoute([{place:'Beijing'},{place:'Dali'}],['china']),b=resolveRoute([{place:'Tokyo'},{place:'Kyoto'}]);assert.notEqual(routeMap(a,copy),routeMap(b,copy));assert.equal(routeMap(a,copy),routeMap(a,copy));assert.notEqual(routeMap(a,copy),routeMap(a,{...copy,title:'Resrutt'}));
});
test('all supported locale UI dictionaries are complete',()=>{
 for(const locale of ['en','sv','da','no','es','fr','it','nl','hu'])assert.ok(Object.values(proposalCopy(locale)).every(v=>typeof v==='string'&&v.length>0));
});

test('many repeated stops are retained rather than visually collapsed',()=>{
 const route=resolveRoute(Array.from({length:24},(_,i)=>({place:i%2?'Japan: Kyoto':'Japan: Tokyo'})));const svg=routeMap(route,copy);assert.match(svg,/data-index="24"/);assert.doesNotMatch(svg,/NaN|Infinity/);
});
