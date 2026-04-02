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

describe("User endpoints", () => {
  it("returns conflict for duplicate email on create", async () => {
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
    expect(res.body.code).toBe("CONFLICT");
    expect(res.body.error).toBe("Email already exists");
  });

  it("returns conflict for duplicate email on update", async () => {
    mockQuery.mockResolvedValueOnce([
      { id: "admin-1", status: "active", role_name: "admin" } as never,
    ]);
    mockQuery.mockResolvedValueOnce([{ id: "u2" } as never]);

    const res = await request(app)
      .put("/users/u1")
      .set("Authorization", `Bearer ${makeAdminToken()}`)
      .send({ email: "exists@zorvyn.com" });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe("CONFLICT");
    expect(res.body.error).toBe("Email already exists");
  });
});
