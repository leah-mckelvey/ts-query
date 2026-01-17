import { useEffect, useRef, useState } from 'react';
import { Box, Stack, Text } from '@ts-query/ui-react';
import { getGlobalEvents, type GlobalEvent } from './api';

const eventIcons: Record<string, string> = {
  double_cps: '⚡',
  double_click: '👆',
  bonus_golden: '✨',
};

const eventColors: Record<string, string> = {
  double_cps: '#48bb78',
  double_click: '#4299e1',
  bonus_golden: '#ecc94b',
};

interface GlobalEventsProps {
  onEventsChange?: (events: GlobalEvent[]) => void;
}

export const GlobalEvents = ({ onEventsChange }: GlobalEventsProps) => {
  const [events, setEvents] = useState<GlobalEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Use ref to store the latest callback to avoid re-creating the interval
  // when the callback reference changes (prevents memory leaks from overlapping intervals)
  const onEventsChangeRef = useRef(onEventsChange);
  useEffect(() => {
    onEventsChangeRef.current = onEventsChange;
  }, [onEventsChange]);

  useEffect(() => {
    let cancelled = false;

    const fetchEvents = async () => {
      try {
        const { events: newEvents } = await getGlobalEvents();
        if (!cancelled) {
          // Filter to only active events
          const now = Date.now();
          const active = newEvents.filter(
            (e) => e.startsAt <= now && e.endsAt > now,
          );
          setEvents(active);
          setError(null);
          // Use ref to call the latest callback without triggering re-renders
          onEventsChangeRef.current?.(active);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load events',
          );
        }
      }
    };

    fetchEvents();

    // Refresh every 30 seconds
    const interval = setInterval(fetchEvents, 30_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []); // Empty deps - interval is stable, callback accessed via ref

  if (error || events.length === 0) {
    return null; // Don't show anything if no events or error
  }

  return (
    <Box p={3} bg="#2d3748" rounded={8} style={{ marginBottom: '1rem' }}>
      <Text
        fontSize="0.75rem"
        color="#a0aec0"
        style={{ marginBottom: '0.5rem' }}
      >
        ACTIVE EVENTS
      </Text>
      <Stack direction="column" gap={2}>
        {events.map((event) => {
          const remaining = Math.max(0, event.endsAt - Date.now());
          const minutes = Math.floor(remaining / 60_000);
          const seconds = Math.floor((remaining % 60_000) / 1000);

          return (
            <Box
              key={event.id}
              p={2}
              rounded={4}
              style={{
                backgroundColor: `${eventColors[event.type] || '#4a5568'}22`,
                borderLeft: `3px solid ${eventColors[event.type] || '#4a5568'}`,
              }}
            >
              <Stack direction="row" gap={2} style={{ alignItems: 'center' }}>
                <Text fontSize="1.5rem">{eventIcons[event.type] || '🎉'}</Text>
                <Box style={{ flex: 1 }}>
                  <Text fontWeight={600} fontSize="0.9rem">
                    {event.name}
                  </Text>
                  <Text fontSize="0.8rem" color="#cbd5e0">
                    {event.description}
                  </Text>
                </Box>
                <Text fontSize="0.75rem" color="#a0aec0">
                  {minutes}:{seconds.toString().padStart(2, '0')}
                </Text>
              </Stack>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
};
