import m from 'mithril';
import { Box, Stack, Text, Button } from '@ts-query/ui-mithril';
import { dashboardActions, type DashboardState } from '../uiState';

const STATUS_FILTERS: { id: DashboardState['statusFilter']; label: string }[] =
  [
    { id: 'all', label: 'All' },
    { id: 'new', label: 'New' },
    { id: 'open', label: 'Open' },
    { id: 'in_progress', label: 'In progress' },
    { id: 'blocked', label: 'Blocked' },
    { id: 'closed', label: 'Closed' },
  ];

export interface FiltersPanelAttrs {
  ui: DashboardState;
}

export const FiltersPanel: m.Component<FiltersPanelAttrs> = {
  view: ({ attrs }) =>
    m(
      Box,
      {
        p: 3,
        rounded: 12,
        bg: '#020617',
        style: { border: '1px solid rgba(55, 65, 81, 0.9)' },
      },
      [
        m(
          Text,
          {
            fontSize: '0.9rem',
            style: { color: '#d1d5db', marginBottom: '0.5rem' },
          },
          'Filters',
        ),
        m(
          Stack,
          { direction: 'row', gap: 2, style: { flexWrap: 'wrap' } },
          STATUS_FILTERS.map((filter) => {
            const isActive = attrs.ui.statusFilter === filter.id;

            return m(
              Button,
              {
                key: filter.id,
                size: 'sm',
                variant: isActive ? 'solid' : 'ghost',
                colorScheme: isActive ? 'blue' : 'gray',
                onclick: () => dashboardActions.setStatusFilter(filter.id),
              },
              filter.label,
            );
          }),
        ),
        m(Box, { mt: 3 }, [
          m('input', {
            type: 'text',
            placeholder: 'Search by text or tag…',
            value: attrs.ui.search,
            oninput: (event: Event) => {
              const target = event.target as HTMLInputElement;
              dashboardActions.setSearch(target.value);
            },
            style: {
              width: '100%',
              padding: '0.5rem 0.75rem',
              borderRadius: '0.5rem',
              border: '1px solid rgba(55, 65, 81, 1)',
              backgroundColor: '#020617',
              color: '#e5e7eb',
              fontSize: '0.9rem',
            },
          }),
        ]),
      ],
    ),
};
