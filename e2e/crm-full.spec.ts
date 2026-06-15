import { test, expect } from "@playwright/test";
import { e2eCredentials, loginAsE2EUser } from "./helpers/auth";

const PAGE_TIMEOUT = 15_000;

test.describe("CRM full page load", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eCredentials().configured, "Set E2E_EMAIL and E2E_PASSWORD in .env.local");
    await loginAsE2EUser(page);
  });

  test("dashboard loads", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText(/your workspace at a glance/i)).toBeVisible({
      timeout: PAGE_TIMEOUT,
    });
  });

  test("contacts loads", async ({ page }) => {
    await page.goto("/contacts");
    await expect(page.getByRole("heading", { name: /^contacts$/i })).toBeVisible({
      timeout: PAGE_TIMEOUT,
    });
  });

  test("conversations loads", async ({ page }) => {
    await page.goto("/conversations");
    await expect(page.getByRole("heading", { name: /^conversations$/i })).toBeVisible({
      timeout: PAGE_TIMEOUT,
    });
  });

  test("calendar loads", async ({ page }) => {
    await page.goto("/calendar");
    await expect(page.getByRole("heading", { name: /^calendar$/i })).toBeVisible({
      timeout: PAGE_TIMEOUT,
    });
  });

  test("opportunities loads", async ({ page }) => {
    await page.goto("/opportunities");
    await expect(page.getByRole("heading", { name: /^pipelines$/i })).toBeVisible({
      timeout: PAGE_TIMEOUT,
    });
  });

  test("quotes loads", async ({ page }) => {
    await page.goto("/quotes");
    await expect(page.getByRole("heading", { name: /^quotes$/i })).toBeVisible({
      timeout: PAGE_TIMEOUT,
    });
  });

  test("finances redirects to invoices", async ({ page }) => {
    await page.goto("/finances");
    await expect(page).toHaveURL(/\/finances\/invoices/, { timeout: PAGE_TIMEOUT });
    await expect(page.getByRole("button", { name: /create invoice/i })).toBeVisible({
      timeout: PAGE_TIMEOUT,
    });
  });

  test("finances invoices loads", async ({ page }) => {
    await page.goto("/finances/invoices");
    await expect(page.getByRole("button", { name: /create invoice/i })).toBeVisible({
      timeout: PAGE_TIMEOUT,
    });
  });

  test("finances transactions loads", async ({ page }) => {
    await page.goto("/finances/transactions");
    await expect(
      page.getByRole("button", { name: /add expense|add income/i }).first()
    ).toBeVisible({ timeout: PAGE_TIMEOUT });
  });

  test("tickets loads", async ({ page }) => {
    await page.goto("/tickets");
    await expect(page.getByRole("heading", { name: /service tickets/i })).toBeVisible({
      timeout: PAGE_TIMEOUT,
    });
  });

  test("attachments loads", async ({ page }) => {
    await page.goto("/attachments");
    await expect(page.getByRole("heading", { name: /^attachments$/i })).toBeVisible({
      timeout: PAGE_TIMEOUT,
    });
  });

  test("media loads", async ({ page }) => {
    await page.goto("/media");
    await expect(page.getByRole("heading", { name: /^media$/i })).toBeVisible({
      timeout: PAGE_TIMEOUT,
    });
  });

  test("settings loads", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: /^settings$/i })).toBeVisible({
      timeout: PAGE_TIMEOUT,
    });
  });

  test("account loads", async ({ page }) => {
    await page.goto("/account");
    await expect(page.getByRole("heading", { name: /my account/i })).toBeVisible({
      timeout: PAGE_TIMEOUT,
    });
  });
});

test.describe("Public pages smoke", () => {
  test("login loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel(/email/i)).toBeVisible({ timeout: PAGE_TIMEOUT });
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in|log in/i })).toBeVisible();
  });

  test("forgot-password loads", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.getByRole("heading", { name: /reset your password/i })).toBeVisible({
      timeout: PAGE_TIMEOUT,
    });
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });

  test("support loads", async ({ page }) => {
    await page.goto("/support");
    await expect(page).toHaveURL(/\/support/, { timeout: PAGE_TIMEOUT });
    await expect(page.getByRole("heading", { name: /customer support/i }).first()).toBeVisible({
      timeout: PAGE_TIMEOUT,
    });
  });
});
