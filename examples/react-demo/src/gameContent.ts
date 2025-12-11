import type {
  Building,
  UpgradeDefinition,
  AchievementDefinition,
} from './gameStore';

export const DEFAULT_BUILDINGS: Building[] = [
  {
    id: 'cursor',
    name: 'Cursor',
    baseCost: 15,
    cps: 0.1,
    count: 0,
    unlockAtTotalCookies: 0,
  },
  {
    id: 'grandma',
    name: 'Grandma',
    baseCost: 100,
    cps: 1,
    count: 0,
    unlockAtTotalCookies: 30,
  },
  {
    id: 'farm',
    name: 'Farm',
    baseCost: 1100,
    cps: 8,
    count: 0,
    unlockAtTotalCookies: 300,
  },
  {
    id: 'mine',
    name: 'Mine',
    baseCost: 12_000,
    cps: 47,
    count: 0,
    unlockAtTotalCookies: 2_000,
  },
  {
    id: 'factory',
    name: 'Factory',
    baseCost: 130_000,
    cps: 260,
    count: 0,
    unlockAtTotalCookies: 20_000,
  },
  {
    id: 'bank',
    name: 'Bank',
    baseCost: 1_400_000,
    cps: 1_400,
    count: 0,
    unlockAtTotalCookies: 200_000,
  },
];

export const UPGRADES: UpgradeDefinition[] = [
  {
    id: 'click-1',
    name: 'Reinforced index finger',
    description: '+1 cookie per click',
    cost: 100,
    kind: 'click-add',
    amount: 1,
    unlock: (state) => state.totalCookies >= 50,
  },
  {
    id: 'click-2',
    name: 'Carpal tunnel prevention cream',
    description: '+4 cookies per click',
    cost: 500,
    kind: 'click-add',
    amount: 4,
    unlock: (state) => state.totalCookies >= 200,
  },
  {
    id: 'grandma-1',
    name: 'Forwards from grandma',
    description: 'Grandmas are twice as efficient',
    cost: 1000,
    kind: 'building-mult',
    multiplier: 2,
    buildingId: 'grandma',
    unlock: (state) =>
      state.buildings.some((b) => b.id === 'grandma' && b.count >= 5),
  },
];

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'first-cookie',
    name: 'First cookie',
    description: 'Bake 1 cookie in total.',
    condition: (state) => state.totalCookies >= 1,
  },
  {
    id: 'hundred-cookies',
    name: 'Getting there',
    description: 'Bake 100 cookies in total.',
    condition: (state) => state.totalCookies >= 100,
  },
  {
    id: 'thousand-cookies',
    name: 'A thousand treats',
    description: 'Bake 1,000 cookies in total.',
    condition: (state) => state.totalCookies >= 1_000,
  },
  {
    id: 'first-building',
    name: 'Getting staffed',
    description: 'Own 1 building of any type.',
    condition: (state) => state.buildings.some((b) => b.count >= 1),
  },
  {
    id: 'ten-buildings',
    name: 'Estate',
    description: 'Own 10 buildings in total.',
    condition: (state) =>
      state.buildings.reduce((sum, b) => sum + b.count, 0) >= 10,
  },
  {
    id: 'grandma-fanclub',
    name: 'Grandma fanclub',
    description: 'Own 10 grandmas.',
    condition: (state) =>
      state.buildings.some((b) => b.id === 'grandma' && b.count >= 10),
  },
  {
    id: 'golden-touch',
    name: 'Golden touch',
    description: 'Click your first golden cookie.',
    condition: (state) => state.goldenCookiesClicked >= 1,
  },
];

