import { Page, expect } from "@playwright/test";

/** Base URL for API tests (matches `playwright.config.ts` use.baseURL). */
export const BASE =
  process.env.BASE_URL || `http://127.0.0.1:${process.env.E2E_PORT || "3330"}`;

/** Optional headers for authenticated API requests in E2E. */
export function apiHeaders(token?: string): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

interface TestUser {
  email: string;
  password: string;
}

const demoUser: TestUser = {
  email: "demo@complianceforge.ai",
  password: "demo123",
};

export async function loginAsDemo(page: Page) {
  await page.goto("/sign-in");
  await page.fill("#email", demoUser.email);
  await page.fill("#password", demoUser.password);
  await page.click('button[type="submit"]');
  await page.waitForURL("/dashboard", { timeout: 20000 });
}

export async function expectNoServerError(page: Page) {
  const title = await page.title();
  expect(title).not.toContain("500");
  expect(title).not.toContain("Internal Server Error");
  const hasErrorHeading = await page.locator("h1, h2").filter({ hasText: /internal server error/i }).count();
  expect(hasErrorHeading).toBe(0);
}
