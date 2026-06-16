// Mock API with controllable delays and request tracking

export interface User {
  __typename: 'User';
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface Team {
  __typename: 'Team';
  id: number;
  name: string;
  members: User[];
}

export interface Post {
  __typename: 'Post';
  id: number;
  title: string;
  author: User;
}

// In-memory database
let users: User[] = [
  {
    __typename: 'User',
    id: 1,
    name: 'Alice Smith',
    email: 'alice@example.com',
    role: 'Engineer',
  },
  {
    __typename: 'User',
    id: 2,
    name: 'Bob Jones',
    email: 'bob@example.com',
    role: 'Designer',
  },
  {
    __typename: 'User',
    id: 3,
    name: 'Charlie Brown',
    email: 'charlie@example.com',
    role: 'Manager',
  },
];

const teams: Team[] = [
  {
    __typename: 'Team',
    id: 1,
    name: 'Product Team',
    members: [users[0], users[1]],
  },
  {
    __typename: 'Team',
    id: 2,
    name: 'Engineering Team',
    members: [users[0], users[2]],
  },
];

const posts: Post[] = [
  { __typename: 'Post', id: 1, title: 'Hello World', author: users[0] },
  { __typename: 'Post', id: 2, title: 'GraphQL Rocks', author: users[0] },
  { __typename: 'Post', id: 3, title: 'Design Systems', author: users[1] },
];

// Request tracking
export interface RequestLog {
  timestamp: number;
  endpoint: string;
  duration: number;
}

const requestLogs: RequestLog[] = [];

export function getRequestLogs(): RequestLog[] {
  return [...requestLogs];
}

export function clearRequestLogs(): void {
  requestLogs.length = 0;
}

// Configurable network delay
let networkDelay = 500; // ms

export function setNetworkDelay(ms: number): void {
  networkDelay = ms;
}

export function getNetworkDelay(): number {
  return networkDelay;
}

// Helper to simulate network delay
function delay(ms: number = networkDelay): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// API Endpoints
export async function fetchUser(id: number): Promise<User> {
  const start = Date.now();
  await delay();
  const user = users.find((u) => u.id === id);
  if (!user) throw new Error(`User ${id} not found`);

  requestLogs.push({
    timestamp: start,
    endpoint: `GET /users/${id}`,
    duration: Date.now() - start,
  });

  return { ...user };
}

export async function fetchUsers(): Promise<User[]> {
  const start = Date.now();
  await delay();

  requestLogs.push({
    timestamp: start,
    endpoint: 'GET /users',
    duration: Date.now() - start,
  });

  return users.map((u) => ({ ...u }));
}

export async function fetchTeam(id: number): Promise<Team> {
  const start = Date.now();
  await delay();
  const team = teams.find((t) => t.id === id);
  if (!team) throw new Error(`Team ${id} not found`);

  requestLogs.push({
    timestamp: start,
    endpoint: `GET /teams/${id}`,
    duration: Date.now() - start,
  });

  return {
    ...team,
    members: team.members.map((m) => ({ ...m })),
  };
}

export async function fetchPosts(): Promise<Post[]> {
  const start = Date.now();
  await delay();

  requestLogs.push({
    timestamp: start,
    endpoint: 'GET /posts',
    duration: Date.now() - start,
  });

  return posts.map((p) => ({
    ...p,
    author: { ...p.author },
  }));
}

export async function updateUser(
  id: number,
  updates: Partial<Omit<User, '__typename' | 'id'>>,
): Promise<User> {
  const start = Date.now();
  await delay();

  const user = users.find((u) => u.id === id);
  if (!user) throw new Error(`User ${id} not found`);

  Object.assign(user, updates);

  requestLogs.push({
    timestamp: start,
    endpoint: `PATCH /users/${id}`,
    duration: Date.now() - start,
  });

  return { ...user };
}

// Simulate network failure
let shouldFail = false;

export function setShouldFail(fail: boolean): void {
  shouldFail = fail;
}

export async function maybeThrow(): Promise<void> {
  if (shouldFail) {
    throw new Error('Network error (simulated)');
  }
}
