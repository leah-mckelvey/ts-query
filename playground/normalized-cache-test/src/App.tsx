import { useState } from 'react';
import { setNetworkDelay, getNetworkDelay } from './mockApi';
import { MultiQueryUpdate } from './scenarios/MultiQueryUpdate';
import { RaceConditions } from './scenarios/RaceConditions';
import { EvictionCascade } from './scenarios/EvictionCascade';
import { RequestLog } from './RequestLog';
import './styles.css';

type Tab = 'multi-query' | 'race-conditions' | 'eviction';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('multi-query');
  const [delay, setDelay] = useState(getNetworkDelay());

  const handleDelayChange = (newDelay: number) => {
    setDelay(newDelay);
    setNetworkDelay(newDelay);
  };

  return (
    <div className="app">
      <div className="header">
        <h1>Normalized Cache Test Playground</h1>
        <p>
          Interactive tests to verify normalized cache behavior, race
          conditions, and production edge cases.
        </p>
      </div>

      <div className="controls">
        <h3>Global Controls</h3>
        <div className="control-group">
          <label>
            Network Delay:
            <input
              type="range"
              min="0"
              max="3000"
              step="100"
              value={delay}
              onChange={(e) => handleDelayChange(Number(e.target.value))}
            />
            <span className="value-display">{delay}ms</span>
          </label>
        </div>
        <div style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
          💡 Tip: Increase network delay to see race conditions more clearly.
          Try 1000-2000ms for slow motion.
        </div>
      </div>

      <div className="tabs">
        <button
          className={`tab-button ${activeTab === 'multi-query' ? 'active' : ''}`}
          onClick={() => setActiveTab('multi-query')}
        >
          1. Multi-Query Update
        </button>
        <button
          className={`tab-button ${activeTab === 'race-conditions' ? 'active' : ''}`}
          onClick={() => setActiveTab('race-conditions')}
        >
          2. Race Conditions
        </button>
        <button
          className={`tab-button ${activeTab === 'eviction' ? 'active' : ''}`}
          onClick={() => setActiveTab('eviction')}
        >
          3. Eviction Cascade
        </button>
      </div>

      {activeTab === 'multi-query' && <MultiQueryUpdate />}
      {activeTab === 'race-conditions' && <RaceConditions />}
      {activeTab === 'eviction' && <EvictionCascade />}

      <RequestLog />
    </div>
  );
}
