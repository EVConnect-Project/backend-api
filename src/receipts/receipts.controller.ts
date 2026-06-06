import {
  Controller,
  Get,
  Param,
  Request,
  UseGuards,
} from "@nestjs/common";
import { ReceiptsService } from "./receipts.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("receipts")
@UseGuards(JwtAuthGuard)
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Get("mine")
  async listMine(@Request() req) {
    return this.receiptsService.listMine(req.user.userId);
  }

  @Get(":id")
  async getById(@Param("id") id: string, @Request() req) {
    return this.receiptsService.getById(req.user.userId, id);
  }
}
