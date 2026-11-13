/**
 * ROUTELESS – Hackathon Demonstration Control Center Component
 * 1-Click instant incident injectors, simulation toggles, and compliance disclaimers.
 */

function DemoPanel({ isDemoActive, onToggleDemo, onInjectScenario }) {
  const [loadingAction, setLoadingAction] = React.useState(null);
  const [lastMessage, setLastMessage] = React.useState(null);

  const triggerScenario = (scenarioKey) => {
    setLoadingAction(scenarioKey);
    fetch('/api/demo/scenario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario: scenarioKey })
    })
      .then(res => res.json())
      .then(data => {
        setLoadingAction(null);
        if (data.success) {
          setLastMessage(data.message);
          setTimeout(() => setLastMessage(null), 5000);
        }
      })
      .catch(err => {
        console.error('Error triggering scenario:', err);
        setLoadingAction(null);
      });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Disclaimer Card */}
      <div style={{
        background: 'rgba(245, 158, 11, 0.1)',
        border: '1px solid var(--amber-primary)',
        borderRadius: 'var(--radius-md)',
        padding: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--amber-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚠️</span> HACKATHON DEMONSTRATION MODE NOTICE
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '750px' }}>
            This system includes a synthetic demonstration engine for hackathons where physical GPS trackers and IP bus cameras are unavailable. All demo data, animated bus movements, and camera feeds are synthetically generated and transparently watermarked.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: '700', color: isDemoActive ? '#10B981' : '#64748B' }}>
            {isDemoActive ? 'SIMULATION ACTIVE' : 'MANUAL MODE'}
          </span>
          <label className="switch">
            <input 
              type="checkbox" 
              checked={isDemoActive} 
              onChange={(e) => onToggleDemo(e.target.checked)} 
            />
            <span className="slider"></span>
          </label>
        </div>
      </div>

      {lastMessage && (
        <div style={{
          background: 'rgba(6, 182, 212, 0.15)',
          border: '1px solid var(--cyan-primary)',
          color: 'var(--cyan-primary)',
          padding: '10px 16px',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.85rem',
          fontWeight: '700'
        }}>
          ⚡ {lastMessage}
        </div>
      )}

      {/* Instant 1-Click Scenario Injectors */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', color: 'var(--cyan-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>⚡</span> 1-Click Real-Time Incident Injectors
        </h3>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Click any scenario to simulate a real-world rural transit emergency or hazard across the entire platform in real time.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {/* Scenario 1: Breakdown */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#EF4444', marginBottom: '6px' }}>
              🚨 Bus Breakdown & SOS Alert
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Simulates hydraulic failure on Bus-102 near Malhar Gaon. Halts bus, sounds alarm, notifies admin, and computes nearest rescue bus.
            </p>
            <button 
              onClick={() => triggerScenario('BREAKDOWN_BUS_102')}
              disabled={loadingAction === 'BREAKDOWN_BUS_102'}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #DC2626, #EF4444)',
                border: 'none',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: '800',
                cursor: 'pointer'
              }}
            >
              Trigger Bus-102 Breakdown
            </button>
          </div>

          {/* Scenario 2: Overcrowding */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#F59E0B', marginBottom: '6px' }}>
              👥 Overcrowding Threshold Exceeded
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Simulates heavy student boarding on Bus-101 (44/42 passengers). Triggers AI cabin safety warning and doorway standing hazard.
            </p>
            <button 
              onClick={() => triggerScenario('OVERCROWDING_BUS_101')}
              disabled={loadingAction === 'OVERCROWDING_BUS_101'}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #D97706, #F59E0B)',
                border: 'none',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: '800',
                cursor: 'pointer'
              }}
            >
              Simulate Overcrowding
            </button>
          </div>

          {/* Scenario 3: Geofence Breach */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#06B6D4', marginBottom: '6px' }}>
              🛰️ Restricted Geofence Warning
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Simulates Bus-101 approaching the Old Kalu River Causeway (monsoon flood danger area). Triggers geofence proximity advisory.
            </p>
            <button 
              onClick={() => triggerScenario('GEOFENCE_APPROACH')}
              disabled={loadingAction === 'GEOFENCE_APPROACH'}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #0284C7, #06B6D4)',
                border: 'none',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: '800',
                cursor: 'pointer'
              }}
            >
              Simulate Geofence Alert
            </button>
          </div>

          {/* Scenario 4: Door Hazard */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#F87171', marginBottom: '6px' }}>
              🚪 Door Open in Motion Hazard
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              AI camera detects passenger exit door unlatched while vehicle traveling at 38 km/h. Footboard passenger safety hazard alert.
            </p>
            <button 
              onClick={() => triggerScenario('DOOR_HAZARD')}
              disabled={loadingAction === 'DOOR_HAZARD'}
              style={{
                width: '100%',
                background: 'rgba(239, 68, 68, 0.3)',
                border: '1px solid #EF4444',
                color: '#EF4444',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: '800',
                cursor: 'pointer'
              }}
            >
              Trigger Door Hazard
            </button>
          </div>

          {/* Scenario 5: Driver Fatigue */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#FBBF24', marginBottom: '6px' }}>
              😴 Driver Fatigue Detection
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              AI driver cabin monitor detects continuous eye closure and head tilt. Audio alertness reminder sounded in cabin.
            </p>
            <button 
              onClick={() => triggerScenario('DRIVER_FATIGUE')}
              disabled={loadingAction === 'DRIVER_FATIGUE'}
              style={{
                width: '100%',
                background: 'rgba(245, 158, 11, 0.3)',
                border: '1px solid #F59E0B',
                color: '#FBBF24',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: '800',
                cursor: 'pointer'
              }}
            >
              Trigger Fatigue Alert
            </button>
          </div>

          {/* Scenario 6: Reset All */}
          <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#10B981', marginBottom: '6px' }}>
              🟢 Resolve All Incidents & Reset
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Clears all active emergency alerts, restores all buses to normal operating status, and resets safety feeds.
            </p>
            <button 
              onClick={() => triggerScenario('RESOLVE_ALL')}
              disabled={loadingAction === 'RESOLVE_ALL'}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #059669, #10B981)',
                border: 'none',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: '800',
                cursor: 'pointer'
              }}
            >
              ✓ Reset Fleet to Normal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

window.DemoPanel = DemoPanel;
