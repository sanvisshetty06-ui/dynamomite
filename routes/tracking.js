/**
 * ROUTELESS – GPS Bus Tracking & Driver Geolocation Endpoints
 */

const express = require('express');
const router = express.Router();
const { db } = require('../database/database.js');
const { authenticate, requireRole } = require('../middleware/auth.js');
const { simulationEngine } = require('../services/simulation.js');

/**
 * Get latest GPS locations for all active buses
 */
router.get('/latest', (req, res) => {
  const buses = db.prepare(`
    SELECT b.id as bus_id, b.bus_number, b.driver_name, b.driver_phone, b.capacity, b.current_occupancy,
           b.status, r.route_name, r.route_code, r.color as route_color
    FROM buses b
    JOIN routes r ON b.route_id = r.id
  `).all();

  const locations = buses.map(b => {
    const simState = simulationEngine.busState.get(b.bus_id);
    const lastLoc = db.prepare(`
      SELECT latitude, longitude, speed, heading, updated_at 
      FROM bus_locations WHERE bus_id = ? ORDER BY id DESC LIMIT 1
    `).get(b.bus_id);

    return {
      busId: b.bus_id,
      busNumber: b.bus_number,
      driverName: b.driver_name,
      driverPhone: b.driver_phone,
      routeName: b.route_name,
      routeCode: b.route_code,
      routeColor: b.route_color,
      status: simState ? simState.status : b.status,
      occupancy: simState ? simState.occupancy : b.current_occupancy,
      capacity: b.capacity,
      latitude: simState ? simState.currentLat : (lastLoc ? lastLoc.latitude : 15.6320),
      longitude: simState ? simState.currentLng : (lastLoc ? lastLoc.longitude : 74.5150),
      speed: simState ? simState.speed : (lastLoc ? lastLoc.speed : 0),
      heading: simState ? simState.heading : (lastLoc ? lastLoc.heading : 0),
      etaMinutes: simState ? simulationEngine.calculateETA(simState) : 12,
      progressPct: simState ? simulationEngine.calculateProgressPct(simState) : 40,
      updatedAt: lastLoc ? lastLoc.updated_at : new Date().toISOString()
    };
  });

  res.json({ success: true, count: locations.length, locations });
});

/**
 * Driver updates GPS location via Browser Geolocation API
 * Triggered when Driver presses START TRIP
 */
router.post('/update', authenticate, requireRole('driver', 'admin'), (req, res) => {
  const { busId, latitude, longitude, speed = 0, heading = 0 } = req.body;

  if (!busId || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ success: false, error: 'busId, latitude, and longitude required' });
  }

  const result = simulationEngine.updateDriverLocation(
    parseInt(busId, 10),
    parseFloat(latitude),
    parseFloat(longitude),
    parseFloat(speed),
    parseFloat(heading)
  );

  if (!result.success) {
    return res.status(400).json(result);
  }

  res.json({ success: true, message: 'GPS coordinates recorded & broadcasted' });
});

/**
 * Get GPS Breadcrumbs / Location history for a bus
 */
router.get('/history/:busId', (req, res) => {
  const busId = parseInt(req.params.busId, 10);
  const history = db.prepare(`
    SELECT latitude, longitude, speed, heading, updated_at
    FROM bus_locations
    WHERE bus_id = ?
    ORDER BY id DESC LIMIT 50
  `).all(busId);

  res.json({ success: true, busId, history });
});

module.exports = router;
