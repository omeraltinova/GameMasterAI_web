import { test, expect, Page } from "@playwright/test";

/**
 * Shared helpers for E2E tests.
 *
 * Test user credentials — these are created fresh per test run via the
 * registration form (Scenario A), so no seed data is required.
 */

export const TEST_USER = {
  username: `e2euser_${Date.now()}`,
  email: `e2e_${Date.now()}@test.local`,
  password: "TestP@ss123",
};

/**
 * Registers a new user via the UI.
 * Expects to land on /login after successful registration.
 */
export async function registerUser(page: Page, user = TEST_USER) {
  await page.goto("/register");
  await page.getByLabel("Kullanıcı Adı").fill(user.username);
  await page.getByLabel("E-posta").fill(user.email);
  // Use first() to disambiguate "Şifre" from "Şifre Tekrar"
  await page.getByLabel("Şifre", { exact: true }).fill(user.password);
  await page.getByLabel("Şifre Tekrar").fill(user.password);
  await page.locator("#terms").check();
  await page.getByRole("button", { name: "Kayıt Ol" }).click();
  await page.waitForURL("**/login", { timeout: 10_000 });
}

/**
 * Logs in a user via the UI.
 * Expects to land on /dashboard after successful login.
 */
export async function loginUser(page: Page, user = TEST_USER) {
  await page.goto("/login");
  await page.getByLabel("E-posta").fill(user.email);
  await page.getByLabel("Şifre").fill(user.password);
  await page.getByRole("button", { name: "Giriş Yap" }).click();
  await page.waitForURL("**/dashboard", { timeout: 10_000 });
}

/**
 * Full register + login flow.
 */
export async function registerAndLogin(page: Page, user = TEST_USER) {
  await registerUser(page, user);
  await loginUser(page, user);
}
