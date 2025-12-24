import React, { useEffect, useState } from 'react';
import { Box, Button, Heading, Stack, Text } from '@ts-query/ui-react';

export default {
  title: 'Screens/IncrementalGame',
};

type Building = {
  id: string;
  name: string;
  baseCost: number;
  count: number;
  cps: number; // cookies per second per building
};

const formatNumber = (value: number): string => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return value.toFixed(0);
};

export const GameScreen = () => {
  const [cookies, setCookies] = useState(0);
  const [cookiesPerClick, setCookiesPerClick] = useState(1);
  const [buildings, setBuildings] = useState<Building[]>([
    { id: 'cursor', name: 'Cursor', baseCost: 15, count: 0, cps: 0.1 },
    { id: 'grandma', name: 'Grandma', baseCost: 100, count: 0, cps: 1 },
    { id: 'farm', name: 'Farm', baseCost: 1100, count: 0, cps: 8 },
  ]);

  const totalCps = buildings.reduce((sum, b) => sum + b.cps * b.count, 0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCookies((c) => c + totalCps / 10);
    }, 100);
    return () => clearInterval(interval);
  }, [totalCps]);

  const handleClick = () => {
    setCookies((c) => c + cookiesPerClick);
  };

  const buyBuilding = (building: Building) => {
    const costMultiplier = 1.15;
    const currentCost = building.baseCost * costMultiplier ** building.count;
    if (cookies < currentCost) return;

    setCookies((c) => c - currentCost);
    setBuildings((prev) =>
      prev.map((b) =>
        b.id === building.id ? { ...b, count: b.count + 1 } : b,
      ),
    );
  };

  return (
    <Box
      as="main"
      p={6}
      bg="#1a202c"
      color="#edf2f7"
      style={{ minHeight: '100vh' }}
    >
      <Stack direction="row" gap={6} style={{ alignItems: 'flex-start' }}>
        <Box flex={1 as any}>
          <Heading level={1}>Cookie Clicker Clone</Heading>
          <Text fontSize="0.9rem" color="#a0aec0">
            Built with @ts-query/ui-react primitives
          </Text>

          <Box mt={4} mb={4}>
            <Heading level={2}>Cookies: {formatNumber(cookies)}</Heading>
            <Text color="#a0aec0">{totalCps.toFixed(1)} cookies / second</Text>
          </Box>

          <Button
            size="lg"
            colorScheme="green"
            style={{ minWidth: '240px', fontSize: '1.25rem' }}
            onClick={handleClick}
          >
            Click for {cookiesPerClick} cookie
          </Button>
        </Box>

        <Box
          width="320px"
          p={4}
          bg="#2d3748"
          rounded={8}
          style={{ boxShadow: '0 4px 10px rgba(0,0,0,0.4)' }}
        >
          <Heading level={3}>Buildings</Heading>

          <Stack direction="column" gap={3} style={{ marginTop: '1rem' }}>
            {buildings.map((b) => {
              const costMultiplier = 1.15;
              const cost = b.baseCost * costMultiplier ** b.count;
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
                    <Box flex={1 as any}>
                      <Text fontWeight={600}>{b.name}</Text>
                      <Text fontSize="0.85rem" color="#cbd5e0">
                        Cost: {formatNumber(cost)} | Owned: {b.count}
                      </Text>
                    </Box>
                    <Button
                      size="sm"
                      variant="outline"
                      colorScheme="blue"
                      style={{ whiteSpace: 'nowrap' }}
                      disabled={!affordable}
                      onClick={() => buyBuilding(b)}
                    >
                      Buy
                    </Button>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
};
