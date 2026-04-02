import { Router } from "express";
import { authRequired, requireRoles } from "../middlewares/auth";
import { query } from "../db";
import { recentQuerySchema, trendsQuerySchema } from "../schemas";
import { addRecordScopeForNonAdmin } from "../services/recordAccess";

const router = Router();
router.use(authRequired, requireRoles("viewer", "analyst", "admin"));

router.get("/total", async (req, res) => {
  const where: string[] = ["deleted_at IS NULL"];
  const values: unknown[] = [];
  addRecordScopeForNonAdmin(where, values, req.user!);

  const rows = await query<{
    total_income: string;
    total_expense: string;
    net_balance: string;
  }>(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0)::text AS total_income,
       COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)::text AS total_expense,
       COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0)::text AS net_balance
     FROM records
     WHERE ${where.join(" AND ")}`,
    values,
  );

  res.json({
    totalIncome: rows[0].total_income,
    totalExpense: rows[0].total_expense,
    netBalance: rows[0].net_balance,
  });
});

router.get("/category", async (req, res) => {
  const where: string[] = ["deleted_at IS NULL"];
  const values: unknown[] = [];
  addRecordScopeForNonAdmin(where, values, req.user!);

  const rows = await query<{ category: string; total_amount: string }>(
    `SELECT category, COALESCE(SUM(amount), 0)::text AS total_amount
     FROM records
     WHERE ${where.join(" AND ")}
     GROUP BY category
     ORDER BY total_amount DESC`,
    values,
  );

  res.json(rows.map((r) => ({ category: r.category, totalAmount: r.total_amount })));
});

router.get("/recent", async (req, res) => {
  const q = recentQuerySchema.parse(req.query);

  const where: string[] = ["deleted_at IS NULL"];
  const values: unknown[] = [];
  addRecordScopeForNonAdmin(where, values, req.user!);
  values.push(q.limit);

  const rows = await query(
    `SELECT id, user_id, amount, type, category, date, description, created_at, updated_at
     FROM records
     WHERE ${where.join(" AND ")}
     ORDER BY date DESC, created_at DESC
     LIMIT $${values.length}`,
    values,
  );
  res.json(rows);
});

router.get("/trends", async (req, res) => {
  const q = trendsQuerySchema.parse(req.query);
  const interval = q.interval === "weekly" ? "week" : "month";

  const where: string[] = ["deleted_at IS NULL"];
  const values: unknown[] = [];
  addRecordScopeForNonAdmin(where, values, req.user!);

  if (q.from) {
    values.push(q.from);
    where.push(`date >= $${values.length}`);
  }
  if (q.to) {
    values.push(q.to);
    where.push(`date <= $${values.length}`);
  }

  const rows = await query<{
    period: string;
    total_income: string;
    total_expense: string;
  }>(
    `SELECT
       DATE_TRUNC('${interval}', date)::date::text AS period,
       COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0)::text AS total_income,
       COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)::text AS total_expense
     FROM records
     WHERE ${where.join(" AND ")}
     GROUP BY DATE_TRUNC('${interval}', date)
     ORDER BY DATE_TRUNC('${interval}', date) ASC`,
    values,
  );

  res.json(rows.map((r) => ({
    period: r.period,
    totalIncome: r.total_income,
    totalExpense: r.total_expense,
  })));
});

router.get("/analytics", async (req, res) => {
  const where: string[] = ["r.deleted_at IS NULL"];
  const values: unknown[] = [];
  addRecordScopeForNonAdmin(where, values, req.user!);

  values.push("expense");
  const biggestExpenseRows = await query<{ category: string; total_amount: string }>(
    `SELECT r.category, COALESCE(SUM(r.amount), 0)::text AS total_amount
     FROM records r
     WHERE ${where.join(" AND ")} AND r.type = $${values.length}
     GROUP BY r.category
     ORDER BY SUM(r.amount) DESC
     LIMIT 1`,
    values,
  );

  const monthRows = await query<{
    current_income: string;
    current_expense: string;
    current_net: string;
    previous_income: string;
    previous_expense: string;
    previous_net: string;
    net_change_absolute: string;
    net_change_percentage: string | null;
  }>(
    `WITH month_bounds AS (
       SELECT
         DATE_TRUNC('month', CURRENT_DATE)::date AS current_month,
         (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month')::date AS previous_month
     ),
     monthly_totals AS (
       SELECT
         DATE_TRUNC('month', r.date)::date AS month_start,
         COALESCE(SUM(CASE WHEN r.type = 'income' THEN r.amount ELSE 0 END), 0) AS income,
         COALESCE(SUM(CASE WHEN r.type = 'expense' THEN r.amount ELSE 0 END), 0) AS expense
       FROM records r
       WHERE ${where.join(" AND ")} AND r.date >= (SELECT previous_month FROM month_bounds)
       GROUP BY DATE_TRUNC('month', r.date)
     )
     SELECT
       COALESCE((SELECT income::text FROM monthly_totals WHERE month_start = (SELECT current_month FROM month_bounds)), '0') AS current_income,
       COALESCE((SELECT expense::text FROM monthly_totals WHERE month_start = (SELECT current_month FROM month_bounds)), '0') AS current_expense,
       COALESCE((SELECT (income - expense)::text FROM monthly_totals WHERE month_start = (SELECT current_month FROM month_bounds)), '0') AS current_net,
       COALESCE((SELECT income::text FROM monthly_totals WHERE month_start = (SELECT previous_month FROM month_bounds)), '0') AS previous_income,
       COALESCE((SELECT expense::text FROM monthly_totals WHERE month_start = (SELECT previous_month FROM month_bounds)), '0') AS previous_expense,
       COALESCE((SELECT (income - expense)::text FROM monthly_totals WHERE month_start = (SELECT previous_month FROM month_bounds)), '0') AS previous_net,
       (
         COALESCE((SELECT (income - expense) FROM monthly_totals WHERE month_start = (SELECT current_month FROM month_bounds)), 0)
         -
         COALESCE((SELECT (income - expense) FROM monthly_totals WHERE month_start = (SELECT previous_month FROM month_bounds)), 0)
       )::text AS net_change_absolute,
       CASE
         WHEN COALESCE((SELECT (income - expense) FROM monthly_totals WHERE month_start = (SELECT previous_month FROM month_bounds)), 0) = 0 THEN NULL
         ELSE (
           (
             COALESCE((SELECT (income - expense) FROM monthly_totals WHERE month_start = (SELECT current_month FROM month_bounds)), 0)
             -
             COALESCE((SELECT (income - expense) FROM monthly_totals WHERE month_start = (SELECT previous_month FROM month_bounds)), 0)
           )
           /
           ABS(COALESCE((SELECT (income - expense) FROM monthly_totals WHERE month_start = (SELECT previous_month FROM month_bounds)), 0))
           * 100
         )::text
       END AS net_change_percentage`,
    values.slice(0, values.length - 1),
  );

  const biggestExpense = biggestExpenseRows[0]
    ? {
        category: biggestExpenseRows[0].category,
        totalAmount: biggestExpenseRows[0].total_amount,
      }
    : null;

  const m = monthRows[0];
  res.json({
    biggestExpenseCategory: biggestExpense,
    monthOverMonth: {
      currentMonth: {
        income: m.current_income,
        expense: m.current_expense,
        net: m.current_net,
      },
      previousMonth: {
        income: m.previous_income,
        expense: m.previous_expense,
        net: m.previous_net,
      },
      netChange: {
        absolute: m.net_change_absolute,
        percentage: m.net_change_percentage,
      },
    },
  });
});

export default router;
