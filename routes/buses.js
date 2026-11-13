/**
 * ROUTELESS – Bus Management & Fleet Directory Routes
 */

const express = require('express');
const router = express.Router();
const { db } = require('../database/database.js');
const { authenticate, requireRole } = require('../middleware/auth.js');
const { simulationEngine } = require('../services/simulation.js');

/**
 * List all buses with route, driver, occupancy, status, and latest location
 */
router.get('/', (req, res) => {
  const buses = db.prepare(`
    SELECT b.*, r.route_name, r.route_code, r.origin, r.destination, r.color as route_color
    FROM buses b
    JOIN routes r ON b.route_id = r.id
    ORDER BY b.id ASC
  `).all();

  // Attach latest location and camera counts
  const enriched = buses.map(bus => {
    const simState = simulationEngine.busState.get(bus.id);
    const lastLoc = db.prepare(`
      SELECT latitude, longitude, speed, heading, updated_at 
      FROM bus_locations WHERE bus_id = ? ORDER BY id DESC LIMIT 1
    `).get(bus.id);

    const cameraCount = db.prepare('SELECT COUNT(*) as count FROM cameras WHERE bus_id = ?').get(bus.id).count;
    const activeAlerts = db.prepare(`
      SELECT COUNT(*) as count FROM bus_alerts WHERE bus_id = ? AND status = 'ACTIVE'
    `).get(bus.id).count;

    return {
      ...bus,
      current_occupancy: simState ? simState.occupancy : bus.current_occupancy,
      status: simState ? simState.status : bus.status,
      speed: simState ? simState.speed : (lastLoc ? lastLoc.speed : 0),
      heading: simState ? simState.heading : (lastLoc ? lastLoc.heading : 0),
      latitude: simState ? simState.currentLat : (lastLoc ? lastLoc.latitude : 15.6320),
      longitude: simState ? simState.currentLng : (lastLoc ? lastLoc.longitude : 74.5150),
      etaMinutes: simState ? simulationEngine.calculateETA(simState) : 15,
      progressPct: simState ? simulationEngine.calculateProgressPct(simState) : 50,
      cameraCount,
      activeAlerts
    };
  });

  res.json({ success: true, count: enriched.length, buses: enriched });
});

/**
 * Get specific bus details
 */
router.get('/:id', (req, res) => {
  const busId = parseInt(req.params.id, 10);
  const bus = db.prepare(`
    SELECT b.*, r.route_name, r.route_code, r.origin, r.destination, r.waypoints_json, r.color as route_color
    FROM buses b
    JOIN routes r ON b.route_id = r.id
    WHERE b.id = ?
  `).get(busId);

  if (!bus) return res.status(404).json({ success: false, error: 'Bus not found' });

  const simState = simulationEngine.busState.get(busId);
  const lastLoc = db.prepare(`
    SELECT latitude, longitude, speed, heading, updated_at 
    FROM bus_locations WHERE bus_id = ? ORDER BY id DESC LIMIT 1
  `).get(busId);

  const stops = db.prepare(`
    SELECT * FROM stops WHERE route_id = ? ORDER BY sequence_order ASC
  `).all(bus.route_id);

  const cameras = db.prepare(`
    SELECT id, camera_type, connection_status, resolution, last_ping FROM cameras WHERE bus_id = ?
  `).all(busId);

  res.json({
    success: true,
    bus: {
      ...bus,
      current_occupancy: simState ? simState.occupancy : bus.current_occupancy,
      status: simState ? simState.status : bus.status,
      speed: simState ? simState.speed : (lastLoc ? lastLoc.speed : 0),
      latitude: simState ? simState.currentLat : (lastLoc ? lastLoc.latitude : 15.6320),
      longitude: simState ? simState.currentLng : (lastLoc ? lastLoc.longitude : 74.5150),
      etaMinutes: simState ? simulationEngine.calculateETA(simState) : 15,
      progressPct: simState ? simulationEngine.calculateProgressPct(simState) : 50,
      stops,
      cameras
    }
  });
});

/**
 * Update bus status (Driver or Admin)
 */
router.patch('/:id/status', authenticate, requireRole('driver', 'admin'), (req, res) => {
  const busId = parseInt(req.params.id, 10);
  const { status } = req.body;

  const validStatuses = ['IN_TRANSIT', 'IDLE', 'DELAYED', 'EMERGENCY', 'BOARDING'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid status' });
  }

  db.prepare('UPDATE buses SET status = ? WHERE id = ?').run(status, busId);

  const simState = simulationEngine.busState.get(busId);
  if (simState) {
    simState.status = status;
    if (status === 'IDLE' || status === 'EMERGENCY') {
      simState.speed = 0;
    }
  }

  if (simulationEngine.io) {
    simulationEngine.io.emit('bus:status_update', { busId, status });
  }

  res.json({ success: true, busId, status });
});

module.exports = router;
