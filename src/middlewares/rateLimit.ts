import { NextFunction, Request, Response } from "express";
import { config } from "../config";

type Counter = { count: number; resetAt: number };

const bucket = new Map<string, Counter>();

export function rateLimit(req: Request, res: Response, next: NextFunction): void {
  const key = req.user?.id || req.ip || "anonymous";
  const now = Date.now();
  const current = bucket.get(key);

  if (!current || now > current.resetAt) {
    bucket.set(key, { count: 1, resetAt: now + config.rateLimitWindowMs });
    next();
    return;
  }

  current.count += 1;
  if (current.count > config.rateLimitMax) {
    res.status(429).json({
      error: "Too many requests",
      code: "RATE_LIMIT_EXCEEDED",
    });
    return;
  }

  next();
}
