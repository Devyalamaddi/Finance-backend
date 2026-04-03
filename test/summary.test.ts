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
      email: "viewer@zorvyn.com",
      role,
      status: "active",
    },
    process.env.JWT_SECRET as string,
  );
}

describe("Summary endpoints", () => {
  beforeEach(() => {
    mockQuery.mockClear();
  });

  it("scopes totals to non-admin user", async () => {
    mockQuery.mockResolvedValueOnce([
      { id: "u1", status: "active", role_name: "viewer" } as never,
    ]);

    mockQuery.mockResolvedValueOnce([
      {
        total_income: "1000.00",
        total_expense: "400.00",
        net_balance: "600.00",
      } as never,
    ]);

    const res = await request(app)
      .get("/summary/total")
      .set("Authorization", `Bearer ${makeToken("viewer")}`);

    expect(res.status).toBe(200);

    const params = mockQuery.mock.calls[1]?.[1] as unknown[];
    expect(params).toEqual(["u1"]);
  });

  it("keeps totals global for admin", async () => {
    mockQuery.mockResolvedValueOnce([
      { id: "admin-1", status: "active", role_name: "admin" } as never,
    ]);
    mockQuery.mockResolvedValueOnce([
      {
        total_income: "2500.00",
        total_expense: "800.00",
        net_balance: "1700.00",
      } as never,
    ]);

    const res = await request(app)
      .get("/summary/total")
      .set("Authorization", `Bearer ${makeToken("admin", "admin-1")}`);

    expect(res.status).toBe(200);

    const params = mockQuery.mock.calls[1]?.[1] as unknown[];
    expect(params).toEqual([]);
  });

  it("returns category breakdown", async () => {
    mockQuery.mockResolvedValueOnce([
      { id: "u1", status: "active", role_name: "analyst" } as never,
    ]);

    mockQuery.mockResolvedValueOnce([
      { category: "food", total_amount: "500.00" } as never,
      { category: "transport", total_amount: "200.00" } as never,
      { category: "utilities", total_amount: "150.00" } as never,
    ]);

    const res = await request(app)
      .get("/summary/category")
      .set("Authorization", `Bearer ${makeToken("analyst")}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    expect(res.body[0].category).toBe("food");
    expect(res.body[0].totalAmount).toBe("500.00");
  });

  it("returns recent transactions", async () => {
    mockQuery.mockResolvedValueOnce([
      { id: "u1", status: "active", role_name: "viewer" } as never,
    ]);

    mockQuery.mockResolvedValueOnce([
      {
        id: "r1",
        transaction_id: "TXN-20260404-ABC12345",
        user_id: "u1",
        amount: "100.00",
        type: "income",
        category: "salary",
        date: "2026-04-04",
        description: "Monthly salary",
        created_at: "2026-04-04T10:00:00.000Z",
        updated_at: "2026-04-04T10:00:00.000Z",
      } as never,
    ]);

    const res = await request(app)
      .get("/summary/recent?limit=10")
      .set("Authorization", `Bearer ${makeToken("viewer")}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].transaction_id).toMatch(/^TXN-/);
  });

  it("returns trends with time interval", async () => {
    mockQuery.mockResolvedValueOnce([
      { id: "u1", status: "active", role_name: "analyst" } as never,
    ]);

    mockQuery.mockResolvedValueOnce([
      {
        period: "2026-04-01",
        total_income: "3000.00",
        total_expense: "1000.00",
      } as never,
      {
        period: "2026-04-08",
        total_income: "2500.00",
        total_expense: "1200.00",
      } as never,
    ]);

    const res = await request(app)
      .get("/summary/trends?interval=weekly")
      .set("Authorization", `Bearer ${makeToken("analyst")}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].totalIncome).toBe("3000.00");
  });

  it("returns analytics insights with month-over-month", async () => {
    mockQuery.mockResolvedValueOnce([
      { id: "u1", status: "active", role_name: "viewer" } as never,
    ]);

    mockQuery.mockResolvedValueOnce([
      { category: "rent", total_amount: "800.00" } as never,
    ]);

    mockQuery.mockResolvedValueOnce([
      {
        current_income: "2500.00",
        current_expense: "900.00",
        current_net: "1600.00",
        previous_income: "2200.00",
        previous_expense: "1000.00",
        previous_net: "1200.00",
        net_change_absolute: "400.00",
        net_change_percentage: "33.3333333333333333",
      } as never,
    ]);

    const res = await request(app)
      .get("/summary/analytics")
      .set("Authorization", `Bearer ${makeToken("viewer")}`);

    expect(res.status).toBe(200);
    expect(res.body.biggestExpenseCategory.category).toBe("rent");
    expect(res.body.monthOverMonth.currentMonth.net).toBe("1600.00");
    expect(res.body.monthOverMonth.netChange.percentage).toBe("33.3333333333333333");
  });

  it("detects anomalies in spending patterns", async () => {
    mockQuery.mockResolvedValueOnce([
      { id: "u1", status: "active", role_name: "analyst" } as never,
    ]);

    // Recent transactions (normal spending)
    mockQuery.mockResolvedValueOnce([
      {
        id: "r1",
        amount: "100.00",
        type: "expense",
        category: "food",
      } as never,
      {
        id: "r2",
        amount: "50.00",
        type: "expense",
        category: "transport",
      } as never,
    ]);

    // Historical average
    mockQuery.mockResolvedValueOnce([
      {
        avg_expense: "100.00",
      } as never,
    ]);

    const res = await request(app)
      .get("/summary/anomalies")
      .set("Authorization", `Bearer ${makeToken("analyst")}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("hasAnomalies");
  });

  it("detects high spending anomalies", async () => {
    mockQuery.mockResolvedValueOnce([
      { id: "u1", status: "active", role_name: "analyst" } as never,
    ]);

    // Recent transactions with varying expenses
    mockQuery.mockResolvedValueOnce([
      {
        id: "r1",
        amount: "500.00",
        type: "expense",
        category: "luxury",
      } as never,
      {
        id: "r2",
        amount: "300.00",
        type: "expense",
        category: "food",
      } as never,
    ]);

    // Historical average (low)
    mockQuery.mockResolvedValueOnce([
      {
        avg_expense: "100.00",
      } as never,
    ]);

    const res = await request(app)
      .get("/summary/anomalies")
      .set("Authorization", `Bearer ${makeToken("analyst")}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("hasAnomalies");
    expect(res.body).toHaveProperty("severity");
  });

  it("requires authentication for summary endpoints", async () => {
    const res = await request(app).get("/summary/total");

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("UNAUTHORIZED");
  });
});
