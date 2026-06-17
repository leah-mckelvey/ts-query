import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@ts-query/react';
import { useQueryClient } from '@ts-query/react';
import {
  fetchUser,
  updateUser,
  getRequestLogs,
  clearRequestLogs,
  type User,
} from '../mockApi';

// Tests race conditions that commonly break production apps

export function RaceConditions() {
  return (
    <div className="test-scenario">
      <h2>2. Race Condition Tests</h2>
      <div className="description">
        <p>
          <strong>What this tests:</strong> Edge cases that break in production
          - concurrent fetches, mutations during fetches, rapid invalidations.
        </p>
        <p>
          <strong>Expected behavior:</strong>
        </p>
        <ul>
          <li>Double mount: Only 1 network request for same queryKey</li>
          <li>
            Mutation during fetch: No data clobber, proper state resolution
          </li>
          <li>Rapid invalidation: Request deduplication/cancellation</li>
        </ul>
      </div>

      <DoubleMountTest />
      <MutationDuringFetchTest />
      <RapidInvalidationTest />
    </div>
  );
}

// Test 1: Double mount - same query mounted twice before first fetch completes
function DoubleMountTest() {
  const [mountCount, setMountCount] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const client = useQueryClient();

  const runTest = () => {
    // Clear query cache and request logs for fresh test
    setMountCount(0); // Unmount components first
    clearRequestLogs();
    setLogs([]);

    setTimeout(() => {
      setLogs((prev) => [...prev, 'Clearing query cache...']);
      client.removeQueries(['user', 1]); // Remove cached query
      clearRequestLogs(); // Clear any requests from removal
    }, 50);

    setTimeout(() => {
      setLogs((prev) => [...prev, 'Mounting component 1...']);
      setMountCount(1);
    }, 150);

    setTimeout(() => {
      setLogs((prev) => [
        ...prev,
        'Mounting component 2 (before fetch completes)...',
      ]);
      setMountCount(2);
    }, 250);

    setTimeout(() => {
      const requests = getRequestLogs();
      const userRequests = requests.filter((r) =>
        r.endpoint.includes('GET /users/1'),
      );
      setLogs((prev) => [
        ...prev,
        `✓ Test complete. Network requests made: ${userRequests.length}`,
        userRequests.length === 1
          ? '✅ SUCCESS: Only 1 request (deduplication works!)'
          : '❌ FAIL: Multiple requests made',
      ]);
    }, 1500);
  };

  return (
    <div
      style={{
        marginTop: '30px',
        padding: '20px',
        background: 'white',
        borderRadius: '8px',
      }}
    >
      <h3>Test 2.1: Double Mount (Request Deduplication)</h3>
      <p style={{ color: '#666', marginBottom: '15px' }}>
        Simulates fast navigation: same query mounted twice before first fetch
        completes.
      </p>

      <button onClick={runTest}>Run Double Mount Test</button>

      {mountCount >= 1 && <QueryComponent1 />}
      {mountCount >= 2 && <QueryComponent2 />}

      {logs.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h4>Test Log:</h4>
          <div className="timeline">
            {logs.map((log, i) => (
              <div key={i} className="timeline-item">
                <div className="dot"></div>
                <div className="content">{log}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function QueryComponent1() {
  const { data, status } = useQuery<User>({
    queryKey: ['user', 1],
    queryFn: () => fetchUser(1),
  });

  return (
    <div className={`card ${status}`} style={{ marginTop: '10px' }}>
      <h4>Component 1</h4>
      <div className={`status-badge ${status}`}>{status}</div>
      <div className="data-display">
        {data ? JSON.stringify(data, null, 2) : 'Loading...'}
      </div>
    </div>
  );
}

function QueryComponent2() {
  const { data, status } = useQuery<User>({
    queryKey: ['user', 1],
    queryFn: () => fetchUser(1),
  });

  return (
    <div className={`card ${status}`} style={{ marginTop: '10px' }}>
      <h4>Component 2</h4>
      <div className={`status-badge ${status}`}>{status}</div>
      <div className="data-display">
        {data ? JSON.stringify(data, null, 2) : 'Loading...'}
      </div>
    </div>
  );
}

// Test 2: Mutation fires while query is fetching
function MutationDuringFetchTest() {
  const [testRunning, setTestRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [triggerFetch, setTriggerFetch] = useState(0);
  const [triggerMutation, setTriggerMutation] = useState(0);

  const client = useQueryClient();

  const runTest = () => {
    clearRequestLogs();
    setLogs([]);
    setTestRunning(true);
    setTriggerFetch(0);
    setTriggerMutation(0);

    // Clear query cache for fresh test
    client.removeQueries(['user', 2]);

    setTimeout(() => {
      setLogs((prev) => [...prev, 'Starting query fetch...']);
      setTriggerFetch((prev) => prev + 1);
    }, 100);

    setTimeout(() => {
      setLogs((prev) => [
        ...prev,
        'Firing mutation (while query is in flight)...',
      ]);
      setTriggerMutation((prev) => prev + 1);
    }, 300);

    setTimeout(() => {
      setLogs((prev) => [
        ...prev,
        '✓ Test complete. Check that final state is correct (mutation should win).',
      ]);
      setTestRunning(false);
    }, 1500);
  };

  return (
    <div
      style={{
        marginTop: '30px',
        padding: '20px',
        background: 'white',
        borderRadius: '8px',
      }}
    >
      <h3>Test 2.2: Mutation During Fetch</h3>
      <p style={{ color: '#666', marginBottom: '15px' }}>
        Query starts fetching, mutation fires before fetch completes. Mutation
        data should win.
      </p>

      <button onClick={runTest} disabled={testRunning}>
        {testRunning ? 'Test Running...' : 'Run Mutation During Fetch Test'}
      </button>

      {triggerFetch > 0 && (
        <MutationDuringFetchQuery
          key={triggerFetch}
          triggerMutation={triggerMutation}
        />
      )}

      {logs.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h4>Test Log:</h4>
          <div className="timeline">
            {logs.map((log, i) => (
              <div key={i} className="timeline-item">
                <div className="dot"></div>
                <div className="content">{log}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MutationDuringFetchQuery({
  triggerMutation,
}: {
  triggerMutation: number;
}) {
  const client = useQueryClient();
  const { data, status } = useQuery<User>({
    queryKey: ['user', 2],
    queryFn: () => fetchUser(2),
  });

  const mutation = useMutation({
    mutationFn: () => updateUser(2, { name: 'MUTATED NAME' }),
    onSuccess: (updatedUser) => {
      client.writeFragment('User', updatedUser.id, updatedUser);
    },
  });

  useEffect(() => {
    if (triggerMutation > 0) {
      mutation.mutate().catch(() => {
        // Error is reflected in mutation.state
      });
    }
  }, [triggerMutation, mutation]);

  return (
    <div className={`card ${status}`} style={{ marginTop: '10px' }}>
      <h4>Query State</h4>
      <div className={`status-badge ${status}`}>{status}</div>
      {mutation.state.status === 'loading' && (
        <div className="status-badge loading">mutation pending</div>
      )}
      {mutation.state.status === 'success' && (
        <div className="status-badge success">mutation success</div>
      )}
      <div className="data-display">
        {data ? JSON.stringify(data, null, 2) : 'Loading...'}
      </div>
      {mutation.state.status === 'success' && data?.name === 'MUTATED NAME' && (
        <div
          style={{ marginTop: '10px', color: '#28a745', fontWeight: 'bold' }}
        >
          ✅ Mutation data is showing (correct!)
        </div>
      )}
    </div>
  );
}

// Test 3: Rapid invalidation
function RapidInvalidationTest() {
  const [logs, setLogs] = useState<string[]>([]);
  const [testKey, setTestKey] = useState(0);
  const client = useQueryClient();

  const runTest = () => {
    clearRequestLogs();
    setLogs([]);

    // Clear query cache for fresh test
    client.removeQueries(['user', 3]);

    setTestKey((prev) => prev + 1);
  };

  return (
    <div
      style={{
        marginTop: '30px',
        padding: '20px',
        background: 'white',
        borderRadius: '8px',
      }}
    >
      <h3>Test 2.3: Rapid Invalidation</h3>
      <p style={{ color: '#666', marginBottom: '15px' }}>
        Invalidate query multiple times rapidly. Should cancel in-flight
        requests or deduplicate.
      </p>

      <button onClick={runTest}>Run Rapid Invalidation Test</button>

      {testKey > 0 && (
        <RapidInvalidationQuery key={testKey} setLogs={setLogs} />
      )}

      {logs.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h4>Test Log:</h4>
          <div className="timeline">
            {logs.map((log, i) => (
              <div key={i} className="timeline-item">
                <div className="dot"></div>
                <div className="content">{log}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RapidInvalidationQuery({
  setLogs,
}: {
  setLogs: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  const client = useQueryClient();
  const { data, status } = useQuery<User>({
    queryKey: ['user', 3],
    queryFn: () => fetchUser(3),
  });

  useEffect(() => {
    const query = client.getQuery({
      queryKey: ['user', 3],
      queryFn: () => fetchUser(3),
    });

    setTimeout(() => {
      setLogs((prev) => [...prev, 'Invalidate #1']);
      query.invalidate();
    }, 200);

    setTimeout(() => {
      setLogs((prev) => [...prev, 'Invalidate #2 (rapid fire)']);
      query.invalidate();
    }, 250);

    setTimeout(() => {
      setLogs((prev) => [...prev, 'Invalidate #3 (rapid fire)']);
      query.invalidate();
    }, 300);

    setTimeout(() => {
      const requests = getRequestLogs();
      const userRequests = requests.filter((r) =>
        r.endpoint.includes('GET /users/3'),
      );
      setLogs((prev) => [
        ...prev,
        `✓ Test complete. Total requests: ${userRequests.length}`,
        userRequests.length <= 2
          ? '✅ Request deduplication working'
          : '⚠️  Multiple requests fired',
      ]);
    }, 1500);
  }, []);

  return (
    <div className={`card ${status}`} style={{ marginTop: '10px' }}>
      <h4>Query State</h4>
      <div className={`status-badge ${status}`}>{status}</div>
      <div className="data-display">
        {data ? JSON.stringify(data, null, 2) : 'Loading...'}
      </div>
    </div>
  );
}
