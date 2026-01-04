import { http, HttpResponse, type JsonBodyType } from 'msw';
import {
  comments,
  computeSummary,
  tickets,
  type Comment,
  type Ticket,
  type TicketStatus,
} from '../domain';

const MIN_DELAY_MS = 200;
const MAX_DELAY_MS = 900;
const RANDOM_ERROR_RATE = 0.2;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const randomDelay = () =>
  MIN_DELAY_MS + Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS));

async function respond(
  build: () => JsonBodyType,
  endpointLabel: string,
  status = 200,
  { enableRandomErrors = true }: { enableRandomErrors?: boolean } = {},
) {
  await sleep(randomDelay());

  if (enableRandomErrors && Math.random() < RANDOM_ERROR_RATE) {
    return HttpResponse.json(
      {
        message: `Random failure in ${endpointLabel} (demo error)`,
      },
      { status: 500 },
    );
  }

  return HttpResponse.json(build(), { status });
}

export const handlers = [
  http.get('/api/tickets', ({ request }) => {
    const url = new URL(request.url);
    const statusParam = url.searchParams.get('status') as TicketStatus | null;
    const q = url.searchParams.get('q')?.toLowerCase() ?? '';

    let result = tickets.slice();

    if (statusParam) {
      result = result.filter((ticket) => ticket.status === statusParam);
    }

    if (q) {
      result = result.filter((ticket) => {
        const haystack =
          `${ticket.title} ${ticket.description} ${ticket.tags.join(
            ' ',
          )}`.toLowerCase();

        return haystack.includes(q);
      });
    }

    result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return respond(() => result, 'GET /api/tickets');
  }),

  http.get('/api/tickets/:id', ({ params }) => {
    const id = params.id as string;
    const ticket = tickets.find((t) => t.id === id);

    if (!ticket) {
      return respond(
        () => ({ message: 'Ticket not found' }),
        'GET /api/tickets/:id',
        404,
        { enableRandomErrors: false },
      );
    }

    return respond(() => ticket, 'GET /api/tickets/:id');
  }),

  http.get('/api/tickets/:id/comments', ({ params }) => {
    const id = params.id as string;

    const ticketComments = comments
      .filter((comment) => comment.ticketId === id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    return respond(() => ticketComments, 'GET /api/tickets/:id/comments');
  }),

  http.get('/api/summary', () => {
    return respond(() => computeSummary(tickets), 'GET /api/summary');
  }),

  http.patch('/api/tickets/:id', async ({ params, request }) => {
    const id = params.id as string;
    const body = (await request.json()) as Partial<Ticket>;
    const index = tickets.findIndex((ticket) => ticket.id === id);

    if (index === -1) {
      return respond(
        () => ({ message: 'Ticket not found' }),
        'PATCH /api/tickets/:id',
        404,
        { enableRandomErrors: false },
      );
    }

    const existing = tickets[index];
    const updated: Ticket = {
      ...existing,
      ...body,
      updatedAt: new Date().toISOString(),
    };

    tickets[index] = updated;

    return respond(() => updated, 'PATCH /api/tickets/:id');
  }),

  http.post('/api/tickets/:id/comments', async ({ params, request }) => {
    const id = params.id as string;

    if (!tickets.some((ticket) => ticket.id === id)) {
      return respond(
        () => ({ message: 'Ticket not found' }),
        'POST /api/tickets/:id/comments',
        404,
        { enableRandomErrors: false },
      );
    }

    const body = (await request.json()) as { authorId: string; body: string };
    const now = new Date().toISOString();

    const numericIds = comments
      .map((comment) => comment.id.replace('C-', ''))
      .map((idPart) => Number.parseInt(idPart, 10))
      .filter((n) => !Number.isNaN(n));

    const nextId = Math.max(0, ...numericIds) + 1;

    const newComment: Comment = {
      id: `C-${nextId}`,
      ticketId: id,
      authorId: body.authorId,
      body: body.body,
      createdAt: now,
      isSystem: false,
    };

    comments.push(newComment);

    return respond(() => newComment, 'POST /api/tickets/:id/comments', 201);
  }),
];
