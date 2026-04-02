const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
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
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    throw new Error("Usage: npm run user:create-admin -- <email> <password>");
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL is missing in .env");
  }

  const useSsl = /sslmode=require/i.test(dbUrl) || /supabase\./i.test(dbUrl);
  const client = new Client({
    connectionString: sanitizeConnectionString(dbUrl),
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();

  try {
    const roleRes = await client.query("SELECT id FROM roles WHERE name = 'admin' LIMIT 1");
    if (roleRes.rows.length === 0) {
      throw new Error("Admin role not found. Run npm run db:init first.");
    }

    const roleId = roleRes.rows[0].id;
    const hash = await bcrypt.hash(password, 12);

    const existing = await client.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      await client.query(
        "UPDATE users SET password_hash = $1, role_id = $2, status = 'active' WHERE email = $3",
        [hash, roleId, email],
      );
      console.log("Admin user updated and activated.");
      return;
    }

    await client.query(
      "INSERT INTO users (email, password_hash, role_id, status) VALUES ($1, $2, $3, 'active')",
      [email, hash, roleId],
    );

    console.log("Admin user created.");
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error("Create admin failed:", err.message);
  process.exit(1);
});
