import { Router } from "express";
import bcrypt from "bcryptjs";
import { query } from "../db";
import { authRequired, requireRoles } from "../middlewares/auth";
import { createUserSchema, updateUserSchema } from "../schemas";
import { HttpError } from "../utils/httpError";

type UserResponse = {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  last_login: string | null;
};

const router = Router();

router.use(authRequired);

router.post("/", requireRoles("admin"), async (req, res) => {
  const payload = createUserSchema.parse(req.body);

  const existing = await query<{ id: string }>("SELECT id FROM users WHERE email = $1", [payload.email]);
  if (existing.length > 0) {
    throw new HttpError(409, "CONFLICT", "Email already exists");
  }

  const roleRows = await query<{ id: number }>("SELECT id FROM roles WHERE name = $1", [payload.role]);
  if (!roleRows[0]) {
    throw new HttpError(400, "BAD_REQUEST", "Invalid role");
  }

  const passwordHash = await bcrypt.hash(payload.password, 12);
  const rows = await query<UserResponse>(
    `INSERT INTO users (email, password_hash, role_id, status)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email,
       (SELECT name FROM roles WHERE id = users.role_id) AS role,
       status, created_at, last_login`,
    [payload.email, passwordHash, roleRows[0].id, payload.status || "active"],
  );

  res.status(201).json(rows[0]);
});

router.get("/", requireRoles("admin"), async (_req, res) => {
  const rows = await query<UserResponse>(
    `SELECT u.id, u.email, r.name AS role, u.status, u.created_at, u.last_login
     FROM users u
     JOIN roles r ON r.id = u.role_id
     ORDER BY u.created_at DESC`,
  );
  res.json(rows);
});

router.get("/:id", requireRoles("admin", "analyst"), async (req, res) => {
  const rows = await query<UserResponse>(
    `SELECT u.id, u.email, r.name AS role, u.status, u.created_at, u.last_login
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.id = $1`,
    [req.params.id],
  );

  if (!rows[0]) {
    throw new HttpError(404, "NOT_FOUND", "User not found");
  }

  res.json(rows[0]);
});

router.put("/:id", requireRoles("admin"), async (req, res) => {
  const payload = updateUserSchema.parse(req.body);
  const updates: string[] = [];
  const values: unknown[] = [];

  if (payload.email) {
    const existing = await query<{ id: string }>(
      "SELECT id FROM users WHERE email = $1 AND id <> $2",
      [payload.email, req.params.id],
    );
    if (existing.length > 0) {
      throw new HttpError(409, "CONFLICT", "Email already exists");
    }

    values.push(payload.email);
    updates.push(`email = $${values.length}`);
  }

  if (payload.password) {
    const hash = await bcrypt.hash(payload.password, 12);
    values.push(hash);
    updates.push(`password_hash = $${values.length}`);
  }

  if (payload.role) {
    const roleRows = await query<{ id: number }>("SELECT id FROM roles WHERE name = $1", [payload.role]);
    if (!roleRows[0]) {
      throw new HttpError(400, "BAD_REQUEST", "Invalid role");
    }
    values.push(roleRows[0].id);
    updates.push(`role_id = $${values.length}`);
  }

  if (payload.status) {
    values.push(payload.status);
    updates.push(`status = $${values.length}`);
  }

  values.push(req.params.id);

  const rows = await query<UserResponse>(
    `UPDATE users
     SET ${updates.join(", ")}
     WHERE id = $${values.length}
     RETURNING id, email,
       (SELECT name FROM roles WHERE id = users.role_id) AS role,
       status, created_at, last_login`,
    values,
  );

  if (!rows[0]) {
    throw new HttpError(404, "NOT_FOUND", "User not found");
  }

  res.json(rows[0]);
});

router.delete("/:id", requireRoles("admin"), async (req, res) => {
  const rows = await query<{ id: string }>("DELETE FROM users WHERE id = $1 RETURNING id", [req.params.id]);
  if (!rows[0]) {
    throw new HttpError(404, "NOT_FOUND", "User not found");
  }
  res.status(204).send();
});

export default router;
