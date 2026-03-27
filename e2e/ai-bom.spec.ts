import { test, expect } from "@playwright/test";

test.describe("AI-BOM — API Endpoints", () => {
  test("GET /api/v1/systems/{id}/bom returns 401 without auth", async ({
    request,
  }) => {
    const res = await request.get(
      "/api/v1/systems/00000000-0000-0000-0000-000000000000/bom"
    );
    expect(res.status()).toBe(401);
  });

  test("POST /api/v1/systems/{id}/bom returns 401 without auth", async ({
    request,
  }) => {
    const res = await request.post(
      "/api/v1/systems/00000000-0000-0000-0000-000000000000/bom",
      { data: { source: "manual" } }
    );
    expect(res.status()).toBe(401);
  });

  test("GET /api/v1/systems/{id}/bom/export returns 401 without auth", async ({
    request,
  }) => {
    const res = await request.get(
      "/api/v1/systems/00000000-0000-0000-0000-000000000000/bom/export"
    );
    expect(res.status()).toBe(401);
  });

  test("OPTIONS on BOM endpoints return CORS headers", async ({ request }) => {
    const endpoints = ["bom", "bom/export"];
    for (const ep of endpoints) {
      const res = await request.fetch(
        `/api/v1/systems/00000000-0000-0000-0000-000000000000/${ep}`,
        { method: "OPTIONS" }
      );
      expect(res.status()).toBe(204);
      expect(res.headers()["access-control-allow-origin"]).toBeTruthy();
    }
  });

  test("BOM export supports format query parameter", async ({ request }) => {
    const formats = ["json", "yaml", "cyclonedx"];
    for (const format of formats) {
      const res = await request.get(
        `/api/v1/systems/00000000-0000-0000-0000-000000000000/bom/export?format=${format}`
      );
      // Should be 401 (unauthorized), not 404 (route not found) or 400 (bad format)
      expect(res.status()).toBe(401);
    }
  });
});

test.describe("AI-BOM — Route Existence", () => {
  test("BOM routes exist and are not 404", async ({ request }) => {
    const routes = [
      "/api/v1/systems/test-id/bom",
      "/api/v1/systems/test-id/bom/export",
    ];
    for (const route of routes) {
      const res = await request.get(route);
      expect(res.status()).not.toBe(404);
    }
  });
});
