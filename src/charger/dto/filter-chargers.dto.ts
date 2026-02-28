export class FilterChargersDto {
  // Location filters
  lat?: number;
  lng?: number;
  radius?: number; // km

  // Power filters
  minPowerKw?: number;
  maxPowerKw?: number;
  speedTypes?: string[]; // ['ac_slow', 'ac_fast', 'dc_fast', 'dc_rapid', 'ultra_rapid']

  // Connector filters
  connectorTypes?: string[]; // ['type1', 'type2', 'ccs1', 'ccs2', 'chademo', 'tesla']

  // Price filters
  minPrice?: number; // per kWh
  maxPrice?: number; // per kWh

  // Availability
  availableNow?: boolean;

  // Booking Modes
  bookingModes?: string[]; // ['pre_booking_required', 'walk_in_only', 'hybrid']

  // Amenities (if added to charger entity in future)
  amenities?: string[]; // ['wifi', 'restroom', 'restaurant', 'parking', 'shelter']

  // Sorting
  sortBy?: 'distance' | 'price' | 'power' | 'rating';
  sortOrder?: 'asc' | 'desc';

  // Pagination
  limit?: number;
  offset?: number;
}
