// ########################################
// FOCUS MANAGER
// ########################################

/**
 * Global focus manager that tracks window focus/blur events.
 * Used to trigger refetchOnWindowFocus for active queries.
 */
class FocusManager {
  private focused = true;
  private listeners = new Set<() => void>();
  private cleanup?: () => void;

  constructor() {
    this.setup();
  }

  private setup(): void {
    // Only setup in browser environment
    if (
      typeof window === 'undefined' ||
      typeof window.addEventListener === 'undefined'
    ) {
      return;
    }

    const onFocus = () => {
      this.focused = true;
      this.listeners.forEach((listener) => listener());
    };

    const onBlur = () => {
      this.focused = false;
    };

    // Use visibilitychange for better mobile support
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        onFocus();
      } else {
        onBlur();
      }
    };

    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibilityChange);

    this.cleanup = () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }

  isFocused(): boolean {
    return this.focused;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  destroy(): void {
    this.cleanup?.();
    this.listeners.clear();
  }
}

// Global singleton instance
export const focusManager = new FocusManager();
