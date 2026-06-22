// ########################################
// NETWORK MANAGER
// ########################################

/**
 * Global network manager that tracks online/offline events.
 * Used to trigger refetchOnReconnect for active queries.
 */
class NetworkManager {
  private online = true;
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

    // Initialize with current online status
    this.online = navigator.onLine ?? true;

    const onOnline = () => {
      this.online = true;
      this.listeners.forEach((listener) => listener());
    };

    const onOffline = () => {
      this.online = false;
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    this.cleanup = () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }

  isOnline(): boolean {
    return this.online;
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
export const networkManager = new NetworkManager();
