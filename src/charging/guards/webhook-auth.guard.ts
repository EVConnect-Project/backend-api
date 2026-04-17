import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Observable } from "rxjs";

@Injectable()
export class WebhookAuthGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers["x-api-key"];

    const validApiKey = this.configService.get<string>(
      "CHARGING_SERVICE_API_KEY",
      "evconnect-backend-api-key-dev",
    );

    if (!apiKey || apiKey !== validApiKey) {
      throw new UnauthorizedException("Invalid or missing API key for webhook");
    }

    return true;
  }
}
