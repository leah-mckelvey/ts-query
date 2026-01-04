import m from 'mithril';
import { Box, Text } from '@ts-query/ui-mithril';
import type { Ticket } from '../domain';

export interface PriorityPillAttrs {
  priority: Ticket['priority'];
}

export const PriorityPill: m.Component<PriorityPillAttrs> = {
  view: ({ attrs }) => {
    let bg = 'rgba(55, 65, 81, 0.6)';
    let border = 'rgba(75, 85, 99, 1)';
    let label: string;

    if (attrs.priority === 'high') {
      bg = 'rgba(245, 158, 11, 0.18)';
      border = 'rgba(245, 158, 11, 0.7)';
    } else if (attrs.priority === 'urgent') {
      bg = 'rgba(248, 113, 113, 0.18)';
      border = 'rgba(248, 113, 113, 0.7)';
    }

    if (attrs.priority === 'low') {
      label = 'Low';
    } else if (attrs.priority === 'medium') {
      label = 'Medium';
    } else if (attrs.priority === 'high') {
      label = 'High';
    } else {
      label = 'Urgent';
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
