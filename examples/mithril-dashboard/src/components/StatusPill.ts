import m from 'mithril';
import { Box, Text } from '@ts-query/ui-mithril';
import type { TicketStatus } from '../domain';

const STATUS_LABELS: Record<TicketStatus, string> = {
  new: 'New',
  open: 'Open',
  in_progress: 'In progress',
  blocked: 'Blocked',
  closed: 'Closed',
};

export interface StatusPillAttrs {
  status: TicketStatus;
}

export const StatusPill: m.Component<StatusPillAttrs> = {
  view: ({ attrs }) => {
    const label = STATUS_LABELS[attrs.status];

    let bg = 'rgba(59, 130, 246, 0.15)';
    let border = 'rgba(59, 130, 246, 0.6)';

    if (attrs.status === 'blocked') {
      bg = 'rgba(248, 113, 113, 0.15)';
      border = 'rgba(248, 113, 113, 0.6)';
    } else if (attrs.status === 'closed') {
      bg = 'rgba(52, 211, 153, 0.15)';
      border = 'rgba(52, 211, 153, 0.6)';
    }

    return m(
      Box,
      {
        p: 1.5,
        rounded: 999,
        style: {
          border: `1px solid ${border}`,
          backgroundColor: bg,
        },
      },
      m(
        Text,
        {
          as: 'span',
          fontSize: '0.75rem',
          style: { textTransform: 'uppercase', letterSpacing: '0.08em' },
        },
        label,
      ),
    );
  },
};
