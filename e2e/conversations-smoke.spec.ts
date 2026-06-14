import { test, expect } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test.describe("Conversations inbox smoke", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD to run authenticated smoke tests");

    await page.goto("/login");
    await page.getByLabel(/email/i).fill(email!);
    await page.getByLabel(/password/i).fill(password!);
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    await page.waitForURL(/\/(dashboard|finances|contacts|conversations)/, {
      timeout: 30_000,
    });
  });

  test("conversations page loads", async ({ page }) => {
    await page.goto("/conversations");
    await expect(page.getByPlaceholder(/search name or phone/i)).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/select a conversation/i)).toBeVisible();
  });

  test("notification bell shows clear all when items exist", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: /notifications/i }).click();
    const clearAll = page.getByRole("button", { name: /clear all/i });
    const empty = page.getByText(/no notifications yet/i);
    await expect(clearAll.or(empty)).toBeVisible({ timeout: 10_000 });
  });

  test("account notification preferences include conversations toggle", async ({ page }) => {
    await page.goto("/account");
    await expect(
      page.getByText(/whatsapp and webchat conversations needing review/i)
    ).toBeVisible({ timeout: 15_000 });
  });
});
