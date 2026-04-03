import request from "supertest";
import jwt from "jsonwebtoken";

jest.mock("../src/db", () => ({
  query: jest.fn(),
}));

import app from "../src/app";
import { query } from "../src/db";

const mockQuery = query as jest.MockedFunction<typeof query>;

function makeAdminToken(id = "admin-1") {
  return jwt.sign(
    {
      id,
      email: "admin@zorvyn.com",
      role: "admin",
      status: "active",
    },
    process.env.JWT_SECRET as string,
  );
}

function makeUserToken(role: "viewer" | "analyst" | "admin", id = "u1") {
  return jwt.sign(
    {
      id,
      email: "user@zorvyn.com",
      role,
      status: "active",
    },
    process.env.JWT_SECRET as string,
  );
}

describe("User endpoints", () => {
  beforeEach(() => {
    mockQuery.mockClear();
  });

  describe("User creation", () => {
    it("creates a new user with valid data", async () => {
      mockQuery.mockResolvedValueOnce([
        { id: "admin-1", status: "active", role_name: "admin" } as never,
      ]);
      mockQuery.mockResolvedValueOnce([]); // No existing email
      mockQuery.mockResolvedValueOnce([{ id: "role-viewer" } as never]); // Get role
      mockQuery.mockResolvedValueOnce([
        {
          id: "u2",
          email: "newuser@zorvyn.com",
          role: "viewer",
          status: "active",
          created_at: "2026-04-04T10:00:00.000Z",
          last_login: null,
        } as never,
      ]);

      const res = await request(app)
        .post("/users")
        .set("Authorization", `Bearer ${makeAdminToken()}`)
        .send({
          email: "newuser@zorvyn.com",
          password: "StrongPass123!",
          role: "viewer",
        });

      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);
    });

    it("returns conflict for duplicate email", async () => {
      mockQuery.mockResolvedValueOnce([
        { id: "admin-1", status: "active", role_name: "admin" } as never,
      ]);
      mockQuery.mockResolvedValueOnce([{ id: "u2" } as never]);

      const res = await request(app)
        .post("/users")
        .set("Authorization", `Bearer ${makeAdminToken()}`)
        .send({
          email: "exists@zorvyn.com",
          password: "StrongPass123!",
          role: "viewer",
        });

      expect(res.status).toBe(409);
    });

    it("requires admin permission", async () => {
      mockQuery.mockResolvedValueOnce([
        { id: "u1", status: "active", role_name: "viewer" } as never,
      ]);

      const res = await request(app)
        .post("/users")
        .set("Authorization", `Bearer ${makeUserToken("viewer")}`)
        .send({
          email: "newuser@zorvyn.com",
          password: "StrongPass123!",
          role: "viewer",
        });

      expect(res.status).toBe(403);
    });
  });

  describe("User listing", () => {
    it("lists users for admin", async () => {
      mockQuery.mockResolvedValueOnce([
        { id: "admin-1", status: "active", role_name: "admin" } as never,
      ]);
      mockQuery.mockResolvedValueOnce([
        { id: "u1", email: "user1@zorvyn.com", role: "viewer", status: "active", created_at: "2026-01-01T00:00:00Z", last_login: null } as never,
      ]);

      const res = await request(app)
        .get("/users")
        .set("Authorization", `Bearer ${makeAdminToken()}`);

      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);
    });

    it("prevents non-admin from listing", async () => {
      mockQuery.mockResolvedValueOnce([
        { id: "u1", status: "active", role_name: "viewer" } as never,
      ]);

      const res = await request(app)
        .get("/users")
        .set("Authorization", `Bearer ${makeUserToken("viewer")}`);

      expect(res.status).toBe(403);
    });
  });

  describe("User deletion", () => {
    it("deletes user with admin token", async () => {
      mockQuery.mockResolvedValueOnce([
        { id: "admin-1", status: "active", role_name: "admin" } as never,
      ]);
      mockQuery.mockResolvedValueOnce([
        {
          id: "u1",
          email: "user1@zorvyn.com",
          role: "viewer",
          status: "active",
        } as never,
      ]);

      const res = await request(app)
        .delete("/users/u1")
        .set("Authorization", `Bearer ${makeAdminToken()}`);

      expect(res.status).toBeLessThan(400);
    });

    it("prevents non-admin from deleting", async () => {
      mockQuery.mockResolvedValueOnce([
        { id: "u1", status: "active", role_name: "viewer" } as never,
      ]);

      const res = await request(app)
        .delete("/users/u1")
        .set("Authorization", `Bearer ${makeUserToken("viewer")}`);

      expect(res.status).toBe(403);
    });
  });

  describe("Authentication", () => {
    it("requires authentication", async () => {
      const res = await request(app).get("/users");

      expect(res.status).toBe(401);
    });

    it("rejects invalid tokens", async () => {
      const res = await request(app)
        .get("/users")
        .set("Authorization", "Bearer invalid-token");

      expect(res.status).toBe(401);
    });
  });
});
