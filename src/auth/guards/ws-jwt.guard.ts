import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Socket } from "socket.io";

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    try {
      const client: Socket = context.switchToWs().getClient();
      const token = this.extractToken(client);

      if (!token) {
        return false;
      }

      const payload = this.jwtService.verify(token);
      (client as any).user = payload;
      return true;
    } catch {
      return false;
    }
  }

  private extractToken(client: Socket): string | null {
    const auth =
      client.handshake.auth?.token || client.handshake.headers?.authorization;

    if (!auth) {
      return null;
    }

    if (auth.startsWith("Bearer ")) {
      return auth.substring(7);
    }

    return auth;
  }
}
