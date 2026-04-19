import { LeadsController } from "./leads.controller";
import { LeadsService } from "./leads.service";

describe("LeadsController", () => {
  let controller: LeadsController;

  beforeEach(() => {
    controller = new LeadsController({} as LeadsService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
