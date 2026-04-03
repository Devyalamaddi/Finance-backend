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

describe("Audit Logs endpoints", () => {
  beforeEach(() => {
    mockQuery.mockClear();
  });

  it("rejects non-admin access to audit logs", async () => {
    mockQuery.mockResolvedValueOnce([
      { id: "u1", status: "active", role_name: "analyst" } as never,
    ]);

    const res = await request(app)
      .get("/audit-logs")
      .set("Authorization", `Bearer ${makeToken("analyst")}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("FORBIDDEN");
  });

  it("allows admin to list audit logs", async () => {
    mockQuery.mockResolvedValueOnce([
      { id: "u1", status: "active", role_name: "admin" } as never,
    ]);

    mockQuery.mockResolvedValueOnce([
      { count: "5" } as never,
    ]);

    mockQuery.mockResolvedValueOnce([
      {
        id: "audit-1",
        user_id: "u1",
        action: "CREATE",
        entity_type: "record",
        entity_id: "r1",
        old_values: null,
        new_values: JSON.stringify({ amount: "100.00", type: "income" }),
        changes_summary: "Created income record: salary - 100.00",
        ip_address: "127.0.0.1",
        user_agent: "Mozilla/5.0",
        status: "success",
        error_message: null,
        timestamp: "2026-04-04T10:00:00.000Z",
      } as never,
    ]);

    const res = await request(app)
      .get("/audit-logs?limit=50&offset=0")
      .set("Authorization", `Bearer ${makeToken("admin")}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(5);
    expect(res.body.data[0].action).toBe("CREATE");
    expect(res.body.data[0].entity_type).toBe("record");
  });

  it("filters audit logs by action", async () => {
    mockQuery.mockResolvedValueOnce([
      { id: "u1", status: "active", role_name: "admin" } as never,
    ]);

    mockQuery.mockResolvedValueOnce([
      { count: "3" } as never,
    ]);

    mockQuery.mockResolvedValueOnce([
      {
        id: "audit-2",
        user_id: "u1",
        action: "UPDATE",
        entity_type: "record",
        entity_id: "r1",
        old_values: JSON.stringify({ amount: "100.00" }),
        new_values: JSON.stringify({ amount: "150.00" }),
        changes_summary: "amount: 100.00 → 150.00",
        ip_address: "127.0.0.1",
        user_agent: "Mozilla/5.0",
        status: "success",
        error_message: null,
        timestamp: "2026-04-04T10:30:00.000Z",
      } as never,
    ]);

    const res = await request(app)
      .get("/audit-logs?action=UPDATE&limit=50&offset=0")
      .set("Authorization", `Bearer ${makeToken("admin")}`);

    expect(res.status).toBe(200);
    expect(res.body.data[0].action).toBe("UPDATE");
  });

  it("filters audit logs by entity type", async () => {
    mockQuery.mockResolvedValueOnce([
      { id: "u1", status: "active", role_name: "admin" } as never,
    ]);

    mockQuery.mockResolvedValueOnce([
      { count: "2" } as never,
    ]);

    mockQuery.mockResolvedValueOnce([
      {
        id: "audit-3",
        user_id: "u1",
        action: "DELETE",
        entity_type: "record",
        entity_id: "r2",
        old_values: JSON.stringify({ amount: "50.00" }),
        new_values: null,
        changes_summary: "Soft deleted record",
        ip_address: "127.0.0.1",
        user_agent: "Mozilla/5.0",
        status: "success",
        error_message: null,
        timestamp: "2026-04-04T11:00:00.000Z",
      } as never,
    ]);

    const res = await request(app)
      .get("/audit-logs?entity_type=record&limit=50&offset=0")
      .set("Authorization", `Bearer ${makeToken("admin")}`);

    expect(res.status).toBe(200);
    expect(res.body.data[0].entity_type).toBe("record");
  });

  it("allows admin to query audit history", async () => {
    mockQuery.mockResolvedValueOnce([
      { id: "u1", status: "active", role_name: "admin" } as never,
    ]);

    mockQuery.mockResolvedValueOnce([
      {
        id: "audit-1",
        user_id: "u1",
        action: "CREATE",
        entity_type: "record",
        entity_id: "r1",
        old_values: null,
        new_values: JSON.stringify({ amount: "100.00" }),
        changes_summary: "Created record",
        ip_address: "127.0.0.1",
        user_agent: "Mozilla/5.0",
        status: "success",
        error_message: null,
        timestamp: "2026-04-04T10:00:00.000Z",
      } as never,
    ]);

    const res = await request(app)
      .get("/audit-logs?entity_type=record&entity_id=r1&limit=50&offset=0")
      .set("Authorization", `Bearer ${makeToken("admin")}`);

    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
  });
});
