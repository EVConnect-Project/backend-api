import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserEntity } from "../../users/entities/user.entity";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {
    const secret = configService.get<string>("JWT_SECRET");
    if (!secret) throw new Error("JWT_SECRET environment variable is not set");
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    // Reject refresh tokens being used as access tokens
    if (payload.type === "refresh") {
      throw new UnauthorizedException(
        "Refresh token cannot be used as access token",
      );
    }

    // Verify the user still exists in the database
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException("User not found or has been deleted");
    }

    if (user.isBanned) {
      throw new UnauthorizedException("User account is banned");
    }

    // Validate token version when supported by the current schema.
    if (
      typeof payload.tokenVersion === "number" &&
      typeof user.tokenVersion === "number" &&
      payload.tokenVersion !== user.tokenVersion
    ) {
      throw new UnauthorizedException(
        "Token has been invalidated. Please login again.",
      );
    }

    return {
      userId: user.id,
      phoneNumber: user.phoneNumber,
      role: user.role,
      isBanned: user.isBanned,
      tokenVersion: user.tokenVersion,
    };
  }
}
