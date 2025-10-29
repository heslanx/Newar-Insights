// Centralized Google Meet selectors
// Based on latest Google Meet UI (2024-2025)

export const googleNameInputSelectors: string[] = [
  'input[type="text"][aria-label*="name"]',
  'input[type="text"][aria-label*="Name"]',
  'input[placeholder*="name"]',
  'input[placeholder*="Name"]',
  'input[aria-label="Your name"]'
];

export const googleJoinButtonSelectors: string[] = [
  // XPath variants (most reliable - try first!)
  '//button[.//span[text()="Ask to join"]]',
  '//button[.//span[text()="Pedir para participar"]]',
  '//button[.//span[text()="Participar agora"]]',
  '//button[.//span[text()="Join now"]]',
  '//button[.//span[text()="Join"]]',

  // English variants
  'button:has-text("Ask to join")',
  'button:has-text("Join now")',
  'button:has-text("Join")',

  // Portuguese (Brazil) variants
  'button:has-text("Pedir para participar")',
  'button:has-text("Participar agora")',
  'button:has-text("Participar")',

  // Generic aria-label patterns (language-independent)
  'button[aria-label*="join"]',
  'button[aria-label*="Join"]',
  'button[aria-label*="participar"]',
  'button[aria-label*="Participar"]',

  // Class-based selectors (more stable across UI changes)
  'button.VfPpkd-LgbsSe',
  'button[jsname="Qx7uuf"]',
  'button[data-promo-anchor-id]',

  // Fallback: any prominent button on the page
  'main button',
  '[role="main"] button',
  'button[type="button"]'
];

export const googleMicrophoneButtonSelectors: string[] = [
  'button[aria-label*="Turn off microphone"]',
  'button[aria-label*="Turn on microphone"]',
  'button[aria-label*="microphone"]',
  '[aria-label*="microphone"]',
  'button[aria-label*="Desativar microfone"]',
  'button[aria-label*="Ativar microfone"]'
];

export const googleCameraButtonSelectors: string[] = [
  'button[aria-label*="Turn off camera"]',
  'button[aria-label*="Turn on camera"]',
  'button[aria-label*="camera"]',
  '[aria-label*="camera"]',
  'button[aria-label*="Desativar câmera"]',
  'button[aria-label*="Ativar câmera"]'
];

export const googleAdmissionIndicators: string[] = [
  // Meeting toolbar and controls (most reliable)
  'button[aria-label*="Chat"]',
  'button[aria-label*="chat"]',
  'button[aria-label*="People"]',
  'button[aria-label*="people"]',
  'button[aria-label*="Participants"]',
  'button[aria-label*="Leave call"]',
  'button[aria-label*="Leave meeting"]',
  
  // Audio/video controls in meeting
  'button[aria-label*="Turn off microphone"]',
  'button[aria-label*="Turn on microphone"]',
  'button[aria-label*="Turn off camera"]',
  'button[aria-label*="Turn on camera"]',
  
  // Meeting toolbar
  '[role="toolbar"]',
  '[data-participant-id]',
  '[data-self-name]',
  
  // Portuguese variants
  'button[aria-label*="Conversar"]',
  'button[aria-label*="Pessoas"]',
  'button[aria-label*="Participantes"]',
  'button[aria-label*="Sair da chamada"]'
];

export const googleWaitingRoomIndicators: string[] = [
  // Modern waiting room text patterns (2024-2025)
  'text="Asking to be let in..."',
  'text*="Asking to be let in"',
  'text="You\'ll join the call when someone lets you in"',
  'text*="You\'ll join the call when someone lets you"',
  'text="Waiting for the host to let you in"',
  'text="You\'re in the waiting room"',
  'text="Please wait until a meeting host brings you into the call"',
  
  // Portuguese variants
  'text="Pedindo para entrar..."',
  'text*="Pedindo para entrar"',
  'text="Você entrará na chamada quando alguém permitir"',
  'text*="Aguardando o anfitrião"',
  'text="Você está na sala de espera"',
  
  // Aria labels
  '[aria-label*="waiting room"]',
  '[aria-label*="Asking to be let in"]',
  '[aria-label*="waiting for admission"]',
  '[aria-label*="sala de espera"]',
  
  // Progress indicators
  '[role="progressbar"]',
  '[aria-label*="loading"]',
  '.loading-spinner'
];

export const googleRejectionIndicators: string[] = [
  // Meeting not found or access denied
  'text="Meeting not found"',
  'text="Can\'t join the meeting"',
  'text="Unable to join"',
  'text="Access denied"',
  'text="Meeting has ended"',
  'text="This meeting has ended"',
  'text="Invalid meeting"',
  'text="Meeting link expired"',
  
  // Portuguese variants
  'text="Reunião não encontrada"',
  'text="Não é possível participar da reunião"',
  'text="Acesso negado"',
  'text="A reunião terminou"',
  'text="Link da reunião expirado"',
  
  // Error dialogs
  '[role="dialog"]:has-text("not found")',
  '[role="alertdialog"]:has-text("not found")',
  '[role="dialog"]:has-text("ended")',
  '[role="dialog"]:has-text("não encontrada")',
  
  // Retry buttons
  'button:has-text("Try again")',
  'button:has-text("Retry")',
  'button:has-text("Tentar novamente")'
];

export const googleLeaveButtonSelectors: string[] = [
  // Primary leave button
  'button[aria-label="Leave call"]',
  'button[aria-label*="Leave"]',
  'button[aria-label*="leave"]',
  '[role="toolbar"] button[aria-label*="Leave"]',
  
  // Portuguese variants
  'button[aria-label="Sair da chamada"]',
  'button[aria-label*="Sair"]',
  
  // Alternative patterns
  'button[aria-label*="End meeting"]',
  'button:has-text("End meeting")',
  'button[aria-label*="Hang up"]',
  
  // Confirmation dialog
  'button:has-text("Leave meeting")',
  'button:has-text("Just leave the meeting")',
  'button:has-text("Leave")',
  '[role="dialog"] button:has-text("Leave")'
];
