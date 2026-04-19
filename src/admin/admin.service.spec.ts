import { AdminService } from "./admin.service";

describe("AdminService", () => {
  let service: AdminService;

  beforeEach(() => {
    service = new AdminService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
