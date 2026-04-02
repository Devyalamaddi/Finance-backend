import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Secret, SignOptions } from "jsonwebtoken";
import { query } from "../db";
import { config } from "../config";
import { loginSchema } from "../schemas";
import { HttpError } from "../utils/httpError";
import { JwtUser, RoleName } from "../types";

type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  role_name: RoleName;
  status: "active" | "inactive";
};

const router = Router();

router.post("/login", async (req, res) => {
  const payload = loginSchema.parse(req.body);

  const users = await query<UserRow>(
    `SELECT u.id, u.email, u.password_hash, r.name AS role_name, u.status
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.email = $1`,
    [payload.email],
  );

  const user = users[0];
  if (!user) {
    throw new HttpError(400, "BAD_CREDENTIALS", "Invalid email or password");
  }

  const matches = await bcrypt.compare(payload.password, user.password_hash);
  if (!matches) {
    throw new HttpError(400, "BAD_CREDENTIALS", "Invalid email or password");
  }

  if (user.status !== "active") {
    throw new HttpError(403, "FORBIDDEN", "User is inactive");
  }

  const tokenPayload: JwtUser = {
    id: user.id,
    email: user.email,
    role: user.role_name,
    status: user.status,
  };

  const signOptions: SignOptions = {
    expiresIn: config.jwtExpiresIn as SignOptions["expiresIn"],
  };

  const token = jwt.sign(tokenPayload, config.jwtSecret as Secret, signOptions);

  res.json({ token });
});

export default router;
