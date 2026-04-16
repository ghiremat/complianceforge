import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("@/server/db", () => ({
  db: {
    aiSystem: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { calculateComplianceScore } from "@/lib/compliance-scoring";
import { db } from "@/server/db";

const findUnique = db.aiSystem.findUnique as unknown as Mock;
const update = db.aiSystem.update as unknown as Mock;

describe("calculateComplianceScore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns zero score when system not found", async () => {
    findUnique.mockResolvedValue(null);
    const result = await calculateComplianceScore("nonexistent");
    expect(result.score).toBe(0);
    expect(result.grade).toBe("F");
    expect(result.criteria).toEqual([]);
    expect(update).not.toHaveBeenCalled();
  });

  it("awards points for risk classification", async () => {
    findUnique.mockResolvedValue({
      id: "test-1",
      incidents: [],
      documents: [],
      assessments: [{ riskTier: "high", createdAt: new Date() }],
      conformityAssessments: [],
      complianceDeadlines: [],
    });
    update.mockResolvedValue({});

    const result = await calculateComplianceScore("test-1");

    expect(result.score).toBeGreaterThan(0);
    expect(result.criteria).toBeDefined();
    expect(Array.isArray(result.criteria)).toBe(true);
    const risk = result.criteria.find((c) => c.id === "risk_classification");
    expect(risk?.earned).toBe(10);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "test-1" },
        data: expect.objectContaining({ complianceScore: expect.any(Number) }),
      })
    );
  });
});
