import { test, expect } from "@playwright/test";
import { registerAndLogin } from "./helpers";

/**
 * Scenario B: Join campaign with invite code → Select character → Enter lobby
 *
 * This scenario tests the multiplayer campaign join flow.
 *
 * Prerequisites:
 * - A campaign must exist with a known invite code.
 * - The joining user must have at least one character.
 *
 * Since E2E tests run against a live server, this flow creates:
 *   1. A "host" user who creates a campaign
 *   2. A "guest" user who joins the campaign via invite code
 */

test.describe("Scenario B: Campaign Join Flow", () => {
  test.describe.configure({ mode: "serial" });

  const ts = Date.now();

  const host = {
    username: `e2e_host_${ts}`,
    email: `e2e_host_${ts}@test.local`,
    password: "HostP@ss123",
  };

  const guest = {
    username: `e2e_guest_${ts}`,
    email: `e2e_guest_${ts}@test.local`,
    password: "GuestP@ss123",
  };

  let inviteCode = "";

  test("B1: Host creates a multiplayer campaign", async ({ page }) => {
    // Register and login as host
    await registerAndLogin(page, host);

    // Navigate to campaign creation
    await page.goto("/campaigns/new");
    await expect(
      page.getByRole("heading", { name: "Yeni Oturum" })
    ).toBeVisible();

    // Fill campaign details
    await page.getByLabel("Oturum Adı").fill("E2E Party Quest");

    // Select multiplayer mode
    await page.getByRole("button", { name: "Çok Oyunculu" }).click();

    // Select max players (4)
    await page.getByRole("button", { name: "4" }).click();

    // Select free adventure (no scenario)
    await page.getByText("Özgür Macera").click();

    // Create campaign
    await page.getByRole("button", { name: "Oturumu Oluştur" }).click();

    // Should redirect to campaign detail page
    await page.waitForURL("**/campaigns/*", { timeout: 10_000 });

    // Extract invite code from the page (it's typically displayed on the campaign detail)
    // Look for the invite code text on the page
    const codeElement = page.locator("[data-invite-code]");
    const hasDataAttr = await codeElement.count();

    if (hasDataAttr > 0) {
      inviteCode = (await codeElement.getAttribute("data-invite-code")) || "";
    } else {
      // Try to find the invite code in the page text — usually displayed as "XXXXXXXX"
      // The invite code is an 8-char uppercase hex string
      const pageText = await page.textContent("body");
      const codeMatch = pageText?.match(/\b[A-F0-9]{8}\b/);
      if (codeMatch) {
        inviteCode = codeMatch[0];
      }
    }

    // If we couldn't extract the invite code from the detail page,
    // fetch it from the campaigns list
    if (!inviteCode) {
      await page.goto("/campaigns");
      await expect(page.getByText("E2E Party Quest")).toBeVisible({
        timeout: 5_000,
      });
      const pageText = await page.textContent("body");
      const codeMatch = pageText?.match(/\b[A-F0-9]{8}\b/);
      if (codeMatch) {
        inviteCode = codeMatch[0];
      }
    }

    // The invite code should have been captured
    expect(inviteCode.length).toBeGreaterThanOrEqual(4);
  });

  test("B2: Guest registers and creates a character", async ({ page }) => {
    // Register and login as guest
    await registerAndLogin(page, guest);

    // Create a character for the guest
    await page.goto("/characters/new");

    // Step 1: Race
    await page.getByRole("button", { name: /Elf/ }).first().click();
    await page.getByRole("button", { name: "İleri" }).click();

    // Step 2: Class
    await page.getByRole("button", { name: /Wizard/ }).first().click();
    await page.getByRole("button", { name: "İleri" }).click();

    // Step 3: Stats
    await page.getByRole("button", { name: /Zar At/ }).click();
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: "İleri" }).click();

    // Step 4: Details
    await page.getByLabel("Karakter Adı").fill("E2E Guest Mage");
    await page.getByRole("button", { name: "Karakteri Oluştur" }).click();

    await page.waitForURL("**/characters/*", { timeout: 10_000 });
  });

  test("B3: Guest joins campaign with invite code", async ({ page }) => {
    test.skip(!inviteCode, "No invite code captured from B1");

    await registerAndLogin(page, guest);

    // Navigate to join page
    await page.goto("/campaigns/join");
    await expect(
      page.getByRole("heading", { name: "Oturuma Katıl" })
    ).toBeVisible();

    // Enter invite code
    await page.getByPlaceholder("ABCD-1234").fill(inviteCode);

    // Search for campaign
    await page.getByRole("button", { name: "Oturumu Bul" }).click();

    // Wait for campaign to be found
    await expect(page.getByText("Oturum Bulundu!")).toBeVisible({
      timeout: 10_000,
    });

    // Campaign name should be displayed
    await expect(page.getByText("E2E Party Quest")).toBeVisible();

    // Join the lobby
    const joinButton = page.getByRole("button", { name: /Lobiye/ });
    await expect(joinButton).toBeVisible();
    await joinButton.click();

    // Should navigate to the campaign lobby/detail
    await page.waitForURL("**/campaigns/*", { timeout: 10_000 });
  });

  test("B4: Guest sees the campaign in their list", async ({ page }) => {
    test.skip(!inviteCode, "No invite code captured from B1");

    await registerAndLogin(page, guest);
    await page.goto("/campaigns");

    // The joined campaign should appear
    await expect(page.getByText("E2E Party Quest")).toBeVisible({
      timeout: 10_000,
    });
  });
});
