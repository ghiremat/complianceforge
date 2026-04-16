import { Page, expect } from "@playwright/test";

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
