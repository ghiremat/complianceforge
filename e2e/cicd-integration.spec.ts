import { test, expect } from "@playwright/test";

test.describe("CI/CD Integration — GitHub Webhook", () => {
  const webhookUrl = "/api/github/webhook";

  test("webhook endpoint exists and rejects unauthenticated requests", async ({
    request,
  }) => {
    const res = await request.post(webhookUrl, {
      headers: { "X-GitHub-Event": "ping", "Content-Type": "application/json" },
      data: { zen: "test" },
    });
    // 401 (no signature) or 500 (GITHUB_WEBHOOK_SECRET not configured) — never 404
    expect([401, 500]).toContain(res.status());
    expect(res.status()).not.toBe(404);
  });

  test("webhook rejects GET method", async ({ request }) => {
    const res = await request.get(webhookUrl);
    expect(res.status()).toBe(405);
  });
});

test.describe("CI/CD Integration — Check Run Details", () => {
  test("returns 404 for non-existent check run", async ({ request }) => {
    const res = await request.get(
      "/api/github/check-runs/00000000-0000-0000-0000-000000000000"
    );
    expect(res.status()).toBe(404);
  });

  test("check-runs endpoint exists", async ({ request }) => {
    const res = await request.get("/api/github/check-runs/test-id");
    expect(res.status()).not.toBe(405);
  });
});
