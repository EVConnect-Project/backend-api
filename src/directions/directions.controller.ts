import { Controller, Get, Query, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Controller("directions")
export class DirectionsController {
  private readonly logger = new Logger(DirectionsController.name);
  private readonly googleApiKey: string;

  constructor(private configService: ConfigService) {
    this.googleApiKey =
      this.configService.get<string>("GOOGLE_MAPS_API_KEY") || "";
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
    @Query("waypoints") waypoints: string = "",
    @Query("mode") mode: string = "driving",
  ) {
    // --- Try Google Directions API first ---
    if (this.googleApiKey.length > 0) {
      try {
        const result = await this.fetchGoogleRoute(
          originLat,
          originLng,
          destLat,
          destLng,
          waypoints,
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
    } else {
      this.logger.warn("GOOGLE_MAPS_API_KEY is not configured; using OSRM fallback");
    }

    // --- Fallback: OSRM (free, no key needed) ---
    try {
      const result = await this.fetchOsrmRoute(
        originLat,
        originLng,
        destLat,
        destLng,
        waypoints,
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
    waypoints: string,
    mode: string,
  ) {
    const waypointsQuery = waypoints.trim().length === 0
      ? ""
      : `&waypoints=${encodeURIComponent(waypoints)}`;

    const url =
      `https://maps.googleapis.com/maps/api/directions/json` +
      `?origin=${originLat},${originLng}` +
      `&destination=${destLat},${destLng}` +
      waypointsQuery +
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
    waypoints: string,
  ) {
    const waypointPairs = waypoints
      .split("|")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
      .map((entry) => entry.split(","))
      .filter(
        (coords) =>
          coords.length == 2 &&
          Number.isFinite(Number(coords[0])) &&
          Number.isFinite(Number(coords[1])),
      )
      .map((coords) => `${coords[1]},${coords[0]}`);

    const coordinates = [
      `${originLng},${originLat}`,
      ...waypointPairs,
      `${destLng},${destLat}`,
    ].join(";");

    // OSRM uses lng,lat order
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${coordinates}` +
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
