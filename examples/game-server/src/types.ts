/**
 * Shared types for the incremental game API.
 * These would typically be in a shared package for client/server.
 */

// ============================================================================
// Player State
// ============================================================================

export interface PlayerBuilding {
  id: string;
  count: number;
  cps: number; // cookies per second per building (after upgrades)
}

export interface PlayerState {
  playerId: string;
  displayName: string;
  cookies: number;
  totalCookies: number; // lifetime baked - used for leaderboard
  cookiesPerClick: number;
  buildings: PlayerBuilding[];
  purchasedUpgrades: string[];
  unlockedAchievements: string[];
  goldenCookiesClicked: number;
  lastUpdate: number; // timestamp
  createdAt: number;
}

// ============================================================================
// Leaderboard
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
  playerRank?: number; // current player's rank if they're not in top N
}

// ============================================================================
// Global Events (server-driven bonuses)
// ============================================================================

export type GlobalEventType =
  | 'double_cps' // 2x passive income
  | 'double_click' // 2x click power
  | 'bonus_golden'; // golden cookies spawn 5x more often

export interface GlobalEvent {
  id: string;
  type: GlobalEventType;
  name: string;
  description: string;
  multiplier: number;
  startsAt: number;
  endsAt: number;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface RegisterRequest {
  displayName: string;
}

export interface RegisterResponse {
  playerId: string;
  playerSecret: string; // simple auth token
  state: PlayerState;
}

export interface SyncStateRequest {
  playerId: string;
  playerSecret: string;
  state: Omit<PlayerState, 'playerId' | 'displayName' | 'createdAt'>;
}

export interface SyncStateResponse {
  success: boolean;
  state: PlayerState;
  serverTime: number;
}

export interface GetLeaderboardResponse {
  leaderboard: Leaderboard;
  cachedAt: number;
}

export interface GetGlobalEventsResponse {
  events: GlobalEvent[];
  serverTime: number;
}

export interface GetPlayerProfileRequest {
  playerId: string;
}

export interface GetPlayerProfileResponse {
  displayName: string;
  totalCookies: number;
  achievementCount: number;
  buildingCount: number;
  memberSince: number;
}

// ============================================================================
// Game Config (rarely changes, heavily cached)
// ============================================================================

export interface BuildingDefinition {
  id: string;
  name: string;
  baseCost: number;
  baseCps: number;
  unlockAtTotalCookies: number;
}

export interface GameConfig {
  buildings: BuildingDefinition[];
  buildingCostMultiplier: number;
  maxOfflineSeconds: number;
  version: string;
}
