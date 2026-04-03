import { randomBytes } from "crypto";

//Generate a unique transaction ID.
//Format: TXN-YYYYMMDD-[random-suffix]
//This follows fintech standards for transaction tracking.
export function generateTransactionId(): string {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
  const randomSuffix = randomBytes(4).toString('hex').toUpperCase();
  return `TXN-${dateStr}-${randomSuffix}`;
}

//Calculate month-over-month change percentage.
export function calculatePercentageChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

//Detect anomalies in spending patterns.
//Simple rule-based approach (not ML-based yet).
//USP: Anomaly detection shows AI-readiness.
export function detectAnomalies(
  transactions: Array<{ amount: number; type: string; category: string }>,
  historicalAverage?: number,
): {
  isAnomaly: boolean;
  reason?: string;
  severity?: "low" | "medium" | "high";
} {
  if (!transactions || transactions.length === 0) {
    return { isAnomaly: false };
  }

  // Rule 1: Single expense more than 3x the average
  const expenses = transactions.filter((t) => t.type === "expense").map((t) => t.amount);
  if (expenses.length > 0) {
    const avg = expenses.reduce((a, b) => a + b, 0) / expenses.length;
    const maxExpense = Math.max(...expenses);

    if (maxExpense > avg * 3 && historicalAverage && maxExpense > historicalAverage * 2) {
      return {
        isAnomaly: true,
        reason: "Unusually high expense detected",
        severity: "high",
      };
    }
  }

  // Rule 2: Spending pattern change > 50% from historical
  if (historicalAverage) {
    const totalSpent = expenses.reduce((a, b) => a + b, 0);
    const percentChange = Math.abs((totalSpent - historicalAverage) / historicalAverage) * 100;

    if (percentChange > 50) {
      return {
        isAnomaly: true,
        reason: "Significant change in spending pattern",
        severity: "medium",
      };
    }
  }

  return { isAnomaly: false };
}

//Format amount for display (currently returns as string from DB).
export function formatAmount(amount: string | number): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return num.toFixed(2);
}
