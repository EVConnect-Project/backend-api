import { Controller, Get, Query, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Controller("directions")
export class DirectionsController {
  private readonly logger = new Logger(DirectionsController.name);
  private readonly googleApiKey: string;

  constructor(private configService: ConfigService) {
    this.googleApiKey =
      this.configService.get<string>("GOOGLE_MAPS_API_KEY") ||
      "AIzaSyC9HoLlBFBxkOADOS5OXBU1nF2Rbw5os6w";
  }

  /**
   * GET /api/directions/route
   * Server-side routing proxy. Tries Google Directions API first,
   * falls back to OSRM if Google fails. API keys never leave the server.
   */
  @Get("route")
  async getRoute(
    @Query("originLat") originLat: string,
    @Query("originLng") originLng: string,
    @Query("destLat") destLat: string,
    @Query("destLng") destLng: string,
    @Query("mode") mode: string = "driving",
  ) {
    // --- Try Google Directions API first ---
    try {
      const result = await this.fetchGoogleRoute(
        originLat,
        originLng,
        destLat,
        destLng,
        mode,
      );
      if (result.status === "OK" && result.routes?.length > 0) {
        this.logger.log(
          `Google route: ${result.routes[0].legs?.[0]?.distance?.text} | ` +
            `${result.routes[0].legs?.[0]?.steps?.length} steps`,
        );
        return { source: "google", ...result };
      }
      this.logger.warn(
        `Google returned status: ${result.status} — ${result.error_message || ""}`,
      );
    } catch (e) {
      this.logger.warn(`Google Directions failed: ${e.message}`);
    }

    // --- Fallback: OSRM (free, no key needed) ---
    try {
      const result = await this.fetchOsrmRoute(
        originLat,
        originLng,
        destLat,
        destLng,
      );
      this.logger.log(
        `OSRM route: ${(result.routes[0].distance / 1000).toFixed(1)} km | ` +
          `${result.routes[0].legs?.[0]?.steps?.length} steps`,
      );
      return { source: "osrm", ...result };
    } catch (e) {
      this.logger.error(`OSRM fallback failed: ${e.message}`);
    }

    return { source: "none", status: "ZERO_RESULTS", routes: [] };
  }

  private async fetchGoogleRoute(
    originLat: string,
    originLng: string,
    destLat: string,
    destLng: string,
    mode: string,
  ) {
    const url =
      `https://maps.googleapis.com/maps/api/directions/json` +
      `?origin=${originLat},${originLng}` +
      `&destination=${destLat},${destLng}` +
      `&mode=${mode}` +
      `&key=${this.googleApiKey}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  }

  private async fetchOsrmRoute(
    originLat: string,
    originLng: string,
    destLat: string,
    destLng: string,
  ) {
    // OSRM uses lng,lat order
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${originLng},${originLat};${destLng},${destLat}` +
      `?overview=full&geometries=polyline&steps=true`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    if (data.code !== "Ok") {
      throw new Error(`OSRM error: ${data.code}`);
    }
    return data;
  }
}
