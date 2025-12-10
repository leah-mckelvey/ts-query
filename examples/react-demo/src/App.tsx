import { useState } from 'react';
import { useQuery, useMutation } from '@ts-query/react';
import './App.css';

// Mock API functions
const fetchUser = async (userId: number): Promise<{ id: number; name: string; email: string }> => {
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

const createPost = async (data: { title: string; body: string }): Promise<{ id: number; title: string; body: string }> => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return {
    id: Math.floor(Math.random() * 1000),
    ...data,
  };
};

function App() {
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
          <button onClick={() => setUserId(999)}>Test Error (ID 999)</button>
        </div>

        {userQuery.isLoading && <div className="loading">Loading user...</div>}

        {userQuery.isError && (
          <div className="error">
            Error: {userQuery.error?.message || 'Failed to fetch user'}
          </div>
        )}

        {userQuery.isSuccess && userQuery.data && (
          <div className="success">
            <h3>User Data:</h3>
            <p><strong>ID:</strong> {userQuery.data.id}</p>
            <p><strong>Name:</strong> {userQuery.data.name}</p>
            <p><strong>Email:</strong> {userQuery.data.email}</p>
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
            disabled={createPostMutation.state.isLoading || !postTitle || !postBody}
          >
            {createPostMutation.state.isLoading ? 'Creating...' : 'Create Post'}
          </button>
        </div>

        {createPostMutation.state.isError && (
          <div className="error">
            Error: {createPostMutation.state.error?.message || 'Failed to create post'}
          </div>
        )}

        {createPostMutation.state.isSuccess && createPostMutation.state.data && (
          <div className="success">
            <h3>Post Created:</h3>
            <p><strong>ID:</strong> {createPostMutation.state.data.id}</p>
            <p><strong>Title:</strong> {createPostMutation.state.data.title}</p>
            <p><strong>Body:</strong> {createPostMutation.state.data.body}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
