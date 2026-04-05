// ============================================================
// Zorvyn Financial Assessment — Auth Service
//
// Handles: register, login, token refresh, logout
//
// TOKEN STRATEGY:
// Access token  — short lived (15 min), carries role + userId
// Refresh token — long lived (7 days), carries userId only
//
// WHY TWO TOKENS:
// If an access token is stolen, it expires in 15 minutes.
// The refresh token stays server-side in the client's storage
// and is used only to get new access tokens.
// This is the industry standard for stateless JWT auth.
// ============================================================

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../../config/prisma";
import { auditService } from "../audit/audit.service";
import {
  ConflictError,
  UnauthorizedError,
  NotFoundError,
} from "../../utils/errors";
import {
  RegisterInput,
  LoginInput,
  AuthTokens,
  JwtAccessPayload,
  JwtRefreshPayload,
  SafeUser,
} from "../../types";

class AuthService {
  // ─────────────────────────────────────────
  // REGISTER
  // ─────────────────────────────────────────

  async register(
    input: RegisterInput,
    meta?: { ipAddress?: string; userAgent?: string }
  ): Promise<{ user: SafeUser; tokens: AuthTokens }> {
    // Check for duplicate email
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existing) {
      throw new ConflictError("An account with this email already exists");
    }

    // Hash password — bcrypt with configurable rounds
    const rounds = parseInt(process.env.BCRYPT_ROUNDS ?? "12");
    const hashedPassword = await bcrypt.hash(input.password, rounds);

    // Create user — default role is VIEWER (least privilege)
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Log creation event
    await auditService.logCreate("system", "User", user.id, {
      name: user.name,
      email: user.email,
      role: user.role,
    }, meta);

    const tokens = this.generateTokens(user.id, user.email, user.role);

    return { user, tokens };
  }

  // ─────────────────────────────────────────
  // LOGIN
  // ─────────────────────────────────────────

  async login(
    input: LoginInput,
    meta?: { ipAddress?: string; userAgent?: string }
  ): Promise<{ user: SafeUser; tokens: AuthTokens }> {
    // Find user — include password for comparison
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    // Generic error message — do not reveal whether email exists
    // This prevents user enumeration attacks
    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    if (user.status === "INACTIVE") {
      throw new UnauthorizedError("Account has been deactivated");
    }

    // Compare password
    const isValid = await bcrypt.compare(input.password, user.password);
    if (!isValid) {
      throw new UnauthorizedError("Invalid email or password");
    }

    // Log login event
    await auditService.logLogin(user.id, meta);

    const tokens = this.generateTokens(user.id, user.email, user.role);

    const safeUser: SafeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return { user: safeUser, tokens };
  }

  // ─────────────────────────────────────────
  // REFRESH TOKEN
  // ─────────────────────────────────────────

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: JwtRefreshPayload;

    try {
      payload = jwt.verify(
        refreshToken,
        process.env.JWT_SECRET as string
      ) as JwtRefreshPayload;
    } catch {
      throw new UnauthorizedError("Invalid or expired refresh token");
    }

    if (payload.type !== "refresh") {
      throw new UnauthorizedError("Invalid token type");
    }

    // Validate user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, status: true },
    });

    if (!user) {
      throw new UnauthorizedError("User no longer exists");
    }

    if (user.status === "INACTIVE") {
      throw new UnauthorizedError("Account has been deactivated");
    }

    return this.generateTokens(user.id, user.email, user.role);
  }

  // ─────────────────────────────────────────
  // LOGOUT
  // ─────────────────────────────────────────

  async logout(
    userId: string,
    meta?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    // Log the logout event
    // Note: Without a token blacklist, the token remains valid
    // until expiry. The short TTL (15 min) is the mitigation.
    // See README tradeoffs section for full explanation.
    await auditService.logLogout(userId, meta);
  }

  // ─────────────────────────────────────────
  // TOKEN GENERATION
  // ─────────────────────────────────────────

  private generateTokens(
    userId: string,
    email: string,
    role: string
  ): AuthTokens {
    const secret = process.env.JWT_SECRET as string;

    const accessPayload: JwtAccessPayload = {
      sub: userId,
      email,
      role: role as any,
      type: "access",
    };

    const refreshPayload: JwtRefreshPayload = {
      sub: userId,
      type: "refresh",
    };

    const accessToken = jwt.sign(accessPayload, secret, {
      expiresIn: process.env.JWT_ACCESS_EXPIRES ?? "15m",
    } as jwt.SignOptions);

    const refreshToken = jwt.sign(refreshPayload, secret, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES ?? "7d",
    } as jwt.SignOptions);

    return { accessToken, refreshToken };
  }
}

export const authService = new AuthService();
