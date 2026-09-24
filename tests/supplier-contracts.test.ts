import assert from 'node:assert/strict';
import test from 'node:test';
import {preferredSupplierCandidate,supplierCandidates} from '../src/lib/suppliers/registry';
import {validateSupplierSearch} from '../src/lib/suppliers/validation';

test('HBX is sandbox ready across every required vertical',()=>{
  assert.equal(preferredSupplierCandidate.id,'hbx');
  assert.deepEqual(new Set(preferredSupplierCandidate.verticals),new Set(['accommodation','transfer','activity']));
  assert.equal(preferredSupplierCandidate.status,'sandbox-ready');
});

test('no supplier is presented as production ready before commercial approval',()=>{
  assert.equal(supplierCandidates.some(candidate=>candidate.status==='production-ready'),false);
});

test('accommodation searches require coherent dates and room allocation',()=>{
  const errors=validateSupplierSearch({vertical:'accommodation',requestId:'proposal-1',locale:'en',currency:'EUR',travellerCountry:'DK',party:{adults:2,childAges:[9]},destination:{name:'Bangkok'},checkIn:'2027-02-12',checkOut:'2027-02-10',rooms:[{adults:2,childAges:[]}]});
  assert.deepEqual(errors,['Accommodation dates must be valid and checkout must follow check-in.','Every traveller must be assigned to a room.']);
});

test('transfer searches require timezone-aware pickup times',()=>{
  const errors=validateSupplierSearch({vertical:'transfer',requestId:'proposal-1',locale:'en',currency:'DKK',travellerCountry:'DK',party:{adults:2,childAges:[]},pickup:{type:'airport',name:'Bangkok Suvarnabhumi',code:'BKK'},dropoff:{type:'hotel',name:'Bangkok hotel'},pickupAt:'2027-02-12T15:30'});
  assert.deepEqual(errors,['pickupAt must include an ISO timestamp and timezone.']);
});
