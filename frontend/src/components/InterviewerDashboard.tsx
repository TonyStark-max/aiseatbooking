import React, { useState } from 'react';
import { Terminal, RefreshCw, Zap } from 'lucide-react';

interface InterviewerDashboardProps {
  eventId: number | null;
  onRefreshSeats: () => void;
}

export const InterviewerDashboard: React.FC<InterviewerDashboardProps> = ({ eventId, onRefreshSeats }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const runSimulation = () => {
    if (!eventId) return;

    setIsRunning(true);
    setError(null);
    setLogs(['[System] Initializing simulation request...', '[System] Calling POST /api/simulation/concurrency...']);

    fetch(`http://localhost:8080/api/simulation/concurrency?eventId=${eventId}`, {
      method: 'POST',
    })
      .then(async (res) => {
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(errText || 'Simulation failed.');
        }
        return res.json();
      })
      .then((data) => {
        setLogs(data.logs);
        setIsRunning(false);
        onRefreshSeats(); // Force refresh seat map to display held seat
      })
      .catch((err) => {
        setError(err.message || 'Failed to execute concurrency simulation.');
        setIsRunning(false);
      });
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="dashboard-title-group">
          <h2>Interviewer Concurrency Dashboard</h2>
          <p>Verify ACID isolation, sorted deadlock prevention, and pessimistic write locks.</p>
        </div>
        {eventId && (
          <button 
            className="btn btn-primary" 
            style={{ fontSize: '12px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={runSimulation}
            disabled={isRunning}
          >
            {isRunning ? (
              <RefreshCw size={14} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <Zap size={14} />
            )}
            <span>Simulate 5-Thread Race</span>
          </button>
        )}
      </div>

      <div className="dashboard-metrics-grid">
        <div className="metric-card">
          <span className="metric-label">Lock Mechanism</span>
          <div className="metric-value safe">PESSIMISTIC_WRITE</div>
          <p style={{ fontSize: '11px', color: 'var(--color-ink-muted)', marginTop: '4px' }}>
            SELECT ... FOR UPDATE prevents parallel transactions from modifying seat records.
          </p>
        </div>
        <div className="metric-card">
          <span className="metric-label">Deadlock Safeguard</span>
          <div className="metric-value safe">ID Sorted Arrays</div>
          <p style={{ fontSize: '11px', color: 'var(--color-ink-muted)', marginTop: '4px' }}>
            Primary keys sorted numerically before locking to eliminate transaction wait-locks.
          </p>
        </div>
        <div className="metric-card">
          <span className="metric-label">Active Hold Cache</span>
          <div className="metric-value safe">Redis Key TTL</div>
          <p style={{ fontSize: '11px', color: 'var(--color-ink-muted)', marginTop: '4px' }}>
            Redis sets a 5-minute time-to-live. Sync scheduler cleans up DB rows automatically.
          </p>
        </div>
      </div>

      {eventId ? (
        <div style={{ marginTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Terminal size={14} style={{ color: 'var(--color-ink-muted)' }} />
            <span className="text-caption" style={{ textTransform: 'none' }}>Live Concurrency Log Output (Simulating 5 concurrent requests)</span>
          </div>

          <div className="simulation-log-box">
            {logs.length === 0 ? (
              <div style={{ color: 'var(--color-ink-muted)', fontStyle: 'italic' }}>
                Click "Simulate 5-Thread Race" to execute a live multi-threaded request race on the next available seat.
              </div>
            ) : (
              logs.map((log, index) => {
                let className = 'log-entry';
                if (log.includes('SUCCESSFUL') || log.includes('verified')) {
                  className += ' success';
                } else if (log.includes('FAILED') || log.includes('BLOCKED')) {
                  className += ' error';
                }
                return (
                  <div key={index} className={className}>
                    {log}
                  </div>
                );
              })
            )}

            {error && (
              <div className="log-entry error" style={{ marginTop: '8px', fontWeight: 600 }}>
                System Error: {error}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ padding: '12px', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-sm)', textAlign: 'center', color: 'var(--color-ink-muted)', fontSize: '12px' }}>
          Please select a movie/show below to run the live database lock concurrency simulation.
        </div>
      )}
    </div>
  );
};
