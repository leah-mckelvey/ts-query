import { createStore } from '@ts-query/core';
import { DEFAULT_BUILDINGS, UPGRADES, ACHIEVEMENTS } from './gameContent';

export type Building = {
	id: string;
	name: string;
	baseCost: number;
	count: number;
	cps: number; // cookies per second per building
	/** When totalCookies reaches this, the building row becomes visible. */
	unlockAtTotalCookies?: number;
};

export type GameState = {
	cookies: number;
	totalCookies: number; // lifetime baked
	cookiesPerClick: number;
	buildings: Building[];
	purchasedUpgrades: string[];
	unlockedAchievements: string[];
	goldenCookieVisible: boolean;
	goldenCookieExpiresAt: number | null;
	goldenCookiesClicked: number;
	/** Last time cookies were updated, in ms since epoch */
	lastUpdate: number;
};

export type GameStoreState = GameState & {
	click: () => void;
	buyBuilding: (id: string) => void;
	buyUpgrade: (id: string) => void;
	clickGoldenCookie: () => void;
};

type UpgradeKind = 'click-add' | 'click-mult' | 'building-mult';

export type UpgradeDefinition = {
	id: string;
	name: string;
	description: string;
	cost: number;
	kind: UpgradeKind;
	amount?: number; // for click-add
	multiplier?: number; // for mult types
	buildingId?: string; // for building-mult
	unlock: (state: GameState) => boolean;
};

export type AchievementDefinition = {
	id: string;
	name: string;
	description: string;
	condition: (state: GameState) => boolean;
};

// Bump this key when we intentionally want to invalidate old saves
// (e.g. after fixing offline math bugs that could create absurd totals).
const STORAGE_KEY = 'incremental-game-v2';
export const BUILDING_COST_MULTIPLIER = 1.15;

const defaultGameState: GameState = {
	cookies: 0,
	totalCookies: 0,
	cookiesPerClick: 1,
	buildings: DEFAULT_BUILDINGS,
	purchasedUpgrades: [],
	unlockedAchievements: [],
	goldenCookieVisible: false,
	goldenCookieExpiresAt: null,
	goldenCookiesClicked: 0,
	lastUpdate: 0,
};

function computeTotalCps(state: Pick<GameState, 'buildings'>): number {
	return state.buildings.reduce((sum, b) => sum + b.cps * b.count, 0);
}

function loadPersistedState(): GameState | null {
  if (typeof window === 'undefined') return null;

	  try {
	    const raw = window.localStorage.getItem(STORAGE_KEY);
	    if (!raw) return null;

	    const parsed = JSON.parse(raw) as Partial<GameState>;
	    if (typeof parsed !== 'object' || parsed === null) return null;

	    const persistedBuildings = Array.isArray((parsed as any).buildings)
	      ? ((parsed as any).buildings as Partial<Building>[])
	      : null;

	    const mergedBuildings: Building[] = DEFAULT_BUILDINGS.map((def) => {
	      const persisted = persistedBuildings?.find((b) => b && b.id === def.id);
	      return {
	        ...def,
	        count:
	          persisted && typeof persisted.count === 'number'
	            ? persisted.count
	            : def.count,
	        cps:
	          persisted && typeof persisted.cps === 'number'
	            ? persisted.cps
	            : def.cps,
	      };
	    });

	    return {
	      ...defaultGameState,
	      ...parsed,
	      buildings: mergedBuildings,
	      totalCookies:
	        typeof parsed.totalCookies === 'number'
	          ? parsed.totalCookies
	          : typeof parsed.cookies === 'number'
	            ? parsed.cookies
	            : defaultGameState.totalCookies,
	      purchasedUpgrades: Array.isArray((parsed as any).purchasedUpgrades)
	        ? (parsed as any).purchasedUpgrades
	        : [],
	      unlockedAchievements: Array.isArray((parsed as any).unlockedAchievements)
	        ? (parsed as any).unlockedAchievements
	        : [],
	      goldenCookieVisible:
	        typeof (parsed as any).goldenCookieVisible === 'boolean'
	          ? (parsed as any).goldenCookieVisible
	          : false,
	      goldenCookieExpiresAt:
	        typeof (parsed as any).goldenCookieExpiresAt === 'number'
	          ? (parsed as any).goldenCookieExpiresAt
	          : null,
	      goldenCookiesClicked:
	        typeof (parsed as any).goldenCookiesClicked === 'number'
	          ? (parsed as any).goldenCookiesClicked
	          : 0,
	      lastUpdate: typeof parsed.lastUpdate === 'number' ? parsed.lastUpdate : 0,
	    };
	  } catch {
	    return null;
	  }
}

function persistState(state: GameState): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore persistence errors
  }
}

function computeUnlockedAchievements(state: GameState): string[] {
	const unlocked = new Set(state.unlockedAchievements);
	for (const achievement of ACHIEVEMENTS) {
		if (!unlocked.has(achievement.id) && achievement.condition(state)) {
			unlocked.add(achievement.id);
		}
	}
	return Array.from(unlocked);
}

	export const gameStore = createStore<GameStoreState>(() => {
	  const persisted = loadPersistedState();
	  const now = typeof window === 'undefined' ? Date.now() : Date.now();

	  let baseState: GameState = persisted ?? { ...defaultGameState, lastUpdate: now };

	  if (persisted) {
	    const persistedLastUpdate = persisted.lastUpdate;
	    const lastUpdate =
	      typeof persistedLastUpdate === 'number' && persistedLastUpdate > 0
	        ? persistedLastUpdate
	        : now;
	    const elapsedSecondsRaw = Math.max(0, (now - lastUpdate) / 1000);
	    const cps = computeTotalCps(baseState);

	    // Optional safety clamp: avoid absurd gains from old saves or clock jumps.
	    const MAX_OFFLINE_SECONDS = 60 * 60 * 24; // cap at 24 hours offline
	    const elapsedSeconds = Math.min(elapsedSecondsRaw, MAX_OFFLINE_SECONDS);

	    if (elapsedSeconds > 0 && cps > 0) {
	      baseState = {
	        ...baseState,
	        cookies: baseState.cookies + cps * elapsedSeconds,
	        totalCookies: baseState.totalCookies + cps * elapsedSeconds,
	        lastUpdate: now,
	      };
	    } else {
	      baseState = { ...baseState, lastUpdate: now };
	    }
	  }

		  // Ensure achievements are up-to-date after any offline catch-up
		  baseState = {
		    ...baseState,
		    unlockedAchievements: computeUnlockedAchievements(baseState),
		  };

	  return {
    ...baseState,
    click: () => {
      gameStore.setState((state) => {
        const nowClick = Date.now();
        const gain = state.cookiesPerClick;
        const snapshot: GameState = {
          cookies: state.cookies + gain,
          totalCookies: state.totalCookies + gain,
          cookiesPerClick: state.cookiesPerClick,
          buildings: state.buildings,
          purchasedUpgrades: state.purchasedUpgrades,
          unlockedAchievements: state.unlockedAchievements,
          goldenCookieVisible: state.goldenCookieVisible,
          goldenCookieExpiresAt: state.goldenCookieExpiresAt,
          goldenCookiesClicked: state.goldenCookiesClicked,
          lastUpdate: nowClick,
        };

        const unlockedAchievements = computeUnlockedAchievements(snapshot);

        return {
          cookies: snapshot.cookies,
          totalCookies: snapshot.totalCookies,
          unlockedAchievements,
          lastUpdate: snapshot.lastUpdate,
        };
      });
    },
    buyBuilding: (id: string) => {
      gameStore.setState((state) => {
        const building = state.buildings.find((b) => b.id === id);
        if (!building) return {};

        const currentCost =
          building.baseCost * BUILDING_COST_MULTIPLIER ** building.count;
        if (state.cookies < currentCost) return {};

        const updatedBuildings = state.buildings.map((b) =>
          b.id === id ? { ...b, count: b.count + 1 } : b,
        );

        const nowPurchase = Date.now();
        const snapshot: GameState = {
          cookies: state.cookies - currentCost,
          totalCookies: state.totalCookies,
          cookiesPerClick: state.cookiesPerClick,
          buildings: updatedBuildings,
          purchasedUpgrades: state.purchasedUpgrades,
          unlockedAchievements: state.unlockedAchievements,
          goldenCookieVisible: state.goldenCookieVisible,
          goldenCookieExpiresAt: state.goldenCookieExpiresAt,
          goldenCookiesClicked: state.goldenCookiesClicked,
          lastUpdate: nowPurchase,
        };

        const unlockedAchievements = computeUnlockedAchievements(snapshot);

        return {
          cookies: snapshot.cookies,
          buildings: snapshot.buildings,
          unlockedAchievements,
          lastUpdate: snapshot.lastUpdate,
        };
      });
    },
    buyUpgrade: (id: string) => {
      gameStore.setState((state) => {
        if (state.purchasedUpgrades.includes(id)) return {};
        const def = UPGRADES.find((u) => u.id === id);
        if (!def) return {};
        if (!def.unlock(state)) return {};
        if (state.cookies < def.cost) return {};

        let cookiesPerClick = state.cookiesPerClick;
        let buildings = state.buildings;

        if (def.kind === 'click-add' && typeof def.amount === 'number') {
          cookiesPerClick += def.amount;
        } else if (def.kind === 'click-mult' && typeof def.multiplier === 'number') {
          cookiesPerClick *= def.multiplier;
        } else if (
          def.kind === 'building-mult' &&
          def.buildingId &&
          typeof def.multiplier === 'number'
        ) {
          buildings = state.buildings.map((b) =>
            b.id === def.buildingId ? { ...b, cps: b.cps * def.multiplier! } : b,
          );
        }

        const nowUpgrade = Date.now();
        const snapshot: GameState = {
          cookies: state.cookies - def.cost,
          totalCookies: state.totalCookies,
          cookiesPerClick,
          buildings,
          purchasedUpgrades: [...state.purchasedUpgrades, def.id],
          unlockedAchievements: state.unlockedAchievements,
          goldenCookieVisible: state.goldenCookieVisible,
          goldenCookieExpiresAt: state.goldenCookieExpiresAt,
          goldenCookiesClicked: state.goldenCookiesClicked,
          lastUpdate: nowUpgrade,
        };

        const unlockedAchievements = computeUnlockedAchievements(snapshot);

        return {
          cookies: snapshot.cookies,
          totalCookies: snapshot.totalCookies,
          cookiesPerClick: snapshot.cookiesPerClick,
          buildings: snapshot.buildings,
          purchasedUpgrades: snapshot.purchasedUpgrades,
          unlockedAchievements,
          lastUpdate: snapshot.lastUpdate,
        };
      });
    },
    clickGoldenCookie: () => {
      gameStore.setState((state) => {
        if (!state.goldenCookieVisible) return {};

        const nowClick = Date.now();
        const reward = Math.max(10, computeTotalCps(state) * 30);

        const snapshot: GameState = {
          cookies: state.cookies + reward,
          totalCookies: state.totalCookies + reward,
          cookiesPerClick: state.cookiesPerClick,
          buildings: state.buildings,
          purchasedUpgrades: state.purchasedUpgrades,
          unlockedAchievements: state.unlockedAchievements,
          goldenCookieVisible: false,
          goldenCookieExpiresAt: null,
          goldenCookiesClicked: state.goldenCookiesClicked + 1,
          lastUpdate: nowClick,
        };

        const unlockedAchievements = computeUnlockedAchievements(snapshot);

        return {
          cookies: snapshot.cookies,
          totalCookies: snapshot.totalCookies,
          goldenCookieVisible: snapshot.goldenCookieVisible,
          goldenCookieExpiresAt: snapshot.goldenCookieExpiresAt,
          goldenCookiesClicked: snapshot.goldenCookiesClicked,
          unlockedAchievements,
          lastUpdate: snapshot.lastUpdate,
        };
      });
    },
  };
});

if (typeof window !== 'undefined') {
  // Persist on any state change
  gameStore.subscribe((state) => {
	    const {
	      cookies,
	      totalCookies,
	      cookiesPerClick,
	      buildings,
	      purchasedUpgrades,
	      unlockedAchievements,
	      goldenCookieVisible,
	      goldenCookieExpiresAt,
	      goldenCookiesClicked,
	      lastUpdate,
	    } = state;
	    persistState({
	      cookies,
	      totalCookies,
	      cookiesPerClick,
	      buildings,
	      purchasedUpgrades,
	      unlockedAchievements,
	      goldenCookieVisible,
	      goldenCookieExpiresAt,
	      goldenCookiesClicked,
	      lastUpdate,
	    });
  });

  // Passive income tick while the app is open, independent of which view is active
  const TICK_INTERVAL_MS = 1000;
  window.setInterval(() => {
	    const state = gameStore.getState();
	    const now = Date.now();
	    const elapsedSeconds = Math.max(0, (now - state.lastUpdate) / 1000);

	    let cookies = state.cookies;
	    let totalCookies = state.totalCookies;
	    let lastUpdate = state.lastUpdate;
	    let goldenCookieVisible = state.goldenCookieVisible;
	    let goldenCookieExpiresAt = state.goldenCookieExpiresAt;

	    if (elapsedSeconds > 0) {
	      const cps = computeTotalCps(state);
	      if (cps > 0) {
	        const gained = cps * elapsedSeconds;
	        cookies += gained;
	        totalCookies += gained;
	      }
	      lastUpdate = now;
	    }

	    // Golden cookie expiration/spawn
	    if (goldenCookieVisible && goldenCookieExpiresAt && now >= goldenCookieExpiresAt) {
	      goldenCookieVisible = false;
	      goldenCookieExpiresAt = null;
	    } else if (!goldenCookieVisible) {
	      const SPAWN_CHANCE_PER_TICK = 0.02; // ~2% per second
	      if (Math.random() < SPAWN_CHANCE_PER_TICK) {
	        goldenCookieVisible = true;
	        const LIFETIME_MS = 10_000;
	        goldenCookieExpiresAt = now + LIFETIME_MS;
	      }
	    }

	    const snapshot: GameState = {
	      cookies,
	      totalCookies,
	      cookiesPerClick: state.cookiesPerClick,
	      buildings: state.buildings,
	      purchasedUpgrades: state.purchasedUpgrades,
	      unlockedAchievements: state.unlockedAchievements,
	      goldenCookieVisible,
	      goldenCookieExpiresAt,
	      goldenCookiesClicked: state.goldenCookiesClicked,
	      lastUpdate,
	    };

	    const unlockedAchievements = computeUnlockedAchievements(snapshot);

	    gameStore.setState({
	      cookies: snapshot.cookies,
	      totalCookies: snapshot.totalCookies,
	      goldenCookieVisible: snapshot.goldenCookieVisible,
	      goldenCookieExpiresAt: snapshot.goldenCookieExpiresAt,
	      unlockedAchievements,
	      lastUpdate: snapshot.lastUpdate,
	    });
  }, TICK_INTERVAL_MS);
}

