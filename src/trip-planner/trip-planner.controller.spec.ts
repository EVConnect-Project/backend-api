import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TripPlannerController } from "./trip-planner.controller";
import { TripPlannerService } from "./trip-planner.service";
import { SmartTripPlannerService } from "./services/smart-trip-planner.service";
import { TripPlanEntity } from "./entities/trip-plan.entity";

describe("TripPlannerController", () => {
  let controller: TripPlannerController;
  let smartTripPlannerService: {
    resolveVehicleIdForUser: jest.Mock;
    generateSmartRoutes: jest.Mock;
  };

  beforeEach(async () => {
    smartTripPlannerService = {
      resolveVehicleIdForUser: jest.fn().mockResolvedValue("vehicle-1"),
      generateSmartRoutes: jest.fn().mockResolvedValue([
        {
          routeNumber: 1,
          totalDistanceKm: 48.9,
          totalDurationMinutes: 92,
          drivingDurationMinutes: 82,
          totalChargingTimeMinutes: 10,
          totalChargingCostLkr: 1850,
          estimatedArrivalTime: new Date().toISOString(),
          chargingStops: [],
          routeScore: 123,
          routePolyline: "abc123",
          routeSummary: "Route A",
          isRecommended: true,
          safetyWarnings: [],
          drivingMode: "normal",
          arrivalBatteryPercent: 41,
          etaConfidencePercent: 86,
          socConfidencePercent: 82,
        },
        {
          routeNumber: 2,
          totalDistanceKm: 50.1,
          totalDurationMinutes: 99,
          drivingDurationMinutes: 89,
          totalChargingTimeMinutes: 10,
          totalChargingCostLkr: 2100,
          estimatedArrivalTime: new Date().toISOString(),
          chargingStops: [],
          routeScore: 135,
          routePolyline: "def456",
          routeSummary: "Route B",
          isRecommended: false,
          safetyWarnings: [],
          drivingMode: "normal",
          arrivalBatteryPercent: 36,
          etaConfidencePercent: 81,
          socConfidencePercent: 76,
        },
      ]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TripPlannerController],
      providers: [
        {
          provide: TripPlannerService,
          useValue: {},
        },
        {
          provide: SmartTripPlannerService,
          useValue: smartTripPlannerService,
        },
        {
          provide: getRepositoryToken(TripPlanEntity),
          useValue: {} as Partial<Repository<TripPlanEntity>>,
        },
      ],
    }).compile();

    controller = module.get<TripPlannerController>(TripPlannerController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("returns wrapped routes with bestRouteId for GET /trip-planner/routes", async () => {
    const req = { user: { userId: "user-123" } };

    const response = await controller.getRoutes(
      "6.9271,79.8612",
      "7.2906,80.6337",
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      req,
    );

    expect(response.bestRouteId).toBe("1");
    expect(response.routes).toHaveLength(2);
    expect(response.routes[0]).toMatchObject({
      id: "1",
      polyline: "abc123",
      isRecommended: true,
    });
  });

  it("throws BadRequestException for invalid origin format", async () => {
    const req = { user: { userId: "user-123" } };

    await expect(
      controller.getRoutes(
        "invalid-origin",
        "7.2906,80.6337",
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        req,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("parses csv and waypoint query values before calling smart route generation", async () => {
    const req = { user: { userId: "user-123" } };

    await controller.getRoutes(
      "6.9271,79.8612",
      "7.2906,80.6337",
      "vehicle-preferred",
      "78",
      "6.95,79.9| |bad,token|7.1,80.2",
      "  ChargeNet , , EVPower ",
      "  OfflineNet  ",
      "27",
      "12",
      "220",
      "1.2",
      "eco",
      "fastest",
      "18",
      "72",
      "Colombo",
      "Kandy",
      req,
    );

    expect(
      smartTripPlannerService.resolveVehicleIdForUser,
    ).toHaveBeenCalledWith("user-123", "vehicle-preferred");

    expect(smartTripPlannerService.generateSmartRoutes).toHaveBeenCalledWith(
      expect.objectContaining({
        startLat: 6.9271,
        startLng: 79.8612,
        destLat: 7.2906,
        destLng: 80.6337,
        vehicleId: "vehicle-1",
        currentBatteryPercent: 78,
        preferredNetworks: ["ChargeNet", "EVPower"],
        excludedNetworks: ["OfflineNet"],
        waypoints: [
          { lat: 6.95, lng: 79.9 },
          { lat: 7.1, lng: 80.2 },
        ],
      }),
      "user-123",
    );
  });
});
