export interface Location {
  lat: number;
  lng: number;
  address: string;
}

export interface RouteSegment {
  distance: number; // km
  duration: number; // seconds
  startLocation: Location;
  endLocation: Location;
}

export interface VehicleSpecs {
  batteryCapacity: number; // kWh
  rangeKm: number;
  connectorType: string;
  efficiencyKwhPer100km: number;
}
