/**
 * Shows a blocking dialog for structured query failures.
 */

import Alpine from 'alpinejs';
import type { QueryFailure } from './supabaseErrors.js';
import { queryFailureMessage } from './supabaseErrors.js';

/**
 * Opens the global confirm dialog with a user-safe message.
 *
 * @param error - Typed Supabase/query failure.
 */
export function showQueryFailureDialog(error: QueryFailure): void {
  Alpine.store('dialog', {
    open: true,
    type: 'confirm',
    title: queryFailureMessage(error),
    confirmLabel: 'Ok',
    cancelLabelVisible: false,
    onConfirm: () => {},
  });
}
