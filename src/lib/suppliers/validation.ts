import type {SupplierSearch} from './contracts';

const isoDate=/^\d{4}-\d{2}-\d{2}$/;
const isoDateTime=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2})$/;
const isoCurrency=/^[A-Z]{3}$/;
const isoCountry=/^[A-Z]{2}$/;

export function validateSupplierSearch(query:SupplierSearch):string[]{
  const errors:string[]=[];
  if(!query.requestId.trim())errors.push('requestId is required.');
  if(!isoCurrency.test(query.currency))errors.push('currency must be an ISO 4217 code.');
  if(!isoCountry.test(query.travellerCountry))errors.push('travellerCountry must be an ISO country code.');
  if(!Number.isInteger(query.party.adults)||query.party.adults<1)errors.push('At least one adult is required.');
  if(query.party.childAges.some(age=>!Number.isInteger(age)||age<0||age>17))errors.push('Every child age must be between 0 and 17.');
  if(query.vertical==='accommodation'){
    if(!isoDate.test(query.checkIn)||!isoDate.test(query.checkOut)||query.checkOut<=query.checkIn)errors.push('Accommodation dates must be valid and checkout must follow check-in.');
    if(!query.rooms.length)errors.push('At least one room is required.');
    const assigned=query.rooms.reduce((total,room)=>total+room.adults+room.childAges.length,0);
    if(assigned!==query.party.adults+query.party.childAges.length)errors.push('Every traveller must be assigned to a room.');
  }
  if(query.vertical==='transfer'){
    if(!isoDateTime.test(query.pickupAt))errors.push('pickupAt must include an ISO timestamp and timezone.');
    if(!query.pickup.name.trim()||!query.dropoff.name.trim())errors.push('Pickup and drop-off locations are required.');
  }
  if(query.vertical==='activity'){
    if(!isoDate.test(query.from)||!isoDate.test(query.to)||query.to<query.from)errors.push('Activity dates must be a valid inclusive range.');
  }
  return errors;
}
