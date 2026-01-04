import m from 'mithril';
import { Box } from '@ts-query/ui-mithril';
import type { DashboardState } from '../uiState';
import { DashboardStateView } from './DashboardStateView';
import { DashboardContent } from './DashboardContent';

export const DashboardApp: m.Component = {
  view: () =>
    m(
      Box,
      { bg: '#020617', color: '#e5e7eb', minHeight: '100vh', py: 6, px: 6 },
      [
        m(Box, { mx: 'auto', style: { maxWidth: '1200px' } }, [
          m(DashboardStateView, {
            children: (ui: DashboardState) => m(DashboardContent, { ui }),
          }),
        ]),
      ],
    ),
};

export default DashboardApp;
