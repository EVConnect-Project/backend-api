import { MechanicController } from "./mechanic.controller";
import { MechanicService } from "./mechanic.service";

describe("MechanicController", () => {
  let controller: MechanicController;

  beforeEach(() => {
    controller = new MechanicController({} as MechanicService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
