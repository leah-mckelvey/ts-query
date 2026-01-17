/**
 * API client for the game backend.
 *
 * In production, you'd want:
 * - Better error handling
 * - Request retries
 * - Auth token refresh
 * - WebSocket for real-time updates
 */

const API_BASE = 'http://localhost:3001/api';

// ============================================================================
// Error Classes
// ============================================================================

/**
 * Error thrown when the network request fails (e.g., offline, DNS failure, CORS).
 */
export class NetworkError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'NetworkError';
    this.cause = cause;
  }
}

/**
 * Error thrown when the server responds with an error status code.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly serverMessage?: string;

  constructor(message: string, status: number, serverMessage?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.serverMessage = serverMessage;
  }
}

/**
 * Wrapper around fetch that distinguishes network errors from server errors.
 */
async function fetchWithErrorHandling(
  url: string,
  options?: RequestInit,
): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, options);
  } catch (error) {
    // Network-level failure (offline, DNS, CORS, etc.)
    throw new NetworkError(
      'Network request failed. Please check your internet connection.',
      error,
    );
  }
  return response;
}

// ============================================================================
// Types (mirrored from game-server)
// ============================================================================

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  displayName: string;
  totalCookies: number;
}

export interface Leaderboard {
  entries: LeaderboardEntry[];
  updatedAt: number;
  playerRank?: number;
}

export type GlobalEventType = 'double_cps' | 'double_click' | 'bonus_golden';

export interface GlobalEvent {
  id: string;
  type: GlobalEventType;
  name: string;
  description: string;
  multiplier: number;
  startsAt: number;
  endsAt: number;
}

export interface PlayerProfile {
  displayName: string;
  totalCookies: number;
  achievementCount: number;
  buildingCount: number;
  memberSince: number;
}

// ============================================================================
// API Functions
// ============================================================================

export async function registerPlayer(displayName: string): Promise<{
  playerId: string;
  playerSecret: string;
}> {
  const res = await fetchWithErrorHandling(`${API_BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new ApiError(
      err.error || 'Registration failed',
      res.status,
      err.error,
    );
  }

  const data = await res.json();
  return { playerId: data.playerId, playerSecret: data.playerSecret };
}

export async function getLeaderboard(playerId?: string): Promise<{
  leaderboard: Leaderboard;
  cachedAt: number;
}> {
  const url = playerId
    ? `${API_BASE}/leaderboard?playerId=${encodeURIComponent(playerId)}`
    : `${API_BASE}/leaderboard`;

  const res = await fetchWithErrorHandling(url);

  if (!res.ok) {
    throw new ApiError('Failed to fetch leaderboard', res.status);
  }

  return res.json();
}

export async function getGlobalEvents(): Promise<{
  events: GlobalEvent[];
  serverTime: number;
}> {
  const res = await fetchWithErrorHandling(`${API_BASE}/events`);

  if (!res.ok) {
    throw new ApiError('Failed to fetch events', res.status);
  }

  return res.json();
}

export async function getPlayerProfile(
  playerId: string,
): Promise<PlayerProfile> {
  const res = await fetchWithErrorHandling(`${API_BASE}/player/${playerId}`);

  if (!res.ok) {
    if (res.status === 404) {
      throw new ApiError('Player not found', res.status);
    }
    throw new ApiError('Failed to fetch player profile', res.status);
  }

  return res.json();
}

export async function syncState(
  playerId: string,
  playerSecret: string,
  state: {
    cookies: number;
    totalCookies: number;
    cookiesPerClick: number;
    buildings: Array<{ id: string; count: number; cps: number }>;
    purchasedUpgrades: string[];
    unlockedAchievements: string[];
    goldenCookiesClicked: number;
    lastUpdate: number;
  },
): Promise<{ success: boolean }> {
  const res = await fetchWithErrorHandling(`${API_BASE}/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, playerSecret, state }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new ApiError(err.error || 'Sync failed', res.status, err.error);
  }

  return res.json();
}
