/**
 * Database layer (L3 in the caching hierarchy).
 *
 * This is an in-memory implementation for the demo.
 * In production, you'd use PostgreSQL, MongoDB, etc.
 */

import { v4 as uuidv4 } from 'uuid';
import type { PlayerState, GlobalEvent } from './types.js';

// ============================================================================
// In-Memory "Database"
// ============================================================================

interface PlayerRecord {
  state: PlayerState;
  secret: string; // simple auth
}

const players = new Map<string, PlayerRecord>();
const globalEvents: GlobalEvent[] = [];

// ============================================================================
// Player Operations
// ============================================================================

export async function createPlayer(displayName: string): Promise<{
  playerId: string;
  playerSecret: string;
  state: PlayerState;
}> {
  // Simulate network latency
  await simulateLatency();

  const playerId = uuidv4();
  const playerSecret = uuidv4();
  const now = Date.now();

  const state: PlayerState = {
    playerId,
    displayName,
    cookies: 0,
    totalCookies: 0,
    cookiesPerClick: 1,
    buildings: [],
    purchasedUpgrades: [],
    unlockedAchievements: [],
    goldenCookiesClicked: 0,
    lastUpdate: now,
    createdAt: now,
  };

  players.set(playerId, { state, secret: playerSecret });

  console.log(`[DB] Created player: ${displayName} (${playerId})`);
  return { playerId, playerSecret, state };
}

export async function getPlayer(playerId: string): Promise<PlayerState | null> {
  await simulateLatency();
  const record = players.get(playerId);
  return record?.state ?? null;
}

export async function updatePlayer(
  playerId: string,
  playerSecret: string,
  updates: Partial<PlayerState>,
): Promise<PlayerState | null> {
  await simulateLatency();

  const record = players.get(playerId);
  if (!record) return null;
  if (record.secret !== playerSecret) return null;

  record.state = {
    ...record.state,
    ...updates,
    playerId, // ensure these can't be overwritten
    createdAt: record.state.createdAt,
  };

  console.log(
    `[DB] Updated player: ${record.state.displayName} - ${record.state.totalCookies.toFixed(0)} total cookies`,
  );
  return record.state;
}

export async function validatePlayerSecret(
  playerId: string,
  playerSecret: string,
): Promise<boolean> {
  const record = players.get(playerId);
  return record?.secret === playerSecret;
}

// ============================================================================
// Leaderboard Operations
// ============================================================================

export async function getTopPlayers(
  limit: number = 100,
): Promise<{ playerId: string; displayName: string; totalCookies: number }[]> {
  await simulateLatency();

  const allPlayers = Array.from(players.values())
    .map((r) => ({
      playerId: r.state.playerId,
      displayName: r.state.displayName,
      totalCookies: r.state.totalCookies,
    }))
    .sort((a, b) => b.totalCookies - a.totalCookies)
    .slice(0, limit);

  console.log(`[DB] Fetched top ${limit} players (found ${allPlayers.length})`);
  return allPlayers;
}

export async function getPlayerRank(playerId: string): Promise<number | null> {
  await simulateLatency();

  const sorted = Array.from(players.values())
    .map((r) => ({
      playerId: r.state.playerId,
      totalCookies: r.state.totalCookies,
    }))
    .sort((a, b) => b.totalCookies - a.totalCookies);

  const index = sorted.findIndex((p) => p.playerId === playerId);
  return index >= 0 ? index + 1 : null;
}

// ============================================================================
// Global Events Operations
// ============================================================================

export async function getActiveEvents(): Promise<GlobalEvent[]> {
  await simulateLatency();
  const now = Date.now();
  return globalEvents.filter((e) => e.startsAt <= now && e.endsAt > now);
}

export async function createEvent(
  event: Omit<GlobalEvent, 'id'>,
): Promise<GlobalEvent> {
  await simulateLatency();
  const newEvent: GlobalEvent = { ...event, id: uuidv4() };
  globalEvents.push(newEvent);
  console.log(`[DB] Created global event: ${newEvent.name}`);
  return newEvent;
}

// ============================================================================
// Helpers
// ============================================================================

async function simulateLatency(): Promise<void> {
  // Simulate 5-20ms database latency
  const delay = 5 + Math.random() * 15;
  await new Promise((resolve) => setTimeout(resolve, delay));
}

// Seed some test data
export function seedTestData(): void {
  const testPlayers = [
    { name: 'CookieMonster', cookies: 1_000_000 },
    { name: 'GrandmaLover', cookies: 500_000 },
    { name: 'ClickMaster', cookies: 250_000 },
    { name: 'IdleKing', cookies: 100_000 },
    { name: 'NewPlayer', cookies: 1_000 },
  ];

  for (const { name, cookies } of testPlayers) {
    const playerId = uuidv4();
    const now = Date.now();
    players.set(playerId, {
      state: {
        playerId,
        displayName: name,
        cookies,
        totalCookies: cookies,
        cookiesPerClick: 1,
        buildings: [],
        purchasedUpgrades: [],
        unlockedAchievements: [],
        goldenCookiesClicked: 0,
        lastUpdate: now,
        createdAt: now - Math.random() * 86400000,
      },
      secret: uuidv4(),
    });
  }

  // Create a sample global event
  const now = Date.now();
  globalEvents.push({
    id: uuidv4(),
    type: 'double_cps',
    name: 'Weekend Bonus',
    description: 'All passive income is doubled!',
    multiplier: 2,
    startsAt: now,
    endsAt: now + 3600_000, // 1 hour
  });

  console.log('[DB] Seeded test data');
}
