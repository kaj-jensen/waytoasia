import assert from 'node:assert/strict';
import test from 'node:test';
import {planningEstimateLabel} from '../functions/api/trip-enquiry';

test('formats only the expected locale currency for a saved proposal',()=>{
  const suggestion={priceEstimate:{currency:'DKK',totalLow:62500,totalHigh:81000}};
  assert.match(planningEstimateLabel(suggestion,'da'),/62\.500/);
  assert.equal(planningEstimateLabel({...suggestion,priceEstimate:{currency:'EUR',totalLow:8000,totalHigh:10000}},'da'),'');
});
