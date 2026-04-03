/// <reference types="vite/client" />

import type { MergedThis } from './canvas.js';

declare global {
  interface Window {
    /** Alpine canvas instance exposed for cross-component drag coordination. */
    draggableZoneComponent?: MergedThis;
  }
}

export {};
