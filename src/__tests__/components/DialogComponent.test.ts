/**
 * @vitest-environment happy-dom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DialogStoreState } from '../../types/dialog.js';
import type { VitestGlobalWithAlpineDataCapture } from '../helpers/alpineDataCapture.js';

const alpineCapture = vi.hoisted(() =>
  (globalThis as unknown as VitestGlobalWithAlpineDataCapture).__vitestCreateAlpineDataCapture(
    'dialogComponent',
  ),
);

vi.mock('alpinejs', () => ({
  default: alpineCapture.Alpine,
}));

import '../../components/DialogComponent.js';

type DialogCtx = {
  inputValue: string;
  inputError: string;
  readonly store: DialogStoreState;
  init: () => void;
  close: () => void;
  handleConfirm: () => void;
  handleCancel: () => void;
  handleInputSubmit: () => void;
  handleInputTextSubmit: () => void;
  initInputValue: () => void;
  initInputTextValue: () => void;
};

function dialogState(overrides: Partial<DialogStoreState> = {}): DialogStoreState {
  return {
    open: true,
    type: 'confirm',
    title: 'T',
    confirmLabel: 'Yes',
    cancelLabel: 'Cancel',
    cancelLabelVisible: true,
    ...overrides,
  };
}

function mount(): DialogCtx {
  const f = alpineCapture.getFactory();
  if (!f) {
    throw new Error('dialogComponent factory not registered');
  }
  return f() as DialogCtx;
}

describe('dialogComponent (DialogComponent.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k of Object.keys(alpineCapture.rawStores)) {
      delete alpineCapture.rawStores[k];
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('init creates default dialog store when missing', () => {
    const ctx = mount();
    expect(alpineCapture.rawStores.dialog).toBeUndefined();
    ctx.init.call(ctx);
    const d = alpineCapture.rawStores.dialog as DialogStoreState;
    expect(d).toMatchObject({
      open: false,
      type: 'confirm',
      confirmLabel: 'Yes',
      cancelLabel: 'Cancel',
      cancelLabelVisible: true,
    });
  });

  it('init does not replace an existing dialog store', () => {
    const existing = dialogState({ title: 'Keep me' });
    alpineCapture.rawStores.dialog = existing;
    const ctx = mount();
    ctx.init.call(ctx);
    expect(alpineCapture.rawStores.dialog).toBe(existing);
  });

  it('close sets open to false when store exists', () => {
    const d = dialogState({ open: true });
    alpineCapture.rawStores.dialog = d;
    const ctx = mount();
    ctx.close.call(ctx);
    expect(d.open).toBe(false);
  });

  it('close is a no-op when dialog store is missing', () => {
    const ctx = mount();
    expect(() => ctx.close.call(ctx)).not.toThrow();
  });

  it('handleConfirm invokes onConfirm then closes', async () => {
    const onConfirm = vi.fn();
    const d = dialogState({ open: true, onConfirm });
    alpineCapture.rawStores.dialog = d;
    const ctx = mount();
    ctx.handleConfirm.call(ctx);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(d.open).toBe(true);
    await Promise.resolve();
    expect(d.open).toBe(false);
  });

  it('handleConfirm still closes when onConfirm is absent', async () => {
    const d = dialogState({ open: true, onConfirm: undefined });
    alpineCapture.rawStores.dialog = d;
    const ctx = mount();
    ctx.handleConfirm.call(ctx);
    expect(d.open).toBe(true);
    await Promise.resolve();
    expect(d.open).toBe(false);
  });

  it('handleConfirm does not close when dialog store is replaced before scheduled close', async () => {
    const onConfirmFirst = vi.fn(() => {
      alpineCapture.rawStores.dialog = dialogState({
        open: true,
        title: 'Save current reading?',
        onConfirm: vi.fn(),
      });
    });
    const d = dialogState({ open: true, onConfirm: onConfirmFirst });
    alpineCapture.rawStores.dialog = d;
    const ctx = mount();
    ctx.handleConfirm.call(ctx);
    expect(onConfirmFirst).toHaveBeenCalledTimes(1);
    await Promise.resolve();
    expect((alpineCapture.rawStores.dialog as DialogStoreState).open).toBe(true);
    expect((alpineCapture.rawStores.dialog as DialogStoreState).title).toBe(
      'Save current reading?',
    );
  });

  it('handleCancel invokes onCancel then closes', async () => {
    const onCancel = vi.fn();
    const d = dialogState({ open: true, onCancel });
    alpineCapture.rawStores.dialog = d;
    const ctx = mount();
    ctx.handleCancel.call(ctx);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(d.open).toBe(true);
    await Promise.resolve();
    expect(d.open).toBe(false);
  });

  it('handleCancel still closes when onCancel is absent', async () => {
    const d = dialogState({ open: true, onCancel: undefined });
    alpineCapture.rawStores.dialog = d;
    const ctx = mount();
    ctx.handleCancel.call(ctx);
    expect(d.open).toBe(true);
    await Promise.resolve();
    expect(d.open).toBe(false);
  });

  it('handleInputSubmit sets inputError and does not close when value is invalid', () => {
    const onSubmit = vi.fn();
    const d = dialogState({
      open: true,
      type: 'input',
      inputMin: 1,
      inputMax: 3,
      onSubmit,
    });
    alpineCapture.rawStores.dialog = d;
    const ctx = mount();
    ctx.inputValue = 'not-a-number';
    ctx.handleInputSubmit.call(ctx);
    expect(ctx.inputError).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(d.open).toBe(true);
  });

  it('handleInputSubmit rejects out-of-range integers', () => {
    const d = dialogState({ open: true, type: 'input', inputMin: 2, inputMax: 4 });
    alpineCapture.rawStores.dialog = d;
    const ctx = mount();
    ctx.inputValue = '9';
    ctx.handleInputSubmit.call(ctx);
    expect(ctx.inputError).toContain('at most');
    expect(d.open).toBe(true);
  });

  it('handleInputSubmit uses default min 0 and max 10 when omitted', async () => {
    const onSubmit = vi.fn();
    const d = dialogState({ open: true, type: 'input', onSubmit });
    alpineCapture.rawStores.dialog = d;
    const ctx = mount();
    ctx.inputValue = '7';
    ctx.handleInputSubmit.call(ctx);
    expect(onSubmit).toHaveBeenCalledWith(7);
    expect(ctx.inputError).toBe('');
    expect(d.open).toBe(true);
    await Promise.resolve();
    expect(d.open).toBe(false);
  });

  it('handleInputSubmit clears error, calls onSubmit, and closes on success', async () => {
    const onSubmit = vi.fn();
    const d = dialogState({
      open: true,
      type: 'input',
      inputMin: 1,
      inputMax: 10,
      onSubmit,
    });
    alpineCapture.rawStores.dialog = d;
    const ctx = mount();
    ctx.inputError = 'previous';
    ctx.inputValue = '5';
    ctx.handleInputSubmit.call(ctx);
    expect(ctx.inputError).toBe('');
    expect(onSubmit).toHaveBeenCalledWith(5);
    expect(d.open).toBe(true);
    await Promise.resolve();
    expect(d.open).toBe(false);
  });

  it('handleInputSubmit closes without calling onSubmit when handler missing', async () => {
    const d = dialogState({
      open: true,
      type: 'input',
      inputMin: 0,
      inputMax: 10,
      onSubmit: undefined,
    });
    alpineCapture.rawStores.dialog = d;
    const ctx = mount();
    ctx.inputValue = '3';
    ctx.handleInputSubmit.call(ctx);
    expect(d.open).toBe(true);
    await Promise.resolve();
    expect(d.open).toBe(false);
  });

  it('handleInputTextSubmit sets inputError when title is too long', () => {
    const d = dialogState({ open: true, type: 'inputText' });
    alpineCapture.rawStores.dialog = d;
    const ctx = mount();
    ctx.inputValue = 'x'.repeat(501);
    ctx.handleInputTextSubmit.call(ctx);
    expect(ctx.inputError).toContain('at most');
    expect(d.open).toBe(true);
  });

  it('handleInputTextSubmit maps empty trimmed value to Untitled Reading', async () => {
    const onSubmitText = vi.fn();
    const d = dialogState({ open: true, type: 'inputText', onSubmitText });
    alpineCapture.rawStores.dialog = d;
    const ctx = mount();
    ctx.inputValue = '   ';
    ctx.handleInputTextSubmit.call(ctx);
    expect(onSubmitText).toHaveBeenCalledWith('Untitled Reading');
    expect(ctx.inputError).toBe('');
    expect(d.open).toBe(true);
    await Promise.resolve();
    expect(d.open).toBe(false);
  });

  it('handleInputTextSubmit coalesces nullish inputValue to empty string', () => {
    const onSubmitText = vi.fn();
    const d = dialogState({ open: true, type: 'inputText', onSubmitText });
    alpineCapture.rawStores.dialog = d;
    const ctx = mount();
    Reflect.set(ctx, 'inputValue', undefined);
    ctx.handleInputTextSubmit.call(ctx);
    expect(onSubmitText).toHaveBeenCalledWith('Untitled Reading');
  });

  it('handleInputTextSubmit passes trimmed title and closes', async () => {
    const onSubmitText = vi.fn();
    const d = dialogState({ open: true, type: 'inputText', onSubmitText });
    alpineCapture.rawStores.dialog = d;
    const ctx = mount();
    ctx.inputError = 'old';
    ctx.inputValue = '  My Reading  ';
    ctx.handleInputTextSubmit.call(ctx);
    expect(onSubmitText).toHaveBeenCalledWith('My Reading');
    expect(ctx.inputError).toBe('');
    expect(d.open).toBe(true);
    await Promise.resolve();
    expect(d.open).toBe(false);
  });

  it('handleInputTextSubmit closes without onSubmitText when valid', async () => {
    const d = dialogState({ open: true, type: 'inputText', onSubmitText: undefined });
    alpineCapture.rawStores.dialog = d;
    const ctx = mount();
    ctx.inputValue = 'Ok';
    ctx.handleInputTextSubmit.call(ctx);
    expect(d.open).toBe(true);
    await Promise.resolve();
    expect(d.open).toBe(false);
  });

  it('initInputValue resets error and uses inputDefault when set', () => {
    const d = dialogState({ inputDefault: '42' });
    alpineCapture.rawStores.dialog = d;
    const ctx = mount();
    ctx.inputValue = '0';
    ctx.inputError = 'e';
    ctx.initInputValue.call(ctx);
    expect(ctx.inputValue).toBe('42');
    expect(ctx.inputError).toBe('');
  });

  it('initInputValue falls back to "1" when inputDefault missing', () => {
    const d = dialogState({ inputDefault: undefined });
    alpineCapture.rawStores.dialog = d;
    const ctx = mount();
    ctx.inputValue = '99';
    ctx.initInputValue.call(ctx);
    expect(ctx.inputValue).toBe('1');
    expect(ctx.inputError).toBe('');
  });

  it('initInputTextValue resets error and uses inputDefault when set', () => {
    const d = dialogState({ inputDefault: 'hello' });
    alpineCapture.rawStores.dialog = d;
    const ctx = mount();
    ctx.inputValue = 'x';
    ctx.inputError = 'e';
    ctx.initInputTextValue.call(ctx);
    expect(ctx.inputValue).toBe('hello');
    expect(ctx.inputError).toBe('');
  });

  it('initInputTextValue uses empty string when inputDefault missing', () => {
    const d = dialogState({ inputDefault: undefined });
    alpineCapture.rawStores.dialog = d;
    const ctx = mount();
    ctx.inputValue = 'x';
    ctx.initInputTextValue.call(ctx);
    expect(ctx.inputValue).toBe('');
    expect(ctx.inputError).toBe('');
  });
});
