import { createStoreComponent } from '@ts-query/mithril';
import { dashboardStore } from '../uiState';

export const DashboardStateView = createStoreComponent(dashboardStore);
