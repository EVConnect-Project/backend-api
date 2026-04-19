import { LeadsService } from "./leads.service";

describe("LeadsService", () => {
  let service: LeadsService;

  beforeEach(() => {
    service = new LeadsService({} as any);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
