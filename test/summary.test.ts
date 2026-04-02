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

  it("returns analytics insights", async () => {
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
  });
});
