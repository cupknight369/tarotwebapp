/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

import type { MergedThis } from './canvas.js';

/** Account modal instance exposed for global escape handling. */
export interface AuthComponentWindowRef {
  isAccountMenuOpen: boolean;
  closeAccountMenu(): void;
}

/** Correspondences manager instance exposed for global escape handling. */
export interface CorrespondenceManagerWindowRef {
  handleManagerEscape(): boolean;
}

declare global {
  interface Window {
    /** Alpine canvas instance exposed for cross-component drag coordination. */
    draggableZoneComponent?: MergedThis;
    /** Alpine auth component instance for account modal escape handling. */
    authComponent?: AuthComponentWindowRef;
    /** Alpine correspondences manager for stacked-modal escape handling. */
    correspondenceManagerComponent?: CorrespondenceManagerWindowRef;
  }
}

export {};
