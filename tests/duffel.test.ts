import test from 'node:test';
import assert from 'node:assert/strict';
import {normaliseOffer,sampleFlight,renderFlights} from '../functions/_lib/duffel';
const offer={id:'off_test',live_mode:false,slices:[{segments:[{origin:{iata_code:'CPH'},destination:{iata_code:'BKK'},departing_at:'2027-02-10T14:00:00',arriving_at:'2027-02-11T06:00:00',marketing_carrier:{name:'Test airline',iata_code:'ZZ'},marketing_carrier_flight_number:'101',duration:'PT10H'}]}]};
test('rejects live responses and malformed segments; renderer escapes and labels tests',()=>{assert.throws(()=>normaliseOffer({...offer,live_mode:true}),/Only test/);assert.throws(()=>normaliseOffer({...offer,slices:[]}),/incomplete/);const f=sampleFlight();f.slices[0][0].airline='<script>bad</script>';const html=renderFlights(f);assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('not confirmed flights'));assert.ok(renderFlights(f,'da').includes('Flyrejseplan'))});

test('readable flight table preserves local clocks and provider airport and cabin details',()=>{
 const f=normaliseOffer({...offer,slices:[{segments:[{...offer.slices[0].segments[0],origin:{iata_code:'CPH',city_name:'Copenhagen',name:'Kastrup'},destination:{iata_code:'BKK',city_name:'Bangkok',name:'Suvarnabhumi'},passengers:[{cabin_class:'business'}]}]}]});
 const html=renderFlights(f);
 for(const expected of ['Copenhagen','Kastrup','Suvarnabhumi','14:00','06:00','10 Feb 2027','11 Feb 2027','Business','10h 0m','<table'])assert.ok(html.includes(expected),expected);
 assert.ok(!html.includes('2027-02-10T'));
});

test('renders every connecting flight, layover and stop within a flight',()=>{
 const base=offer.slices[0].segments[0];
 const f=normaliseOffer({...offer,slices:[{segments:[{...base,origin:{iata_code:'CPH'},destination:{iata_code:'LHR',city_name:'London',time_zone:'Europe/London'},departing_at:'2027-02-10T08:00:00',arriving_at:'2027-02-10T09:00:00',marketing_carrier_flight_number:'801'},{...base,origin:{iata_code:'LHR',time_zone:'Europe/London'},destination:{iata_code:'HAN'},departing_at:'2027-02-10T11:30:00',arriving_at:'2027-02-11T06:00:00',marketing_carrier_flight_number:'901',stops:[{airport:{iata_code:'BKK',city_name:'Bangkok'},arriving_at:'2027-02-11T03:00:00',departing_at:'2027-02-11T04:00:00',duration:'PT1H'}]}]}]});
 const html=renderFlights(f);
 for(const expected of ['ZZ 801','ZZ 901','Connection: London (LHR)','09:00','11:30','2h 30m','Stop during this flight: Bangkok (BKK)','03:00','04:00','1h 0m'])assert.ok(html.includes(expected),expected);
 assert.equal(f.slices[0][1].stops?.length,1);
});
test('test offer price is preserved once for the whole itinerary, never invented for missing offers',()=>{
 const f=normaliseOffer({...offer,total_amount:'1234.56',total_currency:'EUR'});assert.equal(f.totalAmount,'1234.56');assert.equal(f.totalCurrency,'EUR');assert.equal(f.source,'duffel-test');assert.equal(normaliseOffer(offer).totalAmount,undefined);
});
