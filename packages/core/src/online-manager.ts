/**
 * Tracks whether the network is online and notifies subscribers when
 * connectivity is restored. Queries use this to refetch after a reconnect —
 * TanStack's refetchOnReconnect behaviour.
 */
export class OnlineManager {
  private online: boolean | undefined = undefined;
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
   * Manually set online state. RN adapters can wire this to NetInfo. Passing
   * undefined restores automatic detection from navigator.onLine.
   */
  setOnline(online: boolean | undefined): void {
    const wasOffline = !this.isOnline();
    this.online = online;
    // Only notify on offline -> online transition.
    if (wasOffline && this.isOnline()) {
      this.notify();
    }
  }

  isOnline(): boolean {
    if (typeof this.online === 'boolean') return this.online;
    if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
      return navigator.onLine;
    }
    return true;
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  private attachNativeListeners(): (() => void) | null {
    if (typeof window === 'undefined') return null;
    const onlineHandler = () => this.notify();
    window.addEventListener('online', onlineHandler, false);
    return () => {
      window.removeEventListener('online', onlineHandler);
    };
  }
}

export const onlineManager = new OnlineManager();
