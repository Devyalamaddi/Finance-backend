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

//Enhanced financial record validation following fintech standards.
//- Amount must be positive (immutability: no negative amounts)
//- Type is restricted to income/expense (no ambiguous types)
//- Date cannot be in future (auditability)
//- Category string for flexibility but validated length
export const createRecordSchema = z.object({
  amount: z.number().positive("Amount must be greater than 0"),
  type: z.enum(["income", "expense"]),
  category: z.string()
    .min(1, "Category is required")
    .max(64, "Category cannot exceed 64 characters")
    .trim(),
  date: z.string()
    .date("Date must be in YYYY-MM-DD format")
    .refine((d) => new Date(d) <= new Date(), "Date cannot be in the future"),
  description: z.string()
    .max(512, "Description cannot exceed 512 characters")
    .optional(),
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

export const auditLogsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  action: z.enum(["CREATE", "UPDATE", "DELETE", "LOGIN", "EXPORT"]).optional(),
  entity_type: z.string().optional(),
  user_id: z.string().uuid().optional(),
  from_date: z.string().date().optional(),
  to_date: z.string().date().optional(),
});
