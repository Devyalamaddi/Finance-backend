import request from "supertest";
import jwt from "jsonwebtoken";

jest.mock("../src/db", () => ({
  query: jest.fn(),
}));

import app from "../src/app";
import { query } from "../src/db";

const mockQuery = query as jest.MockedFunction<typeof query>;

function makeToken(role: "viewer" | "analyst" | "admin", id = "u1") {
  return jwt.sign(
    {
      id,
      email: "admin@zorvyn.com",
      role,
      status: "active",
    },
    process.env.JWT_SECRET as string,
  );
}

describe("Record endpoints", () => {
  it("creates record for analyst", async () => {
    mockQuery.mockResolvedValueOnce([
      { id: "u1", status: "active", role_name: "analyst" } as never,
    ]);

    mockQuery.mockResolvedValueOnce([
      {
        id: "r1",
        user_id: "u1",
        amount: "100.00",
        type: "income",
        category: "salary",
        date: "2026-04-02",
        description: "Monthly",
        created_at: "2026-04-02T00:00:00.000Z",
        updated_at: "2026-04-02T00:00:00.000Z",
      } as never,
    ]);

    const res = await request(app)
      .post("/records")
      .set("Authorization", `Bearer ${makeToken("analyst")}`)
      .send({ amount: 100, type: "income", category: "salary", date: "2026-04-02" });

    expect(res.status).toBe(201);
    expect(res.body.type).toBe("income");
  });

  it("rejects viewer create", async () => {
    mockQuery.mockResolvedValueOnce([
      { id: "u1", status: "active", role_name: "viewer" } as never,
    ]);

    const res = await request(app)
      .post("/records")
      .set("Authorization", `Bearer ${makeToken("viewer")}`)
      .send({ amount: 100, type: "income", category: "salary", date: "2026-04-02" });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("FORBIDDEN");
  });

  it("returns 404 when non-admin fetches another user's record", async () => {
    mockQuery.mockResolvedValueOnce([
      { id: "u1", status: "active", role_name: "viewer" } as never,
    ]);
    mockQuery.mockResolvedValueOnce([] as never);

    const res = await request(app)
      .get("/records/r2")
      .set("Authorization", `Bearer ${makeToken("viewer")}`);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe("NOT_FOUND");

    const sql = mockQuery.mock.calls[1]?.[0] as string;
    expect(sql).toContain("user_id = $");
  });

  it("lets admin list records without user scoping", async () => {
    mockQuery.mockResolvedValueOnce([
      { id: "u1", status: "active", role_name: "admin" } as never,
    ]);
    mockQuery.mockResolvedValueOnce([
      {
        id: "r1",
        user_id: "u2",
        amount: "100.00",
        type: "income",
        category: "salary",
        date: "2026-04-02",
        description: null,
        created_at: "2026-04-02T00:00:00.000Z",
        updated_at: "2026-04-02T00:00:00.000Z",
      } as never,
    ]);

    const res = await request(app)
      .get("/records")
      .set("Authorization", `Bearer ${makeToken("admin")}`);

    expect(res.status).toBe(200);

    const params = mockQuery.mock.calls[1]?.[1] as unknown[];
    expect(params).toEqual([20, 0]);
  });

  it("returns 404 when admin updates a record they do not own", async () => {
    mockQuery.mockResolvedValueOnce([
      { id: "u1", status: "active", role_name: "admin" } as never,
    ]);
    mockQuery.mockResolvedValueOnce([] as never);

    const res = await request(app)
      .put("/records/r2")
      .set("Authorization", `Bearer ${makeToken("admin", "u1")}`)
      .send({ amount: 500 });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe("NOT_FOUND");

    const sql = mockQuery.mock.calls[1]?.[0] as string;
    expect(sql).toContain("user_id = $");
  });

  it("returns 404 when admin deletes a record they do not own", async () => {
    mockQuery.mockResolvedValueOnce([
      { id: "u1", status: "active", role_name: "admin" } as never,
    ]);
    mockQuery.mockResolvedValueOnce([] as never);

    const res = await request(app)
      .delete("/records/r2")
      .set("Authorization", `Bearer ${makeToken("admin", "u1")}`);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe("NOT_FOUND");
  });
});
