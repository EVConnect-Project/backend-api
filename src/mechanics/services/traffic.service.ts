import { Injectable } from "@nestjs/common";
import axios from "axios";

export interface TrafficData {
  distanceKm: number;
  durationMinutes: number;
  durationInTrafficMinutes: number;
  trafficLevel: "low" | "moderate" | "heavy" | "severe";
  estimatedArrival: Date;
  routeSummary: string;
}

@Injectable()
export class TrafficService {
  private readonly GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
  private readonly MAPBOX_API_KEY = process.env.MAPBOX_API_KEY;

  /**
   * Get real-time traffic-aware ETA between two points
   */
  async getTrafficAwareETA(
    originLat: number,
    originLng: number,
    destinationLat: number,
    destinationLng: number,
  ): Promise<TrafficData> {
    try {
      // Try Google Maps Directions API first (best traffic data)
      if (this.GOOGLE_MAPS_API_KEY) {
        return await this.getGoogleMapsETA(
          originLat,
          originLng,
          destinationLat,
          destinationLng,
        );
      }

      // Fallback to Mapbox
      if (this.MAPBOX_API_KEY) {
        return await this.getMapboxETA(
          originLat,
          originLng,
          destinationLat,
          destinationLng,
        );
      }

      // Final fallback: haversine distance + estimated speed
      return this.getFallbackETA(
        originLat,
        originLng,
        destinationLat,
        destinationLng,
      );
    } catch (error) {
      console.warn("Traffic API error, using fallback:", error.message);
      return this.getFallbackETA(
        originLat,
        originLng,
        destinationLat,
        destinationLng,
      );
    }
  }

  /**
   * Google Maps Directions API with real-time traffic
   */
  private async getGoogleMapsETA(
    originLat: number,
    originLng: number,
    destinationLat: number,
    destinationLng: number,
  ): Promise<TrafficData> {
    const url = "https://maps.googleapis.com/maps/api/directions/json";

    const response = await axios.get(url, {
      params: {
        origin: `${originLat},${originLng}`,
        destination: `${destinationLat},${destinationLng}`,
        departure_time: "now", // Critical for traffic data
        traffic_model: "best_guess",
        mode: "driving",
        key: this.GOOGLE_MAPS_API_KEY,
      },
      timeout: 5000,
    });

    if (response.data.status !== "OK" || !response.data.routes?.[0]) {
      throw new Error(`Google Maps API error: ${response.data.status}`);
    }

    const route = response.data.routes[0];
    const leg = route.legs[0];

    const distanceKm = leg.distance.value / 1000;
    const durationMinutes = Math.round(leg.duration.value / 60);
    const durationInTrafficMinutes = leg.duration_in_traffic
      ? Math.round(leg.duration_in_traffic.value / 60)
      : durationMinutes;

    const trafficDelay = durationInTrafficMinutes - durationMinutes;
    const trafficLevel = this.calculateTrafficLevel(
      trafficDelay,
      durationMinutes,
    );

    return {
      distanceKm,
      durationMinutes,
      durationInTrafficMinutes,
      trafficLevel,
      estimatedArrival: new Date(
        Date.now() + durationInTrafficMinutes * 60 * 1000,
      ),
      routeSummary: leg.summary || route.summary,
    };
  }

  /**
   * Mapbox Directions API with traffic
   */
  private async getMapboxETA(
    originLat: number,
    originLng: number,
    destinationLat: number,
    destinationLng: number,
  ): Promise<TrafficData> {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${originLng},${originLat};${destinationLng},${destinationLat}`;

    const response = await axios.get(url, {
      params: {
        access_token: this.MAPBOX_API_KEY,
        geometries: "geojson",
        overview: "simplified",
      },
      timeout: 5000,
    });

    if (!response.data.routes?.[0]) {
      throw new Error("Mapbox API error: No routes found");
    }

    const route = response.data.routes[0];
    const distanceKm = route.distance / 1000;
    const durationMinutes = Math.round(route.duration / 60);

    // Mapbox provides duration_typical for non-traffic time
    const durationTypical = route.duration_typical
      ? Math.round(route.duration_typical / 60)
      : durationMinutes;

    const trafficDelay = durationMinutes - durationTypical;
    const trafficLevel = this.calculateTrafficLevel(
      trafficDelay,
      durationTypical,
    );

    return {
      distanceKm,
      durationMinutes: durationTypical,
      durationInTrafficMinutes: durationMinutes,
      trafficLevel,
      estimatedArrival: new Date(Date.now() + durationMinutes * 60 * 1000),
      routeSummary: "Via major roads",
    };
  }

  /**
   * Fallback ETA calculation using haversine distance
   */
  private getFallbackETA(
    originLat: number,
    originLng: number,
    destinationLat: number,
    destinationLng: number,
  ): Promise<TrafficData> {
    const distanceKm = this.calculateDistance(
      originLat,
      originLng,
      destinationLat,
      destinationLng,
    );

    // Estimate time: city average 30 km/h, highway 60 km/h
    // Use 40 km/h as reasonable average with traffic
    const averageSpeed = 40; // km/h
    const durationMinutes = Math.round((distanceKm / averageSpeed) * 60);

    // Add 20% buffer for city traffic
    const durationInTrafficMinutes = Math.round(durationMinutes * 1.2);

    return Promise.resolve({
      distanceKm,
      durationMinutes,
      durationInTrafficMinutes,
      trafficLevel: "moderate" as const,
      estimatedArrival: new Date(
        Date.now() + durationInTrafficMinutes * 60 * 1000,
      ),
      routeSummary: "Estimated route",
    });
  }

  /**
   * Calculate haversine distance between two points
   */
  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Determine traffic level based on delay
   */
  private calculateTrafficLevel(
    delayMinutes: number,
    normalDuration: number,
  ): TrafficData["trafficLevel"] {
    const delayPercent = (delayMinutes / normalDuration) * 100;

    if (delayPercent < 10) return "low";
    if (delayPercent < 30) return "moderate";
    if (delayPercent < 50) return "heavy";
    return "severe";
  }

  /**
   * Get multiple mechanic ETAs in parallel
   */
  async getBulkETAs(
    originLat: number,
    originLng: number,
    mechanics: Array<{ lat: number; lng: number; id: string }>,
  ): Promise<Map<string, TrafficData>> {
    const etaPromises = mechanics.map(async (mechanic) => {
      const eta = await this.getTrafficAwareETA(
        mechanic.lat,
        mechanic.lng,
        originLat,
        originLng,
      );
      return { id: mechanic.id, eta };
    });

    const results = await Promise.all(etaPromises);
    const etaMap = new Map<string, TrafficData>();

    results.forEach(({ id, eta }) => {
      etaMap.set(id, eta);
    });

    return etaMap;
  }
}
