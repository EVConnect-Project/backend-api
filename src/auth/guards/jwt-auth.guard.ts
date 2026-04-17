import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  private readonly logger = new Logger(JwtAuthGuard.name);

  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      this.logger.error(`JWT Auth failed: ${err?.message || "User not found"}`);
      this.logger.error(`Info: ${JSON.stringify(info)}`);
      throw err || new UnauthorizedException("Unauthorized access");
    }

    this.logger.debug(
      `JWT Auth successful for user: ${user.userId}, role: ${user.role}`,
    );
    return user;
  }
}
