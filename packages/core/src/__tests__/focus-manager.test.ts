import { describe, it, expect, vi } from 'vitest';
import { FocusManager } from '../focus-manager';

describe('FocusManager', () => {
  it('notifies subscribers when setFocused transitions hidden -> focused', () => {
    const mgr = new FocusManager();
    const listener = vi.fn();
    mgr.subscribe(listener);

    mgr.setFocused(false);
    expect(listener).not.toHaveBeenCalled();

    mgr.setFocused(true);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('does not notify on noop transitions', () => {
    const mgr = new FocusManager();
    const listener = vi.fn();
    mgr.subscribe(listener);

    mgr.setFocused(true);
    mgr.setFocused(true);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('stops notifying after unsubscribe', () => {
    const mgr = new FocusManager();
    const listener = vi.fn();
    const unsubscribe = mgr.subscribe(listener);
    unsubscribe();

    mgr.setFocused(false);
    mgr.setFocused(true);
    expect(listener).not.toHaveBeenCalled();
  });

  it('isFocused returns true by default in non-document environments', () => {
    const mgr = new FocusManager();
    // jsdom provides document, but visibilityState defaults to 'visible'
    expect(mgr.isFocused()).toBe(true);
  });
});
