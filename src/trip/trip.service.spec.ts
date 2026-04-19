import { TripService } from "./trip.service";
import { HttpService } from "@nestjs/axios";

describe("TripService", () => {
  let service: TripService;

  beforeEach(() => {
    service = new TripService({} as HttpService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
