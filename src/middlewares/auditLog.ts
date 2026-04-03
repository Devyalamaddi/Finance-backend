import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";


 //Audit logging middleware that attaches audit context to requests.
 //This allows routes to track their audit information.

declare global {
  namespace Express {
    interface Request {
      auditId?: string;
      auditStartTime?: number;
    }
  }
}

export function auditContextMiddleware(req: Request, _res: Response, next: NextFunction): void {
  req.auditId = randomUUID();
  req.auditStartTime = Date.now();
  next();
}
