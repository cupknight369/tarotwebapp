import type { RegisterSWOptions } from 'vite-plugin-pwa/types';

/** Vitest stub for the vite-plugin-pwa virtual module. */
export function registerSW(_options?: RegisterSWOptions): (reloadPage?: boolean) => Promise<void> {
  return () => Promise.resolve();
}
