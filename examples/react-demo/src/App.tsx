import { useState } from 'react';
import { createStore } from '@ts-query/core';
import { useQuery, useMutation, useStore } from '@ts-query/react';
import './App.css';
import { IncrementalGame } from './IncrementalGame';

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

function StoreDemo() {
  const { count, increment, reset } = useStore(counterStore);

  return (
    <div className="section">
      <h2>Store Demo (useStore)</h2>
      <div>
        <p>
          <strong>Count:</strong> {count}
        </p>
        <button onClick={increment}>Increment</button>
        <button onClick={reset}>Reset</button>
      </div>
    </div>
  );
}

type View = 'query' | 'game';

function App() {
  const [view, setView] = useState<View>('query');
  const [userId, setUserId] = useState(1);
  const [postTitle, setPostTitle] = useState('');
  const [postBody, setPostBody] = useState('');

  // Query example
  const userQuery = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
    retry: 0, // Disable retries for demo to show errors immediately
  });

  // Mutation example
  const createPostMutation = useMutation({
    mutationFn: createPost,
    onSuccess: (data) => {
      console.log('Post created:', data);
      setPostTitle('');
      setPostBody('');
    },
  });

  const handleCreatePost = async () => {
    if (postTitle && postBody) {
      await createPostMutation.mutate({ title: postTitle, body: postBody });
    }
  };

  return (
    <div className="app">
      <h1>ts-query React Demo</h1>

      <div className="section">
        <button
          className={view === 'query' ? 'active' : ''}
          onClick={() => setView('query')}
        >
          Query / Store Demo
        </button>
        <button
          className={view === 'game' ? 'active' : ''}
          onClick={() => setView('game')}
          style={{ marginLeft: '0.5rem' }}
        >
          Incremental Game
        </button>
      </div>

      {view === 'query' ? (
        <>
          {/* Query Demo */}
          <div className="section">
            <h2>Query Demo (useQuery)</h2>
            <div>
              <label>
                User ID:
                <input
                  type="number"
                  value={userId}
                  onChange={(e) => setUserId(Number(e.target.value))}
                  min="1"
                />
              </label>
              <button onClick={() => setUserId(999)}>
                Test Error (ID 999)
              </button>
            </div>

            {userQuery.isLoading && (
              <div className="loading">Loading user...</div>
            )}

            {userQuery.isError && (
              <div className="error">
                Error: {userQuery.error?.message || 'Failed to fetch user'}
              </div>
            )}

            {userQuery.isSuccess && userQuery.data && (
              <div className="success">
                <h3>User Data:</h3>
                <p>
                  <strong>ID:</strong> {userQuery.data.id}
                </p>
                <p>
                  <strong>Name:</strong> {userQuery.data.name}
                </p>
                <p>
                  <strong>Email:</strong> {userQuery.data.email}
                </p>
              </div>
            )}
          </div>

          {/* Mutation Demo */}
          <div className="section">
            <h2>Mutation Demo (useMutation)</h2>
            <div>
              <input
                type="text"
                placeholder="Post title"
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
              />
              <textarea
                placeholder="Post body"
                value={postBody}
                onChange={(e) => setPostBody(e.target.value)}
              />
              <button
                onClick={handleCreatePost}
                disabled={
                  createPostMutation.state.isLoading || !postTitle || !postBody
                }
              >
                {createPostMutation.state.isLoading
                  ? 'Creating...'
                  : 'Create Post'}
              </button>
            </div>

            {createPostMutation.state.isError && (
              <div className="error">
                Error:{' '}
                {createPostMutation.state.error?.message ||
                  'Failed to create post'}
              </div>
            )}

            {createPostMutation.state.isSuccess &&
              createPostMutation.state.data && (
                <div className="success">
                  <h3>Post Created:</h3>
                  <p>
                    <strong>ID:</strong> {createPostMutation.state.data.id}
                  </p>
                  <p>
                    <strong>Title:</strong>{' '}
                    {createPostMutation.state.data.title}
                  </p>
                  <p>
                    <strong>Body:</strong> {createPostMutation.state.data.body}
                  </p>
                </div>
              )}
          </div>

          {/* Store Demo */}
          <StoreDemo />
        </>
      ) : (
        <IncrementalGame />
      )}
    </div>
  );
}

export default App;
