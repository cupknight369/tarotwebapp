import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { QueryFailure } from '../../lib/supabaseErrors.js';

const alpineStore = vi.hoisted(() => vi.fn());

vi.mock('alpinejs', () => ({
  default: {
    store: alpineStore,
  },
}));

const queryFailureMessage = vi.hoisted(() => vi.fn(() => 'User-facing title'));

vi.mock('../../lib/supabaseErrors.js', () => ({
  queryFailureMessage,
}));

import { showQueryFailureDialog } from '../../lib/queryFailureUi.js';

describe('queryFailureUi.ts', () => {
  const failure: QueryFailure = {
    kind: 'unknown',
    operation: 'listThings',
    message: 'Upstream message',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryFailureMessage.mockReturnValue('User-facing title');
  });

  it('showQueryFailureDialog opens confirm dialog with title from queryFailureMessage', () => {
    showQueryFailureDialog(failure);
    expect(queryFailureMessage).toHaveBeenCalledTimes(1);
    expect(queryFailureMessage).toHaveBeenCalledWith(failure);
    expect(alpineStore).toHaveBeenCalledTimes(1);
    expect(alpineStore).toHaveBeenCalledWith('dialog', {
      open: true,
      type: 'confirm',
      title: 'User-facing title',
      confirmLabel: 'Ok',
      cancelLabelVisible: false,
      onConfirm: expect.any(Function) as unknown as () => void,
    });
  });

  it('showQueryFailureDialog onConfirm is a no-op', () => {
    showQueryFailureDialog(failure);
    const payload = alpineStore.mock.calls[0][1] as { onConfirm: () => void };
    expect(() => payload.onConfirm()).not.toThrow();
  });
});
