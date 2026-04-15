import Alpine from 'alpinejs';

/**
 * Opens the existing Settings backup export confirmation flow (protobuf `.pb` download).
 *
 * @returns Void. No-ops when the settings root element is missing or Alpine data is unavailable.
 */
export function openSettingsExportConfirm(): void {
  const root = document.querySelector('[x-data="settingsComponent"]');
  if (!root || !(root instanceof HTMLElement)) return;
  const data = Alpine.$data(root);
  if (
    data &&
    typeof data === 'object' &&
    'openExportConfirm' in data &&
    typeof (data as { openExportConfirm: unknown }).openExportConfirm === 'function'
  ) {
    (data as { openExportConfirm: () => void }).openExportConfirm();
  }
}
