/**
 * ROUTELESS – Driver Cockpit Interface Component
 * START TRIP button, Browser Geolocation API sharing,
 * interactive stop checklist, passenger manifest, and Driver Emergency SOS.
 */

function DriverView({ currentBus, routes, onTriggerSOS }) {
  const [isTripActive, setIsTripActive] = React.useState(false);
  const [gpsActive, setGpsActive] = React.useState(false);
  const [currentCoords, setCurrentCoords] = React.useState({ lat: 15.6780, lng: 74.6100, speed: 38, heading: 45 });
  const [tripElapsedSec, setTripElapsedSec] = React.useState(0);
  const [showSosModal, setShowSosModal] = React.useState(false);
  const [sosReason, setSosReason] = React.useState('Mechanical Breakdown - Engine Overheating');
  const [manifest, setManifest] = React.useState([]);
  const [boardedStudents, setBoardedStudents] = React.useState(new Set());
  const [completedStops, setCompletedStops] = React.useState(new Set([1]));

  const bus = currentBus || {
    id: 1,
    bus_number: 'KA-22-RT-101',
    driver_name: 'Ramesh Kulkarni',
    driver_phone: '+91 94481 22334',
    model: 'Tata Starbus Ultra Rural',
    capacity: 42,
    current_occupancy: 31,
    route_name: 'Khanapur Rural Corridor',
    status: 'IN_TRANSIT'
  };

  // Fetch student manifest for this bus
  React.useEffect(() => {
    fetch(`/api/bookings/manifest/${bus.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setManifest(data.manifest);
      })
      .catch(err => console.error('Error fetching manifest:', err));
  }, [bus.id]);

  // Trip Elapsed Timer
  React.useEffect(() => {
    let timer = null;
    if (isTripActive) {
      timer = setInterval(() => {
        setTripElapsedSec(s => s + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isTripActive]);

  // START / END TRIP Action
  const toggleTrip = () => {
    if (!isTripActive) {
      // START TRIP: Activate GPS via Browser Geolocation API
      setIsTripActive(true);
      setGpsActive(true);

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const spd = pos.coords.speed ? (pos.coords.speed * 3.6) : 38;
            setCurrentCoords({ lat, lng, speed: spd, heading: 45 });

            // Post location to server
            fetch('/api/tracking/update', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ busId: bus.id, latitude: lat, longitude: lng, speed: spd, heading: 45 })
            }).catch(e => console.error(e));
          },
          (err) => {
            console.warn('Browser GPS permission denied or unavailable, using high-accuracy rural road simulation coordinates:', err.message);
          },
          { enableHighAccuracy: true }
        );
      }
    } else {
      // END TRIP
      setIsTripActive(false);
      setGpsActive(false);
      fetch(`/api/buses/${bus.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'IDLE' })
      }).catch(e => console.error(e));
    }
  };

  // Toggle student boarding
  const toggleStudentBoarding = (bookingId) => {
    setBoardedStudents(prev => {
      const next = new Set(prev);
      if (next.has(bookingId)) {
        next.delete(bookingId);
      } else {
        next.add(bookingId);
      }
      return next;
    });
  };

  // Toggle stop completion
  const toggleStop = (stopSeq) => {
    setCompletedStops(prev => {
      const next = new Set(prev);
      if (next.has(stopSeq)) {
        next.delete(stopSeq);
      } else {
        next.add(stopSeq);
      }
      return next;
    });
  };

  // Trigger SOS Emergency
  const handleConfirmSOS = () => {
    onTriggerSOS(bus.id, sosReason);
    setShowSosModal(false);
  };

  const formatTimer = (sec) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentRoute = routes.find(r => r.id === bus.route_id) || routes[0];
  const stops = currentRoute ? (currentRoute.stops || []) : [];

  return (
    <div className="driver-cockpit" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Driver Header Profile Card */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '1.25rem', color: 'var(--text-main)' }}>{bus.driver_name}</h2>
              <span className={`badge ${isTripActive ? 'badge-green' : 'badge-amber'}`}>
                {isTripActive ? 'TRIP IN PROGRESS' : 'IDLE / READY'}
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Vehicle: <b>{bus.bus_number}</b> ({bus.model}) • Assigned: <b>{bus.route_name}</b>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>GPS Broadcasting Status:</div>
            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: gpsActive ? 'var(--cyan-primary)' : 'var(--text-muted)' }}>
              {gpsActive ? '🟢 Live Geolocation Synced' : '⚪ Geolocation Standby'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Cockpit Telemetry & Big Action Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {/* Speedometer Card */}
        <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '1rem' }}>
            Rural Road Speedometer (Limit: 50 km/h)
          </div>

          <div className="speedo-circle">
            <div className="speedo-value">{Math.round(bus.speed || 38)}</div>
            <div className="speedo-unit">KM / H</div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: '0.8rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>TRIP TIMER</span>
              <b style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem' }}>{formatTimer(tripElapsedSec)}</b>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>HEADING</span>
              <b style={{ color: 'var(--cyan-primary)' }}>NE 45°</b>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>CABIN OCCUPANCY</span>
              <b style={{ color: bus.current_occupancy >= bus.capacity ? 'var(--rose-primary)' : 'var(--emerald-primary)' }}>
                {bus.current_occupancy}/{bus.capacity}
              </b>
            </div>
          </div>
        </div>

        {/* Action Buttons: START TRIP & EMERGENCY SOS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'center' }}>
          {/* Primary Trip Button */}
          <button 
            className={`btn-start-trip ${isTripActive ? 'btn-end-trip' : ''}`}
            onClick={toggleTrip}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              {isTripActive ? (
                <rect x="6" y="6" width="12" height="12"></rect>
              ) : (
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              )}
            </svg>
            {isTripActive ? 'END RURAL TRIP' : 'START TRIP (SHARE GPS)'}
          </button>

          {/* Giant SOS Button */}
          <button 
            className="btn-sos"
            onClick={() => setShowSosModal(true)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            EMERGENCY SOS
          </button>

          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: '1.4' }}>
            ℹ️ Activating SOS immediately broadcasts bus location to Transport Admin and locates the nearest rescue bus.
          </div>
        </div>
      </div>

      {/* Stop Waypoints Checklist */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--cyan-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>📍</span> Rural Pickup Stops Checklist ({stops.length} Stops)
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {stops.map((stop, i) => {
            const isDone = completedStops.has(stop.sequence_order);
            return (
              <div 
                key={stop.id}
                onClick={() => toggleStop(stop.sequence_order)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: isDone ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                  border: isDone ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: isDone ? '#10B981' : '#1E293B',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '800',
                    fontSize: '0.75rem'
                  }}>
                    {isDone ? '✓' : stop.sequence_order}
                  </div>
                  <div>
                    <b style={{ color: isDone ? 'var(--emerald-primary)' : 'var(--text-main)', fontSize: '0.88rem' }}>
                      {stop.stop_name}
                    </b>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
                      ({stop.village_name})
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-cyan)', fontFamily: 'var(--font-mono)' }}>
                    {stop.scheduled_time}
                  </span>
                  <span className={`badge ${isDone ? 'badge-green' : 'badge-amber'}`}>
                    {isDone ? 'COMPLETED' : 'PENDING'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Booked Student Passenger Manifest */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>📋</span> Student Passenger Manifest & Boarding Verification
        </h3>

        {manifest.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No student reservations logged for this trip yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {manifest.map(m => {
              const isBoarded = boardedStudents.has(m.booking_id);
              return (
                <div key={m.booking_id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem'
                }}>
                  <div>
                    <b>{m.student_name}</b> ({m.college_id_card})
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Pickup: <b>{m.pickup_stop_name}</b> • Seat: <b>{m.seat_number}</b> • Pass: {m.pass_code}
                    </div>
                  </div>

                  <button 
                    onClick={() => toggleStudentBoarding(m.booking_id)}
                    style={{
                      background: isBoarded ? 'linear-gradient(135deg, #059669, #10B981)' : 'rgba(255, 255, 255, 0.08)',
                      border: 'none',
                      color: 'white',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.72rem',
                      fontWeight: '700'
                    }}
                  >
                    {isBoarded ? '✓ Boarded' : 'Mark Boarded'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Driver SOS Confirmation Modal */}
      {showSosModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(5, 8, 20, 0.9)',
          backdropFilter: 'blur(10px)',
          zIndex: 3000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem'
        }}>
          <div className="glass-panel" style={{ width: '500px', maxWidth: '100%', padding: '1.75rem', border: '2px solid #EF4444' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#EF4444', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🚨 CONFIRM DRIVER EMERGENCY SOS
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Select the primary cause of emergency. This will pinpoint your bus location to Transport Control and immediately calculate alternative rescue options.
            </p>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Incident Reason:</label>
              <select 
                value={sosReason}
                onChange={(e) => setSosReason(e.target.value)}
                style={{
                  width: '100%',
                  background: '#0F172A',
                  color: 'white',
                  border: '1px solid var(--border-active)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '0.85rem'
                }}
              >
                <option value="Mechanical Breakdown - Engine Overheating">⚠️ Mechanical Breakdown - Engine Overheating</option>
                <option value="Road Flooded / Causeway Waterlogging">🌊 Road Flooded / Causeway Waterlogging</option>
                <option value="Medical Emergency (Student Illness/Injury)">🏥 Medical Emergency (Student Illness/Injury)</option>
                <option value="Accident / Road Collision">🚨 Accident / Road Collision</option>
                <option value="Security Incident / Public Disturbance">🛡️ Security Incident / Public Disturbance</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                onClick={() => setShowSosModal(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmSOS}
                style={{
                  background: 'linear-gradient(135deg, #DC2626, #EF4444)',
                  border: 'none',
                  color: 'white',
                  padding: '8px 20px',
                  borderRadius: '6px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  boxShadow: 'var(--rose-glow)'
                }}
              >
                BROADCAST SOS NOW
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

window.DriverView = DriverView;
