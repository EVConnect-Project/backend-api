import { BreakdownController } from "./breakdown.controller";
import { BreakdownService } from "./breakdown.service";

describe("BreakdownController", () => {
  let controller: BreakdownController;

  beforeEach(() => {
    controller = new BreakdownController({} as BreakdownService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
