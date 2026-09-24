import type {SupplierBookingMode,SupplierSearchStatus,SupplierVertical} from './contracts';

export type SupplierCandidateId = 'hbx'|'mozio'|'viator'|'booking-demand'|'expedia-rapid';

export interface SupplierCandidate {
  id: SupplierCandidateId;
  name: string;
  verticals: SupplierVertical[];
  bookingModes: SupplierBookingMode[];
  status: SupplierSearchStatus;
  priority: 1|2|3;
  recommendedUse: string;
  onboarding: 'self-service-evaluation'|'partner-approval'|'commercial-contact';
}

export const supplierCandidates:SupplierCandidate[]=[
  {id:'hbx',name:'HBX / Hotelbeds API Suite',verticals:['accommodation','transfer','activity'],bookingModes:['agency','merchant'],status:'sandbox-ready',priority:1,recommendedUse:'Evaluation-only search integration for all three product types; no live booking or commercial onboarding.',onboarding:'self-service-evaluation'},
  {id:'mozio',name:'Mozio',verticals:['transfer'],bookingModes:['redirect','agency'],status:'candidate',priority:2,recommendedUse:'Specialist transfer benchmark and possible production transfer provider.',onboarding:'commercial-contact'},
  {id:'viator',name:'Viator Partner API',verticals:['activity'],bookingModes:['redirect','agency','merchant'],status:'candidate',priority:2,recommendedUse:'Specialist activity benchmark with affiliate and transactional access tiers.',onboarding:'partner-approval'},
  {id:'booking-demand',name:'Booking.com Demand API',verticals:['accommodation','activity'],bookingModes:['redirect','agency'],status:'candidate',priority:3,recommendedUse:'Later accommodation alternative; attractions access remains scope-dependent.',onboarding:'partner-approval'},
  {id:'expedia-rapid',name:'Expedia Rapid',verticals:['accommodation','activity'],bookingModes:['agency','merchant'],status:'candidate',priority:3,recommendedUse:'Later accommodation alternative after partner approval and launch review.',onboarding:'partner-approval'},
];

export const preferredSupplierCandidate=supplierCandidates.find(candidate=>candidate.priority===1)!;
