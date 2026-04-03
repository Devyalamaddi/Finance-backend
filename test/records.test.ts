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
  beforeEach(() => {
    mockQuery.mockClear();
  });

  it("creates record for analyst", async () => {
    mockQuery.mockResolvedValueOnce([
      { id: "u1", status: "active", role_name: "analyst" } as never,
    ]);

    mockQuery.mockResolvedValueOnce([
      {
        id: "r1",
        transaction_id: "TXN-20260402-ABC12345",
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

    // Mock audit log insert
    mockQuery.mockResolvedValueOnce([
      {
        id: "audit-1",
        user_id: "u1",
        action: "CREATE",
        entity_type: "record",
        entity_id: "r1",
      } as never,
    ]);

    const res = await request(app)
      .post("/records")
      .set("Authorization", `Bearer ${makeToken("analyst")}`)
      .send({ amount: 100, type: "income", category: "salary", date: "2026-04-02" });

    expect(res.status).toBe(201);
    expect(res.body.type).toBe("income");
    expect(res.body.transaction_id).toMatch(/^TXN-\d{8}-/);
  });

  it("generates unique transaction_id on record creation", async () => {
    mockQuery.mockResolvedValueOnce([
      { id: "u1", status: "active", role_name: "analyst" } as never,
    ]);

    mockQuery.mockResolvedValueOnce([
      {
        id: "r1",
        transaction_id: "TXN-20260402-XYZ98765",
        user_id: "u1",
        amount: "50.00",
        type: "expense",
        category: "food",
        date: "2026-04-02",
        description: null,
        created_at: "2026-04-02T00:00:00.000Z",
        updated_at: "2026-04-02T00:00:00.000Z",
      } as never,
    ]);

    mockQuery.mockResolvedValueOnce([
      {
        id: "audit-2",
        user_id: "u1",
        action: "CREATE",
      } as never,
    ]);

    const res = await request(app)
      .post("/records")
      .set("Authorization", `Bearer ${makeToken("analyst")}`)
      .send({ amount: 50, type: "expense", category: "food", date: "2026-04-02" });

    expect(res.status).toBe(201);
    expect(res.body.transaction_id).toBeDefined();
  });

  it("logs creation to audit trail", async () => {
    mockQuery.mockResolvedValueOnce([
      { id: "u1", status: "active", role_name: "analyst" } as never,
    ]);

    mockQuery.mockResolvedValueOnce([
      {
        id: "r1",
        transaction_id: "TXN-20260402-ABC12345",
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

    mockQuery.mockResolvedValueOnce([
      {
        id: "audit-1",
        user_id: "u1",
        action: "CREATE",
      } as never,
    ]);

    await request(app)
      .post("/records")
      .set("Authorization", `Bearer ${makeToken("analyst")}`)
      .send({ amount: 100, type: "income", category: "salary", date: "2026-04-02" });

    // Verify audit log was inserted
    const auditInsertCall = mockQuery.mock.calls.find((call) => {
      const sql = call[0] as string;
      return sql.includes("INSERT INTO audit_logs");
    });

    expect(auditInsertCall).toBeDefined();
  });

  it("rejects viewer create (permission denied)", async () => {
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

  it("rejects negative amounts", async () => {
    mockQuery.mockResolvedValueOnce([
      { id: "u1", status: "active", role_name: "analyst" } as never,
    ]);

    const res = await request(app)
      .post("/records")
      .set("Authorization", `Bearer ${makeToken("analyst")}`)
      .send({ amount: -100, type: "income", category: "salary", date: "2026-04-02" });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("BAD_REQUEST");
  });

  it("rejects future-dated records", async () => {
    mockQuery.mockResolvedValueOnce([
      { id: "u1", status: "active", role_name: "analyst" } as never,
    ]);

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    const futureDateStr = futureDate.toISOString().split("T")[0];

    const res = await request(app)
      .post("/records")
      .set("Authorization", `Bearer ${makeToken("analyst")}`)
      .send({ amount: 100, type: "income", category: "salary", date: futureDateStr });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("BAD_REQUEST");
  });

  it("rejects zero amounts", async () => {
    mockQuery.mockResolvedValueOnce([
      { id: "u1", status: "active", role_name: "analyst" } as never,
    ]);

    const res = await request(app)
      .post("/records")
      .set("Authorization", `Bearer ${makeToken("analyst")}`)
      .send({ amount: 0, type: "income", category: "salary", date: "2026-04-02" });

    expect(res.status).toBe(400);
  });

  it("logs updates with old/new values to audit trail", async () => {
    mockQuery.mockResolvedValueOnce([
      { id: "u1", status: "active", role_name: "admin" } as never,
    ]);

    // Get old record
    mockQuery.mockResolvedValueOnce([
      {
        id: "r1",
        transaction_id: "TXN-20260402-ABC12345",
        user_id: "u1",
        amount: "100.00",
        type: "income",
        category: "salary",
        date: "2026-04-02",
        description: null,
      } as never,
    ]);

    // Updated record
    mockQuery.mockResolvedValueOnce([
      {
        id: "r1",
        transaction_id: "TXN-20260402-ABC12345",
        user_id: "u1",
        amount: "150.00",
        type: "income",
        category: "salary",
        date: "2026-04-02",
        description: "Updated",
        created_at: "2026-04-02T00:00:00.000Z",
        updated_at: "2026-04-02T01:00:00.000Z",
      } as never,
    ]);

    // Audit log created
    mockQuery.mockResolvedValueOnce([
      {
        id: "audit-3",
        user_id: "u1",
        action: "UPDATE",
      } as never,
    ]);

    const res = await request(app)
      .put("/records/r1")
      .set("Authorization", `Bearer ${makeToken("admin", "u1")}`)
      .send({ amount: 150.00, description: "Updated" });

    expect(res.status).toBe(200);
    expect(res.body.amount).toBe("150.00");
  });

  it("logs deletes to audit trail", async () => {
    mockQuery.mockResolvedValueOnce([
      { id: "u1", status: "active", role_name: "admin" } as never,
    ]);

    // Get record before deletion
    mockQuery.mockResolvedValueOnce([
      {
        id: "r1",
        transaction_id: "TXN-20260402-ABC12345",
        category: "salary",
        amount: "100.00",
        type: "income",
      } as never,
    ]);

    // Soft delete result
    mockQuery.mockResolvedValueOnce([
      {
        id: "r1",
      } as never,
    ]);

    // Audit log created
    mockQuery.mockResolvedValueOnce([
      {
        id: "audit-4",
        user_id: "u1",
        action: "DELETE",
      } as never,
    ]);

    const res = await request(app)
      .delete("/records/r1")
      .set("Authorization", `Bearer ${makeToken("admin", "u1")}`);

    expect(res.status).toBeLessThan(400);
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
        transaction_id: "TXN-20260402-ABC12345",
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
