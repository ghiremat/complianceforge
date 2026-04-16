import { test, expect } from "@playwright/test";

test.describe("SDK API — Auth Protection", () => {
  const endpoints = [
    { method: "GET", path: "/api/v1/systems/00000000-0000-0000-0000-000000000000/gaps" },
    { method: "GET", path: "/api/v1/systems/00000000-0000-0000-0000-000000000000/score" },
    { method: "GET", path: "/api/v1/systems/00000000-0000-0000-0000-000000000000/documents" },
    { method: "GET", path: "/api/v1/systems/00000000-0000-0000-0000-000000000000/evidence" },
  ];

  for (const { method, path } of endpoints) {
    test(`${method} ${path.split("/").pop()} returns 401 without auth`, async ({
      request,
    }) => {
      const res = await request.fetch(path, { method });
      expect(res.status()).toBe(401);
    });
  }
});

test.describe("SDK API — CORS Support", () => {
  const endpoints = ["gaps", "score", "documents", "evidence"];

  for (const ep of endpoints) {
    test(`OPTIONS /systems/{id}/${ep} returns CORS headers`, async ({
      request,
    }) => {
      const res = await request.fetch(
        `/api/v1/systems/00000000-0000-0000-0000-000000000000/${ep}`,
        { method: "OPTIONS" }
      );
      expect(res.status()).toBe(204);
      expect(res.headers()["access-control-allow-origin"]).toBeTruthy();
      expect(res.headers()["access-control-allow-methods"]).toBeTruthy();
    });
  }
});

test.describe("SDK API — Route Existence", () => {
  test("new v1 API routes exist and are not 404", async ({ request }) => {
    const routes = [
      "/api/v1/systems/test-id/gaps",
      "/api/v1/systems/test-id/score",
      "/api/v1/systems/test-id/documents",
      "/api/v1/systems/test-id/evidence",
    ];
    for (const route of routes) {
      const res = await request.get(route);
      // Should be 401 (need auth), not 404 (route missing)
      expect(res.status()).not.toBe(404);
    }
  });

  test("POST /api/v1/systems/{id}/evidence returns 401 without auth", async ({
    request,
  }) => {
    const res = await request.post(
      "/api/v1/systems/00000000-0000-0000-0000-000000000000/evidence",
      { data: { type: "document", title: "test", content: "test content" } }
    );
    expect(res.status()).toBe(401);
  });
});
