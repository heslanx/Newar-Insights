// Utility functions for the recording bot

export function log(message: string): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

export function randomDelay(baseMs: number): number {
  // Add random jitter of ±20%
  const jitter = baseMs * 0.2;
  return Math.floor(baseMs - jitter + Math.random() * jitter * 2);
}

// Placeholder for callback functions (to be implemented with Redis)
export async function callJoiningCallback(config: any): Promise<void> {
  log('📡 [Callback] Joining callback (placeholder)');
}

export async function callAwaitingAdmissionCallback(config: any): Promise<void> {
  log('📡 [Callback] Awaiting admission callback (placeholder)');
}

export async function callStartupCallback(config: any): Promise<void> {
  log('📡 [Callback] Startup callback (placeholder)');
}

export async function callLeaveCallback(config: any, reason: string): Promise<void> {
  log(`📡 [Callback] Leave callback: ${reason} (placeholder)`);
}
