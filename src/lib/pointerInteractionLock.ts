let lockDepth = 0;
let preventDefaultHandler: ((event: Event) => void) | null = null;

function getPreventDefaultHandler(): (event: Event) => void {
  if (!preventDefaultHandler) {
    preventDefaultHandler = (event: Event) => {
      event.preventDefault();
    };
  }
  return preventDefaultHandler;
}

/** Blocks native text selection and image drag while the canvas is being panned. */
export function lockPointerInteraction(): void {
  if (lockDepth === 0) {
    const handler = getPreventDefaultHandler();
    document.addEventListener('selectstart', handler, true);
    document.addEventListener('dragstart', handler, true);
  }
  lockDepth += 1;
}

/** Releases the canvas pan selection/drag guard when the last lock is cleared. */
export function unlockPointerInteraction(): void {
  if (lockDepth <= 0) return;
  lockDepth -= 1;
  if (lockDepth === 0 && preventDefaultHandler) {
    document.removeEventListener('selectstart', preventDefaultHandler, true);
    document.removeEventListener('dragstart', preventDefaultHandler, true);
  }
}

/** @returns True when a canvas pan guard is active (for tests). */
export function isPointerInteractionLocked(): boolean {
  return lockDepth > 0;
}

/** Clears any active lock (for tests and drag-state resets). */
export function resetPointerInteractionLock(): void {
  if (lockDepth > 0 && preventDefaultHandler) {
    document.removeEventListener('selectstart', preventDefaultHandler, true);
    document.removeEventListener('dragstart', preventDefaultHandler, true);
  }
  lockDepth = 0;
}
