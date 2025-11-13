import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('No user found in request');
    }

    if (user.role !== 'admin') {
      throw new ForbiddenException('Access denied. Admin role required.');
    }

    if (user.isBanned) {
      throw new ForbiddenException('Your account has been banned');
    }

    return true;
  }
}
