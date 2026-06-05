import type { CookieOptions, Request, Response } from "express";
import { randomBytes } from "crypto";

export const ADMIN_ACCESS_COOKIE = "evrs_access";
export const ADMIN_REFRESH_COOKIE = "evrs_refresh";
export const CSRF_COOKIE = "XSRF-TOKEN";

const COOKIE_PATH = "/";

interface CookieDurations {
  accessMs: number;
  refreshMs: number;
}

/**
 * Build the cookie options used for the admin session cookies.
 *
 * - HttpOnly: blocks JS read access → defeats XSS-driven token exfiltration.
 *   This is the whole reason we're moving off localStorage.
 * - Secure: required in production (TLS); skipped in dev so localhost works.
 * - SameSite=Lax: enough to block CSRF on top-level cross-site GETs without
 *   breaking the legitimate redirect flow after login. We layer the
 *   double-submit XSRF-TOKEN cookie on top of this for mutation requests.
 */
function baseCookieOptions(): CookieOptions {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: COOKIE_PATH,
  };
}

function durations(): CookieDurations {
  return {
    accessMs: 24 * 60 * 60 * 1000, // matches JWT_EXPIRES_IN default of 24h
    refreshMs: 30 * 24 * 60 * 60 * 1000, // matches JWT_REFRESH_EXPIRES_IN default of 30d
  };
}

/**
 * Issue access + refresh + CSRF cookies for an admin session.
 *
 * The CSRF cookie is intentionally NOT HttpOnly — the dashboard JS reads it
 * and echoes the value in a request header. The backend then checks that the
 * cookie value matches the header value (double-submit cookie pattern).
 * An attacker cross-site request would carry the cookie (because browsers
 * always do) but could NOT read the cookie to set the matching header.
 */
export function setAdminSessionCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
): string {
  const { accessMs, refreshMs } = durations();
  const csrfToken = randomBytes(32).toString("hex");

  res.cookie(ADMIN_ACCESS_COOKIE, tokens.accessToken, {
    ...baseCookieOptions(),
    maxAge: accessMs,
  });
  res.cookie(ADMIN_REFRESH_COOKIE, tokens.refreshToken, {
    ...baseCookieOptions(),
    maxAge: refreshMs,
  });
  // CSRF cookie: NOT HttpOnly on purpose.
  res.cookie(CSRF_COOKIE, csrfToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: COOKIE_PATH,
    maxAge: accessMs,
  });

  return csrfToken;
}

export function clearAdminSessionCookies(res: Response): void {
  const opts = { ...baseCookieOptions(), maxAge: 0 };
  res.cookie(ADMIN_ACCESS_COOKIE, "", opts);
  res.cookie(ADMIN_REFRESH_COOKIE, "", opts);
  res.cookie(CSRF_COOKIE, "", {
    ...opts,
    httpOnly: false,
  });
}

export function readAccessCookie(req: Request): string | undefined {
  const cookies = (req as Request & { cookies?: Record<string, string> })
    .cookies;
  return cookies?.[ADMIN_ACCESS_COOKIE];
}

export function readRefreshCookie(req: Request): string | undefined {
  const cookies = (req as Request & { cookies?: Record<string, string> })
    .cookies;
  return cookies?.[ADMIN_REFRESH_COOKIE];
}

export function readCsrfCookie(req: Request): string | undefined {
  const cookies = (req as Request & { cookies?: Record<string, string> })
    .cookies;
  return cookies?.[CSRF_COOKIE];
}
