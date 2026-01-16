import { useEffect, useState } from 'react';
import { Box, Heading, Stack, Text } from '@ts-query/ui-react';
import { getLeaderboard, type LeaderboardEntry } from './api';

const formatNumber = (value: number): string => {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return value.toFixed(0);
};

interface LeaderboardProps {
  playerId?: string;
}

export const Leaderboard = ({ playerId }: LeaderboardProps) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [playerRank, setPlayerRank] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchLeaderboard = async () => {
      try {
        const { leaderboard } = await getLeaderboard(playerId);
        if (!cancelled) {
          setEntries(leaderboard.entries);
          setPlayerRank(leaderboard.playerRank);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load leaderboard',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchLeaderboard();

    // Refresh every 15 seconds
    const interval = setInterval(fetchLeaderboard, 15_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [playerId]);

  if (loading) {
    return (
      <Box p={3} bg="#2d3748" rounded={8}>
        <Text color="#a0aec0">Loading leaderboard...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3} bg="#2d3748" rounded={8}>
        <Text color="#fc8181">{error}</Text>
        <Text fontSize="0.8rem" color="#a0aec0" style={{ marginTop: '0.5rem' }}>
          Make sure the game server is running on localhost:3001
        </Text>
      </Box>
    );
  }

  return (
    <Box p={4} bg="#2d3748" rounded={8} style={{ minWidth: '280px' }}>
      <Heading level={3}>🏆 Leaderboard</Heading>

      <Stack direction="column" gap={2} style={{ marginTop: '1rem' }}>
        {entries.slice(0, 10).map((entry) => (
          <Box
            key={entry.playerId}
            p={2}
            bg={entry.rank <= 3 ? '#4a5568' : 'transparent'}
            rounded={4}
            style={{
              borderLeft:
                entry.playerId === playerId ? '3px solid #48bb78' : 'none',
            }}
          >
            <Stack direction="row" gap={2} style={{ alignItems: 'center' }}>
              <Text
                fontWeight={700}
                style={{ width: '2rem', textAlign: 'center' }}
              >
                {entry.rank <= 3
                  ? ['🥇', '🥈', '🥉'][entry.rank - 1]
                  : `#${entry.rank}`}
              </Text>
              <Box style={{ flex: 1 }}>
                <Text fontWeight={entry.playerId === playerId ? 700 : 400}>
                  {entry.displayName}
                </Text>
              </Box>
              <Text fontSize="0.85rem" color="#cbd5e0">
                {formatNumber(entry.totalCookies)}
              </Text>
            </Stack>
          </Box>
        ))}
      </Stack>

      {playerRank && playerRank > 10 && (
        <Box mt={3} p={2} bg="#4a5568" rounded={4}>
          <Text fontSize="0.85rem" color="#a0aec0">
            Your rank: <strong>#{playerRank}</strong>
          </Text>
        </Box>
      )}

      <Text
        fontSize="0.75rem"
        color="#718096"
        style={{ marginTop: '0.75rem', textAlign: 'center' }}
      >
        Updates every 15 seconds
      </Text>
    </Box>
  );
};
