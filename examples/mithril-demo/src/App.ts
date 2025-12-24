import m from 'mithril';
import {
  createQueryComponent,
  createMutationComponent,
  createStoreComponent,
} from '@ts-query/mithril';
import type { QueryState } from '@ts-query/core';
import { createStore } from '@ts-query/core';

// Mock API functions
const fetchUser = async (
  userId: number,
): Promise<{ id: number; name: string; email: string }> => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  if (userId === 999) {
    throw new Error('User not found');
  }
  return {
    id: userId,
    name: `User ${userId}`,
    email: `user${userId}@example.com`,
  };
};

const createPost = async (data: {
  title: string;
  body: string;
}): Promise<{ id: number; title: string; body: string }> => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return {
    id: Math.floor(Math.random() * 1000),
    ...data,
  };
};

// Component state (module-level for simplicity in demo)
let userId = 1;
let postTitle = '';
let postBody = '';

// Create query component (proper Mithril pattern with lifecycle)
const UserQueryComponent = createQueryComponent({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
  retry: 0, // Disable retries for demo to show errors immediately
});

// Create mutation component (proper Mithril pattern with lifecycle)
const CreatePostMutationComponent = createMutationComponent({
  mutationFn: createPost,
  onSuccess: (data) => {
    console.log('Post created:', data);
    postTitle = '';
    postBody = '';
  },
});

// Simple global store for manual testing
interface CounterState {
  count: number;
  increment: () => void;
  reset: () => void;
}

const counterStore = createStore<CounterState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  reset: () => set({ count: 0 }),
}));

const CounterStoreComponent = createStoreComponent(counterStore);

const App: m.Component = {
  view: () => {
    return m('div.app', [
      m('h1', 'ts-query Mithril Demo'),

      // Query Demo - using component-based API
      m('div.section', [
        m('h2', 'Query Demo (createQueryComponent)'),
        m('div', [
          m('label', [
            'User ID: ',
            m('input[type=number]', {
              value: userId,
              oninput: (e: Event) => {
                userId = Number((e.target as HTMLInputElement).value);
                // Need to recreate component with new userId
                // In a real app, you'd handle this more elegantly
                m.redraw();
              },
              min: 1,
            }),
          ]),
          m(
            'button',
            {
              onclick: () => {
                userId = 999;
              },
            },
            'Test Error (ID 999)',
          ),
        ]),

        // Render query component with children function
        m(UserQueryComponent, {
          children: (
            userQuery: QueryState<{ id: number; name: string; email: string }>,
          ) => [
            userQuery.isLoading && m('div.loading', 'Loading user...'),

            userQuery.isError &&
              m('div.error', [
                'Error: ',
                userQuery.error?.message || 'Failed to fetch user',
              ]),

            userQuery.isSuccess &&
              userQuery.data &&
              m('div.success', [
                m('h3', 'User Data:'),
                m('p', [m('strong', 'ID: '), userQuery.data.id]),
                m('p', [m('strong', 'Name: '), userQuery.data.name]),
                m('p', [m('strong', 'Email: '), userQuery.data.email]),
              ]),
          ],
        }),
      ]),

      // Mutation Demo - using component-based API
      m('div.section', [
        m('h2', 'Mutation Demo (createMutationComponent)'),

        // Render mutation component with children function
        m(CreatePostMutationComponent, {
          children: (createPostMutation) => [
            m('div', [
              m('input[type=text]', {
                placeholder: 'Post title',
                value: postTitle,
                oninput: (e: Event) => {
                  postTitle = (e.target as HTMLInputElement).value;
                },
              }),
              m('textarea', {
                placeholder: 'Post body',
                value: postBody,
                oninput: (e: Event) => {
                  postBody = (e.target as HTMLTextAreaElement).value;
                },
              }),
              m(
                'button',
                {
                  onclick: async () => {
                    if (postTitle && postBody) {
                      await createPostMutation.mutate({
                        title: postTitle,
                        body: postBody,
                      });
                    }
                  },
                  disabled:
                    createPostMutation.state.isLoading ||
                    !postTitle ||
                    !postBody,
                },
                createPostMutation.state.isLoading
                  ? 'Creating...'
                  : 'Create Post',
              ),
            ]),

            createPostMutation.state.isError &&
              m('div.error', [
                'Error: ',
                createPostMutation.state.error?.message ||
                  'Failed to create post',
              ]),

            createPostMutation.state.isSuccess &&
              createPostMutation.state.data &&
              m('div.success', [
                m('h3', 'Post Created:'),
                m('p', [m('strong', 'ID: '), createPostMutation.state.data.id]),
                m('p', [
                  m('strong', 'Title: '),
                  createPostMutation.state.data.title,
                ]),
                m('p', [
                  m('strong', 'Body: '),
                  createPostMutation.state.data.body,
                ]),
              ]),
          ],
        }),
      ]),

      // Store Demo - using store + createStoreComponent
      m('div.section', [
        m('h2', 'Store Demo (createStoreComponent)'),
        m(CounterStoreComponent, {
          children: (state: CounterState) => [
            m('div', [
              m('p', [m('strong', 'Count: '), state.count]),
              m('button', { onclick: state.increment }, 'Increment'),
              m('button', { onclick: state.reset }, 'Reset'),
            ]),
          ],
        }),
      ]),
    ]);
  },
};

export default App;
