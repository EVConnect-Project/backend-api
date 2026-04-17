import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  MechanicApplication,
  ApplicationStatus,
} from "../../mechanic/entities/mechanic-application.entity";
import { UserEntity } from "../../users/entities/user.entity";

/**
 * Guard that checks if user has mechanic access
 * Allows access if:
 * 1. User role is 'mechanic' or 'admin'
 * 2. User has an approved mechanic application (and auto-updates their role)
 */
@Injectable()
export class MechanicAccessGuard implements CanActivate {
  constructor(
    @InjectRepository(MechanicApplication)
    private mechanicApplicationRepository: Repository<MechanicApplication>,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    // Allow admin always
    if (user.role === "admin") {
      return true;
    }

    // Allow if already has mechanic role
    if (user.role === "mechanic") {
      return true;
    }

    // Check if user has an approved mechanic application
    const application = await this.mechanicApplicationRepository.findOne({
      where: {
        userId: user.userId,
        status: ApplicationStatus.APPROVED,
      },
    });

    if (application) {
      // User has approved application, update their role to mechanic
      await this.userRepository.update(
        { id: user.userId },
        { role: "mechanic" },
      );

      // Update the user object in the request for this request
      user.role = "mechanic";

      return true;
    }

    return false;
  }
}
