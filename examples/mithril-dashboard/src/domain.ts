export type TicketStatus =
  | 'new'
  | 'open'
  | 'in_progress'
  | 'blocked'
  | 'closed';

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export type UserRole = 'agent' | 'admin' | 'requester';

export interface User {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  avatarInitials: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  assigneeId: string | null;
  requesterId: string;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  tags: string[];
}

export interface Comment {
  id: string;
  ticketId: string;
  authorId: string;
  body: string;
  createdAt: string; // ISO timestamp
  isSystem: boolean;
}

export interface SummaryStats {
  totalTickets: number;
  byStatus: Record<TicketStatus, number>;
  byPriority: Record<TicketPriority, number>;
}

export const users: User[] = [
  {
    id: 'u1',
    name: 'Alex Agent',
    email: 'alex@example.com',
    role: 'agent',
    avatarInitials: 'AA',
  },
  {
    id: 'u2',
    name: 'Riley Requester',
    email: 'riley@example.com',
    role: 'requester',
    avatarInitials: 'RR',
  },
  {
    id: 'u3',
    name: 'Casey Coordinator',
    email: 'casey@example.com',
    role: 'admin',
    avatarInitials: 'CC',
  },
];

export const tickets: Ticket[] = [
  {
    id: 'TCK-1001',
    title: 'Login button not responding',
    description:
      'Users report that the login button on the internal dashboard occasionally does nothing.',
    status: 'open',
    priority: 'high',
    assigneeId: 'u1',
    requesterId: 'u2',
    createdAt: '2025-01-10T09:30:00Z',
    updatedAt: '2025-01-10T10:15:00Z',
    tags: ['auth', 'frontend'],
  },
  {
    id: 'TCK-1002',
    title: 'Data export timing out',
    description:
      'Exporting more than 10k rows from the reporting screen often times out after 30 seconds.',
    status: 'in_progress',
    priority: 'urgent',
    assigneeId: 'u1',
    requesterId: 'u3',
    createdAt: '2025-01-09T15:00:00Z',
    updatedAt: '2025-01-10T08:45:00Z',
    tags: ['reports', 'performance'],
  },
  {
    id: 'TCK-1003',
    title: 'Incorrect SLA badge color',
    description:
      'Some tickets are marked as "At risk" even though they are well within SLA.',
    status: 'blocked',
    priority: 'medium',
    assigneeId: null,
    requesterId: 'u2',
    createdAt: '2025-01-08T11:20:00Z',
    updatedAt: '2025-01-08T11:45:00Z',
    tags: ['sla', 'ui'],
  },
  {
    id: 'TCK-1004',
    title: 'Webhook retries not visible',
    description:
      'Ops cannot see whether webhooks have been retried after a failure.',
    status: 'closed',
    priority: 'low',
    assigneeId: 'u3',
    requesterId: 'u2',
    createdAt: '2025-01-05T13:00:00Z',
    updatedAt: '2025-01-07T16:30:00Z',
    tags: ['webhooks', 'observability'],
  },
];

export const comments: Comment[] = [
  {
    id: 'C-1',
    ticketId: 'TCK-1001',
    authorId: 'u2',
    body: 'Saw this twice today on Chrome 122, refreshing the page usually fixes it.',
    createdAt: '2025-01-10T09:35:00Z',
    isSystem: false,
  },
  {
    id: 'C-2',
    ticketId: 'TCK-1001',
    authorId: 'u1',
    body: 'Reproduced in dev, looks like a race with feature flag evaluation.',
    createdAt: '2025-01-10T10:05:00Z',
    isSystem: false,
  },
  {
    id: 'C-3',
    ticketId: 'TCK-1002',
    authorId: 'u1',
    body: 'Investigating slow query plan for large exports.',
    createdAt: '2025-01-09T16:10:00Z',
    isSystem: false,
  },
  {
    id: 'C-4',
    ticketId: 'TCK-1004',
    authorId: 'u3',
    body: 'Deployed new webhook retry monitor, marking ticket as closed.',
    createdAt: '2025-01-07T16:25:00Z',
    isSystem: false,
  },
  {
    id: 'C-5',
    ticketId: 'TCK-1004',
    authorId: 'u3',
    body: 'Status changed from "in_progress" to "closed".',
    createdAt: '2025-01-07T16:30:00Z',
    isSystem: true,
  },
];

export function computeSummary(ticketsInput: readonly Ticket[]): SummaryStats {
  const byStatus: Record<TicketStatus, number> = {
    new: 0,
    open: 0,
    in_progress: 0,
    blocked: 0,
    closed: 0,
  };

  const byPriority: Record<TicketPriority, number> = {
    low: 0,
    medium: 0,
    high: 0,
    urgent: 0,
  };

  for (const ticket of ticketsInput) {
    byStatus[ticket.status] += 1;
    byPriority[ticket.priority] += 1;
  }

  return {
    totalTickets: ticketsInput.length,
    byStatus,
    byPriority,
  };
}

export const initialSummary: SummaryStats = computeSummary(tickets);
