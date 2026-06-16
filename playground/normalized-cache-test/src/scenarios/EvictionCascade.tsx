import { useState } from 'react';
import { useQuery, useFragment } from '@ts-query/react';
import { useQueryClient } from '@ts-query/react';
import { fetchUser, fetchUsers, fetchTeam, type User } from '../mockApi';

// Tests that evicting an entity cascades to all queries and fragments

export function EvictionCascade() {
  const [mounted, setMounted] = useState(false);

  return (
    <div className="test-scenario">
      <h2>3. Eviction Cascade</h2>
      <div className="description">
        <p>
          <strong>What this tests:</strong> When you evict an entity, all
          queries and fragments referencing it should be affected.
        </p>
        <p>
          <strong>Expected behavior:</strong>
        </p>
        <ul>
          <li>Mount multiple queries and fragments that reference User #1</li>
          <li>Call `client.evict('User', 1)`</li>
          <li>All fragments should return `undefined`</li>
          <li>All queries should be marked as stale/invalidated</li>
        </ul>
        <p>
          <strong>Success criteria:</strong> After eviction, fragments show "Not
          in cache", queries refetch on next access.
        </p>
      </div>

      <div className="test-actions">
        <button onClick={() => setMounted(true)}>Mount All</button>
        <button onClick={() => setMounted(false)}>Unmount All</button>
      </div>

      {mounted && <EvictionTestContent />}
    </div>
  );
}

function EvictionTestContent() {
  const client = useQueryClient();

  const handleEvict = () => {
    if (
      confirm(
        'Evict User #1 from cache? This will remove it from all queries and fragments.',
      )
    ) {
      client.evict('User', 1);
    }
  };

  return (
    <>
      <div className="test-grid">
        <SingleUserQuery />
        <UserListQuery />
        <TeamQuery />
        <UserFragmentDisplay />
      </div>

      <div
        style={{
          marginTop: '20px',
          padding: '15px',
          background: '#fff3cd',
          borderRadius: '6px',
          border: '2px solid #ffc107',
        }}
      >
        <h3>Eviction Controls</h3>
        <button onClick={handleEvict} className="danger">
          Evict User #1
        </button>
        <p style={{ marginTop: '10px', color: '#856404', fontSize: '14px' }}>
          This will remove User #1 from the normalized cache. Watch all queries
          and fragments update.
        </p>
      </div>
    </>
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
      <h3>Query: Single User</h3>
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
      <h3>Query: User List</h3>
      <div className={`status-badge ${status}`}>{status}</div>
      {isStale && <div className="status-badge stale">stale</div>}
      <div className="data-display">
        {user1 ? JSON.stringify(user1, null, 2) : 'User #1 not found'}
      </div>
      {data && !user1 && (
        <div style={{ marginTop: '10px', color: '#dc3545' }}>
          ⚠️ User #1 missing from list (evicted?)
        </div>
      )}
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
      <h3>Query: Team Members</h3>
      <div className={`status-badge ${status}`}>{status}</div>
      {isStale && <div className="status-badge stale">stale</div>}
      <div className="data-display">
        {user1 ? JSON.stringify(user1, null, 2) : 'User #1 not in team'}
      </div>
      {data && !user1 && (
        <div style={{ marginTop: '10px', color: '#dc3545' }}>
          ⚠️ User #1 missing from team (evicted?)
        </div>
      )}
    </div>
  );
}

function UserFragmentDisplay() {
  const user = useFragment<User>('User', 1);

  return (
    <div className={`card ${user ? 'success' : 'error'}`}>
      <h3>Fragment: User #1</h3>
      <div className={`status-badge ${user ? 'success' : 'error'}`}>
        {user ? 'In cache' : 'Not in cache'}
      </div>
      <div className="data-display">
        {user
          ? JSON.stringify(user, null, 2)
          : 'undefined (evicted or never cached)'}
      </div>
      {!user && (
        <div
          style={{ marginTop: '10px', color: '#dc3545', fontWeight: 'bold' }}
        >
          ✅ Fragment correctly returns undefined after eviction
        </div>
      )}
    </div>
  );
}
