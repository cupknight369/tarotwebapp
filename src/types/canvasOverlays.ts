/** Runtime visibility of canvas chrome overlays (toolbars, active deck, trademark). */
export interface CanvasOverlaysStoreState {
  visible: boolean;
  toggle(): void;
}
