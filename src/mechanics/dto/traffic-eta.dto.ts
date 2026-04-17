import { IsNumber, IsString, IsOptional } from "class-validator";

export class TrafficETADto {
  @IsNumber()
  originLat: number;

  @IsNumber()
  originLng: number;

  @IsNumber()
  destinationLat: number;

  @IsNumber()
  destinationLng: number;

  @IsOptional()
  @IsString()
  travelMode?: "driving" | "walking" | "bicycling" | "transit";
}

export interface TrafficETAResponse {
  distanceKm: number;
  durationMinutes: number;
  durationInTrafficMinutes: number;
  trafficLevel: "low" | "moderate" | "heavy" | "severe";
  estimatedArrival: string;
  routeSummary: string;
}
