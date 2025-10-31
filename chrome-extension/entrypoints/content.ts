/**
 * Newar Insights - Google Meet Integration
 * Floating panel + toolbar button + auto-admit
 */

export default defineContentScript({
  matches: ['https://meet.google.com/*'],
  main(ctx) {
    console.log('[Newar Insights] Initializing...');

    const meetingId = extractMeetingId(window.location.href);
    if (!meetingId) {
      console.log('[Newar Insights] No meeting ID found');
      return;
    }

    const controller = new NewarMeetController(meetingId, ctx);
    controller.init();
  },
});

class NewarMeetController {
  private meetingId: string;
  private ctx: any;
  private isRecording = false;
  private recordingStatus: string = 'idle';
  private autoAdmitEnabled = false;
  private buttonElement: HTMLElement | null = null;
  private panelElement: HTMLElement | null = null;
  private panelVisible = false;
  private recordingStartTime: number | null = null;
  private isLoading = false;

  constructor(meetingId: string, ctx: any) {
    this.meetingId = meetingId;
    this.ctx = ctx;
  }

  init() {
    // Inject button into toolbar
    this.injectButton();

    // Create floating panel
    this.createFloatingPanel();

    // Check initial recording status
    this.checkRecordingStatus();

    // Listen for storage changes
    this.setupStorageListener();

    // Start auto-admit polling when recording
    this.startAutoAdmitPolling();

    // Status polling every 5s
    this.startStatusPolling();

    // Cleanup on context invalidation
    this.ctx.onInvalidated(() => {
      console.log('[Newar Insights] Context invalidated, cleaning up...');
      this.cleanup();
    });
  }

  // ============================================
  // Floating Panel (Like Toast)
  // ============================================

  private createFloatingPanel() {
    const panel = document.createElement('div');
    panel.id = 'newar-floating-panel';
    panel.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483647;
      background: #1a1a1a;
      border: 1px solid #2a2a2a;
      border-radius: 16px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
      padding: 20px;
      min-width: 320px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: white;
      display: none;
      animation: newar-slide-in 0.3s ease-out;
    `;

    panel.innerHTML = this.getPanelHTML();
    this.panelElement = panel;

    document.body.appendChild(panel);

    // Setup event listeners
    this.setupPanelListeners();

    console.log('[Newar Insights] Floating panel created');
  }

  private getPanelHTML(): string {
    const isRecording = this.isRecording;
    const status = this.recordingStatus;
    const elapsedTime = this.recordingStartTime ? this.formatElapsedTime(Date.now() - this.recordingStartTime) : '00:00';

    // Status colors and icons
    const statusConfig = {
      requested: { color: '#f59e0b', icon: '⏳', text: 'Solicitando...' },
      joining: { color: '#f59e0b', icon: '🚪', text: 'Entrando...' },
      active: { color: '#3b82f6', icon: '✓', text: 'Na reunião' },
      recording: { color: '#ef4444', icon: '🔴', text: 'Gravando' },
      reconnecting: { color: '#f59e0b', icon: '🔄', text: 'Reconectando...' },
      finalizing: { color: '#8b5cf6', icon: '⚙️', text: 'Finalizando...' },
      idle: { color: '#888', icon: '●', text: 'Inativo' },
    };

    const currentStatus = statusConfig[status as keyof typeof statusConfig] || statusConfig.idle;

    return `
      <div style="margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, #3b82f6 0%, #f59e0b 100%); display: flex; align-items: center; justify-content: center;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <circle cx="12" cy="12" r="10" stroke="white" stroke-width="2" fill="none"/>
              <circle cx="12" cy="12" r="4" fill="white"/>
            </svg>
          </div>
          <div>
            <div style="font-size: 16px; font-weight: 600; margin-bottom: 2px;">Newar Insights</div>
            <div style="font-size: 11px; color: #888; font-family: monospace;">${this.meetingId}</div>
          </div>
        </div>
        <button id="newar-panel-close" style="
          background: transparent;
          border: none;
          color: #666;
          cursor: pointer;
          padding: 4px;
          font-size: 20px;
          line-height: 1;
          transition: color 0.2s;
        " onmouseover="this.style.color='#fff'" onmouseout="this.style.color='#666'">×</button>
      </div>

      ${isRecording ? `
        <!-- Recording State -->
        <div style="margin-bottom: 16px; padding: 12px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 10px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 8px; height: 8px; border-radius: 50%; background: #ef4444; animation: newar-pulse 2s ease-in-out infinite;"></div>
              <span style="font-size: 13px; font-weight: 600; color: #ef4444; text-transform: uppercase; letter-spacing: 0.5px;">GRAVANDO</span>
            </div>
            <span id="newar-timer" style="font-size: 14px; font-weight: 600; color: white; font-family: monospace;">${elapsedTime}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #aaa;">
            <span style="color: ${currentStatus.color};">${currentStatus.icon}</span>
            <span>Status: <span style="color: white;">${currentStatus.text}</span></span>
          </div>
        </div>

        <button id="newar-stop-btn" style="
          width: 100%;
          padding: 12px 16px;
          background: transparent;
          border: 2px solid #ef4444;
          color: #ef4444;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          ${this.isLoading ? 'opacity: 0.6; cursor: not-allowed;' : ''}
        " ${this.isLoading ? 'disabled' : ''} onmouseover="if (!this.disabled) { this.style.background='#ef4444'; this.style.color='white'; }" onmouseout="if (!this.disabled) { this.style.background='transparent'; this.style.color='#ef4444'; }">
          ${this.isLoading ? '⏳ Parando...' : 'Parar Gravação'}
        </button>
      ` : `
        <!-- Idle State -->
        <div style="margin-bottom: 16px; padding: 12px; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 10px;">
          <div style="font-size: 13px; font-weight: 500; color: #3b82f6; margin-bottom: 4px;">✓ Reunião Detectada</div>
          <div style="font-size: 12px; color: #aaa;">Pronto para iniciar gravação</div>
        </div>

        <button id="newar-start-btn" style="
          width: 100%;
          padding: 12px 16px;
          background: linear-gradient(135deg, #3b82f6 0%, #f59e0b 100%);
          border: none;
          color: white;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
          transition: transform 0.2s, box-shadow 0.2s;
          ${this.isLoading ? 'opacity: 0.6; cursor: not-allowed;' : ''}
        " ${this.isLoading ? 'disabled' : ''} onmouseover="if (!this.disabled) { this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(59, 130, 246, 0.4)'; }" onmouseout="if (!this.disabled) { this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(59, 130, 246, 0.3)'; }">
          ${this.isLoading ? '⏳ Iniciando...' : '🎥 Gravar Reunião'}
        </button>
      `}

      <div style="margin-top: 12px; display: flex; gap: 8px;">
        <button id="newar-settings-btn" style="
          flex: 1;
          padding: 8px;
          background: transparent;
          border: 1px solid #2a2a2a;
          color: #888;
          border-radius: 8px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        " onmouseover="this.style.borderColor='#3b82f6'; this.style.color='#3b82f6'" onmouseout="this.style.borderColor='#2a2a2a'; this.style.color='#888'">
          ⚙️ Config
        </button>
        <button id="newar-recordings-btn" style="
          flex: 1;
          padding: 8px;
          background: transparent;
          border: 1px solid #2a2a2a;
          color: #888;
          border-radius: 8px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        " onmouseover="this.style.borderColor='#3b82f6'; this.style.color='#3b82f6'" onmouseout="this.style.borderColor='#2a2a2a'; this.style.color='#888'">
          📁 Gravações
        </button>
      </div>
    `;
  }

  private formatElapsedTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  private setupPanelListeners() {
    if (!this.panelElement) return;

    // Close button
    const closeBtn = this.panelElement.querySelector('#newar-panel-close');
    closeBtn?.addEventListener('click', () => this.togglePanel());

    // Start button
    const startBtn = this.panelElement.querySelector('#newar-start-btn');
    startBtn?.addEventListener('click', () => this.startRecording());

    // Stop button
    const stopBtn = this.panelElement.querySelector('#newar-stop-btn');
    stopBtn?.addEventListener('click', () => this.stopRecording());

    // Settings button
    const settingsBtn = this.panelElement.querySelector('#newar-settings-btn');
    settingsBtn?.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'OPEN_SETTINGS' });
    });

    // Recordings button
    const recordingsBtn = this.panelElement.querySelector('#newar-recordings-btn');
    recordingsBtn?.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'OPEN_RECORDINGS' });
    });
  }

  private updatePanel() {
    if (!this.panelElement) return;
    this.panelElement.innerHTML = this.getPanelHTML();
    this.setupPanelListeners();
  }

  private togglePanel() {
    if (!this.panelElement) return;

    this.panelVisible = !this.panelVisible;

    if (this.panelVisible) {
      this.panelElement.style.display = 'block';
      this.panelElement.style.animation = 'newar-slide-in 0.3s ease-out';
    } else {
      this.panelElement.style.animation = 'newar-slide-out 0.3s ease-in';
      setTimeout(() => {
        if (this.panelElement) {
          this.panelElement.style.display = 'none';
        }
      }, 300);
    }
  }

  // ============================================
  // Toolbar Button
  // ============================================

  private injectButton() {
    // Poll for toolbar (Meet loads async)
    const checkToolbar = setInterval(() => {
      if (!this.ctx.isValid) {
        clearInterval(checkToolbar);
        return;
      }

      const toolbar = this.getToolbar();
      if (toolbar && !this.buttonElement) {
        clearInterval(checkToolbar);
        this.createButton(toolbar);
      }
    }, 500);

    // Timeout after 10s
    setTimeout(() => clearInterval(checkToolbar), 10000);
  }

  private createButton(toolbar: Element) {
    const container = document.createElement('div');
    container.className = 'r6xAKc newar-record-btn';
    container.title = 'Newar Insights - Abrir painel';

    container.innerHTML = `
      <span data-is-tooltip-wrapper="true">
        <button
          class="VfPpkd-Bz112c-LgbsSe yHy1rc eT1oJ JsuyRc boDUxc"
          data-disable-idom="true"
          aria-label="Newar Insights"
          data-tooltip-enabled="true"
          aria-pressed="false"
        >
          <div class="VfPpkd-Bz112c-Jh9lGc"></div>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style="color: #F58041;">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
            <circle cx="12" cy="12" r="4" fill="currentColor"/>
          </svg>
        </button>
        <div class="EY8ABd-OWXEXe-TAWMXe" role="tooltip" aria-hidden="true">
          Newar Insights
        </div>
      </span>
    `;

    this.buttonElement = container;

    // Click handler - toggle panel
    const button = container.querySelector('button');
    button?.addEventListener('click', () => this.togglePanel());

    toolbar.appendChild(container);
    console.log('[Newar Insights] Toolbar button injected');
  }

  private updateButtonStyle() {
    if (!this.buttonElement) return;

    const button = this.buttonElement.querySelector('button');
    const svg = this.buttonElement.querySelector('svg');

    if (this.isRecording) {
      // Recording state: red pulsing
      button?.setAttribute('aria-pressed', 'true');
      if (svg) {
        svg.style.color = '#ef4444';
        svg.style.animation = 'newar-pulse 2s ease-in-out infinite';
      }
    } else {
      // Idle state: orange
      button?.setAttribute('aria-pressed', 'false');
      if (svg) {
        svg.style.color = '#F58041';
        svg.style.animation = 'none';
      }
    }
  }

  // ============================================
  // Recording Actions
  // ============================================

  private async startRecording() {
    console.log('[Newar Insights] Starting recording...');

    // Set loading state
    this.isLoading = true;
    this.updatePanel();

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'START_RECORDING',
        payload: { meetingId: this.meetingId },
      });

      if (response.success) {
        console.log('[Newar Insights] Recording started successfully');
        this.isRecording = true;
        this.recordingStatus = response.data?.status || 'requested';
        this.autoAdmitEnabled = true;
        this.recordingStartTime = Date.now();
        this.startTimerUpdate();
        this.updateButtonStyle();
        this.updatePanel();
        this.showToast('✅ Gravação iniciada com sucesso!', 'success');
      } else {
        console.error('[Newar Insights] Failed to start recording:', response.error);
        this.showToast('❌ Erro: ' + response.error, 'error');
      }
    } catch (error) {
      console.error('[Newar Insights] Error starting recording:', error);
      this.showToast('❌ Erro ao iniciar gravação', 'error');
    } finally {
      this.isLoading = false;
      this.updatePanel();
    }
  }

  private async stopRecording() {
    console.log('[Newar Insights] Stopping recording...');

    // Set loading state
    this.isLoading = true;
    this.updatePanel();

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'STOP_RECORDING',
        payload: { meetingId: this.meetingId },
      });

      if (response.success) {
        console.log('[Newar Insights] Recording stopped successfully');
        this.isRecording = false;
        this.recordingStatus = 'stopped';
        this.autoAdmitEnabled = false;
        this.recordingStartTime = null;
        this.updateButtonStyle();
        this.updatePanel();
        this.showToast('✅ Gravação parada com sucesso!', 'success');
      } else {
        console.error('[Newar Insights] Failed to stop recording:', response.error);
        this.showToast('❌ Erro: ' + response.error, 'error');
      }
    } catch (error) {
      console.error('[Newar Insights] Error stopping recording:', error);
      this.showToast('❌ Erro ao parar gravação', 'error');
    } finally {
      this.isLoading = false;
      this.updatePanel();
    }
  }

  private startTimerUpdate() {
    // Update timer every second
    setInterval(() => {
      if (!this.ctx.isValid || !this.isRecording) return;

      // Only update timer element, not full panel (for performance)
      const timerEl = document.getElementById('newar-timer');
      if (timerEl && this.recordingStartTime) {
        const elapsed = Date.now() - this.recordingStartTime;
        timerEl.textContent = this.formatElapsedTime(elapsed);
      }
    }, 1000);
  }

  private async checkRecordingStatus() {
    if (!this.ctx.isValid) return;

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CHECK_MEETING_STATUS',
        payload: { meetingId: this.meetingId },
      });

      if (response.success && response.data) {
        const wasRecording = this.isRecording;
        const oldStatus = this.recordingStatus;

        this.isRecording = response.data.isRecording;
        this.recordingStatus = response.data.recording?.status || 'idle';
        this.autoAdmitEnabled = response.data.isRecording;

        // Initialize timer if recording just started
        if (!wasRecording && this.isRecording && !this.recordingStartTime) {
          this.recordingStartTime = Date.now();
          this.startTimerUpdate();
        }

        // Reset timer if recording stopped
        if (wasRecording && !this.isRecording) {
          this.recordingStartTime = null;
        }

        // Update UI if state changed
        if (wasRecording !== this.isRecording || oldStatus !== this.recordingStatus) {
          this.updateButtonStyle();
          this.updatePanel();

          // Show toast on status change
          if (oldStatus !== this.recordingStatus && this.isRecording) {
            this.showStatusChangeToast(oldStatus, this.recordingStatus);
          }
        }
      }
    } catch (error) {
      console.error('[Newar Insights] Error checking status:', error);
    }
  }

  private showStatusChangeToast(oldStatus: string, newStatus: string) {
    const statusMessages: Record<string, { message: string; type: 'info' | 'success' | 'warning' }> = {
      requested: { message: '⏳ Solicitando bot...', type: 'info' },
      joining: { message: '🚪 Bot entrando na reunião...', type: 'info' },
      active: { message: '✓ Bot entrou na reunião!', type: 'success' },
      recording: { message: '🔴 Gravação iniciada!', type: 'success' },
      reconnecting: { message: '🔄 Reconectando...', type: 'warning' },
      finalizing: { message: '⚙️ Finalizando gravação...', type: 'info' },
    };

    const statusInfo = statusMessages[newStatus];
    if (statusInfo && oldStatus !== newStatus) {
      this.showToast(statusInfo.message, statusInfo.type);
    }
  }

  private startStatusPolling() {
    setInterval(() => {
      if (!this.ctx.isValid) return;
      this.checkRecordingStatus();
    }, 5000); // Poll every 5s
  }

  // ============================================
  // Auto-Admit Bot
  // ============================================

  private startAutoAdmitPolling() {
    setInterval(() => {
      if (!this.ctx.isValid || !this.autoAdmitEnabled) return;
      this.tryAutoAdmit();
    }, 1000);
  }

  private tryAutoAdmit() {
    try {
      // Strategy 1: Find "Admit" button by text
      const admitSpan = Array.from(document.querySelectorAll('span')).find(
        (el) => el.textContent?.trim() === 'Admit'
      );

      if (admitSpan) {
        console.log('[Newar Insights] Auto-admitting participant...');
        (admitSpan as HTMLElement).click();
        return;
      }

      // Strategy 2: Find admit button by jsname
      const admitButtons = document.querySelectorAll('[jsname=USyMUd]');
      if (admitButtons.length > 0) {
        console.log('[Newar Insights] Auto-admitting via jsname...');
        admitButtons.forEach((btn) => (btn as HTMLElement).click());
        return;
      }

      // Strategy 3: Look for bot name
      const botNames = ['Newar', 'Recording', 'Bot', 'Recorder'];
      const waitingList = document.querySelectorAll('[data-participant-id]');

      waitingList.forEach((participant) => {
        const name = participant.textContent || '';
        const isBot = botNames.some((botName) => name.includes(botName));

        if (isBot) {
          const admitBtn = participant.querySelector('button[aria-label*="Admit"]');
          if (admitBtn) {
            console.log('[Newar Insights] Auto-admitting bot:', name);
            (admitBtn as HTMLElement).click();
          }
        }
      });
    } catch (error) {
      console.error('[Newar Insights] Error in auto-admit:', error);
    }
  }

  // ============================================
  // Storage Listener
  // ============================================

  private setupStorageListener() {
    const listener = (changes: any, areaName: string) => {
      if (!this.ctx.isValid) return;

      if (areaName === 'local' && changes.active_recordings) {
        this.checkRecordingStatus();
      }
    };

    chrome.storage.onChanged.addListener(listener);
  }

  // ============================================
  // Toast Notifications
  // ============================================

  private showToast(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') {
    let container = document.getElementById('newar-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'newar-toast-container';
      container.style.cssText = `
        position: fixed;
        top: 24px;
        right: 24px;
        z-index: 2147483647;
        display: flex;
        flex-direction: column;
        gap: 12px;
        pointer-events: none;
      `;
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');

    const colors = {
      success: { bg: '#10b981', icon: '✓' },
      error: { bg: '#ef4444', icon: '✕' },
      warning: { bg: '#f59e0b', icon: '⚠' },
      info: { bg: '#3b82f6', icon: 'ℹ' },
    };

    const color = colors[type];

    toast.style.cssText = `
      background: ${color.bg};
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: center;
      gap: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      pointer-events: auto;
      animation: newar-toast-in 0.3s ease-out;
      max-width: 400px;
    `;

    toast.innerHTML = `
      <span style="font-size: 18px; font-weight: bold;">${color.icon}</span>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'newar-toast-out 0.3s ease-in';
      setTimeout(() => {
        toast.remove();
        if (container && container.children.length === 0) {
          container.remove();
        }
      }, 300);
    }, 4000);
  }

  // ============================================
  // Utilities
  // ============================================

  private getToolbar(): Element | null {
    return (
      document.querySelector('.SGP0hd.kunNie') ||
      document.querySelector('.tMdQNe') ||
      document.querySelector('[role="toolbar"]')
    );
  }

  private cleanup() {
    if (this.buttonElement) {
      this.buttonElement.remove();
      this.buttonElement = null;
    }
    if (this.panelElement) {
      this.panelElement.remove();
      this.panelElement = null;
    }
  }
}

function extractMeetingId(url: string): string | null {
  const match = url.match(/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/);
  return match ? match[1] : null;
}

// Add animations
const style = document.createElement('style');
style.textContent = `
  @keyframes newar-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }

  @keyframes newar-toast-in {
    from {
      opacity: 0;
      transform: translateX(100px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes newar-toast-out {
    from {
      opacity: 1;
      transform: translateX(0);
    }
    to {
      opacity: 0;
      transform: translateX(100px);
    }
  }

  @keyframes newar-slide-in {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes newar-slide-out {
    from {
      opacity: 1;
      transform: translateY(0);
    }
    to {
      opacity: 0;
      transform: translateY(20px);
    }
  }
`;
document.head.appendChild(style);
