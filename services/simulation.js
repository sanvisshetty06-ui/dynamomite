/**
 * ROUTELESS – Real-Time Fleet Simulation & Intelligent Event Engine
 * Drives realistic rural bus dynamics, geofence checks, AI camera analysis, and Socket.IO broadcasts.
 */

const { db } = require('../database/database.js');

// Geofenced Restricted Rural Zones
const RESTRICTED_ZONES = [
  {
    id: 'GEOFENCE-01',
    name: 'Old Kalu River Causeway',
    description: 'Narrow unpaved monsoon flood-risk zone. Max speed 20 km/h; restricted during rain.',
    latitude: 15.6780,
    longitude: 74.6100,
    radiusMeters: 450,
    severity: 'HIGH'
  },
  {
    id: 'GEOFENCE-02',
    name: 'Kanakumbi Ghat Hairpin Bend',
    description: 'Steep blind rural descent. Heavy vehicle overtaking prohibited.',
    latitude: 15.6820,
    longitude: 74.4250,
    radiusMeters: 500,
    severity: 'MEDIUM'
  },
  {
    id: 'GEOFENCE-03',
    name: 'Desur Level Crossing',
    description: 'Unmanned railway crossing approach. Mandatory halt & whistle zone.',
    latitude: 15.7300,
    longitude: 74.6200,
    radiusMeters: 350,
    severity: 'HIGH'
  }
];

class SimulationEngine {
  constructor() {
    this.io = null;
    this.isRunning = true;
    this.intervalId = null;
    this.tickMs = 2500; // 2.5 second updates
    this.busState = new Map();
    this.simulatedTime = Date.now();
  }

  setSocketIO(io) {
    this.io = io;
  }

  init() {
    // Load active routes and buses from database
    const buses = db.prepare(`
      SELECT b.*, r.waypoints_json, r.route_name, r.origin, r.destination, r.total_distance_km
      FROM buses b
      JOIN routes r ON b.route_id = r.id
    `).all();

    for (const b of buses) {
      let waypoints = [];
      try {
        waypoints = JSON.parse(b.waypoints_json);
      } catch (e) {
        waypoints = [];
      }

      // Check current or last recorded location
      const lastLoc = db.prepare(`
        SELECT latitude, longitude, speed, heading FROM bus_locations 
        WHERE bus_id = ? ORDER BY id DESC LIMIT 1
      `).get(b.id);

      this.busState.set(b.id, {
        busId: b.id,
        busNumber: b.bus_number,
        driverName: b.driver_name,
        driverPhone: b.driver_phone,
        model: b.model,
        capacity: b.capacity,
        occupancy: b.current_occupancy,
        status: b.status,
        routeId: b.route_id,
        routeName: b.route_name,
        waypoints: waypoints,
        currentSegment: 0,
        segmentProgress: 0.2, // 0.0 to 1.0
        currentLat: lastLoc ? lastLoc.latitude : (waypoints[0] ? waypoints[0][0] : 15.6320),
        currentLng: lastLoc ? lastLoc.longitude : (waypoints[0] ? waypoints[0][1] : 74.5150),
        speed: b.status === 'IDLE' ? 0 : (lastLoc ? lastLoc.speed : 38.0),
        heading: lastLoc ? lastLoc.heading : 45.0,
        direction: 1, // 1 forward, -1 reverse
        isEmergency: b.status === 'EMERGENCY',
        emergencyDetails: null,
        lastDoorHazardTime: 0,
        lastOvercrowdTime: 0
      });
    }

    if (this.isRunning) {
      this.start();
    }
  }

  start() {
    this.isRunning = true;
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = setInterval(() => this.tick(), this.tickMs);
    console.log('[SimulationEngine] Rural Fleet Simulation active (Tick: 2.5s)');
  }

  stop() {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('[SimulationEngine] Simulation paused.');
  }

  toggle(enable) {
    if (enable !== undefined) {
      this.isRunning = enable;
    } else {
      this.isRunning = !this.isRunning;
    }
    if (this.isRunning) {
      this.start();
    } else {
      this.stop();
    }
    return this.isRunning;
  }

  // Haversine distance in meters
  getDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Bearing between two points
  getBearing(lat1, lon1, lat2, lon2) {
    const y = Math.sin((lon2 - lon1) * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180);
    const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
              Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos((lon2 - lon1) * Math.PI / 180);
    const brng = Math.atan2(y, x) * 180 / Math.PI;
    return (brng + 360) % 360;
  }

  tick() {
    if (!this.isRunning) return;

    const nowIso = new Date().toISOString();

    for (const [busId, state] of this.busState.entries()) {
      // If bus is IDLE or EMERGENCY breakdown, it doesn't advance along road
      if (state.status === 'IDLE' || state.status === 'EMERGENCY') {
        state.speed = 0;
        this.emitBusUpdate(state, nowIso);
        continue;
      }

      const waypoints = state.waypoints;
      if (!waypoints || waypoints.length < 2) continue;

      // Advance segment progress
      // Speed in km/h -> m/s -> progress step
      const currentSpeed = 30 + Math.floor(Math.random() * 15); // 30-45 km/h realistic rural speed
      state.speed = currentSpeed;

      const p1 = waypoints[state.currentSegment];
      const nextIdx = state.currentSegment + state.direction;

      if (nextIdx < 0 || nextIdx >= waypoints.length) {
        // Reverse trip direction (e.g. returning from campus to depot)
        state.direction *= -1;
        state.currentSegment = Math.max(0, Math.min(waypoints.length - 1, state.currentSegment + state.direction));
      }

      const p2 = waypoints[state.currentSegment + state.direction] || waypoints[state.currentSegment];
      const segmentDistance = this.getDistanceMeters(p1[0], p1[1], p2[0], p2[1]) || 500;
      const metersMoved = (currentSpeed * 1000 / 3600) * (this.tickMs / 1000);
      const stepPct = metersMoved / segmentDistance;

      state.segmentProgress += stepPct;

      if (state.segmentProgress >= 1.0) {
        state.segmentProgress = 0.0;
        state.currentSegment += state.direction;

        if (state.currentSegment < 0 || state.currentSegment >= waypoints.length - 1) {
          state.direction *= -1;
          state.currentSegment = Math.max(0, Math.min(waypoints.length - 2, state.currentSegment));
        }

        // Simulate student boarding/alighting at village stop
        this.simulateStopInteraction(state);
      }

      // Interpolate coordinates
      const segStart = waypoints[state.currentSegment];
      const segEnd = waypoints[state.currentSegment + (state.direction > 0 ? 1 : 0)] || segStart;
      const t = Math.max(0, Math.min(1, state.segmentProgress));

      state.currentLat = segStart[0] + (segEnd[0] - segStart[0]) * t;
      state.currentLng = segStart[1] + (segEnd[1] - segStart[1]) * t;
      state.heading = Math.round(this.getBearing(segStart[0], segStart[1], segEnd[0], segEnd[1]));

      // 1. Save location to database (BUS_LOCATIONS)
      try {
        db.prepare(`
          INSERT INTO bus_locations (bus_id, latitude, longitude, speed, heading, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(state.busId, state.currentLat, state.currentLng, state.speed, state.heading, nowIso);
      } catch (err) {
        console.error('Error recording location:', err.message);
      }

      // 2. Perform AI Geofence Checks
      this.checkGeofences(state, nowIso);

      // 3. Emit real-time update
      this.emitBusUpdate(state, nowIso);
    }
  }

  simulateStopInteraction(state) {
    // Random passenger change (+2 to +5 boarding or alighting)
    const delta = Math.floor(Math.random() * 7) - 3;
    const newOccupancy = Math.max(5, Math.min(state.capacity + 4, state.occupancy + delta));
    state.occupancy = newOccupancy;

    // Update DB
    db.prepare('UPDATE buses SET current_occupancy = ? WHERE id = ?').run(newOccupancy, state.busId);

    // AI Overcrowding check
    if (newOccupancy >= state.capacity) {
      this.createOvercrowdAlert(state);
    }
  }

  checkGeofences(state, nowIso) {
    for (const zone of RESTRICTED_ZONES) {
      const dist = this.getDistanceMeters(state.currentLat, state.currentLng, zone.latitude, zone.longitude);
      if (dist <= zone.radiusMeters) {
        // Approaching or inside restricted zone
        const alertType = 'GEOFENCE_RESTRICTION';
        const existing = db.prepare(`
          SELECT id FROM bus_alerts 
          WHERE bus_id = ? AND alert_type = ? AND status = 'ACTIVE' AND created_at > datetime('now', '-3 minutes')
        `).get(state.busId, alertType);

        if (!existing) {
          const desc = `⚠️ Geofence Alert: Bus ${state.busNumber} entered ${zone.name}. ${zone.description}`;
          const locStr = JSON.stringify({ lat: state.currentLat, lng: state.currentLng, landmark: zone.name });
          const res = db.prepare(`
            INSERT INTO bus_alerts (bus_id, alert_type, location, description, status, created_at)
            VALUES (?, ?, ?, ?, 'ACTIVE', ?)
          `).run(state.busId, alertType, locStr, desc, nowIso);

          // Camera Event
          db.prepare(`
            INSERT INTO camera_events (camera_id, event_type, description, confidence, timestamp)
            VALUES (?, 'restricted_zone_approach', ?, 0.94, ?)
          `).run(state.busId, desc, nowIso);

          if (this.io) {
            this.io.emit('bus:alert', {
              id: res.lastInsertRowid,
              busId: state.busId,
              busNumber: state.busNumber,
              alertType,
              location: { lat: state.currentLat, lng: state.currentLng, landmark: zone.name },
              description: desc,
              severity: zone.severity,
              status: 'ACTIVE',
              timestamp: nowIso
            });
          }
        }
      }
    }
  }

  createOvercrowdAlert(state) {
    const nowIso = new Date().toISOString();
    const alertType = 'OVERCROWDED';
    const existing = db.prepare(`
      SELECT id FROM bus_alerts WHERE bus_id = ? AND alert_type = ? AND status = 'ACTIVE'
    `).get(state.busId, alertType);

    if (!existing) {
      const desc = `AI Occupancy Alert: Bus ${state.busNumber} is at ${Math.round((state.occupancy/state.capacity)*100)}% capacity (${state.occupancy}/${state.capacity} passengers). Standing passengers exceed safety threshold.`;
      const locStr = JSON.stringify({ lat: state.currentLat, lng: state.currentLng, landmark: 'En route' });

      const res = db.prepare(`
        INSERT INTO bus_alerts (bus_id, alert_type, location, description, status, created_at)
        VALUES (?, ?, ?, ?, 'ACTIVE', ?)
      `).run(state.busId, alertType, locStr, desc, nowIso);

      // Camera event
      db.prepare(`
        INSERT INTO camera_events (camera_id, event_type, description, confidence, timestamp)
        VALUES (?, 'overcrowding', ?, 0.97, ?)
      `).run(state.busId, desc, nowIso);

      if (this.io) {
        this.io.emit('bus:alert', {
          id: res.lastInsertRowid,
          busId: state.busId,
          busNumber: state.busNumber,
          alertType,
          location: { lat: state.currentLat, lng: state.currentLng },
          description: desc,
          severity: 'HIGH',
          status: 'ACTIVE',
          timestamp: nowIso
        });
      }
    }
  }

  // Calculate ETA in minutes to destination or next stop
  calculateETA(state) {
    const remainingWaypoints = state.waypoints.length - state.currentSegment;
    const estKm = (remainingWaypoints * 4.2);
    const avgSpeed = Math.max(25, state.speed);
    const minutes = Math.round((estKm / avgSpeed) * 60);
    return Math.max(2, minutes);
  }

  // Calculate route progress percentage
  calculateProgressPct(state) {
    if (!state.waypoints || state.waypoints.length === 0) return 0;
    const totalSegs = state.waypoints.length - 1;
    const cur = state.currentSegment + state.segmentProgress;
    return Math.round((cur / totalSegs) * 100);
  }

  emitBusUpdate(state, timestamp) {
    const etaMin = this.calculateETA(state);
    const progressPct = this.calculateProgressPct(state);

    const payload = {
      busId: state.busId,
      busNumber: state.busNumber,
      driverName: state.driverName,
      driverPhone: state.driverPhone,
      model: state.model,
      latitude: state.currentLat,
      longitude: state.currentLng,
      speed: state.speed,
      heading: state.heading,
      occupancy: state.occupancy,
      capacity: state.capacity,
      status: state.status,
      routeId: state.routeId,
      routeName: state.routeName,
      etaMinutes: etaMin,
      progressPct: progressPct,
      updatedAt: timestamp
    };

    if (this.io) {
      this.io.emit('bus:location_update', payload);
    }
  }

  /**
   * Trigger Manual Driver Emergency SOS or Simulated Breakdown
   */
  triggerEmergency(busId, reason = 'Mechanical Breakdown - Engine Overheating', reporter = 'DRIVER') {
    const state = this.busState.get(busId);
    if (!state) return { success: false, error: 'Bus not found' };

    state.status = 'EMERGENCY';
    state.speed = 0;
    const nowIso = new Date().toISOString();

    // Update Bus table
    db.prepare('UPDATE buses SET status = ? WHERE id = ?').run('EMERGENCY', busId);

    // Insert into BUS_ALERTS
    const locStr = JSON.stringify({
      lat: state.currentLat,
      lng: state.currentLng,
      landmark: `${state.routeName} km checkpoint`
    });

    const alertType = reporter === 'DRIVER' ? 'SOS_DRIVER' : 'BREAKDOWN';
    const desc = `🚨 EMERGENCY ALERT on Bus ${state.busNumber} (${state.driverName}): ${reason}. Immediate assistance required.`;

    const alertResult = db.prepare(`
      INSERT INTO bus_alerts (bus_id, alert_type, location, description, status, created_at)
      VALUES (?, ?, ?, ?, 'ACTIVE', ?)
    `).run(busId, alertType, locStr, desc, nowIso);

    // Camera Event
    db.prepare(`
      INSERT INTO camera_events (camera_id, event_type, description, confidence, timestamp)
      VALUES (?, 'emergency_incident', ?, 1.0, ?)
    `).run(busId, desc, nowIso);

    // Find nearest rescue bus
    const rescueBus = this.findNearestRescueBus(busId);

    const alertPayload = {
      id: alertResult.lastInsertRowid,
      busId,
      busNumber: state.busNumber,
      driverName: state.driverName,
      driverPhone: state.driverPhone,
      alertType,
      reason,
      location: { lat: state.currentLat, lng: state.currentLng },
      description: desc,
      status: 'ACTIVE',
      nearestRescueBus: rescueBus,
      suggestedDetour: 'Reroute via State Highway 31 Bypass to avoid bottleneck',
      timestamp: nowIso
    };

    if (this.io) {
      this.io.emit('bus:alert', alertPayload);
      this.io.emit('bus:status_update', { busId, status: 'EMERGENCY' });
    }

    return { success: true, alert: alertPayload };
  }

  /**
   * Find nearest alternative bus for student evacuation / rescue
   */
  findNearestRescueBus(targetBusId) {
    const target = this.busState.get(targetBusId);
    if (!target) return null;

    let nearest = null;
    let minDistance = Infinity;

    for (const [id, candidate] of this.busState.entries()) {
      if (id === targetBusId) continue;
      if (candidate.status === 'EMERGENCY') continue;

      const dist = this.getDistanceMeters(target.currentLat, target.currentLng, candidate.currentLat, candidate.currentLng);
      if (dist < minDistance) {
        minDistance = dist;
        const availableSeats = Math.max(0, candidate.capacity - candidate.occupancy);
        const interceptEtaMin = Math.round((dist / 1000 / 35) * 60) + 3; // at 35 km/h

        nearest = {
          busId: candidate.busId,
          busNumber: candidate.busNumber,
          driverName: candidate.driverName,
          driverPhone: candidate.driverPhone,
          distanceKm: parseFloat((dist / 1000).toFixed(1)),
          etaMinutes: interceptEtaMin,
          availableSeats,
          capacity: candidate.capacity,
          currentOccupancy: candidate.occupancy,
          status: candidate.status
        };
      }
    }

    return nearest;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId) {
    const alert = db.prepare('SELECT * FROM bus_alerts WHERE id = ?').get(alertId);
    if (!alert) return { success: false, error: 'Alert not found' };

    const nowIso = new Date().toISOString();
    db.prepare('UPDATE bus_alerts SET status = ?, resolved_at = ? WHERE id = ?').run('RESOLVED', nowIso, alertId);

    // If bus was emergency, restore status
    const bus = db.prepare('SELECT * FROM buses WHERE id = ?').get(alert.bus_id);
    if (bus && bus.status === 'EMERGENCY') {
      db.prepare('UPDATE buses SET status = ? WHERE id = ?').run('IN_TRANSIT', alert.bus_id);
      const state = this.busState.get(alert.bus_id);
      if (state) {
        state.status = 'IN_TRANSIT';
        state.speed = 35;
      }
    }

    if (this.io) {
      this.io.emit('bus:alert_resolved', { alertId, busId: alert.bus_id });
      this.io.emit('bus:status_update', { busId: alert.bus_id, status: 'IN_TRANSIT' });
    }

    return { success: true };
  }

  /**
   * Trigger simulated AI hazard event
   */
  triggerAIHazard(busId, hazardType) {
    const state = this.busState.get(busId);
    if (!state) return { success: false, error: 'Bus not found' };

    const nowIso = new Date().toISOString();
    let desc = '';
    let eventType = '';

    switch (hazardType) {
      case 'DOOR_OPEN':
        eventType = 'door_open_hazard';
        desc = `AI Camera: Passenger exit door open while Bus ${state.busNumber} traveling at ${state.speed} km/h. Footboard passenger hazard.`;
        break;
      case 'DRIVER_FATIGUE':
        eventType = 'driver_fatigue';
        desc = `AI Cabin Monitor: Driver yawning & head tilt pattern detected on Bus ${state.busNumber}. Audio alertness warning sounded in cabin.`;
        break;
      case 'ERRATIC_BRAKING':
        eventType = 'erratic_braking';
        desc = `AI Sensor: Sudden deceleration (-4.2 m/s²) on Bus ${state.busNumber} near rural livestock crossing.`;
        break;
      default:
        eventType = 'general_hazard';
        desc = `AI Safety Event: Potential hazard detected on Bus ${state.busNumber}.`;
    }

    // Insert camera event
    const res = db.prepare(`
      INSERT INTO camera_events (camera_id, event_type, description, confidence, timestamp)
      VALUES (?, ?, ?, 0.93, ?)
    `).run(busId, eventType, desc, nowIso);

    // Insert bus alert
    const locStr = JSON.stringify({ lat: state.currentLat, lng: state.currentLng });
    const alertRes = db.prepare(`
      INSERT INTO bus_alerts (bus_id, alert_type, location, description, status, created_at)
      VALUES (?, 'SAFETY_VIOLATION', ?, ?, 'ACTIVE', ?)
    `).run(busId, locStr, desc, nowIso);

    const payload = {
      id: alertRes.lastInsertRowid,
      busId,
      busNumber: state.busNumber,
      alertType: 'SAFETY_VIOLATION',
      description: desc,
      eventType,
      confidence: 0.93,
      location: { lat: state.currentLat, lng: state.currentLng },
      timestamp: nowIso,
      status: 'ACTIVE'
    };

    if (this.io) {
      this.io.emit('ai:detection_event', payload);
      this.io.emit('bus:alert', payload);
    }

    return { success: true, event: payload };
  }

  /**
   * Driver updates manual GPS from device
   */
  updateDriverLocation(busId, lat, lng, speed = 0, heading = 0) {
    const state = this.busState.get(busId);
    if (!state) return { success: false, error: 'Bus not registered' };

    state.currentLat = lat;
    state.currentLng = lng;
    state.speed = speed;
    state.heading = heading;
    state.status = 'IN_TRANSIT';

    const nowIso = new Date().toISOString();
    db.prepare(`
      INSERT INTO bus_locations (bus_id, latitude, longitude, speed, heading, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(busId, lat, lng, speed, heading, nowIso);

    this.checkGeofences(state, nowIso);
    this.emitBusUpdate(state, nowIso);

    return { success: true };
  }
}

const simulationEngine = new SimulationEngine();

module.exports = {
  simulationEngine,
  RESTRICTED_ZONES
};
