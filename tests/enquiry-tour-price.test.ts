import test from 'node:test';
import assert from 'node:assert/strict';
import {enquiryTourPrice} from '../functions/_lib/enquiry-tour-price';
test('published price handles missing party size, children, unsupported currencies and unrelated enquiries',()=>{
 const price=(v:Record<string,unknown>)=>enquiryTourPrice(JSON.stringify({tour:'silk-and-courtyards',...v}));
 assert.equal(price({adults:2,children:1})!.partyTotal,null);
 assert.equal(price({})!.partyTotal,null);
 assert.equal(price({adults:2,children:0,budgetCurrency:'DKK'})!.partyTotal,98400);
 assert.equal(price({adults:2,budgetCurrency:'XYZ'})!.currency,'EUR');
 assert.equal(price({tour:'unknown'}),null);assert.equal(enquiryTourPrice('null'),null);assert.equal(enquiryTourPrice('invalid'),null);
});
