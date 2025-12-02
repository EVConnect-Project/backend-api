export class ChargingStop {
  chargerId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  powerKw: number;
  pricePerKwh: number;
  status: string;
  estimatedChargingTime: number; // minutes
  estimatedCost: number;
  energyNeeded: number; // kWh
  batteryOnArrival: number; // percentage
  batteryAfterCharging: number; // percentage
  distanceFromPrevious: number; // km
  isAvailable: boolean;
}

export class RouteResponseDto {
  totalDistance: number; // km
  estimatedTime: string; // e.g., "3h 45min"
  totalCost: number;
  chargingStops: ChargingStop[];
  routePolyline?: string;
  startLocation: {
    lat: number;
    lng: number;
    address: string;
  };
  endLocation: {
    lat: number;
    lng: number;
    address: string;
  };
  energyConsumption: number; // Total kWh needed
  recommendedDepartureBattery: number; // percentage
}
