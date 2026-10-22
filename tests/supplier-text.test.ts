import test from 'node:test';
import assert from 'node:assert/strict';
import {supplierText} from '../src/lib/supplier-text.ts';
test('parses supplier markup as plain text and excludes executable content',()=>{
 assert.equal(supplierText('<p>Coast &amp; forest</p><script>alert(1)</script><style>bad</style>'),'Coast & forest');
 assert.equal(supplierText('<img src=x onerror=alert(1)>Safe stay'),'Safe stay');
 assert.equal(supplierText('x'.repeat(1000),100).length,100);
});
