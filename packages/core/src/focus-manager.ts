/**
 * Tracks whether the browser tab is focused and notifies subscribers when it
 * regains focus. Queries use this to refetch stale data after the user
 * returns to the tab — TanStack's refetchOnWindowFocus behaviour.
 *
 * In non-browser environments (Node, React Native), the manager is a no-op
 * unless an adapter calls setFocused() manually with a custom signal source
 * (RN's AppState, for example).
 */
export class FocusManager {
  private focused: boolean | undefined = undefined;
  private listeners = new Set<() => void>();
  private cleanupNative: (() => void) | null = null;

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    if (this.listeners.size === 1) {
      this.cleanupNative = this.attachNativeListeners();
    }
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0 && this.cleanupNative) {
        this.cleanupNative();
        this.cleanupNative = null;
      }
    };
  }

  /**
   * Manually set the focused state. Adapters in environments without window
   * (React Native) can call this from their own focus signal — e.g.
   * `AppState.addEventListener('change', s => focusManager.setFocused(s === 'active'))`.
   * Passing undefined restores automatic detection from document.visibilityState.
   */
  setFocused(focused: boolean | undefined): void {
    const changed = this.focused !== focused;
    this.focused = focused;
    if (changed && this.isFocused()) {
      this.notify();
    }
  }

  isFocused(): boolean {
    if (typeof this.focused === 'boolean') return this.focused;
    if (typeof document !== 'undefined') {
      return document.visibilityState !== 'hidden';
    }
    return true;
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  private attachNativeListeners(): (() => void) | null {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return null;
    }
    const handler = () => {
      if (this.isFocused()) this.notify();
    };
    window.addEventListener('visibilitychange', handler, false);
    window.addEventListener('focus', handler, false);
    return () => {
      window.removeEventListener('visibilitychange', handler);
      window.removeEventListener('focus', handler);
    };
  }
}

export const focusManager = new FocusManager();
