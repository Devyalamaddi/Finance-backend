const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { Client } = require("pg");

dotenv.config();

function sanitizeConnectionString(url) {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("sslmode");
    return parsed.toString();
  } catch {
    return url;
  }
}

async function run() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL is missing in .env");
  }

  const useSsl = /sslmode=require/i.test(dbUrl) || /supabase\./i.test(dbUrl);
  const connectionString = sanitizeConnectionString(dbUrl);
  const client = new Client({
    connectionString,
    ssl: useSsl
      ? {
          rejectUnauthorized: false,
        }
      : undefined,
  });
  await client.connect();

  try {
    const initSql = fs.readFileSync(path.join(__dirname, "..", "sql", "001_init.sql"), "utf8");
    const seedSql = fs.readFileSync(path.join(__dirname, "..", "sql", "002_seed_roles.sql"), "utf8");

    await client.query(initSql);
    await client.query(seedSql);

    console.log("Database initialized successfully.");
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error("Database init failed:", err.message);
  process.exit(1);
});
