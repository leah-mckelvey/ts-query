import type { Comment, SummaryStats, Ticket, TicketStatus } from './domain';

const API_BASE_URL = '/api';

interface TicketListParams {
  status?: TicketStatus | 'all';
  q?: string;
}

async function requestJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const text = await response.text();
  let data: unknown;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const message =
      typeof data === 'object' &&
      data !== null &&
      'message' in data &&
      typeof (data as { message?: unknown }).message === 'string'
        ? (data as { message: string }).message
        : `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return data as T;
}

export async function fetchTickets(
  params: TicketListParams,
): Promise<Ticket[]> {
  const url = new URL(`${API_BASE_URL}/tickets`, window.location.origin);

  if (params.status && params.status !== 'all') {
    url.searchParams.set('status', params.status);
  }

  if (params.q && params.q.trim()) {
    url.searchParams.set('q', params.q.trim());
  }

  return requestJson<Ticket[]>(url.toString());
}

export function fetchSummary(): Promise<SummaryStats> {
  return requestJson<SummaryStats>(`${API_BASE_URL}/summary`);
}

export function fetchComments(ticketId: string): Promise<Comment[]> {
  return requestJson<Comment[]>(
    `${API_BASE_URL}/tickets/${encodeURIComponent(ticketId)}/comments`,
  );
}

export function updateTicket(
  id: string,
  partial: Partial<Pick<Ticket, 'status' | 'priority'>>,
): Promise<Ticket> {
  return requestJson<Ticket>(
    `${API_BASE_URL}/tickets/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(partial),
    },
  );
}

export function createComment(
  ticketId: string,
  body: { authorId: string; body: string },
): Promise<Comment> {
  return requestJson<Comment>(
    `${API_BASE_URL}/tickets/${encodeURIComponent(ticketId)}/comments`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );
}
