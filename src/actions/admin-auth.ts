"use server";

/**
 * src/actions/admin-auth.ts
 *
 * Next.js Server Actions for Admin Authentication & Password Reset.
 * Handles login, logout, session verification, and password reset flows
 * directly on the server without going through API routes.
 *
 * Password reset emails are dispatched using ISCE_RESEND_API_KEY.
 */

import { cookies } from "next/headers";
import crypto from "crypto";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import {
  ADMIN_COOKIE_NAME,
  createAdminToken,
  verifyAdminToken,
} from "@/lib/admin-auth";
import { encrypt, decrypt } from "@/lib/crypto";
import { resolveProduct } from "@/lib/product-resolver";

const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

/**
 * Helper to mask an email for 2FA display (e.g. em***5@gmail.com)
 */
export async function maskEmailHelper(email: string): Promise<string> {
  if (!email || !email.includes("@")) return "your administrator email";
  const [local, domain] = email.split("@");
  if (local.length <= 2) {
    return `${local}***@${domain}`;
  }
  const visibleStart = local.slice(0, 2);
  const visibleEnd = local.slice(-1);
  return `${visibleStart}***${visibleEnd}@${domain}`;
}

/**
 * Issue an encrypted temporary token for the 2FA verification step.
 */
function createTwoFactorTempToken(userId: string, username: string): string {
  const payload = {
    userId,
    username,
    purpose: "admin_2fa",
    exp: Date.now() + 10 * 60 * 1000, // 10 minutes
  };
  return encrypt(JSON.stringify(payload));
}

/**
 * Decrypt and verify a 2FA temporary token.
 */
function verifyTwoFactorTempToken(
  token: string,
): { userId: string; username: string } | null {
  try {
    const raw = decrypt(token);
    const data = JSON.parse(raw);
    if (data.purpose !== "admin_2fa" || !data.userId || Date.now() > data.exp) {
      return null;
    }
    return { userId: data.userId, username: data.username };
  } catch {
    return null;
  }
}

/**
 * Dispatch 2FA verification code to the administrator's email via Resend.
 */
async function sendTwoFactorEmail(
  email: string,
  username: string,
  code: string,
): Promise<void> {
  let isceResendKey = (process.env.ISCE_RESEND_API_KEY || "").trim();
  if (!isceResendKey) {
    try {
      const isce = await resolveProduct("isce");
      if (isce?.resendApiKey) isceResendKey = isce.resendApiKey;
    } catch {}
  }

  if (!isceResendKey) {
    try {
      const pt = await resolveProduct("palmtechniq");
      if (pt?.resendApiKey) isceResendKey = pt.resendApiKey;
    } catch {}
  }

  if (!isceResendKey) {
    console.error(
      "[sendTwoFactorEmail] No Resend API key configured for 2FA delivery.",
    );
    throw new Error(
      "Email delivery service is unavailable (missing Resend API key).",
    );
  }

  const resend = new Resend(isceResendKey);
  const fromAddress = formatSenderAddress(process.env.FROM_EMAIL_ADDRESS);

  const isceLogoUrl = "https://www.isce.tech/images/isce_white_full_logo.png";

  const emailHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; background-color: #000000; color: #FFFFFF;">
      <div style="background-color: #212121; border-radius: 16px; padding: 44px 32px; border: 1px solid #2e2e2e; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5); text-align: center;">
        <div style="margin-bottom: 28px;">
          <img src="${isceLogoUrl}" alt="ISCE Logo" width="120" style="display: inline-block; max-width: 130px; height: auto; border: 0;" />
        </div>
        <h2 style="color: #FFFFFF; font-size: 22px; font-weight: 700; margin: 0 0 14px 0; letter-spacing: -0.5px;">
          Admin Verification Code
        </h2>
        <p style="color: #D4D4D8; font-size: 14px; line-height: 24px; margin: 0 0 28px 0;">
          Hello <strong style="color: #FFFFFF;">${username}</strong>,<br/>
          Use the 6-digit verification code below to complete your administrator sign-in:
        </p>
        <div style="margin: 28px 0;">
          <div style="display: inline-block; font-size: 38px; font-weight: 800; letter-spacing: 12px; color: #FFFFFF; padding: 18px 32px; background-color: #000000; border: 1px solid #383838; border-radius: 12px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.6);">
            ${code}
          </div>
        </div>
        <p style="color: #A1A1AA; font-size: 13px; line-height: 20px; margin: 0 0 16px 0;">
          This code expires in <strong style="color: #FFFFFF;">10 minutes</strong> and can only be used once.
        </p>
        <div style="border-top: 1px solid #2e2e2e; padding-top: 24px; margin-top: 32px; color: #71717A; font-size: 11px; line-height: 18px;">
          <p style="margin: 0 0 6px 0;">If you did not request this code, please change your administrator password immediately.</p>
          <p style="margin: 0; color: #A1A1AA; font-weight: 600;">ISCE Digital Concepts</p>
        </div>
      </div>
    </div>
  `;

  console.log(
    `[sendTwoFactorEmail] Sending 2FA code to "${email}" from "${fromAddress}"...`,
  );
  const sendRes = await resend.emails.send({
    from: fromAddress,
    to: email,
    subject: `${code} is your ISCE Mail Admin Verification Code`,
    html: emailHtml,
  });

  if (sendRes.error) {
    console.error("[sendTwoFactorEmail] Resend error:", sendRes.error);
    throw new Error(
      sendRes.error.message || "Failed to deliver 2FA verification email.",
    );
  }
  console.log(
    `[sendTwoFactorEmail] Successfully dispatched 2FA email, Resend ID:`,
    sendRes.data?.id,
  );
}

/**
 * Hash password securely with crypto.scryptSync
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verify password against stored hash
 */
export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  try {
    const [salt, key] = storedHash.split(":");
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, "hex");
    const derivedBuffer = crypto.scryptSync(password, salt, 64);
    if (keyBuffer.length !== derivedBuffer.length) return false;
    return crypto.timingSafeEqual(
      new Uint8Array(keyBuffer),
      new Uint8Array(derivedBuffer),
    );
  } catch {
    return false;
  }
}

/**
 * Helper to get or ensure a default AdminUser exists in DB.
 */
async function ensureAdminUserExists(
  usernameInput: string,
  passwordInput: string,
) {
  const cleanUser = usernameInput.trim().toLowerCase();
  const envUser = (process.env.ADMIN_USERNAME || "").trim().toLowerCase();
  const envEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const envPassword = process.env.ADMIN_PASSWORD || "";
  const adminSecret = process.env.ADMIN_SECRET || "";

  const isUserMatch =
    (Boolean(envUser) && cleanUser === envUser) ||
    (Boolean(envEmail) && cleanUser === envEmail);
  const isPassMatch =
    (Boolean(envPassword) && passwordInput === envPassword) ||
    (Boolean(adminSecret) && passwordInput === adminSecret);

  if (isUserMatch && isPassMatch) {
    // Check if row already exists
    let existing = await prisma.adminUser.findFirst({
      where: {
        OR: [{ username: envUser }, { email: envEmail }],
      },
    });

    if (existing) {
      if (existing.email !== envEmail) {
        existing = await prisma.adminUser.update({
          where: { id: existing.id },
          data: { email: envEmail },
        });
      }
    } else {
      const pwdHash = await hashPassword(passwordInput);
      existing = await prisma.adminUser.create({
        data: {
          username: envUser,
          email: envEmail,
          passwordHash: pwdHash,
          role: "super_admin",
        },
      });
    }

    return existing;
  }

  return null;
}

/**
 * SERVER ACTION: Login Admin
 */
export async function loginAdminAction(formData: {
  username: string;
  password: string;
}) {
  const { username, password } = formData;

  if (!username?.trim() || !password?.trim()) {
    return { success: false, error: "Username and password are required." };
  }

  const cleanUser = username.trim().toLowerCase();
  const cleanPass = password.trim();

  try {
    // 1. Look up in DB
    let user = await prisma.adminUser.findFirst({
      where: {
        OR: [{ username: cleanUser }, { email: cleanUser }],
      },
    });

    // 2. Fallback: if user doesn't exist in DB, check env and seed
    if (!user) {
      user = await ensureAdminUserExists(cleanUser, cleanPass);
    }

    if (!user) {
      return {
        success: false,
        error: "Invalid username or password. Please try again.",
      };
    }

    // 3. Verify password
    const isPasswordValid = await verifyPassword(cleanPass, user.passwordHash);
    if (!isPasswordValid) {
      // Check if user still has default env password if not updated
      const envPassword = process.env.ADMIN_PASSWORD || "";
      const adminSecret = process.env.ADMIN_SECRET || "";
      if (
        (Boolean(envPassword) && cleanPass === envPassword) ||
        (Boolean(adminSecret) && cleanPass === adminSecret)
      ) {
        // Rehash and sync
        const newHash = await hashPassword(cleanPass);
        user = await prisma.adminUser.update({
          where: { id: user.id },
          data: { passwordHash: newHash },
        });
      } else {
        return {
          success: false,
          error: "Invalid username or password. Please try again.",
        };
      }
    }

    // 4. Generate 6-digit OTP verification code & 10m expiry
    const twoFactorCode = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();
    const twoFactorExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.adminUser.update({
      where: { id: user.id },
      data: {
        twoFactorCode,
        twoFactorExpiry,
      },
    });

    const recipientEmail = (user.email || process.env.ADMIN_EMAIL || "").trim();
    if (!recipientEmail) {
      return {
        success: false,
        error:
          "No administrator email address configured to receive verification codes.",
      };
    }

    try {
      await sendTwoFactorEmail(recipientEmail, user.username, twoFactorCode);
    } catch (emailErr: any) {
      console.error(
        "[loginAdminAction] Failed to dispatch 2FA email:",
        emailErr,
      );
      return {
        success: false,
        error:
          emailErr?.message ||
          "Failed to dispatch verification email. Please check Resend API key configuration.",
      };
    }

    const tempToken = createTwoFactorTempToken(user.id, user.username);
    const maskedEmail = await maskEmailHelper(recipientEmail);

    return {
      success: true,
      requires2FA: true,
      tempToken,
      maskedEmail,
    };
  } catch (err: any) {
    console.error("[loginAdminAction] Error:", err);
    return {
      success: false,
      error: "Authentication failed. Please try again.",
    };
  }
}

/**
 * SERVER ACTION: Verify 2FA Code & Finalize Login
 */
export async function verifyTwoFactorAction(formData: {
  tempToken: string;
  code: string;
}) {
  const { tempToken, code } = formData;

  if (!tempToken?.trim() || !code?.trim()) {
    return { success: false, error: "Verification code is required." };
  }

  const verified = verifyTwoFactorTempToken(tempToken.trim());
  if (!verified) {
    return {
      success: false,
      error: "Verification session expired. Please sign in again.",
    };
  }

  try {
    const user = await prisma.adminUser.findUnique({
      where: { id: verified.userId },
    });

    if (!user || !user.twoFactorCode || !user.twoFactorExpiry) {
      return {
        success: false,
        error: "No pending verification code found. Please sign in again.",
      };
    }

    if (Date.now() > new Date(user.twoFactorExpiry).getTime()) {
      return {
        success: false,
        error: "Verification code has expired. Please request a new code.",
      };
    }

    const cleanEntered = code.trim().replace(/\s+/g, "");
    if (cleanEntered !== user.twoFactorCode.trim()) {
      return {
        success: false,
        error:
          "Incorrect verification code. Please check your email and try again.",
      };
    }

    // 2FA code is valid! Clear 2FA state from database
    await prisma.adminUser.update({
      where: { id: user.id },
      data: {
        twoFactorCode: null,
        twoFactorExpiry: null,
      },
    });

    // Create full encrypted session token
    const token = createAdminToken(user.username, user.role as any);

    // Set HTTP-only session cookie
    const cookieStore = await cookies();
    cookieStore.set(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return {
      success: true,
      user: {
        username: user.username,
        email: user.email,
        role: user.role,
      },
    };
  } catch (err: any) {
    console.error("[verifyTwoFactorAction] Error:", err);
    return { success: false, error: "Verification failed. Please try again." };
  }
}

/**
 * SERVER ACTION: Resend 2FA Code
 */
export async function resendTwoFactorAction(formData: { tempToken: string }) {
  const { tempToken } = formData;

  if (!tempToken?.trim()) {
    return {
      success: false,
      error: "Verification session expired. Please sign in again.",
    };
  }

  const verified = verifyTwoFactorTempToken(tempToken.trim());
  if (!verified) {
    return {
      success: false,
      error: "Verification session expired. Please sign in again.",
    };
  }

  try {
    const user = await prisma.adminUser.findUnique({
      where: { id: verified.userId },
    });

    if (!user) {
      return {
        success: false,
        error: "Administrator account not found. Please sign in again.",
      };
    }

    const recipientEmail = (user.email || process.env.ADMIN_EMAIL || "").trim();
    if (!recipientEmail) {
      return {
        success: false,
        error: "No administrator email address configured.",
      };
    }

    // Generate fresh 6-digit code & 10m expiry
    const twoFactorCode = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();
    const twoFactorExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.adminUser.update({
      where: { id: user.id },
      data: {
        twoFactorCode,
        twoFactorExpiry,
      },
    });

    await sendTwoFactorEmail(recipientEmail, user.username, twoFactorCode);

    const newTempToken = createTwoFactorTempToken(user.id, user.username);
    const maskedEmail = await maskEmailHelper(recipientEmail);

    return {
      success: true,
      tempToken: newTempToken,
      message: `A new 6-digit verification code has been dispatched to ${maskedEmail}.`,
    };
  } catch (err: any) {
    console.error("[resendTwoFactorAction] Error:", err);
    return {
      success: false,
      error: "Failed to resend verification code. Please try again.",
    };
  }
}

/**
 * SERVER ACTION: Logout Admin
 */
export async function logoutAdminAction() {
  try {
    const cookieStore = await cookies();
    cookieStore.set(ADMIN_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return { success: true };
  } catch (err: any) {
    console.error("[logoutAdminAction] Error:", err);
    return { success: false, error: "Logout failed." };
  }
}

/**
 * SERVER ACTION: Get Current Admin Session
 */
export async function getAdminSessionAction() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

    if (!token) {
      return { authenticated: false };
    }

    const session = verifyAdminToken(token);
    if (!session) {
      return { authenticated: false };
    }

    return {
      authenticated: true,
      user: {
        username: session.username,
        role: session.role,
      },
    };
  } catch {
    return { authenticated: false };
  }
}

/**
 * Helper to safely format sender email address for Resend.
 * Resend expects either "Name <email@example.com>" or "email@example.com".
 * Prevents double-wrapping when FROM_EMAIL_ADDRESS already contains angle brackets.
 */
function formatSenderAddress(raw: string | undefined): string {
  if (!raw || !raw.trim()) {
    return "ISCE Security <hello@isce.tech>";
  }
  const trimmed = raw.trim();

  // If already contains angle brackets e.g. "ISCE TEAM"<hello@isce.tech> or ISCE Team <hello@isce.tech>
  if (trimmed.includes("<") && trimmed.includes(">")) {
    return trimmed;
  }

  // If bare email without brackets, strip any surrounding quotes and format with display name
  const cleanEmail = trimmed.replace(/^["']|["']$/g, "").trim();
  return `ISCE Security <${cleanEmail}>`;
}

/**
 * SERVER ACTION: Request Password Reset
 * Generates a secure token and sends an email via ISCE_RESEND_API_KEY.
 */
export async function requestPasswordResetAction(emailOrUsername: string) {
  if (!emailOrUsername?.trim()) {
    return {
      success: false,
      error: "Please enter your administrator username or email address.",
    };
  }

  const cleanQuery = emailOrUsername.trim().toLowerCase();

  try {
    // 1. Locate user in DB
    let user = await prisma.adminUser.findFirst({
      where: {
        OR: [
          { username: { equals: cleanQuery, mode: "insensitive" } },
          { email: { equals: cleanQuery, mode: "insensitive" } },
        ],
      },
    });

    // If not found in DB, check if it matches configured admin
    if (!user) {
      const defaultUser = (process.env.ADMIN_USERNAME || "")
        .trim()
        .toLowerCase();
      const defaultEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
      if (
        (defaultUser && cleanQuery === defaultUser) ||
        (defaultEmail && cleanQuery === defaultEmail)
      ) {
        const defaultPass = process.env.ADMIN_PASSWORD || "Admin@12345";
        const pwdHash = await hashPassword(defaultPass);
        user = await prisma.adminUser.create({
          data: {
            username: defaultUser || "admin",
            email: defaultEmail || cleanQuery,
            passwordHash: pwdHash,
            role: "super_admin",
          },
        });
      }
    }

    if (!user) {
      console.warn(
        `[requestPasswordResetAction] No admin account matching: "${cleanQuery}"`,
      );
      // Don't leak whether account exists, return friendly message
      return {
        success: true,
        message:
          "If an administrator account matches this identifier, a password reset link has been dispatched.",
      };
    }

    // 2. Generate secure reset token (valid for 1 hour)
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.adminUser.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    // 3. Dispatch email using ISCE_RESEND_API_KEY
    const isceResendKey = (process.env.ISCE_RESEND_API_KEY || "").trim();
    if (!isceResendKey) {
      console.error(
        "[requestPasswordResetAction] ISCE_RESEND_API_KEY is not configured.",
      );
      return {
        success: false,
        error: "Email delivery service is not configured (missing API key).",
      };
    }

    const rawAppUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
      "http://localhost:9999";
    const appUrl = rawAppUrl.startsWith("http")
      ? rawAppUrl.replace(/\/$/, "")
      : `https://${rawAppUrl.replace(/\/$/, "")}`;
    const resetLink = `${appUrl}/admin/reset-password?token=${resetToken}`;

    const resend = new Resend(isceResendKey);
    const fromAddress = formatSenderAddress(process.env.FROM_EMAIL_ADDRESS);

    console.log(
      `[requestPasswordResetAction] Sending reset email to "${user.email}" from "${fromAddress}"`,
    );

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px; background-color: #f8fafc;">
        <div style="background-color: #ffffff; border-radius: 12px; padding: 40px 32px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 12px 18px; border-radius: 8px; font-weight: bold; font-size: 18px;">
              ISCE Mail Admin
            </div>
          </div>
          <h2 style="color: #0f172a; font-size: 20px; font-weight: 700; margin-bottom: 12px; text-align: center;">
            Password Reset Request
          </h2>
          <p style="color: #475569; font-size: 14px; line-height: 24px; margin-bottom: 24px;">
            Hello <strong>${user.username}</strong>,<br/>
            We received a request to reset your administrator password for the ISCE Mail Platform. Click the button below to choose a new password:
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetLink}" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 14px 28px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              Reset Administrator Password
            </a>
          </div>
          <p style="color: #64748b; font-size: 12px; line-height: 20px; margin-bottom: 16px;">
            If the button doesn't work, copy and paste this link into your browser:<br/>
            <a href="${resetLink}" style="color: #2563eb; word-break: break-all;">${resetLink}</a>
          </p>
          <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 24px; color: #94a3b8; font-size: 11px; text-align: center;">
            <p style="margin: 0 0 4px 0;">This password reset link will expire in <strong>1 hour</strong>.</p>
            <p style="margin: 0;">If you did not request this password reset, you can safely ignore this email.</p>
          </div>
        </div>
      </div>
    `;

    const sendResult = await resend.emails.send({
      from: fromAddress,
      to: [user.email],
      subject: "ISCE Mail Admin — Password Reset Request",
      html: emailHtml,
    });

    if (sendResult.error) {
      console.error(
        "[requestPasswordResetAction] Resend dispatch error:",
        sendResult.error,
      );
      return {
        success: false,
        error: `Failed to deliver email: ${sendResult.error.message}`,
      };
    }

    console.log(
      `[requestPasswordResetAction] Password reset email delivered successfully! Resend ID: ${sendResult.data?.id}`,
    );

    return {
      success: true,
      message: `A password reset link has been dispatched to ${user.email}.`,
    };
  } catch (err: any) {
    console.error("[requestPasswordResetAction] Unexpected error:", err);
    return {
      success: false,
      error: "An unexpected error occurred while processing your request.",
    };
  }
}

/**
 * SERVER ACTION: Reset Password
 * Verifies token, hashes new password, and updates database record.
 */
export async function resetPasswordAction(formData: {
  token: string;
  newPassword: string;
}) {
  const { token, newPassword } = formData;

  if (!token?.trim()) {
    return { success: false, error: "Password reset token is missing." };
  }

  if (!newPassword || newPassword.length < 6) {
    return {
      success: false,
      error: "Password must be at least 6 characters long.",
    };
  }

  try {
    // 1. Locate user by token and ensure token is not expired
    const user = await prisma.adminUser.findFirst({
      where: {
        resetToken: token.trim(),
        resetTokenExpiry: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return {
        success: false,
        error:
          "This password reset link is invalid or has expired. Please request a new one.",
      };
    }

    // 2. Hash new password
    const newHash = await hashPassword(newPassword.trim());

    // 3. Update user and invalidate reset token
    await prisma.adminUser.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    // 4. Log the user in immediately by setting cookie
    const sessionToken = createAdminToken(user.username, user.role as any);
    const cookieStore = await cookies();
    cookieStore.set(ADMIN_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return {
      success: true,
      message:
        "Your password has been successfully reset. You are now logged in.",
    };
  } catch (err: any) {
    console.error("[resetPasswordAction] Error:", err);
    return {
      success: false,
      error: "Failed to reset password. Please try again.",
    };
  }
}
