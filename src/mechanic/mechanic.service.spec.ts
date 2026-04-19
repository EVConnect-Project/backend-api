import { MechanicService } from "./mechanic.service";

describe("MechanicService", () => {
  let service: MechanicService;

  beforeEach(() => {
    service = new MechanicService({} as any, {} as any, {} as any);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
