/**
 * Builds a minimal Alpine.js stub for Vitest: captures `Alpine.data(name, factory)` for one
 * component name and implements `Alpine.store` with an in-memory map.
 *
 * **Vitest:** `vi.hoisted` runs before ESM value imports run, so test files must not call
 * {@link createAlpineDataCapture} from an import inside `vi.hoisted`. `vitest.setup.ts`
 * assigns this function to {@link VITEST_ALPINE_CAPTURE_GLOBAL} on `globalThis`; use that
 * from the hoisted callback (see component tests).
 */

/** `globalThis` key where {@link createAlpineDataCapture} is registered in `vitest.setup.ts`. */
export const VITEST_ALPINE_CAPTURE_GLOBAL = '__vitestCreateAlpineDataCapture' as const;

/** Shape of the stub returned by {@link createAlpineDataCapture}. */
export interface AlpineDataCapture {
  /** Backing object for `Alpine.store(name, value)` reads/writes. */
  readonly rawStores: Record<string, unknown>;
  /** Minimal `Alpine` with `data` + `store`. */
  readonly Alpine: AlpineDataCaptureAlpine;
  /** Returns the factory last registered for the configured component name, or `null`. */
  getFactory(): (() => object) | null;
}

/** Minimal Alpine API surface used by component tests. */
export interface AlpineDataCaptureAlpine {
  data(name: string, factory: () => object): void;
  store(name: string, value?: unknown): unknown;
}

/** Use when reading {@link VITEST_ALPINE_CAPTURE_GLOBAL} from `globalThis` inside `vi.hoisted`. */
export type VitestGlobalWithAlpineDataCapture = typeof globalThis &
  Record<typeof VITEST_ALPINE_CAPTURE_GLOBAL, (name: string) => AlpineDataCapture>;

/**
 * Creates an Alpine stub that records the factory for a single `Alpine.data` registration.
 *
 * @param componentName - The `name` passed to `Alpine.data` to capture (e.g. `'canvasComponent'`).
 * @returns Stub with `Alpine`, `rawStores`, and `getFactory`.
 */
export function createAlpineDataCapture(componentName: string): AlpineDataCapture {
  const rawStores: Record<string, unknown> = {};
  let factory: (() => object) | null = null;
  return {
    rawStores,
    getFactory: (): (() => object) | null => factory,
    Alpine: {
      data(name: string, fn: () => object): void {
        if (name === componentName) {
          factory = fn;
        }
      },
      store(name: string, value?: unknown): unknown {
        if (arguments.length >= 2) {
          rawStores[name] = value;
        }
        return rawStores[name];
      },
    },
  };
}
