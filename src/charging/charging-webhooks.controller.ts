import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ChargingService } from "./charging.service";
import { WebhookAuthGuard } from "./guards/webhook-auth.guard";

/**
 * OCPP webhooks from the external ev-charging-service.
 *
 * Kept in a separate controller from ChargingController because that one
 * applies @UseGuards(JwtAuthGuard) at the class level — Nest guards stack,
 * so user-bearing routes and machine-to-machine webhook routes cannot live
 * under the same controller without making the webhook unreachable.
 *
 * Auth here is API key only via WebhookAuthGuard.
 */
@Controller("charging/webhooks")
@UseGuards(WebhookAuthGuard)
export class ChargingWebhooksController {
  private readonly logger = new Logger(ChargingWebhooksController.name);

  constructor(private readonly chargingService: ChargingService) {}

  @Post("session-started")
  @HttpCode(HttpStatus.OK)
  async handleSessionStarted(@Body() payload: any) {
    this.logger.log(
      `session-started: ${payload?.sessionId ?? "?"} user=${payload?.userId ?? "?"}`,
    );
    return this.chargingService.handleSessionStartedWebhook(payload);
  }

  @Post("meter-values")
  @HttpCode(HttpStatus.OK)
  async handleMeterValues(@Body() payload: any) {
    return this.chargingService.handleMeterValuesWebhook(payload);
  }

  @Post("session-completed")
  @HttpCode(HttpStatus.OK)
  async handleSessionCompleted(@Body() payload: any) {
    this.logger.log(
      `session-completed: ${payload?.sessionId ?? "?"} user=${payload?.userId ?? "?"}`,
    );
    return this.chargingService.handleSessionCompletedWebhook(payload);
  }

  @Post("session-completed-full")
  @HttpCode(HttpStatus.OK)
  async handleSessionCompletedFull(@Body() payload: any) {
    return this.chargingService.handleSessionCompletedWebhook(payload);
  }
}
