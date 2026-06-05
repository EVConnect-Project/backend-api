import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import type { Request } from "express";
import { timingSafeEqual } from "crypto";
import {
  CSRF_COOKIE,
  readAccessCookie,
  readCsrfCookie,
} from "../../auth/utils/auth-cookies";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const CSRF_HEADER = "x-xsrf-token";

/**
 * Double-submit cookie CSRF guard.
 *
 * Only enforced when the request is authenticated via the HttpOnly admin
 * cookie. Requests bearing an Authorization header (mobile, server-to-server)
 * are exempted because they cannot be triggered cross-site without scripting
 * in the victim's origin — there is no automatic cookie that an attacker
 * could ride on.
 *
 * Algorithm:
 *  1. Skip safe methods (GET/HEAD/OPTIONS).
 *  2. Skip if no admin cookie is present (request authed via Bearer header
 *     or anonymous; CSRF doesn't apply).
 *  3. Read XSRF-TOKEN cookie and X-XSRF-TOKEN header; require both, equal,
 *     and compared in constant time.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();

    if (SAFE_METHODS.has(req.method)) {
      return true;
    }

    // Only check CSRF when the request is being authenticated via cookie.
    // Bearer-token requests (mobile app) are not CSRF-exploitable.
    if (!readAccessCookie(req)) {
      return true;
    }

    const cookieToken = readCsrfCookie(req);
    const headerToken = req.header(CSRF_HEADER);

    if (!cookieToken || !headerToken) {
      throw new ForbiddenException(`Missing ${CSRF_COOKIE} cookie or header`);
    }

    const a = Buffer.from(cookieToken);
    const b = Buffer.from(headerToken);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new ForbiddenException("CSRF token mismatch");
    }

    return true;
  }
}
