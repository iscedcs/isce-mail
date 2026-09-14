/**
 * admin-auth.ts
 *
 * Secure credential-based authentication and session management for ISCE Mail Admin.
 * Replaces the raw secret-key prompt with a real username/password login system
 * backed by encrypted HTTP-only session cookies.
 */

import { NextRequest, NextResponse } from "next/server";
import { encrypt, decrypt } from "@/lib/crypto";

export const ADMIN_COOKIE_NAME = "isce_admin_session";
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

export interface AdminSession {
  username: string;
  role: "super_admin" | "admin";
  createdAt: number;
  expiresAt: number;
}

/**
 * Validate username and password.
 * Checks environment variables with sensible production defaults.
 */
export function validateAdminCredentials(
  username: string,
  password: string,
): boolean {
  if (!username || !password) return false;

  const validUsername = process.env.ADMIN_USERNAME!.trim().toLowerCase();
  const validPassword = process.env.ADMIN_PASSWORD!;
  const adminSecret = process.env.ADMIN_SECRET;

  const cleanUser = username.trim().toLowerCase();
  const cleanPass = password.trim();

  // Allow login with either configured password OR existing ADMIN_SECRET as password
  const isUserMatch =
    cleanUser === validUsername || cleanUser === process.env.ADMIN_EMAIL!;
  const isPassMatch =
    cleanPass === validPassword ||
    (Boolean(adminSecret) && cleanPass === adminSecret);

  return isUserMatch && isPassMatch;
}

/**
 * Issue an encrypted session token string containing session payload.
 */
export function createAdminToken(
  username: string,
  role: "super_admin" | "admin" = "admin",
): string {
  const now = Date.now();
  const session: AdminSession = {
    username,
    role,
    createdAt: now,
    expiresAt: now + SESSION_MAX_AGE_SECONDS * 1000,
  };

  return encrypt(JSON.stringify(session));
}

/**
 * Decrypt and verify an admin session token.
 * Returns null if token is invalid, tampered, or expired.
 */
export function verifyAdminToken(token: string): AdminSession | null {
  if (!token) return null;

  try {
    const raw = decrypt(token);
    const session: AdminSession = JSON.parse(raw);

    if (!session || !session.username || !session.expiresAt) {
      return null;
    }

    if (Date.now() > session.expiresAt) {
      return null; // Expired
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * Extract authenticated admin session from an incoming NextRequest.
 * Checks:
 * 1. HTTP-only session cookie (`isce_admin_session`)
 * 2. Authorization: Bearer <sessionToken>
 * 3. Fallback: x-admin-secret / Bearer <adminSecret> (preserves backward compatibility for scripts)
 */
export function getAdminFromRequest(
  req: NextRequest,
): { username: string; role: string } | null {
  // 1. Check session cookie
  const cookieToken = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (cookieToken) {
    const session = verifyAdminToken(cookieToken);
    if (session) return { username: session.username, role: session.role };
  }

  // 2. Check Authorization header
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const bearer = authHeader.substring(7).trim();
    // Check if it's an encrypted session token
    const session = verifyAdminToken(bearer);
    if (session) return { username: session.username, role: session.role };

    // Fallback: check if Bearer is the ADMIN_SECRET
    const adminSecret = process.env.ADMIN_SECRET;
    if (adminSecret && bearer === adminSecret) {
      return { username: "system-admin", role: "super_admin" };
    }
  }

  // 3. Check legacy x-admin-secret header
  const headerSecret = req.headers.get("x-admin-secret");
  const adminSecret = process.env.ADMIN_SECRET;
  if (adminSecret && headerSecret === adminSecret) {
    return { username: "system-admin", role: "super_admin" };
  }

  // If no ADMIN_SECRET is configured at all in development, allow system-admin
  if (!adminSecret && process.env.NODE_ENV !== "production") {
    return { username: "dev-admin", role: "super_admin" };
  }

  return null;
}

/**
 * Boolean helper for API routes.
 */
export function checkAdminAuth(req: NextRequest): boolean {
  return getAdminFromRequest(req) !== null;
}

/**
 * Apply session cookie to an outgoing NextResponse.
 */
export function setAdminSessionCookie(res: NextResponse, token: string): void {
  const isProduction = process.env.NODE_ENV === "production";
  res.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/**
 * Clear session cookie from an outgoing NextResponse.
 */
export function clearAdminSessionCookie(res: NextResponse): void {
  res.cookies.set(ADMIN_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
