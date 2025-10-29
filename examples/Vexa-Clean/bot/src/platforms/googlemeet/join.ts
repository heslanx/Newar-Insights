import { Page } from "playwright";
import { log, randomDelay, callJoiningCallback } from "../../utils";
import { BotConfig } from "../../types";
import { 
  googleNameInputSelectors,
  googleJoinButtonSelectors,
  googleMicrophoneButtonSelectors,
  googleCameraButtonSelectors
} from "./selectors";

export async function joinGoogleMeeting(
  page: Page, 
  meetingUrl: string, 
  botName: string, 
  botConfig: BotConfig
): Promise<void> {
  await page.goto(meetingUrl, { waitUntil: "networkidle" });
  await page.bringToFront();

  // Take screenshot after navigation
  await page.screenshot({ path: '/app/storage/screenshots/bot-checkpoint-0-after-navigation.png', fullPage: true });
  log("📸 Screenshot taken: After navigation to meeting URL");
  
  // --- Call joining callback to notify bot-manager that bot is joining ---
  try {
    await callJoiningCallback(botConfig);
    log("Joining callback sent successfully");
  } catch (callbackError: any) {
    log(`Warning: Failed to send joining callback: ${callbackError.message}. Continuing with join process...`);
  }

  // Add a longer, fixed wait after navigation for page elements to settle
  log("Waiting for page elements to settle after navigation...");
  await page.waitForTimeout(5000); // Wait 5 seconds

  // Enter name and join
  await page.waitForTimeout(randomDelay(1000));
  log("Attempting to find name input field...");
  
  // Use selector from selectors.ts instead of inline
  const nameFieldSelector = googleNameInputSelectors[0];
  await page.waitForSelector(nameFieldSelector, { timeout: 120000 }); // 120 seconds
  log("Name input field found.");
  
  // Take screenshot after finding name field
  await page.screenshot({ path: '/app/storage/screenshots/bot-checkpoint-0-name-field-found.png', fullPage: true });
  log("📸 Screenshot taken: Name input field found");

  await page.waitForTimeout(randomDelay(1000));
  await page.fill(nameFieldSelector, botName);

  // Mute mic and camera if available
  try {
    await page.waitForTimeout(randomDelay(500));
    const micSelector = googleMicrophoneButtonSelectors[0];
    await page.click(micSelector, { timeout: 200 });
    await page.waitForTimeout(200);
  } catch (e) {
    log("Microphone already muted or not found.");
  }
  
  try {
    await page.waitForTimeout(randomDelay(500));
    const cameraSelector = googleCameraButtonSelectors[0];
    await page.click(cameraSelector, { timeout: 200 });
    await page.waitForTimeout(200);
  } catch (e) {
    log("Camera already off or not found.");
  }

  // Try multiple join button selectors until one works
  let joinSuccess = false;
  let lastError: any = null;

  for (let i = 0; i < googleJoinButtonSelectors.length && !joinSuccess; i++) {
    const joinSelector = googleJoinButtonSelectors[i];
    try {
      log(`[Join] Trying selector ${i + 1}/${googleJoinButtonSelectors.length}: ${joinSelector}`);
      await page.waitForSelector(joinSelector, { timeout: 5000 });
      await page.click(joinSelector, { timeout: 5000 });
      joinSuccess = true;
      log(`✅ [Join] Successfully clicked join button with selector: ${joinSelector}`);
    } catch (error: any) {
      lastError = error;
      log(`⚠️ [Join] Selector failed: ${joinSelector} - ${error.message}`);
      continue;
    }
  }

  if (!joinSuccess) {
    log(`❌ [Join] Failed to find join button after trying ${googleJoinButtonSelectors.length} selectors`);
    throw lastError || new Error("Could not find join button with any selector");
  }

  log(`${botName} joined the Google Meet Meeting.`);
  
  // Take screenshot after clicking "Ask to join"
  await page.screenshot({ path: '/app/storage/screenshots/bot-checkpoint-0-after-ask-to-join.png', fullPage: true });
  log("📸 Screenshot taken: After clicking 'Ask to join'");
}
