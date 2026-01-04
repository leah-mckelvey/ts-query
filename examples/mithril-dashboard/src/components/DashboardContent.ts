import m from 'mithril';
import { Stack } from '@ts-query/ui-mithril';
import type { DashboardState } from '../uiState';
import { HeaderSection } from './HeaderSection';
import { MainSection } from './MainSection';

export interface DashboardContentAttrs {
  ui: DashboardState;
}

export const DashboardContent: m.Component<DashboardContentAttrs> = {
  view: ({ attrs }) =>
    m(Stack, { gap: 4 }, [m(HeaderSection), m(MainSection, { ui: attrs.ui })]),
};
