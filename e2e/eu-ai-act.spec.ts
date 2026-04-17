import { test, expect } from "@playwright/test";

/** Relative paths use Playwright `use.baseURL` (see `playwright.config.ts`). */

test.describe("EU AI Act Features — API Endpoints", () => {
  const systemId = "test-system-id";

  test("GET /api/systems/{id}/fria returns 401 without auth", async ({ request }) => {
    const res = await request.get(`/api/systems/${systemId}/fria`);
    expect(res.status()).toBe(401);
  });

  test("POST /api/systems/{id}/fria returns 401 without auth", async ({ request }) => {
    const res = await request.post(`/api/systems/${systemId}/fria`, {
      data: { sectionNumber: 1, content: "test", status: "in_progress" },
    });
    expect(res.status()).toBe(401);
  });

  test("GET /api/systems/{id}/obligations returns 401 without auth", async ({ request }) => {
    const res = await request.get(`/api/systems/${systemId}/obligations`);
    expect(res.status()).toBe(401);
  });

  test("GET /api/health returns 200 with status", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBeDefined();
    expect(body.timestamp).toBeDefined();
    expect(body.checks).toBeDefined();
    expect(body.checks.database).toBeDefined();
  });

  test("GET /api/health includes database check", async ({ request }) => {
    const res = await request.get("/api/health");
    const body = await res.json();
    expect(body.checks.database.status).toBe("ok");
    expect(typeof body.checks.database.latencyMs).toBe("number");
  });
});

test.describe("EU AI Act Features — Route Existence", () => {
  test("FRIA route exists and is not 404", async ({ request }) => {
    const res = await request.get(
      "/api/systems/00000000-0000-0000-0000-000000000000/fria"
    );
    expect(res.status()).not.toBe(404);
  });

  test("Obligations route exists and is not 404", async ({ request }) => {
    const res = await request.get(
      "/api/systems/00000000-0000-0000-0000-000000000000/obligations"
    );
    expect(res.status()).not.toBe(404);
  });
});

test.describe("Gap analysis (SDK)", () => {
  test("GET /api/v1/systems/{id}/gaps returns 401 without auth", async ({ request }) => {
    const res = await request.get(
      "/api/v1/systems/00000000-0000-0000-0000-000000000000/gaps"
    );
    expect(res.status()).toBe(401);
  });

  test("gaps route exists and is not 404", async ({ request }) => {
    const res = await request.get(
      "/api/v1/systems/00000000-0000-0000-0000-000000000000/gaps"
    );
    expect(res.status()).not.toBe(404);
  });
});

test.describe("Compliance modules (dashboard)", () => {
  test("dashboard route exists (not 404)", async ({ request }) => {
    const res = await request.get("/dashboard", { maxRedirects: 0 });
    expect(res.status()).not.toBe(404);
  });
});

test.describe("API Pagination", () => {
  test("GET /api/systems supports pagination params", async ({ request }) => {
    const res = await request.get("/api/systems?page=1&limit=10");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.pagination).toBeDefined();
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(10);
  });
});

test.describe("Security Headers", () => {
  test("responses include security headers", async ({ request }) => {
    const res = await request.get("/sign-in");
    const headers = res.headers();
    const lower = Object.fromEntries(
      Object.keys(headers).map((k) => [k.toLowerCase(), headers[k]])
    );
    expect(lower["x-frame-options"]).toBeTruthy();
    expect(lower["x-content-type-options"]).toBeTruthy();
    expect(lower["referrer-policy"]).toBeTruthy();
  });
});
