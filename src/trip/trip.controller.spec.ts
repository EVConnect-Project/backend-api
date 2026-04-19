import { TripController } from "./trip.controller";
import { TripService } from "./trip.service";

describe("TripController", () => {
  let controller: TripController;

  beforeEach(() => {
    controller = new TripController({} as TripService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
