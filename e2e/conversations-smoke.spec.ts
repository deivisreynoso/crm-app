import { test, expect } from "@playwright/test";
import { e2eCredentials, loginAsE2EUser } from "./helpers/auth";

test.describe("Conversations inbox smoke", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eCredentials().configured, "Set E2E_EMAIL and E2E_PASSWORD in .env.local");
    await loginAsE2EUser(page);
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
