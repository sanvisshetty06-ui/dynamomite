/**
 * ROUTELESS – Fleet, Corridors & Student Management Directory Component
 * Bus fleet records, rural route timetables, stop sequences,
 * and complete student registration & pass directory.
 */

function FleetDirectory({ buses, routes, onSelectBusCamera }) {
  const [activeTab, setActiveTab] = React.useState('buses'); // 'buses', 'routes', 'students'
  const [students, setStudents] = React.useState([]);
  const [loadingStudents, setLoadingStudents] = React.useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = React.useState(false);
  const [bannerMsg, setBannerMsg] = React.useState(null);

  // New Student Form State
  const [newStudent, setNewStudent] = React.useState({
    name: '',
    email: '',
    password: 'student123',
    phone: '',
    college_id_card: '',
    pickup_stop_id: routes[0]?.stops?.[0]?.id || 2,
    autoBookBusId: buses[0]?.id || 1,
    preferredSeat: '14A'
  });

  const fetchStudents = () => {
    setLoadingStudents(true);
    fetch('/api/students')
      .then(res => res.json())
      .then(data => {
        if (data.success) setStudents(data.students);
        setLoadingStudents(false);
      })
      .catch(err => {
        console.error('Error fetching students:', err);
        setLoadingStudents(false);
      });
  };

  React.useEffect(() => {
    if (activeTab === 'students') {
      fetchStudents();
    }
  }, [activeTab]);

  // Handle single student registration
  const handleRegisterStudent = (e) => {
    e.preventDefault();
    if (!newStudent.name || !newStudent.email) {
      alert('Student name and email are required.');
      return;
    }

    fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newStudent)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setBannerMsg(`✓ ${data.message} Seat pass generated: ${data.booking ? data.booking.passCode : 'Confirmed'}`);
          fetchStudents();
          setShowAddStudentModal(false);
          setNewStudent({
            name: '',
            email: '',
            password: 'student123',
            phone: '',
            college_id_card: '',
            pickup_stop_id: routes[0]?.stops?.[0]?.id || 2,
            autoBookBusId: buses[0]?.id || 1,
            preferredSeat: '14A'
          });
          setTimeout(() => setBannerMsg(null), 5000);
        } else {
          alert(data.error || 'Registration failed');
        }
      })
      .catch(err => {
        console.error('Error:', err);
        alert('Network error while registering student.');
      });
  };

  // 1-Click Batch Seed 6 Rural Students
  const handleBatchSeed = () => {
    fetch('/api/students/seed-batch', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setBannerMsg(`⚡ ${data.message}`);
          fetchStudents();
          setTimeout(() => setBannerMsg(null), 5000);
        }
      })
      .catch(err => console.error(err));
  };

  const allStops = routes.flatMap(r => r.stops || []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Sub tabs Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className={`role-pill ${activeTab === 'buses' ? 'active' : ''}`}
            onClick={() => setActiveTab('buses')}
          >
            🚌 Rural Bus Fleet ({buses.length})
          </button>
          <button 
            className={`role-pill ${activeTab === 'routes' ? 'active' : ''}`}
            onClick={() => setActiveTab('routes')}
          >
            🛣️ Corridors & Village Stops ({routes.length})
          </button>
          <button 
            className={`role-pill ${activeTab === 'students' ? 'active' : ''}`}
            onClick={() => setActiveTab('students')}
          >
            🎓 Student Directory & Passes ({students.length > 0 ? students.length : 'All'})
          </button>
        </div>

        {activeTab === 'students' && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={handleBatchSeed}
              style={{
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid var(--amber-primary)',
                color: '#FBBF24',
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.78rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              ⚡ 1-Click Add 6 Sample Students
            </button>
            <button 
              onClick={() => setShowAddStudentModal(true)}
              style={{
                background: 'linear-gradient(135deg, #059669, #10B981)',
                border: 'none',
                color: 'white',
                padding: '6px 16px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.78rem',
                fontWeight: '800',
                cursor: 'pointer',
                boxShadow: 'var(--emerald-glow)'
              }}
            >
              ➕ Register New Student
            </button>
          </div>
        )}
      </div>

      {bannerMsg && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.2)',
          border: '1px solid #10B981',
          color: '#10B981',
          padding: '10px 16px',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.85rem',
          fontWeight: '700'
        }}>
          {bannerMsg}
        </div>
      )}

      {/* TAB 1: BUSES */}
      {activeTab === 'buses' && (
        <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px 12px' }}>BUS NUMBER</th>
                <th style={{ padding: '10px 12px' }}>MODEL / SPECS</th>
                <th style={{ padding: '10px 12px' }}>DRIVER</th>
                <th style={{ padding: '10px 12px' }}>LINE / ROUTE</th>
                <th style={{ padding: '10px 12px' }}>OCCUPANCY</th>
                <th style={{ padding: '10px 12px' }}>SPEED</th>
                <th style={{ padding: '10px 12px' }}>STATUS</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {buses.map(b => {
                const occPct = Math.round((b.current_occupancy / b.capacity) * 100);
                return (
                  <tr key={b.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '12px', fontWeight: '800', color: 'var(--cyan-primary)' }}>
                      {b.bus_number}
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                      {b.model || 'Tata Starbus Ultra'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <b style={{ color: 'white' }}>{b.driver_name}</b>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{b.driver_phone}</div>
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                      {b.route_name}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: '700', color: occPct >= 90 ? 'var(--rose-primary)' : 'var(--emerald-primary)' }}>
                        {b.current_occupancy} / {b.capacity} ({occPct}%)
                      </div>
                      <div className="progress-bar-wrap" style={{ width: '90px' }}>
                        <div 
                          className={`progress-bar-fill ${occPct >= 90 ? 'progress-red' : (occPct > 70 ? 'progress-yellow' : 'progress-green')}`}
                          style={{ width: `${Math.min(100, occPct)}%` }}
                        ></div>
                      </div>
                    </td>
                    <td style={{ padding: '12px', fontFamily: 'var(--font-mono)', color: 'var(--cyan-primary)' }}>
                      {Math.round(b.speed || 0)} km/h
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span className={`badge ${b.status === 'EMERGENCY' ? 'badge-red' : (b.status === 'DELAYED' ? 'badge-amber' : 'badge-green')}`}>
                        {b.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <button 
                        onClick={() => onSelectBusCamera(b.id)}
                        style={{
                          background: 'rgba(6, 182, 212, 0.15)',
                          border: '1px solid var(--cyan-muted)',
                          color: 'var(--cyan-primary)',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        📹 Camera
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: ROUTES */}
      {activeTab === 'routes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {routes.map(r => (
            <div key={r.id} className="glass-panel" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--cyan-primary)' }}>
                    {r.route_name} ({r.route_code})
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {r.origin} ➔ {r.destination} • <b>{r.total_distance_km} km</b> • Est. {r.estimated_duration_min} mins
                  </div>
                </div>
                <span className="badge badge-cyan">ACTIVE CORRIDOR</span>
              </div>

              {/* Stops list */}
              <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '8px' }}>
                VILLAGE STOPS & SCHEDULED TIMETABLE:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                {(r.stops || []).map(s => (
                  <div key={s.id} style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    fontSize: '0.78rem'
                  }}>
                    <div style={{ fontWeight: '800', color: 'white' }}>{s.stop_name}</div>
                    <div style={{ color: 'var(--cyan-muted)', fontSize: '0.7rem' }}>📍 Village: {s.village_name}</div>
                    <div style={{ color: 'var(--emerald-primary)', fontFamily: 'var(--font-mono)', marginTop: '3px' }}>
                      ⏰ {s.scheduled_time} • 👥 {s.student_count || 0} Students
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: STUDENT DIRECTORY & PASSES */}
      {activeTab === 'students' && (
        <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--cyan-primary)' }}>
                Registered Students & Transit Pass Manifest ({students.length} Students)
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                All registered rural students, assigned pickup shelters, and digital boarding pass codes
              </span>
            </div>
            <button 
              onClick={fetchStudents}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '0.75rem',
                cursor: 'pointer'
              }}
            >
              🔄 Refresh List
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px 12px' }}>STUDENT NAME</th>
                <th style={{ padding: '10px 12px' }}>COLLEGE ID</th>
                <th style={{ padding: '10px 12px' }}>EMAIL / PHONE</th>
                <th style={{ padding: '10px 12px' }}>PICKUP SHELTER</th>
                <th style={{ padding: '10px 12px' }}>ASSIGNED BUS</th>
                <th style={{ padding: '10px 12px' }}>SEAT</th>
                <th style={{ padding: '10px 12px' }}>PASS CODE</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <td style={{ padding: '12px', fontWeight: '800', color: 'white' }}>
                    {s.name}
                  </td>
                  <td style={{ padding: '12px', color: 'var(--cyan-primary)', fontFamily: 'var(--font-mono)' }}>
                    {s.college_id_card || 'RIT-STU-001'}
                  </td>
                  <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                    <div>{s.email}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.phone}</div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <b style={{ color: 'white' }}>{s.pickup_stop_name || 'Village Shelter'}</b>
                    <div style={{ fontSize: '0.7rem', color: 'var(--cyan-muted)' }}>{s.village_name || 'Rural Corridor'}</div>
                  </td>
                  <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                    {s.bus_number ? (
                      <span className="badge badge-cyan">{s.bus_number}</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>
                    )}
                  </td>
                  <td style={{ padding: '12px', fontWeight: '800', color: 'var(--emerald-primary)' }}>
                    {s.seat_number || '14A'}
                  </td>
                  <td style={{ padding: '12px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-cyan)' }}>
                    {s.pass_code || 'RTL-CONFIRMED'}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <span className="badge badge-green">
                      {s.pass_status || 'CONFIRMED'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: REGISTER NEW STUDENT                                          */}
      {/* ==================================================================== */}
      {showAddStudentModal && (
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
                  <span>🎓</span> Register New Student
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Add a student to the rural transit network and generate an active pass
                </span>
              </div>
              <button 
                onClick={() => setShowAddStudentModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterStudent} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Full Name:
                  </label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Rohan Patil"
                    value={newStudent.name}
                    onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                    style={{
                      width: '100%',
                      background: '#0F172A',
                      color: 'white',
                      border: '1px solid var(--border-subtle)',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    College ID Card:
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. RIT-CSE-2024-099"
                    value={newStudent.college_id_card}
                    onChange={(e) => setNewStudent({ ...newStudent, college_id_card: e.target.value })}
                    style={{
                      width: '100%',
                      background: '#0F172A',
                      color: 'white',
                      border: '1px solid var(--border-subtle)',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Email Address:
                  </label>
                  <input 
                    type="email" 
                    required
                    placeholder="e.g. rohan.patil@routeless.org"
                    value={newStudent.email}
                    onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                    style={{
                      width: '100%',
                      background: '#0F172A',
                      color: 'white',
                      border: '1px solid var(--border-subtle)',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Phone Number:
                  </label>
                  <input 
                    type="text" 
                    placeholder="+91 94490 00000"
                    value={newStudent.phone}
                    onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
                    style={{
                      width: '100%',
                      background: '#0F172A',
                      color: 'white',
                      border: '1px solid var(--border-subtle)',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
              </div>

              {/* Village Pickup Shelter */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Village Pickup Stop:
                </label>
                <select 
                  value={newStudent.pickup_stop_id}
                  onChange={(e) => setNewStudent({ ...newStudent, pickup_stop_id: e.target.value })}
                  style={{
                    width: '100%',
                    background: '#0F172A',
                    color: 'white',
                    border: '1px solid var(--border-subtle)',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '0.85rem'
                  }}
                >
                  {allStops.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.stop_name} ({s.village_name}) — Scheduled: {s.scheduled_time}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assigned Bus & Seat */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Auto-Assign Bus:
                  </label>
                  <select 
                    value={newStudent.autoBookBusId}
                    onChange={(e) => setNewStudent({ ...newStudent, autoBookBusId: e.target.value })}
                    style={{
                      width: '100%',
                      background: '#0F172A',
                      color: 'white',
                      border: '1px solid var(--border-subtle)',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '0.85rem'
                    }}
                  >
                    {buses.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.bus_number} ({b.capacity - b.current_occupancy} open seats)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Seat Preference:
                  </label>
                  <select 
                    value={newStudent.preferredSeat}
                    onChange={(e) => setNewStudent({ ...newStudent, preferredSeat: e.target.value })}
                    style={{
                      width: '100%',
                      background: '#0F172A',
                      color: 'white',
                      border: '1px solid var(--border-subtle)',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '0.85rem'
                    }}
                  >
                    <option value="06A">Seat 06A (Window)</option>
                    <option value="08B">Seat 08B (Aisle)</option>
                    <option value="12A">Seat 12A (Window)</option>
                    <option value="14A">Seat 14A (Window)</option>
                    <option value="16B">Seat 16B (Aisle)</option>
                    <option value="18A">Seat 18A (Window)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1rem' }}>
                <button 
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
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
                  type="submit"
                  style={{
                    background: 'linear-gradient(135deg, #059669, #10B981)',
                    border: 'none',
                    color: 'white',
                    padding: '8px 22px',
                    borderRadius: '6px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    boxShadow: 'var(--emerald-glow)'
                  }}
                >
                  Register Student & Issue Pass
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

window.FleetDirectory = FleetDirectory;
