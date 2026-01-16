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
  const res = await fetch(`${API_BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Registration failed');
  }

  const data = await res.json();
  return { playerId: data.playerId, playerSecret: data.playerSecret };
}

export async function getLeaderboard(playerId?: string): Promise<{
  leaderboard: Leaderboard;
  cachedAt: number;
}> {
  const url = playerId
    ? `${API_BASE}/leaderboard?playerId=${playerId}`
    : `${API_BASE}/leaderboard`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error('Failed to fetch leaderboard');
  }

  return res.json();
}

export async function getGlobalEvents(): Promise<{
  events: GlobalEvent[];
  serverTime: number;
}> {
  const res = await fetch(`${API_BASE}/events`);

  if (!res.ok) {
    throw new Error('Failed to fetch events');
  }

  return res.json();
}

export async function getPlayerProfile(
  playerId: string,
): Promise<PlayerProfile> {
  const res = await fetch(`${API_BASE}/player/${playerId}`);

  if (!res.ok) {
    throw new Error('Player not found');
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
  const res = await fetch(`${API_BASE}/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, playerSecret, state }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Sync failed');
  }

  return res.json();
}
