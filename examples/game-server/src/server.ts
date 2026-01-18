/**
 * Game Server - Express API with tiered caching.
 *
 * This demonstrates how ts-query's caching works in a real backend:
 * - L1: In-process cache (fast, per-server)
 * - L2: Shared cache (Redis in prod, in-memory here)
 * - L3: Database (PostgreSQL in prod, in-memory here)
 */

import express from 'express';
import cors from 'cors';
import { queryClient, CACHE_TTL, getCacheStats } from './cache.js';
import * as db from './database.js';
import type {
  RegisterRequest,
  RegisterResponse,
  SyncStateRequest,
  SyncStateResponse,
  GetLeaderboardResponse,
  GetGlobalEventsResponse,
  GetPlayerProfileResponse,
  Leaderboard,
  LeaderboardEntry,
} from './types.js';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT ?? 3001;

// ============================================================================
// Player Registration & Auth
// ============================================================================

app.post('/api/register', async (req, res) => {
  try {
    const { displayName } = req.body as RegisterRequest;

    if (!displayName || displayName.length < 2 || displayName.length > 20) {
      res.status(400).json({ error: 'Display name must be 2-20 characters' });
      return;
    }

    // Direct database write - no caching for writes
    const result = await db.createPlayer(displayName);

    const response: RegisterResponse = {
      playerId: result.playerId,
      playerSecret: result.playerSecret,
      state: result.state,
    };

    res.json(response);
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ============================================================================
// State Sync (client -> server)
// ============================================================================

app.post('/api/sync', async (req, res) => {
  try {
    const { playerId, playerSecret, state } = req.body as SyncStateRequest;

    // Validate auth
    const valid = await db.validatePlayerSecret(playerId, playerSecret);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Anti-cheat: Server validates the state
    // In production, you'd check:
    // - Time between updates vs cookies gained
    // - Purchase history vs cookie expenditure
    // - Building counts vs theoretical max

    const updatedState = await db.updatePlayer(playerId, playerSecret, state);
    if (!updatedState) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }

    // Invalidate player's cached profile since their stats changed
    queryClient.invalidateQueries(['player-profile', playerId]);

    const response: SyncStateResponse = {
      success: true,
      state: updatedState,
      serverTime: Date.now(),
    };

    res.json(response);
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Sync failed' });
  }
});

// ============================================================================
// Leaderboard (heavily cached - many reads, fewer writes)
// ============================================================================

app.get('/api/leaderboard', async (req, res) => {
  try {
    const playerId = req.query.playerId as string | undefined;

    // This is the key pattern: use QueryClient to cache expensive queries
    const leaderboardQuery = queryClient.getQuery({
      queryKey: ['leaderboard', 'top100'],
      queryFn: async (): Promise<Leaderboard> => {
        console.log('[Cache MISS] Fetching leaderboard from database...');

        const topPlayers = await db.getTopPlayers(100);
        const entries: LeaderboardEntry[] = topPlayers.map((p, i) => ({
          rank: i + 1,
          playerId: p.playerId,
          displayName: p.displayName,
          totalCookies: p.totalCookies,
        }));

        return {
          entries,
          updatedAt: Date.now(),
        };
      },
      staleTime: CACHE_TTL.LEADERBOARD / 2, // L1 staleness
      sharedCacheTtl: CACHE_TTL.LEADERBOARD, // L2 TTL
    });

    const leaderboard = await leaderboardQuery.fetch();

    // If player requested their rank and not in top 100, fetch it separately
    let playerRank: number | undefined;
    if (playerId) {
      const inTop100 = leaderboard.entries.some((e) => e.playerId === playerId);
      if (!inTop100) {
        playerRank = (await db.getPlayerRank(playerId)) ?? undefined;
      }
    }

    const response: GetLeaderboardResponse = {
      leaderboard: { ...leaderboard, playerRank },
      cachedAt: Date.now(), // Use current time since QueryState doesn't track dataUpdatedAt
    };

    res.json(response);
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// ============================================================================
// Player Profile (cached - viewed by many, changes infrequently)
// ============================================================================

app.get('/api/player/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;

    const profileQuery = queryClient.getQuery({
      queryKey: ['player-profile', playerId],
      queryFn: async (): Promise<GetPlayerProfileResponse> => {
        console.log(
          `[Cache MISS] Fetching player ${playerId} from database...`,
        );

        const player = await db.getPlayer(playerId);
        if (!player) {
          throw new Error('Player not found');
        }

        const buildingCount = player.buildings.reduce(
          (sum, b) => sum + b.count,
          0,
        );

        return {
          displayName: player.displayName,
          totalCookies: player.totalCookies,
          achievementCount: player.unlockedAchievements.length,
          buildingCount,
          memberSince: player.createdAt,
        };
      },
      staleTime: CACHE_TTL.PLAYER_PROFILE / 2,
      sharedCacheTtl: CACHE_TTL.PLAYER_PROFILE,
    });

    const profile = await profileQuery.fetch();
    res.json(profile);
  } catch (error) {
    console.error('Player profile error:', error);
    // Distinguish "not found" from other server errors
    if (error instanceof Error && error.message === 'Player not found') {
      res.status(404).json({ error: 'Player not found' });
    } else {
      res.status(500).json({ error: 'Failed to fetch player profile' });
    }
  }
});

// ============================================================================
// Global Events (cached - same for everyone)
// ============================================================================

app.get('/api/events', async (_req, res) => {
  try {
    const eventsQuery = queryClient.getQuery({
      queryKey: ['global-events'],
      queryFn: async () => {
        console.log('[Cache MISS] Fetching global events from database...');
        return db.getActiveEvents();
      },
      staleTime: CACHE_TTL.GLOBAL_EVENTS / 2,
      sharedCacheTtl: CACHE_TTL.GLOBAL_EVENTS,
    });

    const events = await eventsQuery.fetch();

    const response: GetGlobalEventsResponse = {
      events,
      serverTime: Date.now(),
    };

    res.json(response);
  } catch (error) {
    console.error('Events error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// ============================================================================
// Debug/Admin Endpoints
// ============================================================================

app.get('/api/debug/cache', (_req, res) => {
  res.json({
    sharedCache: getCacheStats(),
    message: 'In production, you would query Redis DBSIZE, memory usage, etc.',
  });
});

// ============================================================================
// Start Server
// ============================================================================

db.seedTestData();

app.listen(PORT, () => {
  console.log(`
🍪 Cookie Clicker Backend running on http://localhost:${PORT}

Endpoints:
  POST /api/register        - Create new player
  POST /api/sync            - Sync player state
  GET  /api/leaderboard     - Get top 100 players (cached)
  GET  /api/player/:id      - Get player profile (cached)
  GET  /api/events          - Get active global events (cached)
  GET  /api/debug/cache     - View cache stats

Caching Architecture:
  L1: In-process QueryClient cache (per server instance)
  L2: Shared cache (InMemory for dev, Redis for prod)
  L3: Database (InMemory for dev, PostgreSQL for prod)

Try hitting /api/leaderboard multiple times and watch the logs!
  `);
});
