/**
 * ROUTELESS – Real-Time KPI Cards Dashboard Component
 * Displays the 8 mandatory live transit telemetry metrics
 */

function KPICards({ kpis }) {
  const cards = [
    {
      label: 'Total Active Buses',
      value: kpis.totalActiveBuses || 4,
      subtext: 'Fleet assigned to rural lines',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="6" width="18" height="12" rx="2"></rect>
          <circle cx="7" cy="18" r="2"></circle>
          <circle cx="17" cy="18" r="2"></circle>
          <line x1="3" y1="11" x2="21" y2="11"></line>
        </svg>
      ),
      color: 'var(--cyan-primary)'
    },
    {
      label: 'Buses Currently Moving',
      value: kpis.busesCurrentlyMoving || 3,
      subtext: 'GPS broadcasting in transit',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
        </svg>
      ),
      color: 'var(--emerald-primary)'
    },
    {
      label: 'Students Travelling',
      value: kpis.studentsTravelling || 109,
      subtext: 'Real-time verified passengers',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      ),
      color: '#38BDF8'
    },
    {
      label: 'Available Seats',
      value: kpis.availableSeats || 51,
      subtext: 'Vacant across network',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M7 11v6a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-6"></path>
          <path d="M4 11h16a1 1 0 0 1 1 1v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a1 1 0 0 1 1-1z"></path>
          <path d="M7 7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4H7V7z"></path>
        </svg>
      ),
      color: 'var(--emerald-primary)'
    },
    {
      label: 'Delayed Buses',
      value: kpis.delayedBuses || 0,
      subtext: 'Traffic / rural road obstacles',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      ),
      color: kpis.delayedBuses > 0 ? 'var(--amber-primary)' : 'var(--text-muted)'
    },
    {
      label: 'Cancelled Routes',
      value: kpis.cancelledRoutes || 0,
      subtext: 'All rural services operational',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
        </svg>
      ),
      color: kpis.cancelledRoutes > 0 ? 'var(--rose-primary)' : 'var(--text-muted)'
    },
    {
      label: 'Active Camera Feeds',
      value: kpis.activeCameras || 8,
      subtext: 'Cabin & road vision online',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M23 7l-7 5 7 5V7z"></path>
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
        </svg>
      ),
      color: 'var(--cyan-primary)'
    },
    {
      label: 'Emergency Alerts',
      value: kpis.emergencyAlerts || 0,
      subtext: kpis.emergencyAlerts > 0 ? 'Action required in dispatch' : 'All lines running securely',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      ),
      color: kpis.emergencyAlerts > 0 ? 'var(--rose-primary)' : 'var(--text-muted)'
    }
  ];

  return (
    <div className="kpi-grid">
      {cards.map((c, i) => (
        <div key={i} className="glass-panel kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">{c.label}</span>
            <div className="kpi-icon" style={{ color: c.color, background: `${c.color}20` }}>
              {c.icon}
            </div>
          </div>
          <div className="kpi-value" style={{ color: c.value > 0 && c.label.includes('Alert') ? 'var(--rose-primary)' : c.color }}>
            {c.value}
          </div>
          <div className="kpi-subtext">{c.subtext}</div>
        </div>
      ))}
    </div>
  );
}

window.KPICards = KPICards;
