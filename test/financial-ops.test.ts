import {
  generateTransactionId,
  calculatePercentageChange,
  detectAnomalies,
  formatAmount,
} from "../src/utils/financialOps";

describe("Financial operations", () => {
  describe("generateTransactionId", () => {
    it("generates transaction ID with correct format", () => {
      const id = generateTransactionId();
      expect(id).toMatch(/^TXN-\d{8}-[A-Z0-9]{8}$/);
    });

    it("transaction ID starts with TXN-", () => {
      const id = generateTransactionId();
      expect(id.startsWith("TXN-")).toBe(true);
    });

    it("generates unique transaction IDs", () => {
      const id1 = generateTransactionId();
      const id2 = generateTransactionId();
      expect(id1).not.toBe(id2);
    });

    it("transaction ID contains date portion", () => {
      const now = new Date();
      const dateStr = now.toISOString().split("T")[0].replace(/-/g, "");
      const id = generateTransactionId();
      expect(id).toContain(dateStr);
    });
  });

  describe("calculatePercentageChange", () => {
    it("calculates positive percentage change", () => {
      const change = calculatePercentageChange(150, 100);
      expect(change).toBe(50);
    });

    it("calculates negative percentage change", () => {
      const change = calculatePercentageChange(75, 100);
      expect(change).toBe(-25);
    });

    it("returns 0 when values are equal", () => {
      const change = calculatePercentageChange(100, 100);
      expect(change).toBe(0);
    });

    it("returns null when previous is 0", () => {
      const change = calculatePercentageChange(100, 0);
      expect(change).toBeNull();
    });

    it("handles large percentage changes", () => {
      const change = calculatePercentageChange(500, 100);
      expect(change).toBe(400);
    });

    it("handles decimal precision", () => {
      const change = calculatePercentageChange(110, 100);
      expect(change).toBeCloseTo(10, 1);
    });
  });

  describe("detectAnomalies", () => {
    it("detects no anomalies with normal spending", () => {
      const transactions = [
        { amount: 50, type: "expense", category: "food" },
        { amount: 40, type: "expense", category: "transport" },
        { amount: 35, type: "expense", category: "food" },
      ];
      const result = detectAnomalies(transactions, 100);
      expect(result.isAnomaly).toBe(false);
    });

    it("detects anomaly with significant spending changes", () => {
      const transactions = [
        { amount: 30, type: "expense", category: "food" },
        { amount: 100, type: "expense", category: "luxury" },
        { amount: 25, type: "expense", category: "food" },
      ];
      const result = detectAnomalies(transactions, 50);
      expect(result.isAnomaly).toBe(true);
      expect(result.reason).toBeDefined();
    });

    it("detects anomaly when spending pattern changes > 50%", () => {
      const transactions = [
        { amount: 500, type: "expense", category: "food" },
        { amount: 800, type: "expense", category: "food" },
        { amount: 600, type: "expense", category: "transport" },
      ];
      const result = detectAnomalies(transactions, 100);
      expect(result.isAnomaly).toBe(true);
      expect(result.severity).toBe("medium");
    });

    it("ignores income transactions", () => {
      const transactions = [
        { amount: 1000, type: "income", category: "bonus" },
        { amount: 40, type: "expense", category: "food" },
        { amount: 35, type: "expense", category: "transport" },
      ];
      const result = detectAnomalies(transactions, 100);
      expect(result.isAnomaly).toBe(false);
    });

    it("returns no anomaly for empty transactions", () => {
      const result = detectAnomalies([], 100);
      expect(result.isAnomaly).toBe(false);
    });

    it("returns no anomaly when historical average is undefined", () => {
      const transactions = [
        { amount: 500, type: "expense", category: "food" },
      ];
      const result = detectAnomalies(transactions);
      expect(result.isAnomaly).toBe(false);
    });
  });

  describe("formatAmount", () => {
    it("formats string amount with 2 decimals", () => {
      const formatted = formatAmount("100.5");
      expect(formatted).toBe("100.50");
    });

    it("formats number amount with 2 decimals", () => {
      const formatted = formatAmount(100.5);
      expect(formatted).toBe("100.50");
    });

    it("formats whole number with decimals", () => {
      const formatted = formatAmount("500");
      expect(formatted).toBe("500.00");
    });

    it("handles small amounts", () => {
      const formatted = formatAmount("0.99");
      expect(formatted).toBe("0.99");
    });

    it("handles large amounts", () => {
      const formatted = formatAmount("123456.78");
      expect(formatted).toBe("123456.78");
    });

    it("rounds to 2 decimals", () => {
      const formatted = formatAmount("100.999");
      expect(formatted).toBe("101.00");
    });
  });
});
