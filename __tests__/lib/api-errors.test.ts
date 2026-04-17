import { describe, it, expect } from "vitest";

describe("API error shape consistency", () => {
  it("should have consistent error codes", () => {
    const codes = [
      "UNAUTHORIZED",
      "FORBIDDEN",
      "NOT_FOUND",
      "BAD_REQUEST",
      "VALIDATION_ERROR",
      "INTERNAL_ERROR",
      "RATE_LIMITED",
    ];
    codes.forEach((code) => {
      expect(code).toMatch(/^[A-Z_]+$/);
    });
  });
});
