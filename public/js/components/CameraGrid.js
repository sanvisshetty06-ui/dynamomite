/**
 * ROUTELESS – Dedicated Camera Monitoring Dashboard Component
 * Secure administrator multi-stream grid supporting Inside Cabin & Road Dashcam views,
 * AI bounding box overlays, snapshot capture, and mandatory hackathon demo labeling.
 */

function CameraGrid({ buses, cameras, focusedBusId }) {
  const [filterType, setFilterType] = React.useState('all'); // 'all', 'inside_cabin', 'road_view'
  const [selectedBusFilter, setSelectedBusFilter] = React.useState(focusedBusId ? String(focusedBusId) : 'all');
  const [showAIOverlays, setShowAIOverlays] = React.useState(true);
  const [spotlightCamera, setSpotlightCamera] = React.useState(null);

  // Filter cameras
  const filteredCameras = React.useMemo(() => {
    return cameras.filter(cam => {
      const matchType = filterType === 'all' || cam.cameraType === filterType;
      const matchBus = selectedBusFilter === 'all' || String(cam.busId) === selectedBusFilter;
      return matchType && matchBus;
    });
  }, [cameras, filterType, selectedBusFilter]);

  return (
    <div>
      {/* Controls Bar: Filters & Toggles */}
      <div className="glass-panel" style={{ padding: '0.85rem 1.25rem', marginBottom: '1.25rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>View Filter:</span>
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.05)', padding: '3px', borderRadius: '6px' }}>
            <button 
              className={`role-pill ${filterType === 'all' ? 'active' : ''}`}
              style={{ padding: '4px 12px', fontSize: '0.75rem' }}
              onClick={() => setFilterType('all')}
            >
              All Streams ({cameras.length})
            </button>
            <button 
              className={`role-pill ${filterType === 'inside_cabin' ? 'active' : ''}`}
              style={{ padding: '4px 12px', fontSize: '0.75rem' }}
              onClick={() => setFilterType('inside_cabin')}
            >
              Cabin Feeds
            </button>
            <button 
              className={`role-pill ${filterType === 'road_view' ? 'active' : ''}`}
              style={{ padding: '4px 12px', fontSize: '0.75rem' }}
              onClick={() => setFilterType('road_view')}
            >
              Road Dashcams
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Bus Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Bus:</span>
            <select 
              value={selectedBusFilter}
              onChange={(e) => setSelectedBusFilter(e.target.value)}
              style={{
                background: '#0F172A',
                color: 'white',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                padding: '5px 10px',
                fontSize: '0.75rem'
              }}
            >
              <option value="all">All Fleet Buses</option>
              {buses.map(b => (
                <option key={b.id} value={String(b.id)}>{b.bus_number} ({b.driver_name})</option>
              ))}
            </select>
          </div>

          {/* AI Bounding Box Toggle */}
          <button 
            onClick={() => setShowAIOverlays(!showAIOverlays)}
            style={{
              background: showAIOverlays ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${showAIOverlays ? 'var(--cyan-primary)' : 'var(--border-subtle)'}`,
              color: showAIOverlays ? 'var(--cyan-primary)' : 'var(--text-muted)',
              borderRadius: '6px',
              padding: '5px 12px',
              fontSize: '0.75rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>🧠</span>
            AI Bounding Boxes: {showAIOverlays ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Camera Grid View */}
      <div className="camera-grid">
        {filteredCameras.map(cam => {
          const bus = buses.find(b => b.id === cam.busId) || {};
          return (
            <CameraStreamCard 
              key={cam.id} 
              camera={cam} 
              bus={bus} 
              showAIOverlays={showAIOverlays}
              onSpotlight={() => setSpotlightCamera({ camera: cam, bus })}
            />
          );
        })}
      </div>

      {/* Fullscreen Spotlight Modal */}
      {spotlightCamera && (
        <CameraSpotlightModal 
          item={spotlightCamera} 
          showAIOverlays={showAIOverlays}
          onClose={() => setSpotlightCamera(null)} 
        />
      )}
    </div>
  );
}

/**
 * Individual Camera Stream Card Component
 */
function CameraStreamCard({ camera, bus, showAIOverlays, onSpotlight }) {
  const canvasRef = React.useRef(null);
  const synthFeedRef = React.useRef(null);
  const [camType, setCamType] = React.useState(camera.cameraType);

  // Initialize or update synthetic video feed
  React.useEffect(() => {
    if (!canvasRef.current) return;

    const feed = new SyntheticCameraFeed(canvasRef.current, {
      cameraId: camera.id,
      cameraType: camType,
      busNumber: bus.bus_number || camera.busNumber,
      speed: bus.speed || 38,
      occupancy: bus.current_occupancy || 30,
      capacity: bus.capacity || 40,
      status: bus.status || 'IN_TRANSIT',
      lat: bus.latitude || 15.6780,
      lng: bus.longitude || 74.6100,
      heading: bus.heading || 45,
      showAIOverlays
    });

    synthFeedRef.current = feed;
    feed.start();

    return () => {
      feed.stop();
    };
  }, [camType]);

  // Update dynamic metrics on live ticks
  React.useEffect(() => {
    if (synthFeedRef.current) {
      synthFeedRef.current.updateMetrics({
        speed: bus.speed,
        occupancy: bus.current_occupancy,
        status: bus.status,
        lat: bus.latitude,
        lng: bus.longitude,
        heading: bus.heading,
        showAIOverlays
      });
    }
  }, [bus, showAIOverlays]);

  // Capture Snapshot
  const handleSnapshot = () => {
    if (synthFeedRef.current) {
      const dataUrl = synthFeedRef.current.captureSnapshot();
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `snapshot-${camera.busNumber}-${camType}-${Date.now()}.jpg`;
      a.click();
    }
  };

  return (
    <div className="camera-card">
      {/* Header */}
      <div className="camera-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }}></span>
          <span style={{ fontWeight: '800', fontSize: '0.85rem', color: 'var(--text-main)' }}>
            {bus.bus_number || camera.busNumber}
          </span>
          <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>
            {camType === 'inside_cabin' ? 'CABIN CAM' : 'ROAD DASHCAM'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="badge badge-green">LIVE STREAMING</span>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{camera.resolution}</span>
        </div>
      </div>

      {/* Video Viewport */}
      <div className="camera-video-viewport">
        <canvas ref={canvasRef} width="640" height="360" className="camera-canvas"></canvas>
      </div>

      {/* Access Controls Bar */}
      <div style={{
        padding: '0.65rem 1rem',
        background: 'rgba(15, 23, 42, 0.95)',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.75rem'
      }}>
        {/* Toggle between Cabin and Road view */}
        <button 
          onClick={() => setCamType(camType === 'inside_cabin' ? 'road_view' : 'inside_cabin')}
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
            padding: '4px 10px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.72rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          🔄 Switch to {camType === 'inside_cabin' ? 'Road Cam' : 'Cabin Cam'}
        </button>

        <div style={{ display: 'flex', gap: '6px' }}>
          {/* Snapshot button */}
          <button 
            onClick={handleSnapshot}
            title="Download frame snapshot"
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              padding: '4px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.72rem'
            }}
          >
            📸 Snapshot
          </button>

          {/* Fullscreen Spotlight */}
          <button 
            onClick={onSpotlight}
            title="Spotlight single view"
            style={{
              background: 'rgba(6, 182, 212, 0.15)',
              border: '1px solid var(--cyan-muted)',
              color: 'var(--cyan-primary)',
              padding: '4px 10px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.72rem',
              fontWeight: '700'
            }}
          >
            🔍 Spotlight
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Camera Spotlight Fullscreen Modal
 */
function CameraSpotlightModal({ item, showAIOverlays, onClose }) {
  const canvasRef = React.useRef(null);
  const synthFeedRef = React.useRef(null);
  const { camera, bus } = item;
  const [camType, setCamType] = React.useState(camera.cameraType);

  React.useEffect(() => {
    if (!canvasRef.current) return;
    const feed = new SyntheticCameraFeed(canvasRef.current, {
      cameraId: camera.id,
      cameraType: camType,
      busNumber: bus.bus_number,
      speed: bus.speed || 38,
      occupancy: bus.current_occupancy || 30,
      capacity: bus.capacity || 40,
      status: bus.status,
      lat: bus.latitude,
      lng: bus.longitude,
      heading: bus.heading,
      showAIOverlays
    });
    synthFeedRef.current = feed;
    feed.start();
    return () => feed.stop();
  }, [camType]);

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(5, 8, 20, 0.92)',
      backdropFilter: 'blur(12px)',
      zIndex: 2000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div className="glass-panel" style={{ width: '900px', maxWidth: '100%', overflow: 'hidden' }}>
        <div className="camera-header" style={{ padding: '1rem 1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--cyan-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📹</span> {bus.bus_number} — Stream Spotlight
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Driver: {bus.driver_name} ({bus.driver_phone}) • Line: {bus.route_name}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => setCamType(camType === 'inside_cabin' ? 'road_view' : 'inside_cabin')}
              className="role-pill active"
              style={{ fontSize: '0.75rem', padding: '6px 12px' }}
            >
              Toggle to {camType === 'inside_cabin' ? 'Road Dashcam' : 'Cabin View'}
            </button>
            <button 
              onClick={onClose}
              style={{
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid #EF4444',
                color: '#EF4444',
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: '800',
                cursor: 'pointer'
              }}
            >
              ✕ Close
            </button>
          </div>
        </div>

        <div className="camera-video-viewport" style={{ aspectRatio: '16/9' }}>
          <canvas ref={canvasRef} width="960" height="540" className="camera-canvas"></canvas>
        </div>

        <div style={{ padding: '1rem 1.5rem', background: '#0A0F24', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem' }}>
            <div>Speed: <b style={{ color: 'var(--cyan-primary)' }}>{Math.round(bus.speed || 0)} km/h</b></div>
            <div>Occupancy: <b style={{ color: 'var(--emerald-primary)' }}>{bus.current_occupancy}/{bus.capacity}</b> ({Math.round((bus.current_occupancy/bus.capacity)*100)}%)</div>
            <div>Status: <span className="badge badge-green">{bus.status}</span></div>
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>WebRTC PeerConnection • 1080p @ 30fps</span>
        </div>
      </div>
    </div>
  );
}

window.CameraGrid = CameraGrid;
