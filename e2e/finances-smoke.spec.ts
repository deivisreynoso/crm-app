import { test, expect } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test.describe("Finances smoke", () => {
  test("invoices page loads", async ({ page }) => {
    test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD to run authenticated smoke tests");

    await page.goto("/login");
    await page.getByLabel(/email/i).fill(email!);
    await page.getByLabel(/password/i).fill(password!);
    await page.getByRole("button", { name: /sign in|log in/i }).click();

    await page.waitForURL(/\/(dashboard|finances|contacts)/, { timeout: 30_000 });

    await page.goto("/finances/invoices");
    await expect(page.getByRole("button", { name: /create invoice/i })).toBeVisible({
      timeout: 15_000,
    });
  });
});
