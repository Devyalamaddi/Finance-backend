import { Request } from "express";
import { randomUUID } from "crypto";
import { query } from "../db";
import { JwtUser, AuditAction, AuditLogEntry } from "../types";

export interface AuditLogInput {
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  changesSummary?: string;
  req?: Request;
  status?: "success" | "failure";
  errorMessage?: string;
}


//  Log an action to the audit trail.
//  This is the core of the immutable audit system - every action is tracked.
 
export async function logAuditAction(input: AuditLogInput): Promise<AuditLogEntry> {
  const id = randomUUID();
  const ipAddress = input.req?.ip || input.req?.connection?.remoteAddress || "unknown";
  const userAgent = input.req?.get("user-agent") || "unknown";

  const result = await query<AuditLogEntry>(
    `INSERT INTO audit_logs (
      id, user_id, action, entity_type, entity_id, old_values, new_values, 
      changes_summary, ip_address, user_agent, status, error_message
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING 
      id, user_id, action, entity_type, entity_id, old_values, new_values,
      changes_summary, ip_address, user_agent, status, error_message, timestamp`,
    [
      id,
      input.userId,
      input.action,
      input.entityType,
      input.entityId || null,
      input.oldValues ? JSON.stringify(input.oldValues) : null,
      input.newValues ? JSON.stringify(input.newValues) : null,
      input.changesSummary || null,
      ipAddress,
      userAgent,
      input.status || "success",
      input.errorMessage || null,
    ],
  );

  return result[0];
}

//Get audit logs with pagination and filtering.
//USP: Immutable audit system - every action is tracked.
export async function getAuditLogs(
  options: {
    limit?: number;
    offset?: number;
    entityType?: string;
    action?: AuditAction;
    userId?: string;
    fromDate?: string;
    toDate?: string;
  } = {},
): Promise<{ logs: AuditLogEntry[]; total: number }> {
  const where: string[] = [];
  const values: unknown[] = [];
  let paramCounter = 1;

  if (options.entityType) {
    values.push(options.entityType);
    where.push(`entity_type = $${paramCounter++}`);
  }

  if (options.action) {
    values.push(options.action);
    where.push(`action = $${paramCounter++}`);
  }

  if (options.userId) {
    values.push(options.userId);
    where.push(`user_id = $${paramCounter++}`);
  }

  if (options.fromDate) {
    values.push(options.fromDate);
    where.push(`timestamp >= $${paramCounter++}`);
  }

  if (options.toDate) {
    values.push(options.toDate);
    where.push(`timestamp <= $${paramCounter++}`);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

  // Get total count
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM audit_logs ${whereClause}`,
    values,
  );
  const total = parseInt(countResult[0]?.count || "0", 10);

  // Get paginated logs
  const limit = options.limit || 50;
  const offset = options.offset || 0;
  values.push(limit);
  values.push(offset);

  const logs = await query<AuditLogEntry>(
    `SELECT 
      id, user_id, action, entity_type, entity_id, old_values, new_values,
      changes_summary, ip_address, user_agent, status, error_message, timestamp
     FROM audit_logs
     ${whereClause}
     ORDER BY timestamp DESC
     LIMIT $${paramCounter++} OFFSET $${paramCounter++}`,
    values,
  );

  return { logs, total };
}

//Track user login for audit purposes.
export async function logUserLogin(userId: string, req: Request, success: boolean): Promise<void> {
  await logAuditAction({
    userId,
    action: "LOGIN",
    entityType: "user",
    entityId: userId,
    req,
    status: success ? "success" : "failure",
    errorMessage: success ? undefined : "Login failed",
  });
}

//Get audit trail for a specific entity.
//Shows complete history of changes to a record.
export async function getEntityAuditTrail(entityType: string, entityId: string): Promise<AuditLogEntry[]> {
  const logs = await query<AuditLogEntry>(
    `SELECT 
      id, user_id, action, entity_type, entity_id, old_values, new_values,
      changes_summary, ip_address, user_agent, status, error_message, timestamp
     FROM audit_logs
     WHERE entity_type = $1 AND entity_id = $2
     ORDER BY timestamp ASC`,
    [entityType, entityId],
  );

  return logs;
}
