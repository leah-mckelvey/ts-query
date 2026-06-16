import { useState } from 'react';
import { useQuery, useMutation, useFragment } from '@ts-query/react';
import { useQueryClient } from '@ts-query/react';
import {
  fetchUser,
  fetchUsers,
  fetchTeam,
  updateUser,
  type User,
} from '../mockApi';

// This tests the CORE normalized cache feature:
// - Multiple queries contain the same User entity
// - A mutation updates that User
// - ALL queries update instantly WITHOUT refetching

export function MultiQueryUpdate() {
  const [mounted, setMounted] = useState({
    singleUser: false,
    userList: false,
    team: false,
  });

  return (
    <div className="test-scenario">
      <h2>1. Multi-Query Update (The Money Shot)</h2>
      <div className="description">
        <p>
          <strong>What this tests:</strong> The normalized cache's ability to
          update all queries when a single entity changes.
        </p>
        <p>
          <strong>Expected behavior:</strong>
        </p>
        <ul>
          <li>Mount 3 different queries that all contain User #1</li>
          <li>Run a mutation that updates User #1's name</li>
          <li>All 3 queries should update instantly (no network requests)</li>
          <li>The fragment should also update instantly</li>
        </ul>
        <p>
          <strong>Success criteria:</strong> Zero network requests after
          mutation completes. All queries show new data.
        </p>
      </div>

      <div className="test-actions">
        <button
          onClick={() =>
            setMounted({ singleUser: true, userList: true, team: true })
          }
        >
          Mount All Queries
        </button>
        <button
          onClick={() =>
            setMounted({ singleUser: false, userList: false, team: false })
          }
        >
          Unmount All
        </button>
      </div>

      <div className="test-grid">
        {mounted.singleUser && <SingleUserQuery />}
        {mounted.userList && <UserListQuery />}
        {mounted.team && <TeamQuery />}
        {mounted.singleUser && <UserFragment />}
      </div>

      {(mounted.singleUser || mounted.userList || mounted.team) && (
        <MutationPanel />
      )}
    </div>
  );
}

function SingleUserQuery() {
  const { data, status, isStale } = useQuery<User>({
    queryKey: ['user', 1],
    queryFn: () => fetchUser(1),
    staleTime: 60000,
  });

  return (
    <div className={`card ${status}`}>
      <h3>Query 1: Single User</h3>
      <div className={`status-badge ${status}`}>{status}</div>
      {isStale && <div className="status-badge stale">stale</div>}
      <div className="data-display">
        {data ? JSON.stringify(data, null, 2) : 'No data'}
      </div>
    </div>
  );
}

function UserListQuery() {
  const { data, status, isStale } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => fetchUsers(),
    staleTime: 60000,
  });

  const user1 = data?.find((u) => u.id === 1);

  return (
    <div className={`card ${status}`}>
      <h3>Query 2: User List (showing User #1)</h3>
      <div className={`status-badge ${status}`}>{status}</div>
      {isStale && <div className="status-badge stale">stale</div>}
      <div className="data-display">
        {user1 ? JSON.stringify(user1, null, 2) : 'User #1 not found in list'}
      </div>
    </div>
  );
}

function TeamQuery() {
  const { data, status, isStale } = useQuery({
    queryKey: ['team', 1],
    queryFn: () => fetchTeam(1),
    staleTime: 60000,
  });

  const user1 = data?.members.find((m) => m.id === 1);

  return (
    <div className={`card ${status}`}>
      <h3>Query 3: Team (showing User #1 from members)</h3>
      <div className={`status-badge ${status}`}>{status}</div>
      {isStale && <div className="status-badge stale">stale</div>}
      <div className="data-display">
        {user1 ? JSON.stringify(user1, null, 2) : 'User #1 not in team'}
      </div>
    </div>
  );
}

function UserFragment() {
  const user = useFragment<User>('User', 1);

  return (
    <div className={`card ${user ? 'success' : 'loading'}`}>
      <h3>Fragment: User #1</h3>
      <div className={`status-badge ${user ? 'success' : 'loading'}`}>
        {user ? 'has data' : 'no data'}
      </div>
      <div className="data-display">
        {user ? JSON.stringify(user, null, 2) : 'Not in cache yet'}
      </div>
    </div>
  );
}

function MutationPanel() {
  const client = useQueryClient();
  const [newName, setNewName] = useState('');

  const mutation = useMutation({
    mutationFn: ({ name }: { name: string }) => updateUser(1, { name }),
    onSuccess: (updatedUser) => {
      // Write to normalized cache - this should update ALL queries
      client.writeFragment('User', updatedUser.id, updatedUser);
    },
  });

  const handleUpdate = () => {
    if (!newName.trim()) {
      alert('Please enter a new name');
      return;
    }
    mutation.mutate({ name: newName });
    setNewName('');
  };

  return (
    <div
      style={{
        marginTop: '20px',
        padding: '15px',
        background: '#f8f9fa',
        borderRadius: '6px',
      }}
    >
      <h3>Mutation Panel</h3>
      <div
        style={{
          display: 'flex',
          gap: '10px',
          marginTop: '10px',
          alignItems: 'center',
        }}
      >
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New name for User #1"
          style={{
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            flex: 1,
          }}
        />
        <button onClick={handleUpdate} disabled={mutation.status === 'pending'}>
          {mutation.status === 'pending' ? 'Updating...' : 'Update User #1'}
        </button>
      </div>
      {mutation.status === 'error' && (
        <div style={{ marginTop: '10px', color: '#dc3545' }}>
          Error: {(mutation.error as Error)?.message}
        </div>
      )}
      {mutation.status === 'success' && (
        <div style={{ marginTop: '10px', color: '#28a745' }}>
          ✓ Mutation succeeded! All queries should update instantly.
        </div>
      )}
    </div>
  );
}
