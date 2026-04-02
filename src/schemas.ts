import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["viewer", "analyst", "admin"]),
  status: z.enum(["active", "inactive"]).optional(),
});

export const updateUserSchema = createUserSchema.partial().refine(
  (payload) => Object.keys(payload).length > 0,
  "At least one field is required",
);

export const createRecordSchema = z.object({
  amount: z.number().nonnegative(),
  type: z.enum(["income", "expense"]),
  category: z.string().min(1).max(64),
  date: z.string().date(),
  description: z.string().max(512).optional(),
});

export const updateRecordSchema = createRecordSchema.partial().refine(
  (payload) => Object.keys(payload).length > 0,
  "At least one field is required",
);

export const listRecordsQuerySchema = z.object({
  q: z.string().trim().min(1).max(100).optional(),
  type: z.enum(["income", "expense"]).optional(),
  category: z.string().optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const trendsQuerySchema = z.object({
  interval: z.enum(["weekly", "monthly"]).default("monthly"),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
});

export const recentQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
});
