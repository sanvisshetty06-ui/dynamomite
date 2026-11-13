/**
 * ROUTELESS – Student Portal Interface Component
 * Interactive Seat Booking & Pass Reservation, Live ETA Countdown,
 * First-Mile Rural Pickup Guidance, Digital QR Pass, and Student Safety SOS.
 */

function StudentView({ buses, routes, onTriggerSOS, currentUser, authToken, onRefreshData }) {
  const [activePass, setActivePass] = React.useState(null);
  const [loadingPass, setLoadingPass] = React.useState(true);
  const [showBookingModal, setShowBookingModal] = React.useState(false);
  const [showSosModal, setShowSosModal] = React.useState(false);
  const [sosSent, setSosSent] = React.useState(false);
  const [bookingSuccessMsg, setBookingSuccessMsg] = React.useState(null);
  const [allStudentsList, setAllStudentsList] = React.useState([]);

  // Booking Form State
  const [selectedRouteId, setSelectedRouteId] = React.useState(routes[0] ? routes[0].id : 1);
  const [selectedStopId, setSelectedStopId] = React.useState('');
  const [selectedBusId, setSelectedBusId] = React.useState('');
  const [selectedSeat, setSelectedSeat] = React.useState('14A');
  const [isSubmittingBooking, setIsSubmittingBooking] = React.useState(false);

  // Fetch active student pass
  const fetchPass = () => {
    fetch('/api/bookings/my-pass', {
      headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.hasActivePass) {
          setActivePass(data.pass);
        } else {
          setActivePass(null);
        }
        setLoadingPass(false);
      })
      .catch(err => {
        console.error('Error fetching pass:', err);
        setLoadingPass(false);
      });
  };

  const loadAllStudents = () => {
    fetch('/api/students')
      .then(res => res.json())
      .then(d => { if (d.success) setAllStudentsList(d.students); })
      .catch(e => console.error(e));
  };

  React.useEffect(() => {
    fetchPass();
    loadAllStudents();
  }, [authToken]);

  // Fast switch to another student profile
  const handleSwitchStudentProfile = (email) => {
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'student123' })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          localStorage.setItem('rtl_token', data.token);
          window.location.reload();
        }
      })
      .catch(e => console.error(e));
  };

  // When selected route changes, update default stop and bus
  React.useEffect(() => {
    const route = routes.find(r => r.id === Number(selectedRouteId)) || routes[0];
    if (route && route.stops && route.stops.length > 0) {
      setSelectedStopId(route.stops[0].id);
    }
    const matchingBus = buses.find(b => b.route_id === Number(selectedRouteId)) || buses[0];
    if (matchingBus) {
      setSelectedBusId(matchingBus.id);
    }
  }, [selectedRouteId, routes, buses]);

  // Assigned or tracked bus
  const trackedBus = (activePass ? buses.find(b => b.id === activePass.bus_id) : buses[0]) || buses[0];
  const etaMinutes = trackedBus ? (trackedBus.etaMinutes || 12) : 12;

  // Handle Booking Submission
  const handleBookSeat = (e) => {
    e.preventDefault();
    if (!selectedBusId || !selectedRouteId || !selectedStopId) {
      alert('Please select a route, pickup stop, and bus.');
      return;
    }

    setIsSubmittingBooking(true);
    fetch('/api/bookings/book', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        busId: Number(selectedBusId),
        routeId: Number(selectedRouteId),
        pickupStopId: Number(selectedStopId),
        seatNumber: selectedSeat
      })
    })
      .then(res => res.json())
      .then(data => {
        setIsSubmittingBooking(false);
        if (data.success) {
          setBookingSuccessMsg(`Seat ${data.seatNumber} reserved successfully! Pass Code: ${data.passCode}`);
          fetchPass();
          if (onRefreshData) onRefreshData();
          setTimeout(() => {
            setShowBookingModal(false);
            setBookingSuccessMsg(null);
          }, 2000);
        } else {
          alert(data.error || 'Booking failed');
        }
      })
      .catch(err => {
        setIsSubmittingBooking(false);
        console.error('Booking error:', err);
        alert('Network error while booking seat.');
      });
  };

  const handleStudentSOS = () => {
    onTriggerSOS(trackedBus ? trackedBus.id : 1, 'Student Safety Concern / First-Mile Pickup Assistance Request', 'STUDENT');
    setSosSent(true);
    setTimeout(() => {
      setShowSosModal(false);
      setSosSent(false);
    }, 2500);
  };

  const activeRouteObj = routes.find(r => r.id === Number(selectedRouteId)) || routes[0];
  const activeStops = activeRouteObj ? (activeRouteObj.stops || []) : [];
  const activeBusesForRoute = buses.filter(b => b.route_id === Number(selectedRouteId));

  const availableSeatChoices = ['04A (Window)', '04B (Aisle)', '08A (Window)', '08B (Aisle)', '12A (Window)', '14A (Window)', '14B (Aisle)', '16A (Window)', '18B (Aisle)'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Student Welcome & Profile Header */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '1.25rem', color: 'var(--text-main)' }}>
                {currentUser ? currentUser.name : 'Ananya Hegde'}
              </h2>
              <span className="badge badge-cyan">STUDENT VERIFIED</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              College ID: <b>{currentUser && currentUser.college_id_card ? currentUser.college_id_card : 'RIT-CSE-2024-042'}</b> • Destination: <b>Rural Institute of Technology Campus</b>
            </div>

            {/* Quick Switch Student Dropdown */}
            {allStudentsList.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '600' }}>Active Student:</span>
                <select 
                  value={currentUser ? currentUser.email : ''}
                  onChange={(e) => handleSwitchStudentProfile(e.target.value)}
                  style={{
                    background: '#0F172A',
                    color: 'var(--cyan-primary)',
                    border: '1px solid var(--border-subtle)',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: '700'
                  }}
                >
                  {allStudentsList.map(s => (
                    <option key={s.id} value={s.email}>
                      {s.name} ({s.college_id_card || s.village_name || 'Student'})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {/* Book / Change Seat Button */}
            <button 
              onClick={() => setShowBookingModal(true)}
              style={{
                background: 'linear-gradient(135deg, #059669, #10B981)',
                border: 'none',
                color: 'white',
                padding: '8px 18px',
                borderRadius: 'var(--radius-md)',
                fontWeight: '800',
                fontSize: '0.82rem',
                cursor: 'pointer',
                boxShadow: 'var(--emerald-glow)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>🎟️</span> {activePass ? 'Book Another Seat / Change Stop' : 'Book Bus Seat Now'}
            </button>

            {/* Student SOS Button */}
            <button 
              onClick={() => setShowSosModal(true)}
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #EF4444',
                color: '#EF4444',
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                fontWeight: '700',
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>🛡️</span> SOS
            </button>
          </div>
        </div>
      </div>

      {/* Hero Card: "My Next Bus" Live ETA Countdown */}
      <div className="glass-panel" style={{
        padding: '2rem',
        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(15, 23, 42, 0.9))',
        border: '1px solid var(--border-active)',
        boxShadow: 'var(--cyan-glow)'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--cyan-primary)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              🚌 YOUR ASSIGNED MORNING TRANSIT
            </span>
            <h1 style={{ fontSize: '2.2rem', fontWeight: '900', color: 'white', margin: '6px 0' }}>
              {trackedBus ? trackedBus.bus_number : 'KA-22-RT-101'}
            </h1>
            <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              Line: <b>{trackedBus ? trackedBus.route_name : 'Khanapur Rural Corridor'}</b>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Driver: <b>{trackedBus ? trackedBus.driver_name : 'Ramesh Kulkarni'}</b> ({trackedBus ? trackedBus.driver_phone : '+91 94481 22334'})
            </div>
          </div>

          {/* Large Live ETA Clock */}
          <div style={{
            background: 'rgba(10, 15, 36, 0.8)',
            padding: '1.5rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            textAlign: 'center'
          }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700' }}>
              ESTIMATED ARRIVAL AT YOUR STOP
            </span>
            <div style={{ fontSize: '3rem', fontWeight: '900', color: 'var(--emerald-primary)', fontFamily: 'var(--font-mono)', lineHeight: '1.1', margin: '4px 0' }}>
              ~{etaMinutes} <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>MIN</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Speed: <b>{Math.round(trackedBus ? trackedBus.speed : 38)} km/h</b> • Status: <b style={{ color: 'var(--emerald-primary)' }}>{trackedBus ? trackedBus.status : 'IN_TRANSIT'}</b>
            </div>
          </div>
        </div>

        {/* Live Occupancy Status Bar */}
        <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
            <span>Bus Occupancy: <b>{trackedBus ? trackedBus.current_occupancy : 31}/{trackedBus ? trackedBus.capacity : 42} seats filled</b></span>
            <span style={{ color: (trackedBus && trackedBus.current_occupancy >= trackedBus.capacity) ? 'var(--rose-primary)' : 'var(--emerald-primary)', fontWeight: '700' }}>
              {trackedBus && trackedBus.current_occupancy >= trackedBus.capacity ? '⚠️ Max Capacity' : `✓ ${trackedBus ? (trackedBus.capacity - trackedBus.current_occupancy) : 11} Seats Available`}
            </span>
          </div>
          <div className="progress-bar-wrap">
            <div 
              className={`progress-bar-fill ${(trackedBus && trackedBus.current_occupancy >= trackedBus.capacity) ? 'progress-red' : 'progress-green'}`} 
              style={{ width: `${Math.min(100, Math.round(((trackedBus ? trackedBus.current_occupancy : 31) / (trackedBus ? trackedBus.capacity : 42)) * 100))}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Grid: First-Mile Guidance & Digital Pass */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* First-Mile Rural Pickup Point Guidance */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--cyan-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📍</span> First-Mile Rural Pickup Point
            </h3>
            <span className="badge badge-cyan">STOP GUIDANCE</span>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: '800', color: 'white' }}>
              {activePass ? activePass.pickup_stop_name : 'Malhar Gaon Shelter Stop'}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--cyan-muted)', marginTop: '2px' }}>
              Village: <b>{activePass ? activePass.village_name : 'Malhar'}</b> • Landmark: {activePass && activePass.landmark ? activePass.landmark : 'Opposite Banyan Tree Chawl'}
            </div>

            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
              <div>⏰ Scheduled Pickup Time: <b style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>{activePass ? activePass.scheduled_time : '07:25 AM'}</b></div>
              <div>🚶 Walking Distance: <b>~450m (approx 6 min walking pace)</b></div>
              <div>💡 Safety Note: Well-lit shelter junction with emergency call box & panchayat shade</div>
            </div>
          </div>
        </div>

        {/* Digital Student Bus Pass Card */}
        <div className="student-pass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <span className="badge badge-cyan" style={{ fontSize: '0.65rem', marginBottom: '4px' }}>OFFICIAL DIGITAL PASS</span>
              <h3 style={{ fontSize: '1.1rem', color: 'white' }}>Rural Transit Pass</h3>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Valid for Academic Session 2026-27</div>
            </div>

            {/* QR Mock graphic */}
            <div className="pass-qr-mock">
              <svg width="78" height="78" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="2.5">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
                <line x1="7" y1="7" x2="7.01" y2="7"></line>
                <line x1="17" y1="17" x2="17.01" y2="17"></line>
                <line x1="7" y1="17" x2="7.01" y2="17"></line>
                <line x1="17" y1="17" x2="17.01" y2="17"></line>
              </svg>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.78rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '0.75rem' }}>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.68rem' }}>PASS CODE</span>
              <b style={{ color: 'var(--cyan-primary)', fontFamily: 'var(--font-mono)' }}>
                {activePass ? activePass.pass_code : 'RTL-PASS-8891'}
              </b>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.68rem' }}>RESERVED SEAT</span>
              <b style={{ color: 'var(--emerald-primary)', fontSize: '0.95rem' }}>
                {activePass ? activePass.seat_number : 'Seat 14A'}
              </b>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.68rem' }}>STUDENT NAME</span>
              <b>{currentUser ? currentUser.name : 'Ananya Hegde'}</b>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.68rem' }}>STATUS</span>
              <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>
                {activePass ? activePass.status : 'CONFIRMED'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* MODAL: BOOK BUS SEAT / RESERVE RURAL PASS                            */}
      {/* ==================================================================== */}
      {showBookingModal && (
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
          <div className="glass-panel" style={{ width: '560px', maxWidth: '100%', padding: '2rem', border: '1px solid var(--border-active)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--cyan-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🎟️</span> Reserve Student Bus Seat
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Select your rural corridor, pickup shelter, and seat preference
                </span>
              </div>
              <button 
                onClick={() => setShowBookingModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {bookingSuccessMsg ? (
              <div style={{
                background: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid #10B981',
                color: '#10B981',
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                textAlign: 'center',
                fontWeight: '700',
                fontSize: '0.95rem'
              }}>
                🎉 {bookingSuccessMsg}
              </div>
            ) : (
              <form onSubmit={handleBookSeat} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                {/* 1. Select Route / Corridor */}
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    1. SELECT RURAL CORRIDOR:
                  </label>
                  <select 
                    value={selectedRouteId}
                    onChange={(e) => setSelectedRouteId(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#0F172A',
                      color: 'white',
                      border: '1px solid var(--border-subtle)',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      fontSize: '0.85rem'
                    }}
                  >
                    {routes.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.route_name} ({r.total_distance_km} km • {r.origin} ➔ {r.destination})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Select Pickup Stop */}
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    2. SELECT YOUR VILLAGE PICKUP STOP:
                  </label>
                  <select 
                    value={selectedStopId}
                    onChange={(e) => setSelectedStopId(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#0F172A',
                      color: 'white',
                      border: '1px solid var(--border-subtle)',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      fontSize: '0.85rem'
                    }}
                  >
                    {activeStops.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.stop_name} ({s.village_name}) — Scheduled: {s.scheduled_time}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Select Bus */}
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    3. SELECT OPERATING BUS:
                  </label>
                  <select 
                    value={selectedBusId}
                    onChange={(e) => setSelectedBusId(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#0F172A',
                      color: 'white',
                      border: '1px solid var(--border-subtle)',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      fontSize: '0.85rem'
                    }}
                  >
                    {activeBusesForRoute.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.bus_number} — Driver: {b.driver_name} ({b.capacity - b.current_occupancy} seats available)
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Select Seat Preference */}
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    4. SELECT SEAT PREFERENCE:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '8px' }}>
                    {availableSeatChoices.map(seat => {
                      const seatCode = seat.split(' ')[0];
                      const isSelected = selectedSeat === seatCode;
                      return (
                        <div 
                          key={seat}
                          onClick={() => setSelectedSeat(seatCode)}
                          style={{
                            padding: '8px 6px',
                            textAlign: 'center',
                            background: isSelected ? 'rgba(6, 182, 212, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                            border: `1px solid ${isSelected ? 'var(--cyan-primary)' : 'var(--border-subtle)'}`,
                            color: isSelected ? 'var(--cyan-primary)' : 'var(--text-secondary)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: '700'
                          }}
                        >
                          💺 {seat}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Submit Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1rem' }}>
                  <button 
                    type="button"
                    onClick={() => setShowBookingModal(false)}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-secondary)',
                      padding: '10px 18px',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>

                  <button 
                    type="submit"
                    disabled={isSubmittingBooking}
                    style={{
                      background: 'linear-gradient(135deg, #059669, #10B981)',
                      border: 'none',
                      color: 'white',
                      padding: '10px 24px',
                      borderRadius: '6px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      boxShadow: 'var(--emerald-glow)'
                    }}
                  >
                    {isSubmittingBooking ? 'Reserving...' : '✓ Confirm Seat & Issue Pass'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Student Safety Assistance Modal */}
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
          <div className="glass-panel" style={{ width: '450px', maxWidth: '100%', padding: '1.75rem', border: '1px solid var(--rose-primary)' }}>
            <h3 style={{ fontSize: '1.15rem', color: '#EF4444', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🛡️ Student Safety Assistance
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Are you experiencing a delay, feeling unsafe at the shelter, or need transportation dispatch assistance?
            </p>

            {sosSent ? (
              <div style={{ background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10B981', color: '#10B981', padding: '12px', borderRadius: '6px', textAlign: 'center', fontWeight: '700', fontSize: '0.85rem' }}>
                ✓ Assistance alert transmitted to Transport Dispatch. Controller will contact you or driver shortly.
              </div>
            ) : (
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
                  onClick={handleStudentSOS}
                  style={{
                    background: 'linear-gradient(135deg, #DC2626, #EF4444)',
                    border: 'none',
                    color: 'white',
                    padding: '8px 18px',
                    borderRadius: '6px',
                    fontWeight: '800',
                    cursor: 'pointer'
                  }}
                >
                  Confirm Alert
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

window.StudentView = StudentView;
