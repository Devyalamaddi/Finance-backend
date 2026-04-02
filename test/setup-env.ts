process.env.NODE_ENV = "test";
process.env.PORT = "4000";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.JWT_SECRET = "test-secret";
process.env.JWT_EXPIRES_IN = "1d";
process.env.REDIS_URL = "";
process.env.RATE_LIMIT_WINDOW_MS = "60000";
process.env.RATE_LIMIT_MAX = "100";
