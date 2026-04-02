import request from "supertest";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

jest.mock("../src/db", () => ({
  query: jest.fn(),
}));

import app from "../src/app";
import { query } from "../src/db";

const mockQuery = query as jest.MockedFunction<typeof query>;

function makeToken(id = "u1") {
  return jwt.sign(
    {
      id,
      email: "viewer@zorvyn.com",
      role: "viewer",
      status: "active",
    },
    process.env.JWT_SECRET as string,
  );
}

describe("Auth endpoints", () => {
  it("returns token for valid credentials", async () => {
    const hash = await bcrypt.hash("StrongPass123!", 10);

    mockQuery.mockResolvedValueOnce([
      {
        id: "u1",
        email: "admin@zorvyn.com",
        password_hash: hash,
        role_name: "admin",
        status: "active",
      } as never,
    ]);

    const res = await request(app).post("/auth/login").send({
      email: "admin@zorvyn.com",
      password: "StrongPass123!",
    });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it("rejects invalid credentials", async () => {
    mockQuery.mockResolvedValueOnce([] as never);

    const res = await request(app).post("/auth/login").send({
      email: "unknown@zorvyn.com",
      password: "wrong",
    });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("BAD_CREDENTIALS");
  });

  it("blocks inactive users on protected endpoints even with valid token", async () => {
    mockQuery.mockResolvedValueOnce([
      { id: "u1", status: "inactive", role_name: "viewer" } as never,
    ]);

    const res = await request(app)
      .get("/records")
      .set("Authorization", `Bearer ${makeToken("u1")}`);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("UNAUTHORIZED");
  });
});
