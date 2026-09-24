export type SupplierVertical = 'accommodation'|'transfer'|'activity';
export type SupplierBookingMode = 'redirect'|'agency'|'merchant';
export type SupplierSearchStatus = 'candidate'|'sandbox-pending'|'sandbox-ready'|'production-ready';

export interface Money {
  /** Integer minor units: EUR 123.45 is represented as 12345. */
  amountMinor: number;
  currency: string;
}

export interface TravellerParty {
  adults: number;
  childAges: number[];
}

export interface SupplierSearchContext {
  requestId: string;
  locale: string;
  currency: string;
  party: TravellerParty;
  /** ISO 3166-1 alpha-2 country of the traveller, required by many pricing APIs. */
  travellerCountry: string;
}

export interface AccommodationSearch extends SupplierSearchContext {
  vertical: 'accommodation';
  destination: {name:string; latitude?:number; longitude?:number; supplierCode?:string};
  checkIn: string;
  checkOut: string;
  rooms: Array<{adults:number;childAges:number[]}>;
}

export interface TransferLocation {
  type: 'airport'|'hotel'|'address'|'station'|'port';
  name: string;
  code?: string;
  latitude?: number;
  longitude?: number;
}

export interface TransferSearch extends SupplierSearchContext {
  vertical: 'transfer';
  pickup: TransferLocation;
  dropoff: TransferLocation;
  pickupAt: string;
  returnAt?: string;
  flightNumber?: string;
  luggage?: number;
}

export interface ActivitySearch extends SupplierSearchContext {
  vertical: 'activity';
  destination: {name:string; latitude?:number; longitude?:number; supplierCode?:string};
  from: string;
  to: string;
  interests: string[];
}

export type SupplierSearch = AccommodationSearch|TransferSearch|ActivitySearch;

export interface CancellationTerm {
  refundable: boolean;
  deadline?: string;
  penalty?: Money;
  description: string;
}

export interface SupplierOffer {
  provider: string;
  vertical: SupplierVertical;
  offerId: string;
  productId: string;
  title: string;
  summary: string;
  total: Money;
  bookingMode: SupplierBookingMode;
  cancellation: CancellationTerm[];
  retrievedAt: string;
  /** Short-lived supplier tokens must never be treated as durable product IDs. */
  expiresAt?: string;
  recheckRequired: true;
  sourceUrl?: string;
  attributes: Record<string,string|number|boolean|string[]>;
}

export interface SupplierSearchResult {
  provider: string;
  vertical: SupplierVertical;
  requestId: string;
  offers: SupplierOffer[];
  warnings: string[];
  retrievedAt: string;
}

export interface SupplierCapability {
  provider: string;
  verticals: SupplierVertical[];
  bookingModes: SupplierBookingMode[];
  status: SupplierSearchStatus;
  searchOnly: boolean;
}

/**
 * Stage 2 deliberately stops at search and normalization. Booking, payment,
 * cancellation and traveller-data submission require separate reviewed APIs.
 */
export interface SupplierSearchAdapter<TSearch extends SupplierSearch = SupplierSearch> {
  capability: SupplierCapability;
  search(query: TSearch, signal: AbortSignal): Promise<SupplierSearchResult>;
  recheck(offerId: string, query: TSearch, signal: AbortSignal): Promise<SupplierOffer>;
}
