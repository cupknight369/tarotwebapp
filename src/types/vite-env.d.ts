/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

import type { MergedThis } from './canvas.js';

/** Account modal instance exposed for global escape handling. */
export interface AuthComponentWindowRef {
  isAccountMenuOpen: boolean;
  closeAccountMenu(): void;
}

declare global {
  interface Window {
    /** Alpine canvas instance exposed for cross-component drag coordination. */
    draggableZoneComponent?: MergedThis;
    /** Alpine auth component instance for account modal escape handling. */
    authComponent?: AuthComponentWindowRef;
  }
}

export {};
