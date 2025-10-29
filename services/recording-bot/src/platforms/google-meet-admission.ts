import { Page } from 'playwright';
import {
  googleAdmissionIndicators,
  googleWaitingRoomIndicators,
  googleRejectionIndicators
} from './selectors';

// Check if bot has been rejected from the meeting
export async function checkForRejection(page: Page): Promise<boolean> {
  try {
    for (const selector of googleRejectionIndicators) {
      try {
        const element = await page.locator(selector).first();
        if (await element.isVisible()) {
          console.log(`🚨 Rejection detected: ${selector}`);
          return true;
        }
      } catch (e) {
        continue;
      }
    }
    return false;
  } catch (error: any) {
    console.log(`Error checking rejection: ${error.message}`);
    return false;
  }
}

// Check for admission indicators
export async function checkForAdmissionIndicators(page: Page): Promise<boolean> {
  for (const selector of googleAdmissionIndicators) {
    try {
      const element = page.locator(selector).first();
      const isVisible = await element.isVisible();
      if (isVisible) {
        const isDisabled = await element.getAttribute('aria-disabled');
        if (isDisabled !== 'true') {
          console.log(`✅ Found admission indicator: ${selector}`);
          return true;
        }
      }
    } catch (error) {
      continue;
    }
  }
  return false;
}

// Check for waiting room indicators
export async function checkForWaitingRoomIndicators(page: Page): Promise<boolean> {
  for (const selector of googleWaitingRoomIndicators) {
    try {
      const element = await page.locator(selector).first();
      if (await element.isVisible()) {
        return true;
      }
    } catch {
      continue;
    }
  }
  return false;
}

// Wait for "Getting ready..." loading screen to disappear
async function waitForLoadingScreenToDisappear(page: Page, timeout: number): Promise<void> {
  const loadingIndicators = [
    'text="Getting ready..."',
    'text*="Getting ready"',
    'text="You\'ll be able to join in just a moment"',
    'text*="be able to join in just a moment"',
    'text="Preparando..."',
    'text*="Preparando"'
  ];

  console.log('⏳ Checking for "Getting ready..." loading screen...');

  // Check if loading screen is visible
  let loadingVisible = false;
  for (const selector of loadingIndicators) {
    try {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 1000 })) {
        loadingVisible = true;
        console.log(`📍 Found loading screen: ${selector}`);
        break;
      }
    } catch {
      continue;
    }
  }

  if (!loadingVisible) {
    console.log('✅ No loading screen detected, proceeding...');
    return;
  }

  // Wait for loading screen to disappear
  console.log('⏳ Waiting for "Getting ready..." screen to disappear...');
  const startTime = Date.now();
  const checkInterval = 2000;

  while (Date.now() - startTime < timeout) {
    let stillLoading = false;

    for (const selector of loadingIndicators) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 500 })) {
          stillLoading = true;
          break;
        }
      } catch {
        continue;
      }
    }

    if (!stillLoading) {
      console.log('✅ Loading screen disappeared!');
      return;
    }

    await page.waitForTimeout(checkInterval);
    console.log(`Still on loading screen... ${Math.round((Date.now() - startTime) / 1000)}s elapsed`);
  }

  throw new Error('Timeout waiting for loading screen to disappear');
}

// Wait for meeting admission
export async function waitForAdmission(page: Page, timeout: number): Promise<void> {
  console.log('Waiting for Google Meet meeting admission...');

  // Screenshot at start
  try {
    await page.screenshot({
      path: '/app/storage/screenshots/06-admission-start.png',
      fullPage: true
    });
    console.log('📸 Screenshot: Admission check start');
  } catch (e) {}

  // FIRST: Wait for "Getting ready..." loading screen to disappear
  try {
    await waitForLoadingScreenToDisappear(page, 60000); // 60 seconds timeout

    // Screenshot after loading screen
    try {
      await page.screenshot({
        path: '/app/storage/screenshots/06b-after-loading.png',
        fullPage: true
      });
      console.log('📸 Screenshot: After loading screen');
    } catch (e) {}
  } catch (error) {
    console.log('⚠️ Timeout waiting for loading screen to disappear, continuing anyway...');
  }

  // Check if already admitted
  const initialAdmissionFound = await checkForAdmissionIndicators(page);
  const initialLobbyVisible = await checkForWaitingRoomIndicators(page);

  if (initialAdmissionFound && !initialLobbyVisible) {
    console.log('✅ Bot is already admitted!');
    try {
      await page.screenshot({
        path: '/app/storage/screenshots/07-admitted.png',
        fullPage: true
      });
      console.log('📸 Screenshot: Already admitted');
    } catch (e) {}
    return;
  }

  console.log('Bot not yet admitted - checking for waiting room...');

  const waitingRoomVisible = await checkForWaitingRoomIndicators(page);

  if (waitingRoomVisible) {
    console.log('⏳ Bot is in waiting room');
    
    try {
      await page.screenshot({ 
        path: '/app/storage/screenshots/08-waiting-room.png', 
        fullPage: true 
      });
      console.log('📸 Screenshot: In waiting room');
    } catch (e) {}

    const checkInterval = 2000;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      // Check for rejection
      const isRejected = await checkForRejection(page);
      if (isRejected) {
        throw new Error('Bot admission was rejected by meeting admin');
      }

      // Check if still in waiting room
      const stillWaiting = await checkForWaitingRoomIndicators(page);

      if (!stillWaiting) {
        console.log('Waiting room disappeared - checking admission...');

        const admissionFound = await checkForAdmissionIndicators(page);
        if (admissionFound) {
          console.log('✅ Bot was admitted!');
          try {
            await page.screenshot({ 
              path: '/app/storage/screenshots/09-admitted-after-wait.png', 
              fullPage: true 
            });
          } catch (e) {}
          return;
        }
      }

      await page.waitForTimeout(checkInterval);
      console.log(`Still in waiting room... ${Math.round((Date.now() - startTime) / 1000)}s elapsed`);
    }

    throw new Error('Timeout waiting for admission - still in waiting room');
  }

  // Not in waiting room, poll for admission
  console.log('No waiting room detected, polling for admission...');
  const checkInterval = 2000;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const isRejected = await checkForRejection(page);
    if (isRejected) {
      throw new Error('Bot admission was rejected');
    }

    const admissionFound = await checkForAdmissionIndicators(page);
    const lobbyVisible = await checkForWaitingRoomIndicators(page);

    if (admissionFound && !lobbyVisible) {
      console.log('✅ Bot admitted during polling!');
      try {
        await page.screenshot({ 
          path: '/app/storage/screenshots/10-admitted-polling.png', 
          fullPage: true 
        });
      } catch (e) {}
      return;
    }

    await page.waitForTimeout(checkInterval);
    console.log(`Polling for admission... ${Math.round((Date.now() - startTime) / 1000)}s elapsed`);
  }

  throw new Error('Timeout waiting for admission');
}
