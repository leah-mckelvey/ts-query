import { describe, it, expect, vi } from 'vitest';
import { OnlineManager } from '../online-manager';

describe('OnlineManager', () => {
  it('notifies subscribers on offline -> online transition', () => {
    const mgr = new OnlineManager();
    const listener = vi.fn();
    mgr.subscribe(listener);

    mgr.setOnline(false);
    expect(listener).not.toHaveBeenCalled();

    mgr.setOnline(true);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('does not notify on online -> online transition', () => {
    const mgr = new OnlineManager();
    const listener = vi.fn();
    mgr.subscribe(listener);

    mgr.setOnline(true);
    expect(listener).not.toHaveBeenCalled();
  });

  it('stops notifying after unsubscribe', () => {
    const mgr = new OnlineManager();
    const listener = vi.fn();
    const unsubscribe = mgr.subscribe(listener);
    unsubscribe();

    mgr.setOnline(false);
    mgr.setOnline(true);
    expect(listener).not.toHaveBeenCalled();
  });
});
