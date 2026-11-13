/**
 * ROUTELESS – Navigation Header Component
 */

function Navbar({ 
  currentRole, 
  onRoleChange, 
  currentUser, 
  onQuickLogin, 
  isDemoActive, 
  onToggleDemo, 
  activeAlertsCount,
  onOpenEmergencyModal 
}) {
  const [showAccountDropdown, setShowAccountDropdown] = React.useState(false);
  const [demoAccounts, setDemoAccounts] = React.useState([]);

  const loadDemoAccounts = () => {
    fetch('/api/auth/demo-users')
      .then(res => res.json())
      .then(data => {
        if (data.success) setDemoAccounts(data.accounts);
      })
      .catch(err => console.error('Error fetching demo accounts:', err));
  };

  React.useEffect(() => {
    loadDemoAccounts();
  }, []);

  return (
    <header className="header-bar">
      {/* Brand & Animated Radar Logo */}
      <div className="logo-badge">
        <div className="radar-logo">
          <div className="radar-ping"></div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
            <line x1="4" y1="22" x2="4" y2="15"></line>
          </svg>
        </div>
        <div className="brand-text">
          <h1>ROUTELESS</h1>
          <span>The Last Mile • Rural Transit AI</span>
        </div>
      </div>

      {/* Role Selector: Student | Driver | Transport Administrator */}
      <div className="role-pills">
        <button 
          className={`role-pill ${currentRole === 'student' ? 'active' : ''}`}
          onClick={() => onRoleChange('student')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
            <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
          </svg>
          Student
        </button>

        <button 
          className={`role-pill ${currentRole === 'driver' ? 'active' : ''}`}
          onClick={() => onRoleChange('driver')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <circle cx="12" cy="12" r="2"></circle>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
          </svg>
          Driver Cockpit
        </button>

        <button 
          className={`role-pill ${currentRole === 'admin' ? 'active' : ''}`}
          onClick={() => onRoleChange('admin')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
          </svg>
          Transport Admin
        </button>
      </div>

      {/* Right Controls: Demo Mode Switch & Alert Bell & User Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Hackathon Demo Switch */}
        <div className="demo-toggle-wrap" title="Simulates moving buses and synthetic camera feeds for hackathons">
          <div className="demo-badge-pulse"></div>
          <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#FBBF24', letterSpacing: '0.04em' }}>
            DEMO MODE
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

        {/* Emergency Alert Bell Indicator */}
        <button 
          onClick={onOpenEmergencyModal}
          style={{
            position: 'relative',
            background: activeAlertsCount > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.05)',
            border: activeAlertsCount > 0 ? '1px solid #EF4444' : '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 10px',
            color: activeAlertsCount > 0 ? '#EF4444' : 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
          title={activeAlertsCount > 0 ? `${activeAlertsCount} Active Emergency Alerts` : 'No Active Emergencies'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          {activeAlertsCount > 0 && (
            <span style={{
              background: '#EF4444',
              color: 'white',
              fontSize: '0.65rem',
              fontWeight: '800',
              padding: '1px 5px',
              borderRadius: '9999px'
            }}>
              {activeAlertsCount}
            </span>
          )}
        </button>

        {/* Quick Demo Account Selector */}
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => {
              if (!showAccountDropdown) loadDemoAccounts();
              setShowAccountDropdown(!showAccountDropdown);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(6, 182, 212, 0.1)',
              border: '1px solid var(--border-active)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-main)',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: '600'
            }}
          >
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: currentRole === 'admin' ? '#00F0FF' : (currentRole === 'driver' ? '#10B981' : '#F59E0B')
            }}></span>
            <span>{currentUser ? currentUser.name.split(' ')[0] : 'Demo User'}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          {showAccountDropdown && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '115%',
              width: '280px',
              background: '#0F172A',
              border: '1px solid var(--border-active)',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
              padding: '0.5rem',
              zIndex: 100
            }}>
              <div style={{ padding: '6px 10px', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>
                ⚡ Quick Switch Demo Account
              </div>
              {demoAccounts.map(acc => (
                <div 
                  key={acc.email}
                  onClick={() => {
                    onQuickLogin(acc);
                    setShowAccountDropdown(false);
                  }}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    transition: 'background 0.2s',
                    background: currentUser && currentUser.email === acc.email ? 'rgba(6, 182, 212, 0.15)' : 'transparent'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = currentUser && currentUser.email === acc.email ? 'rgba(6, 182, 212, 0.15)' : 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>{acc.name}</span>
                    <span className={`badge ${acc.role === 'admin' ? 'badge-cyan' : (acc.role === 'driver' ? 'badge-green' : 'badge-amber')}`}>
                      {acc.role}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{acc.description}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

window.Navbar = Navbar;
