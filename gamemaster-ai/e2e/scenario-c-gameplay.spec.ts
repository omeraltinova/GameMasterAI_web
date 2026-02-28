import { test, expect } from "@playwright/test";
import { registerAndLogin } from "./helpers";

/**
 * Scenario C: Campaign Play — Send message → Roll dice → See results
 *
 * This scenario tests the in-game experience:
 *   1. Create a solo campaign
 *   2. Select a character and start the session
 *   3. Navigate to the play page
 *   4. Send a message
 *   5. Roll dice via the dice modal
 *   6. Verify results appear in the chat
 *
 * NOTE: This test requires a running AI backend (OpenRouter) for full
 * GM narration. The test is written to handle both cases:
 *   - With AI: Full narrative flow with GM responses
 *   - Without AI: Verifies the player message appears and dice roll works
 */

test.describe("Scenario C: In-Game Messaging & Dice Rolling", () => {
  test.describe.configure({ mode: "serial" });

  const ts = Date.now();
  const user = {
    username: `e2e_c_${ts}`,
    email: `e2e_c_${ts}@test.local`,
    password: "PlayP@ss123",
  };

  let campaignUrl = "";

  test("C1: Setup — Register, create character, and create campaign", async ({
    page,
  }) => {
    // Register and login
    await registerAndLogin(page, user);

    // Create a character first
    await page.goto("/characters/new");

    // Step 1: Race — Human
    await page.getByRole("button", { name: /Human/ }).first().click();
    await page.getByRole("button", { name: "İleri" }).click();

    // Step 2: Class — Fighter
    await page.getByRole("button", { name: /Fighter/ }).first().click();
    await page.getByRole("button", { name: "İleri" }).click();

    // Step 3: Stats
    await page.getByRole("button", { name: /Zar At/ }).click();
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: "İleri" }).click();

    // Step 4: Details
    await page.getByLabel("Karakter Adı").fill("E2E Warrior");
    await page.getByRole("button", { name: "Karakteri Oluştur" }).click();
    await page.waitForURL("**/characters/*", { timeout: 10_000 });

    // Create a solo campaign
    await page.goto("/campaigns/new");
    await page.getByLabel("Oturum Adı").fill("E2E Solo Adventure");
    await page.getByRole("button", { name: "Solo" }).click();
    await page.getByText("Özgür Macera").click();
    await page.getByRole("button", { name: "Oturumu Oluştur" }).click();

    await page.waitForURL("**/campaigns/*", { timeout: 10_000 });
    campaignUrl = page.url();
  });

  test("C2: Select character and start session from lobby", async ({
    page,
  }) => {
    test.skip(!campaignUrl, "No campaign URL from C1");

    await registerAndLogin(page, user);
    await page.goto(campaignUrl);

    // Select the character we created
    const characterCard = page.getByText("E2E Warrior");
    await expect(characterCard).toBeVisible({ timeout: 10_000 });
    await characterCard.click();

    // Confirm character selection
    const confirmBtn = page.getByRole("button", { name: /Karakteri Onayla/ });
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
      // Wait for confirmation
      await page.waitForTimeout(2_000);
    }

    // Start the session (creator-only button)
    const startBtn = page.getByRole("button", { name: /Oturumu Başlat/ });
    if (await startBtn.isVisible()) {
      await startBtn.click();
      await page.waitForTimeout(2_000);
    }

    // Navigate to play
    const playBtn = page.getByRole("button", { name: /Oyuna Başla|Oyuna Devam Et/ });
    await expect(playBtn).toBeVisible({ timeout: 10_000 });
    await playBtn.click();

    await page.waitForURL("**/play", { timeout: 10_000 });
  });

  test("C3: Skip or complete game setup wizard", async ({ page }) => {
    test.skip(!campaignUrl, "No campaign URL from C1");

    await registerAndLogin(page, user);
    await page.goto(campaignUrl + "/play");

    // If setup wizard is shown, skip it
    const skipBtn = page.getByRole("button", { name: /Atla|Skip/ });
    const completeBtn = page.getByRole("button", { name: /Tamamla|Complete/ });

    // Wait for either the setup wizard or the playing phase
    await page.waitForTimeout(3_000);

    if (await skipBtn.isVisible()) {
      await skipBtn.click();
    } else if (await completeBtn.isVisible()) {
      await completeBtn.click();
    }

    // We should now be in playing phase — verify the message input exists
    const messageInput = page.getByPlaceholder(/Aksiyonunu yaz/);
    await expect(messageInput).toBeVisible({ timeout: 15_000 });
  });

  test("C4: Send a player message", async ({ page }) => {
    test.skip(!campaignUrl, "No campaign URL from C1");

    await registerAndLogin(page, user);
    await page.goto(campaignUrl + "/play");

    // Wait for the game to load
    const messageInput = page.getByPlaceholder(/Aksiyonunu yaz/);
    await expect(messageInput).toBeVisible({ timeout: 15_000 });

    // Type and send a message
    await messageInput.fill("Etrafıma bakıyorum ve karanlık koridoru inceliyorum.");
    await messageInput.press("Enter");

    // The player message should appear in the chat
    await expect(
      page.getByText("Etrafıma bakıyorum ve karanlık koridoru inceliyorum.")
    ).toBeVisible({ timeout: 10_000 });
  });

  test("C5: Roll dice via the dice modal", async ({ page }) => {
    test.skip(!campaignUrl, "No campaign URL from C1");

    await registerAndLogin(page, user);
    await page.goto(campaignUrl + "/play");

    // Wait for the game to load
    await expect(
      page.getByPlaceholder(/Aksiyonunu yaz/)
    ).toBeVisible({ timeout: 15_000 });

    // Open dice modal
    const diceBtn = page.getByRole("button", { name: "Zar At" });
    await expect(diceBtn).toBeVisible();
    await diceBtn.click();

    // Modal should open
    await expect(page.getByText("Zar At").first()).toBeVisible();

    // Select d20
    await page.getByRole("button", { name: "D20" }).click();

    // Roll the dice
    await page.getByRole("button", { name: "Zar At!" }).click();

    // Wait for the roll animation (800ms) + result
    await page.waitForTimeout(1_500);

    // The modal should show a numeric result
    // Close the modal
    const closeBtn = page.getByRole("button", { name: /Kapat|Close|×/ });
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    } else {
      // Try pressing Escape
      await page.keyboard.press("Escape");
    }

    // The dice roll should appear in the chat as a DICE message
    // Dice messages contain the 🎲 emoji or "d20" text
    await expect(
      page.getByText(/🎲|d20/).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
