import { Pool } from "pg";
import { config } from "./config";

function sanitizeConnectionString(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("sslmode");
    return parsed.toString();
  } catch {
    return url;
  }
}

const useSsl = /sslmode=require/i.test(config.databaseUrl) || /supabase\./i.test(config.databaseUrl);
const connectionString = sanitizeConnectionString(config.databaseUrl);

export const db = new Pool({
  connectionString,
  ssl: useSsl
    ? {
        rejectUnauthorized: false,
      }
    : undefined,
});

export async function query<T = unknown>(text: string, params: unknown[] = []): Promise<T[]> {
  const result = await db.query(text, params);
  return result.rows as T[];
}
