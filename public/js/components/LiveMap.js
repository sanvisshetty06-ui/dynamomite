/**
 * ROUTELESS – Interactive Full-Screen Live Map Component
 * Powered by Leaflet & OpenStreetMap with real-time animated buses,
 * rural pickup stops, route polylines, geofences, and rich popups.
 */

function LiveMap({ 
  buses, 
  routes, 
  infrastructure, 
  onSelectBusCamera, 
  isFullScreen, 
  onToggleFullScreen 
}) {
  const mapRef = React.useRef(null);
  const leafletMap = React.useRef(null);
  const busMarkersRef = React.useRef(new Map());
  const routeLayersRef = React.useRef([]);
  const infraLayersRef = React.useRef([]);

  // Initialize Leaflet Map
  React.useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    // Center on rural Belgaum-Khanapur-Kittur corridor
    const map = L.map(mapRef.current, {
      center: [15.7050, 74.6500],
      zoom: 11,
      zoomControl: false,
      attributionControl: false
    });

    // Dark styled OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      className: 'dark-tiles'
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    leafletMap.current = map;

    return () => {
      map.remove();
      leafletMap.current = null;
    };
  }, []);

  // Render Routes, Stops, Geofences & Infrastructure
  React.useEffect(() => {
    const map = leafletMap.current;
    if (!map || !routes || routes.length === 0) return;

    // Clear previous layers
    routeLayersRef.current.forEach(l => map.removeLayer(l));
    routeLayersRef.current = [];

    // 1. Draw Route Polylines & Stops
    routes.forEach(route => {
      if (route.waypoints && route.waypoints.length > 1) {
        const polyline = L.polyline(route.waypoints, {
          color: route.color || '#06B6D4',
          weight: 4,
          opacity: 0.75,
          dashArray: route.status === 'ACTIVE' ? null : '6, 8'
        }).addTo(map);

        polyline.bindTooltip(`<b>${route.route_name}</b> (${route.total_distance_km} km)`, {
          sticky: true,
          className: 'custom-map-tooltip'
        });

        routeLayersRef.current.push(polyline);
      }

      // Draw Pickup Stops
      if (route.stops) {
        route.stops.forEach((stop, idx) => {
          const isCampus = stop.stop_name.toLowerCase().includes('campus');
          const stopIcon = L.divIcon({
            className: 'stop-marker-wrapper',
            html: `
              <div style="
                width: ${isCampus ? '24px' : '16px'};
                height: ${isCampus ? '24px' : '16px'};
                border-radius: 50%;
                background: ${isCampus ? '#10B981' : '#0F172A'};
                border: 2px solid ${isCampus ? '#34D399' : (route.color || '#06B6D4')};
                box-shadow: 0 0 10px ${isCampus ? 'rgba(16,185,129,0.6)' : 'rgba(6,182,212,0.4)'};
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 9px;
                font-weight: 800;
              ">
                ${isCampus ? '🏛️' : idx + 1}
              </div>
            `,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });

          const marker = L.marker([stop.latitude, stop.longitude], { icon: stopIcon }).addTo(map);
          marker.bindPopup(`
            <div style="color: #0F172A; font-family: sans-serif; font-size: 12px; padding: 4px;">
              <div style="font-weight: 800; color: #0284C7; font-size: 13px;">${stop.stop_name}</div>
              <div style="color: #475569; margin: 3px 0;">📍 Village: <b>${stop.village_name}</b></div>
              <div style="color: #475569;">⏰ Scheduled: <b>${stop.scheduled_time}</b></div>
              ${stop.landmark ? `<div style="color: #64748B; font-size: 11px; margin-top: 4px;">🏛️ Landmark: ${stop.landmark}</div>` : ''}
              <div style="background: #E0F2FE; color: #0369A1; padding: 3px 6px; border-radius: 4px; font-weight: 700; margin-top: 6px; display: inline-block;">
                👥 Students: ${stop.student_count || 0}
              </div>
            </div>
          `);

          routeLayersRef.current.push(marker);
        });
      }
    });

    // 2. Draw Geofence Danger Zones
    if (infrastructure && infrastructure.restrictedZones) {
      infrastructure.restrictedZones.forEach(zone => {
        const circle = L.circle([zone.latitude, zone.longitude], {
          radius: zone.radiusMeters,
          color: zone.severity === 'HIGH' ? '#EF4444' : '#F59E0B',
          fillColor: zone.severity === 'HIGH' ? '#EF4444' : '#F59E0B',
          fillOpacity: 0.18,
          weight: 2,
          dashArray: '4, 6'
        }).addTo(map);

        circle.bindTooltip(`
          <div style="color: #EF4444; font-weight: 800;">⚠️ RESTRICTED GEOFENCE: ${zone.name}</div>
          <div style="font-size: 11px; color: #334155;">${zone.description}</div>
        `, { sticky: true });

        routeLayersRef.current.push(circle);
      });
    }

    // 3. Draw Alternative Transport & Emergency Services
    if (infrastructure) {
      if (infrastructure.alternativeTransport) {
        infrastructure.alternativeTransport.forEach(alt => {
          const altIcon = L.divIcon({
            className: 'alt-marker',
            html: `<div style="font-size: 16px; filter: drop-shadow(0 0 6px rgba(245,158,11,0.8));">🛺</div>`,
            iconSize: [20, 20]
          });
          const m = L.marker([alt.latitude, alt.longitude], { icon: altIcon }).addTo(map);
          m.bindPopup(`
            <div style="color: #0F172A; font-size: 12px;">
              <b>🛺 ${alt.hub_name}</b><br/>
              Type: ${alt.transport_type}<br/>
              Available Vehicles: <b>${alt.available_vehicles}</b><br/>
              Contact: ${alt.contact_number}
            </div>
          `);
          routeLayersRef.current.push(m);
        });
      }

      if (infrastructure.emergencyServices) {
        infrastructure.emergencyServices.forEach(es => {
          const emIcon = L.divIcon({
            className: 'em-marker',
            html: `<div style="font-size: 16px; filter: drop-shadow(0 0 6px rgba(239,68,68,0.8));">🏥</div>`,
            iconSize: [20, 20]
          });
          const m = L.marker([es.latitude, es.longitude], { icon: emIcon }).addTo(map);
          m.bindPopup(`
            <div style="color: #0F172A; font-size: 12px;">
              <b>🏥 ${es.name}</b><br/>
              Service: ${es.service_type}<br/>
              Emergency Phone: <b>${es.emergency_phone}</b><br/>
              Address: ${es.address}
            </div>
          `);
          routeLayersRef.current.push(m);
        });
      }
    }
  }, [routes, infrastructure]);

  // Update Live Bus Markers on Location Broadcast
  React.useEffect(() => {
    const map = leafletMap.current;
    if (!map || !buses) return;

    buses.forEach(bus => {
      const isEmergency = bus.status === 'EMERGENCY';
      const isDelayed = bus.status === 'DELAYED';
      const isIdle = bus.status === 'IDLE';

      let statusClass = '';
      let statusColor = '#00F0FF';
      if (isEmergency) {
        statusClass = 'emergency';
        statusColor = '#EF4444';
      } else if (isDelayed) {
        statusClass = 'delayed';
        statusColor = '#F59E0B';
      } else if (isIdle) {
        statusClass = 'idle';
        statusColor = '#64748B';
      }

      const busIcon = L.divIcon({
        className: 'bus-marker-wrapper',
        html: `
          <div class="bus-marker-pin ${statusClass}" title="${bus.bus_number}">
            <div class="bus-heading-arrow" style="transform: rotate(${bus.heading || 0}deg); border-bottom-color: ${statusColor};"></div>
            🚌
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 19]
      });

      const popupHtml = `
        <div style="color: #0F172A; font-family: sans-serif; min-width: 210px; padding: 2px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #CBD5E1; padding-bottom: 5px;">
            <b style="font-size: 14px; color: #0284C7;">${bus.bus_number}</b>
            <span style="font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px; background: ${isEmergency ? '#FEE2E2' : '#DCFCE7'}; color: ${isEmergency ? '#B91C1C' : '#15803D'};">
              ${bus.status}
            </span>
          </div>

          <div style="margin: 8px 0; font-size: 11px; line-height: 1.6;">
            <div>👤 Driver: <b>${bus.driver_name}</b> (${bus.driver_phone})</div>
            <div>⚡ Speed: <b style="color: #0284C7; font-size: 12px;">${Math.round(bus.speed || 0)} km/h</b></div>
            <div>👥 Occupancy: <b>${bus.current_occupancy}/${bus.capacity}</b> (${Math.round((bus.current_occupancy/bus.capacity)*100)}%)</div>
            <div>⏱️ ETA: <b style="color: #16A34A;">~${bus.etaMinutes || 12} mins</b></div>
            <div>🛣️ Line: ${bus.route_name || 'Rural Corridor'}</div>
          </div>

          <div style="background: #F1F5F9; border-radius: 4px; height: 6px; overflow: hidden; margin-bottom: 8px;">
            <div style="background: ${bus.current_occupancy >= bus.capacity ? '#EF4444' : '#10B981'}; width: ${Math.min(100, Math.round((bus.current_occupancy/bus.capacity)*100))}%; height: 100%;"></div>
          </div>

          <button 
            onclick="window.dispatchEvent(new CustomEvent('open-bus-camera', { detail: { busId: ${bus.id} } }))"
            style="width: 100%; background: #0284C7; color: white; border: none; padding: 6px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;"
          >
            📹 Open Live Camera Feed
          </button>
        </div>
      `;

      if (busMarkersRef.current.has(bus.id)) {
        // Smoothly animate existing marker
        const marker = busMarkersRef.current.get(bus.id);
        marker.setLatLng([bus.latitude, bus.longitude]);
        marker.setIcon(busIcon);
        marker.setPopupContent(popupHtml);
      } else {
        // Create new marker
        const marker = L.marker([bus.latitude, bus.longitude], { icon: busIcon }).addTo(map);
        marker.bindPopup(popupHtml);
        busMarkersRef.current.set(bus.id, marker);
      }
    });
  }, [buses]);

  // Listen for custom open-bus-camera event from popup HTML
  React.useEffect(() => {
    const handler = (e) => {
      if (onSelectBusCamera && e.detail) {
        onSelectBusCamera(e.detail.busId);
      }
    };
    window.addEventListener('open-bus-camera', handler);
    return () => window.removeEventListener('open-bus-camera', handler);
  }, [onSelectBusCamera]);

  return (
    <div style={{ position: 'relative' }}>
      <div 
        ref={mapRef} 
        className="map-container"
        style={{ height: isFullScreen ? 'calc(100vh - 120px)' : '620px' }}
      ></div>

      {/* Floating Map Controls & Legend Overlay */}
      <div style={{
        position: 'absolute',
        top: 15,
        left: 15,
        background: 'rgba(10, 15, 36, 0.88)',
        backdropFilter: 'blur(10px)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '10px 14px',
        zIndex: 500,
        fontSize: '0.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        maxWidth: '240px'
      }}>
        <div style={{ fontWeight: '800', color: 'var(--cyan-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00F0FF', display: 'inline-block' }}></span>
          LIVE FLEET TRACKING
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }}></span>
          On Time / Smooth (42-45 km/h)
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#F59E0B', display: 'inline-block' }}></span>
          Delayed / Rural Traffic
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#EF4444', display: 'inline-block' }}></span>
          Emergency SOS / Breakdown
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'rgba(239, 68, 68, 0.4)', border: '1px dashed #EF4444', display: 'inline-block' }}></span>
          Restricted Geofence Zone
        </div>
      </div>

      {/* Full Screen Toggle Button */}
      <button 
        onClick={onToggleFullScreen}
        style={{
          position: 'absolute',
          top: 15,
          right: 15,
          background: 'rgba(10, 15, 36, 0.9)',
          backdropFilter: 'blur(8px)',
          border: '1px solid var(--border-active)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--cyan-primary)',
          padding: '8px 12px',
          cursor: 'pointer',
          zIndex: 500,
          fontWeight: '700',
          fontSize: '0.78rem',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {isFullScreen ? (
            <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
          ) : (
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path>
          )}
        </svg>
        {isFullScreen ? 'Exit Fullscreen' : 'Full Screen Map'}
      </button>
    </div>
  );
}

window.LiveMap = LiveMap;
