import app from "./app";
import { config } from "./config";
import { db } from "./db";
import { redis } from "./redis";

async function bootstrap(): Promise<void> {
  try {
    await db.query("SELECT 1");
  } catch (err) {
    console.warn("Database unavailable at startup, continuing to boot server", err);
  }

  if (redis) {
    try {
      await redis.connect();
      await redis.ping();
      console.log("Redis connected");
    } catch (err) {
      console.warn("Redis unavailable, continuing without cache", err);
    }
  }

  app.listen(config.port, () => {
    console.log(`Server started on port ${config.port}`);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});
