import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { HttpError } from "../utils/httpError";

type PgLikeError = {
  code?: string;
  constraint?: string;
};

function isUniqueConstraintError(err: unknown): err is PgLikeError {
  if (!err || typeof err !== "object") {
    return false;
  }

  return (err as PgLikeError).code === "23505";
}

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({
    error: "Route not found",
    message: "Route not found",
    code: "NOT_FOUND",
  });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation failed",
      message: "Validation failed",
      code: "BAD_REQUEST",
      details: err.issues,
    });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.statusCode).json({
      error: err.message,
      message: err.message,
      code: err.code,
    });
    return;
  }

  if (isUniqueConstraintError(err)) {
    const duplicateEmail = err.constraint?.toLowerCase().includes("email");
    const message = duplicateEmail ? "Email already exists" : "Resource already exists";
    res.status(409).json({
      error: message,
      message,
      code: "CONFLICT",
    });
    return;
  }

  console.error(err);
  res.status(500).json({
    error: "Internal server error",
    message: "Internal server error",
    code: "INTERNAL_SERVER_ERROR",
  });
}
