import { Page } from 'playwright';

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

    // Wait for pre-join screen
    await this.page.waitForSelector('button[aria-label*="microphone"]', { timeout: 30000 });

    console.log('✅ Pre-join screen loaded');

    // Enter bot name (if there's a name input field)
    try {
      const nameInput = await this.page.$('input[placeholder*="name"]');
      if (nameInput) {
        await nameInput.fill(this.botName);
        console.log(`✅ Set bot name: ${this.botName}`);
      }
    } catch (err) {
      console.log('ℹ️  No name input found, continuing...');
    }

    // Mute microphone
    try {
      const micButton = await this.page.$('button[aria-label*="microphone"]');
      if (micButton) {
        const ariaLabel = await micButton.getAttribute('aria-label');
        if (!ariaLabel?.includes('off')) {
          await micButton.click();
          console.log('✅ Microphone muted');
        }
      }
    } catch (err) {
      console.warn('⚠️  Failed to mute microphone:', err);
    }

    // Disable camera
    try {
      const cameraButton = await this.page.$('button[aria-label*="camera"]');
      if (cameraButton) {
        const ariaLabel = await cameraButton.getAttribute('aria-label');
        if (!ariaLabel?.includes('off')) {
          await cameraButton.click();
          console.log('✅ Camera disabled');
        }
      }
    } catch (err) {
      console.warn('⚠️  Failed to disable camera:', err);
    }

    // Click "Join now" or "Ask to join"
    const joinButton = await this.page.$('button[aria-label*="Join"]');
    if (!joinButton) {
      throw new Error('Join button not found');
    }

    await joinButton.click();
    console.log('✅ Clicked join button');

    // Wait for meeting to load (either admitted or waiting for admission)
    await this.page.waitForTimeout(5000);

    // Check if we're in the meeting
    const isInMeeting = await this.isInMeeting();
    if (!isInMeeting) {
      console.log('⏳ Waiting for host to admit...');
      await this.waitForAdmission(60000); // 60 seconds timeout
    }

    console.log('🎉 Successfully joined Google Meet!');
  }

  async waitForAdmission(timeout: number): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (await this.isInMeeting()) {
        console.log('✅ Admitted to meeting');
        return;
      }

      await this.page.waitForTimeout(2000);
    }

    throw new Error('Timeout waiting for admission to meeting');
  }

  async isInMeeting(): Promise<boolean> {
    // Check for indicators that we're in the meeting
    // Google Meet shows participant info or leave button when in meeting
    const leaveButton = await this.page.$('button[aria-label*="Leave"]');
    const participantButton = await this.page.$('button[aria-label*="participant"]');

    return !!(leaveButton || participantButton);
  }

  async leave(): Promise<void> {
    console.log('👋 Leaving Google Meet...');

    try {
      const leaveButton = await this.page.$('button[aria-label*="Leave"]');
      if (leaveButton) {
        await leaveButton.click();
        console.log('✅ Left meeting');
      }
    } catch (err) {
      console.warn('⚠️  Failed to click leave button:', err);
    }
  }
}
