import { BadRequestException } from "@nestjs/common";
import { SmartTripPlannerService } from "./smart-trip-planner.service";

describe("SmartTripPlannerService", () => {
  const chargerRepositoryMock = {
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const vehicleRepositoryMock = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const httpServiceMock = {
    get: jest.fn(),
  };

  let service: SmartTripPlannerService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SmartTripPlannerService(
      chargerRepositoryMock as any,
      vehicleRepositoryMock as any,
      httpServiceMock as any,
    );
  });

  it("throws when road-based fallback geometry is unavailable", async () => {
    jest.spyOn(service as any, "getOsrmDirections").mockResolvedValue([]);

    await expect(
      (service as any).getFallbackRoute(6.9271, 79.8612, 7.2906, 80.6337, []),
    ).rejects.toThrow(BadRequestException);
  });

  it("ranks chargers by route-corridor proximity when other factors are equal", () => {
    const routePoints = [
      { lat: 7.0, lng: 80.0 },
      { lat: 7.0, lng: 80.5 },
      { lat: 7.0, lng: 81.0 },
    ];

    const targetLat = 7.25;
    const targetLng = 81.2;

    const nearTargetFarCorridor = {
      id: "charger-a",
      lat: 7.3,
      lng: 81.4,
      maxPowerKw: 150,
      reliabilityScore: 0.95,
      status: "available",
      currentStatus: "available",
      isOnline: true,
      manualOverride: false,
      lastHeartbeat: new Date().toISOString(),
    };

    const onCorridorFartherFromTarget = {
      id: "charger-b",
      lat: 7.0,
      lng: 81.0,
      maxPowerKw: 150,
      reliabilityScore: 0.95,
      status: "available",
      currentStatus: "available",
      isOnline: true,
      manualOverride: false,
      lastHeartbeat: new Date().toISOString(),
    };

    const ranked = (service as any).rankChargersForStop(
      [nearTargetFarCorridor, onCorridorFartherFromTarget],
      targetLat,
      targetLng,
      routePoints,
    );

    expect(ranked[0].id).toBe("charger-b");
  });
});
