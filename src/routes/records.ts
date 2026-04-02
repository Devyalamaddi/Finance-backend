import { Router } from "express";
import { authRequired, requireRoles } from "../middlewares/auth";
import { createRecordSchema, listRecordsQuerySchema, updateRecordSchema } from "../schemas";
import { query } from "../db";
import { addRecordOwnershipScope, addRecordScopeForNonAdmin } from "../services/recordAccess";
import { HttpError } from "../utils/httpError";

type RecordRow = {
  id: string;
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

router.post("/", requireRoles("analyst", "admin"), async (req, res) => {
  const payload = createRecordSchema.parse(req.body);
  const rows = await query<RecordRow>(
    `INSERT INTO records (user_id, amount, type, category, date, description)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, user_id, amount, type, category, date, description, created_at, updated_at`,
    [req.user!.id, payload.amount, payload.type, payload.category, payload.date, payload.description || null],
  );
  res.status(201).json(rows[0]);
});

router.get("/", requireRoles("viewer", "analyst", "admin"), async (req, res) => {
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
    `SELECT id, user_id, amount, type, category, date, description, created_at, updated_at
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

router.get("/:id", requireRoles("viewer", "analyst", "admin"), async (req, res) => {
  const where: string[] = ["id = $1", "deleted_at IS NULL"];
  const values: unknown[] = [req.params.id];
  addRecordScopeForNonAdmin(where, values, req.user!);

  const rows = await query<RecordRow>(
    `SELECT id, user_id, amount, type, category, date, description, created_at, updated_at
     FROM records
     WHERE ${where.join(" AND ")}`,
    values,
  );

  if (!rows[0]) {
    throw new HttpError(404, "NOT_FOUND", "Record not found");
  }

  res.json(rows[0]);
});

router.put("/:id", requireRoles("admin"), async (req, res) => {
  const payload = updateRecordSchema.parse(req.body);
  const updates: string[] = [];
  const values: unknown[] = [];

  if (payload.amount !== undefined) {
    values.push(payload.amount);
    updates.push(`amount = $${values.length}`);
  }
  if (payload.type) {
    values.push(payload.type);
    updates.push(`type = $${values.length}`);
  }
  if (payload.category) {
    values.push(payload.category);
    updates.push(`category = $${values.length}`);
  }
  if (payload.date) {
    values.push(payload.date);
    updates.push(`date = $${values.length}`);
  }
  if (payload.description !== undefined) {
    values.push(payload.description || null);
    updates.push(`description = $${values.length}`);
  }

  updates.push("updated_at = NOW()");

  values.push(req.params.id);
  const idIndex = values.length;

  const where: string[] = [`id = $${idIndex}`, "deleted_at IS NULL"];
  addRecordOwnershipScope(where, values, req.user!);

  const rows = await query<RecordRow>(
    `UPDATE records
     SET ${updates.join(", ")}
     WHERE ${where.join(" AND ")}
     RETURNING id, user_id, amount, type, category, date, description, created_at, updated_at`,
    values,
  );

  if (!rows[0]) {
    throw new HttpError(404, "NOT_FOUND", "Record not found");
  }

  res.json(rows[0]);
});

router.delete("/:id", requireRoles("admin"), async (req, res) => {
  const where: string[] = ["id = $1", "deleted_at IS NULL"];
  const values: unknown[] = [req.params.id];
  addRecordOwnershipScope(where, values, req.user!);

  const rows = await query<{ id: string }>(
    `UPDATE records SET deleted_at = NOW(), updated_at = NOW()
     WHERE ${where.join(" AND ")}
     RETURNING id`,
    values,
  );

  if (!rows[0]) {
    throw new HttpError(404, "NOT_FOUND", "Record not found");
  }

  res.status(204).send();
});

export default router;
