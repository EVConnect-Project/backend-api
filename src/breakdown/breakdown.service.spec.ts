import { BreakdownService } from "./breakdown.service";

describe("BreakdownService", () => {
  let service: BreakdownService;

  beforeEach(() => {
    service = new BreakdownService({} as any, {} as any, {} as any);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
