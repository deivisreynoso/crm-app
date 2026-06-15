import { test, expect } from "@playwright/test";
import { e2eCredentials, loginAsE2EUser } from "./helpers/auth";

test.describe("Finances smoke", () => {
  test("invoices page loads", async ({ page }) => {
    test.skip(!e2eCredentials().configured, "Set E2E_EMAIL and E2E_PASSWORD in .env.local");

    await loginAsE2EUser(page);

    await page.goto("/finances/invoices");
    await expect(page.getByRole("button", { name: /create invoice/i })).toBeVisible({
      timeout: 15_000,
    });
  });
});
