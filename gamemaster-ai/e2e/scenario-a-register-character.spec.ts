import { test, expect } from "@playwright/test";
import { TEST_USER, registerUser, loginUser } from "./helpers";

/**
 * Scenario A: Register → Create Character → Save Character
 *
 * Tests the full flow from user registration to character creation.
 * Uses the 4-step character wizard (Race → Class → Stats → Details).
 */

test.describe("Scenario A: Registration & Character Creation", () => {
  test.describe.configure({ mode: "serial" });

  // Use a unique user for this entire scenario
  const user = {
    username: `e2e_a_${Date.now()}`,
    email: `e2e_a_${Date.now()}@test.local`,
    password: "TestP@ss123",
  };

  test("A1: User can register a new account", async ({ page }) => {
    await page.goto("/register");

    // Verify we're on the registration page
    await expect(
      page.getByRole("heading", { name: "Maceraya Katıl" })
    ).toBeVisible();

    // Fill registration form
    await page.getByLabel("Kullanıcı Adı").fill(user.username);
    await page.getByLabel("E-posta").fill(user.email);
    await page.getByLabel("Şifre", { exact: true }).fill(user.password);
    await page.getByLabel("Şifre Tekrar").fill(user.password);
    await page.locator("#terms").check();

    // Submit
    await page.getByRole("button", { name: "Kayıt Ol" }).click();

    // Should redirect to login page
    await page.waitForURL("**/login", { timeout: 10_000 });
    await expect(
      page.getByRole("heading", { name: "Hoş Geldiniz" })
    ).toBeVisible();
  });

  test("A2: User can log in", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("E-posta").fill(user.email);
    await page.getByLabel("Şifre").fill(user.password);
    await page.getByRole("button", { name: "Giriş Yap" }).click();

    // Should redirect to dashboard
    await page.waitForURL("**/dashboard", { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: /Hoş geldin/ })).toBeVisible();
  });

  test("A3: Dashboard shows empty character state", async ({ page }) => {
    await loginUser(page, user);

    // New user should see empty state
    await expect(page.getByText("Henüz karakterin yok")).toBeVisible({
      timeout: 5_000,
    });
  });

  test("A4: User can create a character via wizard", async ({ page }) => {
    await loginUser(page, user);

    // Navigate to character creation
    await page.getByRole("button", { name: "Yeni Karakter" }).first().click();
    await page.waitForURL("**/characters/new", { timeout: 5_000 });

    await expect(
      page.getByRole("heading", { name: "Yeni Karakter Oluştur" })
    ).toBeVisible();

    // Step 1: Select Race — click "Human"
    await page.getByRole("button", { name: /Human/ }).first().click();
    await page.getByRole("button", { name: "İleri" }).click();

    // Step 2: Select Class — click "Fighter"
    await page.getByRole("button", { name: /Fighter/ }).first().click();
    await page.getByRole("button", { name: "İleri" }).click();

    // Step 3: Stats — roll dice
    await page.getByRole("button", { name: /Zar At/ }).click();
    // Wait a moment for the dice roll animation
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: "İleri" }).click();

    // Step 4: Details — fill name
    await page.getByLabel("Karakter Adı").fill("E2E Test Hero");

    // Submit character
    await page.getByRole("button", { name: "Karakteri Oluştur" }).click();

    // Should redirect to the character detail page
    await page.waitForURL("**/characters/*", { timeout: 10_000 });
  });

  test("A5: Created character appears in character list", async ({ page }) => {
    await loginUser(page, user);
    await page.goto("/characters");

    // Wait for characters to load
    await expect(page.getByText("E2E Test Hero")).toBeVisible({
      timeout: 10_000,
    });
  });
});

test.describe("Registration validation", () => {
  test("shows error for invalid email", async ({ page }) => {
    await page.goto("/register");

    await page.getByLabel("Kullanıcı Adı").fill("testuser");
    await page.getByLabel("E-posta").fill("not-an-email");
    await page.getByLabel("Şifre", { exact: true }).fill("TestP@ss123");
    await page.getByLabel("Şifre Tekrar").fill("TestP@ss123");
    await page.locator("#terms").check();

    await page.getByRole("button", { name: "Kayıt Ol" }).click();

    // Should show validation error — stay on register page
    await expect(page).toHaveURL(/\/register/);
  });

  test("shows error for password mismatch", async ({ page }) => {
    await page.goto("/register");

    await page.getByLabel("Kullanıcı Adı").fill("testuser");
    await page.getByLabel("E-posta").fill("test@test.local");
    await page.getByLabel("Şifre", { exact: true }).fill("TestP@ss123");
    await page.getByLabel("Şifre Tekrar").fill("DifferentP@ss1");
    await page.locator("#terms").check();

    await page.getByRole("button", { name: "Kayıt Ol" }).click();

    // Should show mismatch error
    await expect(page.getByText(/eşleşmiyor/i)).toBeVisible({ timeout: 3_000 });
  });
});
