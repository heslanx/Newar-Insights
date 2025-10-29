import { Page } from 'playwright';
import {
  googleNameInputSelectors,
  googleJoinButtonSelectors,
  googleMicrophoneButtonSelectors,
  googleCameraButtonSelectors,
  googleLeaveButtonSelectors
} from './selectors';
import { waitForAdmission } from './google-meet-admission';

export class GoogleMeetPlatform {
  private page: Page;
  private botName: string;

  constructor(page: Page, botName: string) {
    this.page = page;
    this.botName = botName;
  }

  async join(meetingUrl: string): Promise<void> {
    console.log(`🚀 Joining Google Meet: ${meetingUrl}`);

    // Navigate to meeting
    await this.page.goto(meetingUrl, { waitUntil: 'networkidle' });
    await this.page.bringToFront();

    console.log('✅ Navigated to meeting URL');

    // Screenshot after navigation
    try {
      await this.page.screenshot({ path: '/app/storage/screenshots/01-after-navigation.png', fullPage: true });
      console.log('📸 Screenshot: After navigation');
    } catch (e) {
      console.log('⚠️ Failed to take screenshot');
    }

    // Wait for page elements to settle (matching Vexa Clean's timing)
    console.log('⏳ Waiting for page to fully load (5 seconds)...');
    await this.page.waitForTimeout(5000); // 5 seconds like Vexa Clean

    // Enter bot name
    await this.enterBotName();

    // Screenshot after name input
    try {
      await this.page.screenshot({ path: '/app/storage/screenshots/02-after-name-input.png', fullPage: true });
      console.log('📸 Screenshot: After name input');
    } catch (e) {}

    // Mute microphone and camera
    await this.muteAudioVideo();

    // Screenshot before clicking join
    try {
      await this.page.screenshot({ path: '/app/storage/screenshots/03-before-join-click.png', fullPage: true });
      console.log('📸 Screenshot: Before join click');
    } catch (e) {}

    // Click join button (like Vexa Clean, no pre-validation)
    await this.clickJoinButton();

    console.log('✅ Clicked join button, waiting for admission...');

    // Screenshot after clicking join
    try {
      await this.page.screenshot({ path: '/app/storage/screenshots/04-after-join-click.png', fullPage: true });
      console.log('📸 Screenshot: After join click');
    } catch (e) {}

    // Wait for admission
    await waitForAdmission(this.page, 120000); // 120 seconds timeout

    console.log('🎉 Successfully joined Google Meet!');
  }

  private async enterBotName(): Promise<void> {
    console.log('Attempting to find name input field...');

    // Like Vexa Clean: wait up to 120 seconds for name field
    const nameFieldSelector = googleNameInputSelectors[0];
    try {
      await this.page.waitForSelector(nameFieldSelector, { timeout: 120000 }); // 120 seconds
      console.log('Name input field found.');
      await this.page.fill(nameFieldSelector, this.botName);
      console.log(`✅ Set bot name: ${this.botName}`);
      return;
    } catch (err) {
      console.log('ℹ️  No name input found after 120s, continuing...');
    }
  }

  private async muteAudioVideo(): Promise<void> {
    // MODIFICADO: Deixar microfone ATIVO para gravar próprio áudio
    // Se quiser mutar, descomente o código abaixo

    /*
    // Mute microphone
    for (const selector of googleMicrophoneButtonSelectors) {
      try {
        const element = await this.page.locator(selector).first();
        if (await element.isVisible()) {
          await element.click({ timeout: 500 });
          console.log('✅ Microphone muted');
          break;
        }
      } catch (err) {
        continue;
      }
    }
    */
    console.log('🎤 Microphone LEFT ACTIVE for recording');

    // Disable camera
    for (const selector of googleCameraButtonSelectors) {
      try {
        const element = await this.page.locator(selector).first();
        if (await element.isVisible()) {
          await element.click({ timeout: 500 });
          console.log('✅ Camera disabled');
          break;
        }
      } catch (err) {
        continue;
      }
    }
  }

  private async clickJoinButton(): Promise<void> {
    let joinSuccess = false;
    let lastError: any = null;

    // First try: wait for visible buttons
    for (let i = 0; i < googleJoinButtonSelectors.length && !joinSuccess; i++) {
      const joinSelector = googleJoinButtonSelectors[i];
      try {
        console.log(`[Join] Trying selector ${i + 1}/${googleJoinButtonSelectors.length}: ${joinSelector}`);
        await this.page.waitForSelector(joinSelector, { timeout: 5000, state: 'visible' });
        await this.page.click(joinSelector, { timeout: 5000 });
        joinSuccess = true;
        console.log(`✅ [Join] Successfully clicked join button with selector: ${joinSelector}`);
      } catch (error: any) {
        lastError = error;
        console.log(`⚠️ [Join] Selector failed: ${joinSelector}`);
        continue;
      }
    }

    // Second try: force click on hidden buttons using JavaScript
    if (!joinSuccess) {
      console.log('🔧 [Join] Trying to force click on hidden buttons...');
      for (const selector of ['button:has-text("Ask to join")', 'button:has-text("Join now")']) {
        try {
          const clicked = await this.page.evaluate((sel) => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const btn = buttons.find(b => 
              b.textContent?.includes('Ask to join') || 
              b.textContent?.includes('Join now') ||
              b.textContent?.includes('Pedir para participar')
            );
            if (btn) {
              (btn as HTMLElement).click();
              return true;
            }
            return false;
          }, selector);
          
          if (clicked) {
            joinSuccess = true;
            console.log(`✅ [Join] Force clicked join button`);
            break;
          }
        } catch (e) {
          continue;
        }
      }
    }

    if (!joinSuccess) {
      console.log(`❌ [Join] Failed to find join button after trying ${googleJoinButtonSelectors.length} selectors`);
      
      // Debug: Log all buttons on the page
      const buttons = await this.page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.slice(0, 10).map(btn => ({
          text: btn.textContent?.trim().substring(0, 50),
          ariaLabel: btn.getAttribute('aria-label'),
          visible: btn.offsetParent !== null
        }));
      });
      console.log('🔍 Debug: First 10 buttons on page:', JSON.stringify(buttons, null, 2));
      
      throw lastError || new Error('Could not find join button with any selector');
    }
  }


  async isInMeeting(): Promise<boolean> {
    // Import the function dynamically
    const { checkForAdmissionIndicators } = await import('./google-meet-admission');
    return await checkForAdmissionIndicators(this.page);
  }

  async leave(): Promise<void> {
    console.log('👋 Leaving Google Meet...');

    for (const selector of googleLeaveButtonSelectors) {
      try {
        const element = await this.page.locator(selector).first();
        if (await element.isVisible()) {
          await element.click();
          console.log('✅ Left meeting');
          return;
        }
      } catch (err) {
        continue;
      }
    }

    console.warn('⚠️  Failed to find leave button');
  }
}
