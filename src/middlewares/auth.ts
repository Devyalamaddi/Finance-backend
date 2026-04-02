import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { JwtUser, RoleName } from "../types";
import { HttpError } from "../utils/httpError";
import { query } from "../db";

declare global {
  namespace Express {
    interface Request {
      user?: JwtUser;
    }
  }
}

export async function authRequired(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new HttpError(401, "UNAUTHORIZED", "Missing or invalid authorization header");
  }

  const token = authHeader.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, config.jwtSecret) as JwtUser;

    const users = await query<{ id: string; status: string; role_name: string }>(
      `SELECT u.id, u.status, r.name AS role_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.id = $1`,
      [payload.id],
    );

    if (!users[0]) {
      throw new HttpError(401, "UNAUTHORIZED", "User not found");
    }

    if (users[0].status !== "active") {
      throw new HttpError(401, "UNAUTHORIZED", "User is inactive or no longer exists");
    }

    req.user = {
      ...payload,
      status: users[0].status as "active" | "inactive",
      role: users[0].role_name as RoleName,
    };

    next();
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    throw new HttpError(401, "UNAUTHORIZED", "Invalid or expired token");
  }
}

export function requireRoles(...allowed: RoleName[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new HttpError(401, "UNAUTHORIZED", "Authentication required");
    }
    if (!allowed.includes(req.user.role)) {
      throw new HttpError(403, "FORBIDDEN", "You do not have permission to perform this action");
    }
    next();
  };
}
