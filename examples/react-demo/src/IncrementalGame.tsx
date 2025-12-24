import { useStore } from '@ts-query/react';
import { Box, Button, Heading, Stack, Text } from '@ts-query/ui-react';
import { gameStore, BUILDING_COST_MULTIPLIER } from './gameStore';
import { UPGRADES, ACHIEVEMENTS } from './gameContent';

const formatNumber = (value: number): string => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return value.toFixed(0);
};

export const IncrementalGame = () => {
  const state = useStore(gameStore);
  const {
    cookies,
    totalCookies,
    cookiesPerClick,
    buildings,
    purchasedUpgrades,
    unlockedAchievements,
    goldenCookieVisible,
    click,
    buyBuilding,
    buyUpgrade,
    clickGoldenCookie,
  } = state;

  const totalCps = buildings.reduce((sum, b) => sum + b.cps * b.count, 0);

  const visibleBuildings = buildings.filter(
    (b) => (b.unlockAtTotalCookies ?? 0) <= totalCookies,
  );

  const availableUpgrades = UPGRADES.filter(
    (u) => u.unlock(state) && !purchasedUpgrades.includes(u.id),
  );

  return (
    <Box
      as="main"
      p={6}
      bg="#1a202c"
      color="#edf2f7"
      style={{ minHeight: '100vh', position: 'relative' }}
    >
      <Stack direction="row" gap={6} style={{ alignItems: 'flex-start' }}>
        <Box style={{ flex: 1 }}>
          <Heading level={1}>Cookie Clicker Clone</Heading>
          <Text fontSize="0.9rem" color="#a0aec0">
            Built with @ts-query/ui-react primitives
          </Text>

          <Box mt={4} mb={4}>
            <Heading level={2}>Cookies: {formatNumber(cookies)}</Heading>
            <Text color="#a0aec0">{totalCps.toFixed(1)} cookies / second</Text>
            <Text fontSize="0.85rem" color="#cbd5e0">
              Total baked: {formatNumber(totalCookies)}
            </Text>
          </Box>

          <Button
            size="lg"
            colorScheme="green"
            style={{ minWidth: '240px', fontSize: '1.25rem' }}
            onClick={click}
          >
            Click for {cookiesPerClick} cookie{cookiesPerClick !== 1 ? 's' : ''}
          </Button>
        </Box>

        <Box
          p={4}
          bg="#2d3748"
          rounded={8}
          style={{ boxShadow: '0 4px 10px rgba(0,0,0,0.4)', width: '360px' }}
        >
          <Heading level={3}>Buildings</Heading>

          <Stack direction="column" gap={3} style={{ marginTop: '1rem' }}>
            {visibleBuildings.map((b) => {
              const cost = b.baseCost * BUILDING_COST_MULTIPLIER ** b.count;
              const affordable = cookies >= cost;

              return (
                <Box
                  key={b.id}
                  p={3}
                  bg="#4a5568"
                  rounded={6}
                  style={{ opacity: affordable ? 1 : 0.6 }}
                >
                  <Stack
                    direction="row"
                    gap={2}
                    style={{ alignItems: 'center' }}
                  >
                    <Box style={{ flex: 1 }}>
                      <Text fontWeight={600}>{b.name}</Text>
                      <Text fontSize="0.85rem" color="#cbd5e0">
                        Cost: {formatNumber(cost)} | Owned: {b.count}
                      </Text>
                      <Text fontSize="0.75rem" color="#a0aec0">
                        {b.cps.toFixed(1)} cps each
                      </Text>
                    </Box>
                    <Button
                      size="sm"
                      variant="outline"
                      colorScheme="blue"
                      style={{ whiteSpace: 'nowrap' }}
                      disabled={!affordable}
                      onClick={() => buyBuilding(b.id)}
                    >
                      Buy
                    </Button>
                  </Stack>
                </Box>
              );
            })}
          </Stack>

          <Box mt={4}>
            <Heading level={3}>Upgrades</Heading>
            {availableUpgrades.length === 0 ? (
              <Text
                fontSize="0.85rem"
                color="#a0aec0"
                style={{ marginTop: '0.75rem' }}
              >
                No upgrades available yet. Keep baking!
              </Text>
            ) : (
              <Stack direction="column" gap={3} style={{ marginTop: '1rem' }}>
                {availableUpgrades.map((u) => {
                  const affordable = cookies >= u.cost;
                  return (
                    <Box
                      key={u.id}
                      p={3}
                      bg="#4a5568"
                      rounded={6}
                      style={{ opacity: affordable ? 1 : 0.7 }}
                    >
                      <Stack
                        direction="row"
                        gap={2}
                        style={{ alignItems: 'center' }}
                      >
                        <Box style={{ flex: 1 }}>
                          <Text fontWeight={600}>{u.name}</Text>
                          <Text fontSize="0.85rem" color="#cbd5e0">
                            {u.description}
                          </Text>
                          <Text fontSize="0.8rem" color="#a0aec0">
                            Cost: {formatNumber(u.cost)} cookies
                          </Text>
                        </Box>
                        <Button
                          size="sm"
                          variant="outline"
                          colorScheme="green"
                          disabled={!affordable}
                          onClick={() => buyUpgrade(u.id)}
                        >
                          Buy
                        </Button>
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Box>

          <Box mt={4}>
            <Heading level={3}>Achievements</Heading>
            <Stack direction="column" gap={2} style={{ marginTop: '0.75rem' }}>
              {ACHIEVEMENTS.map((a) => {
                const earned = unlockedAchievements.includes(a.id);
                return (
                  <Box
                    key={a.id}
                    p={2}
                    rounded={4}
                    style={{
                      backgroundColor: earned ? '#38a169' : 'transparent',
                      opacity: earned ? 1 : 0.5,
                    }}
                  >
                    <Text fontSize="0.85rem" fontWeight={600}>
                      {a.name}
                    </Text>
                    <Text fontSize="0.75rem" color="#e2e8f0">
                      {a.description}
                    </Text>
                  </Box>
                );
              })}
            </Stack>
          </Box>
        </Box>
      </Stack>

      {goldenCookieVisible && (
        <Button
          size="lg"
          colorScheme="green"
          style={{
            position: 'fixed',
            right: '2rem',
            bottom: '2rem',
            borderRadius: '999px',
            boxShadow: '0 0 20px rgba(255, 215, 0, 0.8)',
          }}
          onClick={clickGoldenCookie}
        >
          Golden Cookie!
        </Button>
      )}
    </Box>
  );
};
