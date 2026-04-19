import { AdminController } from "./admin.controller";
import { AdminAuditService } from "./admin-audit.service";
import { AdminChatService } from "./admin-chat.service";
import { AdminService } from "./admin.service";
import { SupportService } from "../support/support.service";

describe("AdminController", () => {
  let controller: AdminController;

  beforeEach(() => {
    controller = new AdminController(
      {} as AdminService,
      {} as AdminChatService,
      {} as AdminAuditService,
      {} as SupportService,
    );
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
