import { Router } from "express";
import { authRequired, requireRoles, requirePermissions } from "../middlewares/auth";
import { createRecordSchema, listRecordsQuerySchema, updateRecordSchema } from "../schemas";
import { query } from "../db";
import { addRecordOwnershipScope, addRecordScopeForNonAdmin } from "../services/recordAccess";
import { logAuditAction } from "../services/auditLog";
import { HttpError } from "../utils/httpError";
import { generateTransactionId } from "../utils/financialOps";

type RecordRow = {
  id: string;
  transaction_id: string;
  user_id: string;
  amount: string;
  type: "income" | "expense";
  category: string;
  date: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

const router = Router();
router.use(authRequired);

/**
 * Create a new financial record.
 * USP: Every record gets a unique transaction_id for immutable tracking.
 */
router.post("/", requirePermissions("create_records"), async (req, res) => {
  const payload = createRecordSchema.parse(req.body);
  const transactionId = generateTransactionId();

  const rows = await query<RecordRow>(
    `INSERT INTO records (transaction_id, user_id, amount, type, category, date, description)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, transaction_id, user_id, amount, type, category, date, description, created_at, updated_at`,
    [transactionId, req.user!.id, payload.amount, payload.type, payload.category, payload.date, payload.description || null],
  );

  const record = rows[0];

  // Log to audit trail
  await logAuditAction({
    userId: req.user!.id,
    action: "CREATE",
    entityType: "record",
    entityId: record.id,
    newValues: {
      transaction_id: record.transaction_id,
      amount: record.amount,
      type: record.type,
      category: record.category,
      date: record.date,
    },
    changesSummary: `Created ${record.type} record: ${record.category} - ${record.amount}`,
    req,
  });

  res.status(201).json(record);
});

/**
 * List financial records with filtering and pagination.
 * Respects access control based on user role.
 */
router.get("/", requirePermissions("view_records"), async (req, res) => {
  const q = listRecordsQuerySchema.parse(req.query);
  const where: string[] = ["deleted_at IS NULL"];
  const values: unknown[] = [];
  addRecordScopeForNonAdmin(where, values, req.user!);

  if (q.type) {
    values.push(q.type);
    where.push(`type = $${values.length}`);
  }
  if (q.category) {
    values.push(q.category);
    where.push(`category = $${values.length}`);
  }
  if (q.q) {
    values.push(`%${q.q}%`);
    const textSearchParam = `$${values.length}`;
    where.push(`(category ILIKE ${textSearchParam} OR COALESCE(description, '') ILIKE ${textSearchParam})`);
  }
  if (q.from) {
    values.push(q.from);
    where.push(`date >= $${values.length}`);
  }
  if (q.to) {
    values.push(q.to);
    where.push(`date <= $${values.length}`);
  }

  const offset = (q.page - 1) * q.limit;
  values.push(q.limit);
  const limitIndex = values.length;
  values.push(offset);
  const offsetIndex = values.length;

  const rows = await query<RecordRow>(
    `SELECT id, transaction_id, user_id, amount, type, category, date, description, created_at, updated_at
     FROM records
     WHERE ${where.join(" AND ")}
     ORDER BY date DESC, created_at DESC
     LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
    values,
  );

  res.json({
    page: q.page,
    limit: q.limit,
    data: rows,
  });
});

/**
 * Get a specific financial record.
 */
router.get("/:id", requirePermissions("view_records"), async (req, res) => {
  const where: string[] = ["id = $1", "deleted_at IS NULL"];
  const values: unknown[] = [req.params.id];
  addRecordScopeForNonAdmin(where, values, req.user!);

  const rows = await query<RecordRow>(
    `SELECT id, transaction_id, user_id, amount, type, category, date, description, created_at, updated_at
     FROM records
     WHERE ${where.join(" AND ")}`,
    values,
  );

  if (!rows[0]) {
    throw new HttpError(404, "NOT_FOUND", "Record not found");
  }

  res.json(rows[0]);
});

/**
 * Update a financial record.
 * USP: Updates are logged in audit trail with old and new values.
 */
router.put("/:id", requireRoles("admin"), async (req, res) => {
  const payload = updateRecordSchema.parse(req.body);

  // Get old values for audit
  const oldRows = await query<RecordRow>(
    `SELECT id, transaction_id, user_id, amount, type, category, date, description
     FROM records
     WHERE id = $1 AND deleted_at IS NULL`,
    [req.params.id],
  );

  if (!oldRows[0]) {
    throw new HttpError(404, "NOT_FOUND", "Record not found");
  }

  const oldRecord = oldRows[0];
  const updates: string[] = [];
  const values: unknown[] = [];
  const changesSummary: string[] = [];

  if (payload.amount !== undefined) {
    values.push(payload.amount);
    updates.push(`amount = $${values.length}`);
    changesSummary.push(`amount: ${oldRecord.amount} → ${payload.amount}`);
  }
  if (payload.type) {
    values.push(payload.type);
    updates.push(`type = $${values.length}`);
    changesSummary.push(`type: ${oldRecord.type} → ${payload.type}`);
  }
  if (payload.category) {
    values.push(payload.category);
    updates.push(`category = $${values.length}`);
    changesSummary.push(`category: ${oldRecord.category} → ${payload.category}`);
  }
  if (payload.date) {
    values.push(payload.date);
    updates.push(`date = $${values.length}`);
    changesSummary.push(`date: ${oldRecord.date} → ${payload.date}`);
  }
  if (payload.description !== undefined) {
    values.push(payload.description || null);
    updates.push(`description = $${values.length}`);
    changesSummary.push(`description updated`);
  }

  if (updates.length === 0) {
    res.json(oldRecord);
    return;
  }

  updates.push("updated_at = NOW()");
  values.push(req.params.id);
  const idIndex = values.length;

  const where: string[] = [`id = $${idIndex}`, "deleted_at IS NULL"];
  addRecordOwnershipScope(where, values, req.user!);

  const newRows = await query<RecordRow>(
    `UPDATE records
     SET ${updates.join(", ")}
     WHERE ${where.join(" AND ")}
     RETURNING id, transaction_id, user_id, amount, type, category, date, description, created_at, updated_at`,
    values,
  );

  if (!newRows[0]) {
    throw new HttpError(404, "NOT_FOUND", "Record not found");
  }

  // Log update to audit trail
  await logAuditAction({
    userId: req.user!.id,
    action: "UPDATE",
    entityType: "record",
    entityId: req.params.id as string,
    oldValues: {
      amount: oldRecord.amount,
      type: oldRecord.type,
      category: oldRecord.category,
      date: oldRecord.date,
      description: oldRecord.description,
    },
    newValues: {
      amount: newRows[0].amount,
      type: newRows[0].type,
      category: newRows[0].category,
      date: newRows[0].date,
      description: newRows[0].description,
    },
    changesSummary: changesSummary.join("; "),
    req,
  });

  res.json(newRows[0]);
});

/**
 * Delete (soft delete) a financial record.
 * USP: Soft delete preserves audit trail and data integrity.
 */
router.delete("/:id", requireRoles("admin"), async (req, res) => {
  const where: string[] = ["id = $1", "deleted_at IS NULL"];
  const values: unknown[] = [req.params.id];
  addRecordOwnershipScope(where, values, req.user!);

  // Get record info for audit before deletion
  const recordRows = await query<RecordRow>(
    `SELECT id, transaction_id, category, amount, type FROM records WHERE id = $1 AND deleted_at IS NULL`,
    [req.params.id],
  );

  if (!recordRows[0]) {
    throw new HttpError(404, "NOT_FOUND", "Record not found");
  }

  const rows = await query<{ id: string }>(
    `UPDATE records SET deleted_at = NOW(), updated_at = NOW()
     WHERE ${where.join(" AND ")}
     RETURNING id`,
    values,
  );

  // Log deletion to audit trail
  await logAuditAction({
    userId: req.user!.id,
    action: "DELETE",
    entityType: "record",
    entityId: req.params.id as string,
    oldValues: {
      transaction_id: recordRows[0].transaction_id,
      amount: recordRows[0].amount,
      type: recordRows[0].type,
      category: recordRows[0].category,
    },
    changesSummary: `Soft deleted record: ${recordRows[0].category}`,
    req,
  });

  res.status(204).send();
});

export default router;
