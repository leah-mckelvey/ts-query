import m from 'mithril';
import { Box, Stack, Text, Button } from '@ts-query/ui-mithril';
import { getQueryClient } from '@ts-query/mithril';
import type { QueryState } from '@ts-query/core';
import type { Comment, Ticket } from '../domain';

export interface CommentsPanelAttrs {
  ticket: Ticket;
  commentsState: QueryState<Comment[], Error>;
}

export const CommentsPanel: m.Component<CommentsPanelAttrs> = {
  view: ({ attrs }) => {
    const { commentsState, ticket } = attrs;
    const client = getQueryClient();

    return m(Stack, { gap: 2 }, [
      m(
        Text,
        {
          as: 'h4',
          fontSize: '0.9rem',
          fontWeight: 600,
          style: { textTransform: 'uppercase', letterSpacing: '0.08em' },
        },
        'Conversation',
      ),
      commentsState.isLoading && !commentsState.data
        ? m(
            Text,
            { fontSize: '0.9rem', style: { color: '#9ca3af' } },
            'Loading comments…',
          )
        : null,
      commentsState.isError
        ? m(Box, { mt: 1 }, [
            m(
              Text,
              { fontSize: '0.85rem', style: { color: '#f97373' } },
              `Could not load comments: ${
                commentsState.error?.message ?? 'Unknown error'
              }`,
            ),
            m(Box, { mt: 1.5 }, [
              m(
                Button,
                {
                  size: 'sm',
                  variant: 'outline',
                  colorScheme: 'gray',
                  onclick: () => client.invalidateQueries('ticketComments'),
                },
                'Retry',
              ),
            ]),
          ])
        : null,
      !commentsState.isLoading && !commentsState.isError
        ? m(
            Box,
            { mt: 1, style: { maxHeight: '12rem', overflowY: 'auto' } },
            (commentsState.data ?? []).length === 0
              ? m(
                  Text,
                  { fontSize: '0.9rem', style: { color: '#9ca3af' } },
                  `No conversation yet on ${ticket.id}.`,
                )
              : (commentsState.data ?? []).map((comment) =>
                  m(
                    Box,
                    {
                      key: comment.id,
                      p: 2,
                      rounded: 10,
                      style: {
                        border: '1px solid rgba(55, 65, 81, 0.9)',
                        backgroundColor: comment.isSystem
                          ? 'rgba(55, 65, 81, 0.9)'
                          : 'rgba(15, 23, 42, 0.98)',
                        marginBottom: '0.5rem',
                      },
                    },
                    [
                      m(
                        Text,
                        {
                          as: 'span',
                          fontSize: '0.75rem',
                          style: { color: '#9ca3af' },
                        },
                        new Date(comment.createdAt).toLocaleString(),
                      ),
                      m(
                        Text,
                        {
                          fontSize: '0.9rem',
                          style: {
                            marginTop: '0.25rem',
                            color: comment.isSystem ? '#e5e7eb' : '#d1d5db',
                            fontStyle: comment.isSystem ? 'italic' : 'normal',
                          },
                        },
                        comment.body,
                      ),
                    ],
                  ),
                ),
          )
        : null,
    ]);
  },
};
