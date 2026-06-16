import { useState, useEffect } from 'react';
import {
  getRequestLogs,
  clearRequestLogs,
  type RequestLog as RequestLogType,
} from './mockApi';

export function RequestLog() {
  const [logs, setLogs] = useState<RequestLogType[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setLogs(getRequestLogs());
    }, 500);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleClear = () => {
    clearRequestLogs();
    setLogs([]);
  };

  const handleRefresh = () => {
    setLogs(getRequestLogs());
  };

  return (
    <div className="request-log">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '15px',
        }}
      >
        <h3>Network Request Log</h3>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />{' '}
            Auto-refresh
          </label>
          <button onClick={handleRefresh} className="secondary">
            Refresh
          </button>
          <button onClick={handleClear} className="danger">
            Clear
          </button>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="empty-state">
          No requests yet. Start a test to see network activity.
        </div>
      ) : (
        <div>
          <div
            style={{ marginBottom: '10px', color: '#666', fontSize: '14px' }}
          >
            Total requests: {logs.length}
          </div>
          {logs.map((log, index) => (
            <div key={index} className="request-log-item">
              <div className="endpoint">{log.endpoint}</div>
              <div className="timing">
                {new Date(log.timestamp).toLocaleTimeString()} • Duration:{' '}
                {log.duration}ms
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
