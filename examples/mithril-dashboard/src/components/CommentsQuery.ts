import { createQueryComponent } from '@ts-query/mithril';
import type { Comment } from '../domain';
import { dashboardStore } from '../uiState';
import { fetchComments } from '../api';

export const CommentsQuery = createQueryComponent<Comment[]>({
  queryKey: 'ticketComments',
  queryFn: () => {
    const { selectedTicketId } = dashboardStore.getState();

    if (!selectedTicketId) {
      return Promise.resolve([]);
    }

    return fetchComments(selectedTicketId);
  },
});
