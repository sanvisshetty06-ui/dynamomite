/**
 * ROUTELESS – Emergency Monitoring & Rescue Coordinator Component
 * Incident dispatch, location pinpointing, automated nearest alternative bus
 * recommendation, detour suggestions, camera jump, and alert resolution.
 */

function EmergencyCenter({ alerts, onResolveAlert, onSelectBusCamera }) {
  const activeAlerts = alerts.filter(a => a.status === 'ACTIVE');
  const pastAlerts = alerts.filter(a => a.status === 'RESOLVED');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Active Incidents Section */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.15rem', color: activeAlerts.length > 0 ? 'var(--rose-primary)' : 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🚨</span> Active Emergency Incidents ({activeAlerts.length})
          </h2>
          {activeAlerts.length > 0 && (
            <span className="badge badge-red" style={{ padding: '6px 12px', fontSize: '0.75rem', animation: 'sos-pulse 1.5s infinite' }}>
              HIGH PRIORITY DISPATCH ACTIVE
            </span>
          )}
        </div>

        {activeAlerts.length === 0 ? (
          <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🛡️</div>
            <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--emerald-primary)' }}>
              All Rural Transit Lines Operating Normally
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              No active breakdowns, SOS signals, or geofence breaches reported across the fleet.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {activeAlerts.map(alert => (
              <div 
                key={alert.id} 
                className="glass-panel" 
                style={{
                  border: '1px solid var(--rose-primary)',
                  boxShadow: 'var(--rose-glow)',
                  padding: '1.5rem',
                  position: 'relative'
                }}
              >
                {/* Alert Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="badge badge-red">{alert.alert_type}</span>
                      <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>
                        {alert.bus_number} — {alert.driver_name}
                      </h3>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Driver Phone: <b>{alert.driver_phone}</b> • Route: <b>{alert.route_name}</b> • Reported: {new Date(alert.created_at).toLocaleTimeString()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    {/* Jump to live camera */}
                    <button 
                      onClick={() => onSelectBusCamera(alert.bus_id)}
                      style={{
                        background: 'rgba(6, 182, 212, 0.2)',
                        border: '1px solid var(--cyan-primary)',
                        color: 'var(--cyan-primary)',
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      📹 View Bus Camera
                    </button>

                    {/* Resolve Alert button */}
                    <button 
                      onClick={() => onResolveAlert(alert.id)}
                      style={{
                        background: 'linear-gradient(135deg, #059669, #10B981)',
                        border: 'none',
                        color: 'white',
                        padding: '6px 14px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem',
                        fontWeight: '800',
                        cursor: 'pointer'
                      }}
                    >
                      ✓ Mark Resolved
                    </button>
                  </div>
                </div>

                {/* Incident Description */}
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  borderLeft: '4px solid #EF4444',
                  padding: '10px 14px',
                  borderRadius: '0 6px 6px 0',
                  marginBottom: '1.25rem',
                  fontSize: '0.85rem',
                  color: 'var(--text-main)'
                }}>
                  {alert.description}
                </div>

                {/* Automated Rescue Coordinator & Nearest Alternative Bus */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '1rem',
                  background: 'rgba(0, 0, 0, 0.3)',
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}>
                  {/* Nearest Rescue Bus Box */}
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--cyan-primary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                      🚌 Recommended Rescue Bus (Nearest Alternative)
                    </div>
                    {alert.rescueBus ? (
                      <div>
                        <div style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-main)' }}>
                          {alert.rescueBus.busNumber} ({alert.rescueBus.driverName})
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.5' }}>
                          Distance: <b style={{ color: 'var(--cyan-primary)' }}>{alert.rescueBus.distanceKm} km away</b><br/>
                          Estimated Intercept ETA: <b style={{ color: 'var(--emerald-primary)' }}>~{alert.rescueBus.etaMinutes} minutes</b><br/>
                          Vacant Seats for Transfer: <b style={{ color: '#FBBF24' }}>{alert.rescueBus.availableSeats} seats open</b>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Searching for standby vehicles...
                      </div>
                    )}
                  </div>

                  {/* Detour Suggestion */}
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--amber-primary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                      🛣️ Suggested Detour / Bypass Route
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                      {alert.suggestedDetour}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                      Bypasses narrow unpaved bridge corridor. Cleared for heavy passenger vehicles.
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Incident History Audit Log */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--text-main)', marginBottom: '1rem' }}>
          📋 Recent Emergency Resolution Audit Log
        </h3>
        {pastAlerts.length === 0 ? (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No past incidents on record.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {pastAlerts.slice(0, 5).map(pa => (
              <div key={pa.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 12px',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.78rem'
              }}>
                <div>
                  <b style={{ color: 'var(--text-main)' }}>{pa.bus_number} — {pa.alert_type}</b>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{pa.description}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="badge badge-green">RESOLVED</span>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {new Date(pa.resolved_at || pa.created_at).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

window.EmergencyCenter = EmergencyCenter;
