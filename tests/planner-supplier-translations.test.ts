import {test} from 'node:test';
import assert from 'node:assert/strict';
import {locales,tr} from '../src/i18n';
import {plannerStrings,supplierPlannerStrings} from '../src/content/plannerCopy';

test('supplier hotel copy reaches the React catalogue in every translated locale',()=>{
 for(const locale of locales.filter(locale=>locale!=='en'))for(const source of supplierPlannerStrings){
  assert.ok(plannerStrings.includes(source),`Missing client catalogue entry: ${source}`);
  if(source!=='Suite')assert.notEqual(tr(locale,source),source,`${locale}: ${source}`);
 }
});
