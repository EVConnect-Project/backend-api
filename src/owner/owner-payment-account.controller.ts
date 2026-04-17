import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from "@nestjs/common";
import { OwnerPaymentAccountService } from "./owner-payment-account.service";
import { CreatePaymentAccountDto } from "./dto/create-payment-account.dto";
import { UpdatePaymentAccountDto } from "./dto/update-payment-account.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("owner/payment-accounts")
@UseGuards(JwtAuthGuard)
export class OwnerPaymentAccountController {
  constructor(
    private readonly paymentAccountService: OwnerPaymentAccountService,
  ) {}

  @Post()
  create(@Request() req, @Body() createDto: CreatePaymentAccountDto) {
    return this.paymentAccountService.create(req.user.userId, createDto);
  }

  @Get()
  findAll(@Request() req) {
    return this.paymentAccountService.findAllByUser(req.user.userId);
  }

  @Get("primary")
  getPrimary(@Request() req) {
    return this.paymentAccountService.getPrimaryAccount(req.user.userId);
  }

  @Get(":id")
  findOne(@Request() req, @Param("id") id: string) {
    return this.paymentAccountService.findOne(id, req.user.userId);
  }

  @Patch(":id")
  update(
    @Request() req,
    @Param("id") id: string,
    @Body() updateDto: UpdatePaymentAccountDto,
  ) {
    return this.paymentAccountService.update(id, req.user.userId, updateDto);
  }

  @Patch(":id/set-primary")
  setPrimary(@Request() req, @Param("id") id: string) {
    return this.paymentAccountService.setPrimary(id, req.user.userId);
  }

  @Delete(":id")
  remove(@Request() req, @Param("id") id: string) {
    return this.paymentAccountService.remove(id, req.user.userId);
  }
}
