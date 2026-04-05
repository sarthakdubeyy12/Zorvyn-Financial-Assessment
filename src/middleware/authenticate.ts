// ============================================================
// Zorvyn Financial Assessment — Authentication Middleware
//
// WHY THIS EXISTS:
// Every protected route needs to know WHO is making the request.
// This middleware verifies the JWT, validates the user still
// exists and is ACTIVE, then injects the user into req.user.
//
// IMPORTANT: We validate against the DB on every request — not
// just the token. This ensures deactivated users are blocked
// even if their token hasn't expired yet.
// ============================================================

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma";
import { UnauthorizedError } from "../utils/errors";
import { JwtAccessPayload } from "../types";

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 1. Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("No token provided");
    }

    const token = authHeader.split(" ")[1];

    // 2. Verify token signature and expiry
    let payload: JwtAccessPayload;
    try {
      payload = jwt.verify(
        token,
        process.env.JWT_SECRET as string
      ) as JwtAccessPayload;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError("Token has expired");
      }
      throw new UnauthorizedError("Invalid token");
    }

    // 3. Ensure this is an access token, not a refresh token
    if (payload.type !== "access") {
      throw new UnauthorizedError("Invalid token type");
    }

    // 4. Validate user still exists and is ACTIVE in the database
    // This is the critical check — tokens outlive role/status changes
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError("User no longer exists");
    }

    if (user.status === "INACTIVE") {
      throw new UnauthorizedError("Account has been deactivated");
    }

    // 5. Inject user context into request
    req.user = user;

    next();
  } catch (err) {
    next(err);
  }
}
