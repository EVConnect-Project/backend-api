import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    // Debug logging
    this.logger.debug(`Required roles: ${requiredRoles.join(", ")}`);
    this.logger.debug(`User role: ${user?.role || "undefined"}`);
    this.logger.debug(`User ID: ${user?.userId || "undefined"}`);

    if (!user || !user.role) {
      this.logger.warn("User or user.role is undefined");
      return false;
    }

    // Fix: user.role is a string, not an array
    const hasRole = requiredRoles.some((role) => user.role === role);
    this.logger.debug(`Access ${hasRole ? "granted" : "denied"}`);

    return hasRole;
  }
}
