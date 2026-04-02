import request from "supertest";
import jwt from "jsonwebtoken";

jest.mock("../src/db", () => ({
  query: jest.fn(),
}));

import app from "../src/app";
import { query } from "../src/db";

const mockQuery = query as jest.MockedFunction<typeof query>;

function makeToken(id: string = "u1") {
  return jwt.sign(
    {
      id,
      email: "test@zorvyn.com",
      role: "analyst",
      status: "active",
    },
    process.env.JWT_SECRET as string,
  );
}

describe("Edge cases and error handling", () => {
  beforeEach(() => {
    mockQuery.mockClear();
  });

  describe("Authentication edge cases", () => {
    it("rejects request without authorization header", async () => {
      const res = await request(app).get("/records");

      expect(res.status).toBe(401);
      expect(res.body.code).toBe("UNAUTHORIZED");
      expect(res.body.message).toContain("authorization header");
    });

    it("rejects request with malformed bearer token", async () => {
      const res = await request(app)
        .get("/records")
        .set("Authorization", "Bearer");

      expect(res.status).toBe(401);
      expect(res.body.code).toBe("UNAUTHORIZED");
    });

    it("rejects request with invalid JWT signature", async () => {
      const fakeToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InUxIiwiZW1haWwiOiJ0ZXN0QHpvcnZ5bi5jb20iLCJyb2xlIjoiYW5hbHlzdCIsInN0YXR1cyI6ImFjdGl2ZSJ9.fakesignature";

      const res = await request(app)
        .get("/records")
        .set("Authorization", `Bearer ${fakeToken}`);

      expect(res.status).toBe(401);
      expect(res.body.code).toBe("UNAUTHORIZED");
    });

    it("rejects request when user deleted from DB", async () => {
      // Mock auth middleware - user not found
      mockQuery.mockResolvedValueOnce([] as never);

      const res = await request(app)
        .get("/records")
        .set("Authorization", `Bearer ${makeToken()}`);

      expect(res.status).toBe(401);
      expect(res.body.code).toBe("UNAUTHORIZED");
      expect(res.body.message).toContain("not found");
    });
  });

  describe("Record validation edge cases", () => {
    it("rejects record with negative amount", async () => {
      // Mock auth middleware DB check
      mockQuery.mockResolvedValueOnce([
        { id: "u1", status: "active", role_name: "analyst" } as never,
      ]);

      const res = await request(app)
        .post("/records")
        .set("Authorization", `Bearer ${makeToken()}`)
        .send({ amount: -100, type: "income", category: "salary", date: "2026-04-02" });

      expect(res.status).toBe(400);
    });

    it("rejects record with invalid type", async () => {
      // Mock auth middleware DB check
      mockQuery.mockResolvedValueOnce([
        { id: "u1", status: "active", role_name: "analyst" } as never,
      ]);

      const res = await request(app)
        .post("/records")
        .set("Authorization", `Bearer ${makeToken()}`)
        .send({ amount: 100, type: "other", category: "salary", date: "2026-04-02" });

      expect(res.status).toBe(400);
    });

    it("rejects record with missing required fields", async () => {
      // Mock auth middleware DB check
      mockQuery.mockResolvedValueOnce([
        { id: "u1", status: "active", role_name: "analyst" } as never,
      ]);

      const res = await request(app)
        .post("/records")
        .set("Authorization", `Bearer ${makeToken()}`)
        .send({ amount: 100 });

      expect(res.status).toBe(400);
    });

    it("rejects record with invalid date format", async () => {
      // Mock auth middleware DB check
      mockQuery.mockResolvedValueOnce([
        { id: "u1", status: "active", role_name: "analyst" } as never,
      ]);

      const res = await request(app)
        .post("/records")
        .set("Authorization", `Bearer ${makeToken()}`)
        .send({ amount: 100, type: "income", category: "salary", date: "invalid-date" });

      expect(res.status).toBe(400);
    });
  });

  describe("Record ID edge cases", () => {
    it("returns 404 for non-existent record ID", async () => {
      // Mock auth middleware DB check
      mockQuery.mockResolvedValueOnce([
        { id: "u1", status: "active", role_name: "viewer" } as never,
      ]);

      // Mock record query - not found
      mockQuery.mockResolvedValueOnce([] as never);

      const res = await request(app)
        .get("/records/00000000-0000-0000-0000-000000000000")
        .set("Authorization", `Bearer ${makeToken()}`);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe("NOT_FOUND");
    });

    it("handles malformed UUID in record ID", async () => {
      // Mock auth middleware DB check
      mockQuery.mockResolvedValueOnce([
        { id: "u1", status: "active", role_name: "viewer" } as never,
      ]);

      // Mock record query - DB will handle invalid UUID
      mockQuery.mockRejectedValueOnce(new Error("invalid input syntax for type uuid"));

      const res = await request(app)
        .get("/records/not-a-valid-uuid")
        .set("Authorization", `Bearer ${makeToken()}`);

      expect(res.status).toBe(500);
    });
  });

  describe("Pagination edge cases", () => {
    it("handles page=0", async () => {
      // Mock auth middleware DB check
      mockQuery.mockResolvedValueOnce([
        { id: "u1", status: "active", role_name: "viewer" } as never,
      ]);

      const res = await request(app)
        .get("/records?page=0&limit=10")
        .set("Authorization", `Bearer ${makeToken()}`);

      // Zod validation should catch this
      expect(res.status).toBe(400);
    });

    it("handles excessive limit", async () => {
      // Mock auth middleware DB check
      mockQuery.mockResolvedValueOnce([
        { id: "u1", status: "active", role_name: "viewer" } as never,
      ]);

      const res = await request(app)
        .get("/records?page=1&limit=10000")
        .set("Authorization", `Bearer ${makeToken()}`);

      // Zod validation should cap or reject this
      expect(res.status).toBe(400);
    });
  });

  describe("Empty data scenarios", () => {
    it("returns empty array when user has no records", async () => {
      // Mock auth middleware DB check
      mockQuery.mockResolvedValueOnce([
        { id: "u1", status: "active", role_name: "viewer" } as never,
      ]);

      // Mock empty records list
      mockQuery.mockResolvedValueOnce([] as never);

      const res = await request(app)
        .get("/records")
        .set("Authorization", `Bearer ${makeToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it("returns zero totals when user has no records", async () => {
      // Mock auth middleware DB check
      mockQuery.mockResolvedValueOnce([
        { id: "u1", status: "active", role_name: "viewer" } as never,
      ]);

      // Mock summary with zeros
      mockQuery.mockResolvedValueOnce([
        {
          total_income: "0.00",
          total_expense: "0.00",
          net_balance: "0.00",
        } as never,
      ]);

      const res = await request(app)
        .get("/summary/total")
        .set("Authorization", `Bearer ${makeToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.totalIncome).toBe("0.00");
      expect(res.body.netBalance).toBe("0.00");
    });

    it("returns empty array for category summary with no records", async () => {
      // Mock auth middleware DB check
      mockQuery.mockResolvedValueOnce([
        { id: "u1", status: "active", role_name: "viewer" } as never,
      ]);

      // Mock empty category summary
      mockQuery.mockResolvedValueOnce([] as never);

      const res = await request(app)
        .get("/summary/category")
        .set("Authorization", `Bearer ${makeToken()}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });
});
