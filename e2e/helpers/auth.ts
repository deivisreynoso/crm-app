import { expect, type Page } from "@playwright/test";

export function e2eCredentials() {
  const email = process.env.E2E_EMAIL?.trim();
  const password = process.env.E2E_PASSWORD;
  return { email, password, configured: Boolean(email && password) };
}

/** Sign in via /login using E2E_EMAIL and E2E_PASSWORD from .env.local */
export async function loginAsE2EUser(page: Page) {
  const { email, password, configured } = e2eCredentials();
  if (!configured) {
    throw new Error("Set E2E_EMAIL and E2E_PASSWORD in .env.local to run authenticated smoke tests.");
  }

  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email!);
  await page.getByLabel(/password/i).fill(password!);
  await page.getByRole("button", { name: /sign in|log in/i }).click();

  const loginError = page.getByText(/invalid email or password/i);
  const navigated = page.waitForURL(/\/(dashboard|finances|contacts|conversations)/, {
    timeout: 30_000,
  });

  const outcome = await Promise.race([
    navigated.then(() => "ok" as const),
    loginError.waitFor({ state: "visible", timeout: 30_000 }).then(() => "invalid" as const),
  ]).catch(() => "timeout" as const);

  if (outcome === "invalid") {
    throw new Error(
      "E2E login failed: invalid email or password. Update E2E_EMAIL / E2E_PASSWORD in .env.local (must match a Supabase Auth user with CRM access)."
    );
  }
  if (outcome === "timeout") {
    throw new Error(
      "E2E login timed out. Ensure `npm run dev` is running and credentials are correct."
    );
  }

  await expect(page).toHaveURL(/\/(dashboard|finances|contacts|conversations)/);
}
