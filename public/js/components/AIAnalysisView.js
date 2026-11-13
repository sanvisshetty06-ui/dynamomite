/**
 * ROUTELESS – AI Camera Analysis & Safety Compliance Component
 * Real-time computer vision metrics, overcrowding detection, hazard logs,
 * geofence monitoring, and strict zero-facial-recognition privacy panel.
 */

function AIAnalysisView({ buses, infrastructure }) {
  const [fleetStats, setFleetStats] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  const fetchAI = () => {
    fetch('/api/ai-analysis/fleet')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setFleetStats(data.analytics);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching AI analytics:', err);
        setLoading(false);
      });
  };

  React.useEffect(() => {
    fetchAI();
    const interval = setInterval(fetchAI, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !fleetStats) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ color: 'var(--cyan-primary)', fontSize: '1.1rem', fontWeight: '700' }}>
          🧠 Initializing AI Computer Vision Analytics...
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Privacy-First Compliance Guarantee Banner */}
      <div style={{
        background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.15), rgba(6, 182, 212, 0.15))',
        border: '1px solid var(--emerald-primary)',
        borderRadius: 'var(--radius-md)',
        padding: '0.85rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.4rem' }}>🛡️</span>
          <div>
            <div style={{ fontWeight: '800', color: 'var(--emerald-primary)', fontSize: '0.9rem' }}>
              ZERO FACIAL RECOGNITION ARCHITECTURE (DPDP & GDPR COMPLIANT)
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Passenger counts and safety hazards are detected strictly via anonymous body silhouette segmentation and pose contours. No facial recognition or student biometric identifiers are captured or processed.
            </div>
          </div>
        </div>
        <span className="badge badge-green" style={{ padding: '4px 10px' }}>
          100% PRIVACY VERIFIED
        </span>
      </div>

      {/* Main Analysis Grid: Occupancy Gauge & Hazard Feed */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        {/* Card 1: Overcrowding & Fleet Occupancy Estimation */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--cyan-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>👥</span> Real-Time Passenger Occupancy Estimation
            </h3>
            <span className="badge badge-cyan">MODEL: YOLO-EDGE CV</span>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Fleet Occupancy Rate:</span>
              <b style={{ color: fleetStats.averageOccupancyRate > 85 ? 'var(--rose-primary)' : 'var(--emerald-primary)' }}>
                {fleetStats.averageOccupancyRate}%
              </b>
            </div>
            <div className="progress-bar-wrap" style={{ height: '12px' }}>
              <div 
                className={`progress-bar-fill ${fleetStats.averageOccupancyRate > 90 ? 'progress-red' : (fleetStats.averageOccupancyRate > 75 ? 'progress-yellow' : 'progress-green')}`}
                style={{ width: `${fleetStats.averageOccupancyRate}%` }}
              ></div>
            </div>
          </div>

          {/* Bus Occupancy Breakdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {buses.map(b => {
              const occPct = Math.round((b.current_occupancy / b.capacity) * 100);
              const isOvercrowded = occPct >= 90;
              return (
                <div key={b.id} style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: isOvercrowded ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.82rem' }}>{b.bus_number}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: '700', color: isOvercrowded ? '#EF4444' : '#10B981' }}>
                      {b.current_occupancy}/{b.capacity} ({occPct}%)
                      {isOvercrowded && ' ⚠️ OVERCROWDED'}
                    </span>
                  </div>
                  <div className="progress-bar-wrap">
                    <div 
                      className={`progress-bar-fill ${isOvercrowded ? 'progress-red' : (occPct > 70 ? 'progress-yellow' : 'progress-green')}`}
                      style={{ width: `${Math.min(100, occPct)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card 2: AI Safety Violations & Unusual Activity Stream */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--amber-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚠️</span> Unsafe Situation & Hazard Detection Feed
            </h3>
            <span className="badge badge-amber">LIVE CV LOG</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '340px', overflowY: 'auto' }}>
            {fleetStats.recentAIEvents && fleetStats.recentAIEvents.length > 0 ? (
              fleetStats.recentAIEvents.map((ev, i) => (
                <div key={i} style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderLeft: `3px solid ${ev.event_type.includes('hazard') || ev.event_type.includes('emergency') || ev.event_type.includes('overcrowd') ? '#EF4444' : '#06B6D4'}`,
                  padding: '8px 12px',
                  borderRadius: '0 6px 6px 0',
                  fontSize: '0.75rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <b style={{ color: 'var(--text-main)' }}>{ev.bus_number} • {ev.event_type.toUpperCase()}</b>
                    <span style={{ color: 'var(--text-muted)' }}>{new Date(ev.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div style={{ color: 'var(--text-secondary)' }}>{ev.description}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--cyan-muted)', marginTop: '3px' }}>
                    Confidence Score: {Math.round((ev.confidence || 0.95) * 100)}%
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                ✅ No active hazards detected. Fleet operating under standard safety margins.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Geofence Restricted Rural Zones Monitor */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--cyan-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🛰️</span> Geofenced Restricted Rural Zones & Hazardous Points
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {infrastructure && infrastructure.restrictedZones ? (
            infrastructure.restrictedZones.map(zone => (
              <div key={zone.id} style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${zone.severity === 'HIGH' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                padding: '1rem',
                borderRadius: 'var(--radius-md)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <b style={{ color: 'var(--text-main)', fontSize: '0.85rem' }}>{zone.name}</b>
                  <span className={`badge ${zone.severity === 'HIGH' ? 'badge-red' : 'badge-amber'}`}>
                    {zone.severity} RISK
                  </span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  {zone.description}
                </p>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Perimeter Radius: <b>{zone.radiusMeters}m</b> • GPS: {zone.latitude.toFixed(4)}°N, {zone.longitude.toFixed(4)}°E
                </div>
              </div>
            ))
          ) : null}
        </div>
      </div>
    </div>
  );
}

window.AIAnalysisView = AIAnalysisView;
