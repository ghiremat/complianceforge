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
  const content = await page.content();
  expect(content).not.toContain("Internal Server Error");
  expect(content).not.toContain("500");
}
