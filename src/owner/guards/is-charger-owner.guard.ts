import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Charger } from "../../charger/entities/charger.entity";

/**
 * Guard to check if user owns any chargers (is a charger owner)
 * This allows mechanics and other roles to access owner endpoints if they have registered chargers
 */
@Injectable()
export class IsChargerOwnerGuard implements CanActivate {
  constructor(
    @InjectRepository(Charger)
    private chargerRepository: Repository<Charger>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.userId) {
      throw new ForbiddenException("User not authenticated");
    }

    // Admins always have access
    if (user.role === "admin") {
      return true;
    }

    // Check if user has role 'owner'
    if (user.role === "owner") {
      return true;
    }

    // Check if user owns any chargers (regardless of role)
    const chargerCount = await this.chargerRepository.count({
      where: { ownerId: user.userId },
    });

    if (chargerCount > 0) {
      return true;
    }

    throw new ForbiddenException(
      "You must be a charger owner to access this resource",
    );
  }
}
