/**
 * ROUTELESS – Master React Application Root
 * Coordinates real-time Socket.IO subscriptions, Web Audio alert chime,
 * role-based views (Student, Driver, Admin), and full platform state.
 */

function App() {
  const [currentRole, setCurrentRole] = React.useState('admin'); // 'admin', 'driver', 'student'
  const [adminTab, setAdminTab] = React.useState('map'); // 'map', 'cameras', 'ai', 'emergency', 'fleet', 'demo'
  const [currentUser, setCurrentUser] = React.useState(null);
  const [authToken, setAuthToken] = React.useState(localStorage.getItem('rtl_token') || null);

  const [buses, setBuses] = React.useState([]);
  const [routes, setRoutes] = React.useState([]);
  const [cameras, setCameras] = React.useState([]);
  const [alerts, setAlerts] = React.useState([]);
  const [kpis, setKpis] = React.useState({});
  const [infrastructure, setInfrastructure] = React.useState(null);
  const [isDemoActive, setIsDemoActive] = React.useState(true);

  const [focusedBusId, setFocusedBusId] = React.useState(null);
  const [isFullScreenMap, setIsFullScreenMap] = React.useState(false);
  const [audioMuted, setAudioMuted] = React.useState(false);

  // Web Audio Context for Emergency Chimes (zero external sound file required)
  const audioCtxRef = React.useRef(null);

  const playEmergencyChime = () => {
    if (audioMuted) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.warn('AudioContext chime error:', e);
    }
  };

  // 1. Initial Data Fetch
  const fetchAllData = () => {
    // Fetch Buses
    fetch('/api/buses')
      .then(res => res.json())
      .then(d => { if (d.success) setBuses(d.buses); })
      .catch(e => console.error(e));

    // Fetch Routes
    fetch('/api/routes')
      .then(res => res.json())
      .then(d => { if (d.success) setRoutes(d.routes); })
      .catch(e => console.error(e));

    // Fetch KPIs
    fetch('/api/dashboard/kpis')
      .then(res => res.json())
      .then(d => { if (d.success) setKpis(d.kpis); })
      .catch(e => console.error(e));

    // Fetch Infrastructure
    fetch('/api/routes/data/infrastructure')
      .then(res => res.json())
      .then(d => { if (d.success) setInfrastructure(d); })
      .catch(e => console.error(e));

    // Fetch Alerts
    fetch('/api/alerts')
      .then(res => res.json())
      .then(d => { if (d.success) setAlerts(d.alerts); })
      .catch(e => console.error(e));

    // Fetch Demo state
    fetch('/api/demo/state')
      .then(res => res.json())
      .then(d => { if (d.success) setIsDemoActive(d.isDemoActive); })
      .catch(e => console.error(e));
  };

  // Fetch Cameras with Admin Auth
  const fetchCameras = (token) => {
    fetch('/api/cameras', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    })
      .then(res => res.json())
      .then(d => {
        if (d.success) setCameras(d.cameras);
      })
      .catch(e => console.error(e));
  };

  React.useEffect(() => {
    fetchAllData();

    // Default Demo Admin Login
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@routeless.org', password: 'admin123' })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCurrentUser(data.user);
          setAuthToken(data.token);
          fetchCameras(data.token);
        }
      })
      .catch(e => console.error(e));
  }, []);

  // 2. Real-Time Socket.IO Integration
  React.useEffect(() => {
    let socket = null;
    try {
      socket = io();

      // Bus Location Update Broadcast
      socket.on('bus:location_update', (loc) => {
        setBuses(prevBuses => {
          return prevBuses.map(b => {
            if (b.id === loc.busId) {
              return {
                ...b,
                latitude: loc.latitude,
                longitude: loc.longitude,
                speed: loc.speed,
                heading: loc.heading,
                current_occupancy: loc.occupancy !== undefined ? loc.occupancy : b.current_occupancy,
                status: loc.status || b.status,
                etaMinutes: loc.etaMinutes || b.etaMinutes,
                progressPct: loc.progressPct !== undefined ? loc.progressPct : b.progressPct
              };
            }
            return b;
          });
        });
      });

      // Emergency Alert Broadcast
      socket.on('bus:alert', (newAlert) => {
        playEmergencyChime();
        setAlerts(prev => [newAlert, ...prev]);
        setKpis(prev => ({ ...prev, emergencyAlerts: (prev.emergencyAlerts || 0) + 1 }));

        // Update corresponding bus status to EMERGENCY
        setBuses(prev => prev.map(b => {
          if (b.id === newAlert.busId) {
            return { ...b, status: 'EMERGENCY', speed: 0 };
          }
          return b;
        }));
      });

      // Alert Resolved Broadcast
      socket.on('bus:alert_resolved', ({ alertId, busId }) => {
        setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: 'RESOLVED' } : a));
        setKpis(prev => ({ ...prev, emergencyAlerts: Math.max(0, (prev.emergencyAlerts || 1) - 1) }));
        setBuses(prev => prev.map(b => b.id === busId ? { ...b, status: 'IN_TRANSIT', speed: 35 } : b));
      });

      // Status Update
      socket.on('bus:status_update', ({ busId, status }) => {
        setBuses(prev => prev.map(b => b.id === busId ? { ...b, status } : b));
      });

      // Demo Toggle
      socket.on('demo:toggle', ({ isDemoActive }) => {
        setIsDemoActive(isDemoActive);
      });
    } catch (err) {
      console.warn('Socket.IO connection notice:', err.message);
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, [audioMuted]);

  // Handle Quick Demo Account Switch
  const handleQuickLogin = (account) => {
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: account.email, password: account.password })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCurrentUser(data.user);
          setAuthToken(data.token);
          setCurrentRole(account.role);
          if (account.role === 'admin') {
            fetchCameras(data.token);
          }
        }
      })
      .catch(e => console.error(e));
  };

  // Toggle Demo Mode
  const handleToggleDemo = (enabled) => {
    fetch('/api/demo/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) setIsDemoActive(data.isDemoActive);
      })
      .catch(e => console.error(e));
  };

  // Resolve Alert Action
  const handleResolveAlert = (alertId) => {
    fetch(`/api/alerts/${alertId}/resolve`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: 'RESOLVED' } : a));
          setKpis(prev => ({ ...prev, emergencyAlerts: Math.max(0, (prev.emergencyAlerts || 1) - 1) }));
        }
      })
      .catch(e => console.error(e));
  };

  // Trigger Emergency SOS from Driver or Student
  const handleTriggerSOS = (busId, reason, reporter = 'DRIVER') => {
    fetch('/api/alerts/sos', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ busId, reason, reporter })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          playEmergencyChime();
        }
      })
      .catch(e => console.error(e));
  };

  // Jump from Map or Alert directly to Camera
  const handleSelectBusCamera = (busId) => {
    setFocusedBusId(busId);
    if (currentRole !== 'admin') {
      setCurrentRole('admin');
    }
    setAdminTab('cameras');
  };

  const activeAlertsCount = alerts.filter(a => a.status === 'ACTIVE').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Top Navigation */}
      <Navbar 
        currentRole={currentRole} 
        onRoleChange={setCurrentRole} 
        currentUser={currentUser}
        onQuickLogin={handleQuickLogin}
        isDemoActive={isDemoActive}
        onToggleDemo={handleToggleDemo}
        activeAlertsCount={activeAlertsCount}
        onOpenEmergencyModal={() => {
          setCurrentRole('admin');
          setAdminTab('emergency');
        }}
      />

      {/* Main Container */}
      <main style={{ flex: 1, padding: '1.25rem 1.5rem', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
        {/* Active Emergency Banner */}
        {activeAlertsCount > 0 && (
          <div className="emergency-banner">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.3rem' }}>🚨</span>
              <div>
                <b style={{ color: 'white', fontSize: '0.92rem' }}>
                  ACTIVE EMERGENCY ALERT DETECTED ({activeAlertsCount} INCIDENT PENDING)
                </b>
                <div style={{ fontSize: '0.75rem', color: '#FECACA' }}>
                  {alerts.find(a => a.status === 'ACTIVE')?.description}
                </div>
              </div>
            </div>

            <button 
              onClick={() => {
                setCurrentRole('admin');
                setAdminTab('emergency');
              }}
              style={{
                background: '#FFFFFF',
                color: '#B91C1C',
                border: 'none',
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: '800',
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
            >
              Dispatch Rescue Bus ➔
            </button>
          </div>
        )}

        {/* ================================================================ */}
        {/* ROLE 1: TRANSPORT ADMINISTRATOR DASHBOARD                        */}
        {/* ================================================================ */}
        {currentRole === 'admin' && (
          <div>
            {/* Real-Time Telemetry KPI Cards (8 metrics) */}
            <KPICards kpis={kpis} />

            {/* Admin Command Center Tabs */}
            <div className="admin-tabs" style={{ marginBottom: '1.5rem' }}>
              <button 
                className={`admin-tab ${adminTab === 'map' ? 'active' : ''}`}
                onClick={() => setAdminTab('map')}
              >
                🗺️ Master Live Fleet Map
              </button>
              <button 
                className={`admin-tab ${adminTab === 'cameras' ? 'active' : ''}`}
                onClick={() => setAdminTab('cameras')}
              >
                📹 Live Camera Monitoring Center ({cameras.length})
              </button>
              <button 
                className={`admin-tab ${adminTab === 'ai' ? 'active' : ''}`}
                onClick={() => setAdminTab('ai')}
              >
                🧠 AI Safety & Occupancy Analytics
              </button>
              <button 
                className={`admin-tab ${adminTab === 'emergency' ? 'active' : ''}`}
                onClick={() => setAdminTab('emergency')}
              >
                🚨 Emergency Dispatch & Rescue Coordinator {activeAlertsCount > 0 && `(${activeAlertsCount})`}
              </button>
              <button 
                className={`admin-tab ${adminTab === 'fleet' ? 'active' : ''}`}
                onClick={() => setAdminTab('fleet')}
              >
                🚌 Fleet & Rural Corridors
              </button>
              <button 
                className={`admin-tab ${adminTab === 'demo' ? 'active' : ''}`}
                onClick={() => setAdminTab('demo')}
              >
                🎮 Hackathon Demo Control
              </button>
            </div>

            {/* Tab Views */}
            {adminTab === 'map' && (
              <LiveMap 
                buses={buses} 
                routes={routes} 
                infrastructure={infrastructure}
                onSelectBusCamera={handleSelectBusCamera}
                isFullScreen={isFullScreenMap}
                onToggleFullScreen={() => setIsFullScreenMap(!isFullScreenMap)}
              />
            )}

            {adminTab === 'cameras' && (
              <CameraGrid 
                buses={buses} 
                cameras={cameras} 
                focusedBusId={focusedBusId}
              />
            )}

            {adminTab === 'ai' && (
              <AIAnalysisView 
                buses={buses} 
                infrastructure={infrastructure} 
              />
            )}

            {adminTab === 'emergency' && (
              <EmergencyCenter 
                alerts={alerts} 
                onResolveAlert={handleResolveAlert}
                onSelectBusCamera={handleSelectBusCamera}
              />
            )}

            {adminTab === 'fleet' && (
              <FleetDirectory 
                buses={buses} 
                routes={routes} 
                onSelectBusCamera={handleSelectBusCamera}
              />
            )}

            {adminTab === 'demo' && (
              <DemoPanel 
                isDemoActive={isDemoActive} 
                onToggleDemo={handleToggleDemo} 
              />
            )}
          </div>
        )}

        {/* ================================================================ */}
        {/* ROLE 2: DRIVER COCKPIT INTERFACE                                 */}
        {/* ================================================================ */}
        {currentRole === 'driver' && (
          <DriverView 
            currentBus={buses[0]} 
            routes={routes} 
            onTriggerSOS={handleTriggerSOS} 
          />
        )}

        {/* ================================================================ */}
        {/* ROLE 3: STUDENT PORTAL INTERFACE                                 */}
        {/* ================================================================ */}
        {currentRole === 'student' && (
          <StudentView 
            buses={buses} 
            routes={routes} 
            onTriggerSOS={handleTriggerSOS}
            currentUser={currentUser}
            authToken={authToken}
            onRefreshData={fetchAllData}
          />
        )}
      </main>

      {/* Footer */}
      <footer style={{
        background: 'rgba(5, 8, 20, 0.95)',
        borderTop: '1px solid var(--border-subtle)',
        padding: '1rem 1.5rem',
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        <div>
          <b>ROUTELESS: THE LAST MILE</b> • Intelligent Rural Student Transportation & Camera Monitoring Platform
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <span>🛰️ GPS Tracking: Active</span>
          <span>📹 Camera Gateway: WebRTC Online</span>
          <span>🛡️ Privacy: Zero Facial Recognition</span>
        </div>
      </footer>
    </div>
  );
}

// Mount React Root
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}
