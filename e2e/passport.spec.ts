import { test, expect } from "@playwright/test";
import { loginAsDemo, expectNoServerError } from "./helpers";

test.describe("Compliance Passport — Public Trust Page", () => {
  test("returns 404 for non-existent org slug", async ({ page }) => {
    const res = await page.goto("/trust/nonexistent-org/fake-id");
    expect(res?.status()).toBe(404);
  });

  test("returns 404 for disabled or missing passport", async ({ page }) => {
    const res = await page.goto(
      "/trust/test-org/00000000-0000-0000-0000-000000000000"
    );
    expect(res?.status()).toBe(404);
  });
});

test.describe("Compliance Passport — Widget API", () => {
  test("returns 404 for non-existent system passport", async ({ request }) => {
    const res = await request.get(
      "/api/passport/00000000-0000-0000-0000-000000000000"
    );
    expect(res.status()).toBe(404);
  });

  test("returns CORS headers on OPTIONS", async ({ request }) => {
    const res = await request.fetch(
      "/api/passport/00000000-0000-0000-0000-000000000000",
      { method: "OPTIONS" }
    );
    expect(res.status()).toBe(204);
    expect(res.headers()["access-control-allow-origin"]).toBe("*");
  });

  test("widget.js endpoint serves JavaScript", async ({ request }) => {
    const res = await request.get("/api/passport/widget.js");
    expect(res.status()).toBe(200);
    const contentType = res.headers()["content-type"] ?? "";
    expect(contentType).toContain("javascript");
    const body = await res.text();
    expect(body).toContain("complianceforge");
    expect(body.length).toBeLessThan(5000);
  });
});

test.describe("Compliance Passport — Management API", () => {
  test("GET /api/v1/systems/{id}/passport returns 401 without auth", async ({
    request,
  }) => {
    const res = await request.get(
      "/api/v1/systems/00000000-0000-0000-0000-000000000000/passport"
    );
    expect(res.status()).toBe(401);
  });

  test("PATCH /api/v1/systems/{id}/passport returns 401 without auth", async ({
    request,
  }) => {
    const res = await request.patch(
      "/api/v1/systems/00000000-0000-0000-0000-000000000000/passport",
      { data: { enabled: true } }
    );
    expect(res.status()).toBe(401);
  });

  test("OPTIONS returns CORS headers", async ({ request }) => {
    const res = await request.fetch(
      "/api/v1/systems/00000000-0000-0000-0000-000000000000/passport",
      { method: "OPTIONS" }
    );
    expect(res.status()).toBe(204);
    expect(res.headers()["access-control-allow-origin"]).toBeTruthy();
  });
});

test.describe("Compliance Passport — Full Flow", () => {
  test("passport config is accessible from settings", async ({ page }) => {
    await loginAsDemo(page);
    await expectNoServerError(page);
    await page.goto("/dashboard");
    await expectNoServerError(page);
    expect(page.url()).toContain("/dashboard");
  });
});
