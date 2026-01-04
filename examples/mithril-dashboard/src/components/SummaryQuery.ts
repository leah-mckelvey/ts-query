import { createQueryComponent } from '@ts-query/mithril';
import type { SummaryStats } from '../domain';
import { fetchSummary } from '../api';

export const SummaryQuery = createQueryComponent<SummaryStats>({
  queryKey: 'summary',
  queryFn: () => fetchSummary(),
});
