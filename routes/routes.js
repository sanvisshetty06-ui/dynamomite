/**
 * ROUTELESS – Routes, Rural Stops, and Route Disruptions
 */

const express = require('express');
const router = express.Router();
const { db } = require('../database/database.js');
const { RESTRICTED_ZONES } = require('../services/simulation.js');

/**
 * List all routes with stops and waypoints
 */
router.get('/', (req, res) => {
  const routes = db.prepare('SELECT * FROM routes ORDER BY id ASC').all();

  const enrichedRoutes = routes.map(r => {
    const stops = db.prepare(`
      SELECT * FROM stops WHERE route_id = ? ORDER BY sequence_order ASC
    `).all(r.id);

    const disruptions = db.prepare(`
      SELECT * FROM route_disruptions WHERE route_id = ? AND is_active = 1
    `).all(r.id);

    let waypoints = [];
    try {
      waypoints = JSON.parse(r.waypoints_json);
    } catch (e) {
      waypoints = [];
    }

    return {
      ...r,
      waypoints,
      stops,
      disruptions
    };
  });

  res.json({ success: true, count: enrichedRoutes.length, routes: enrichedRoutes });
});

/**
 * Get route by ID
 */
router.get('/:id', (req, res) => {
  const routeId = parseInt(req.params.id, 10);
  const route = db.prepare('SELECT * FROM routes WHERE id = ?').get(routeId);

  if (!route) return res.status(404).json({ success: false, error: 'Route not found' });

  const stops = db.prepare('SELECT * FROM stops WHERE route_id = ? ORDER BY sequence_order ASC').all(routeId);
  const disruptions = db.prepare('SELECT * FROM route_disruptions WHERE route_id = ? AND is_active = 1').all(routeId);

  let waypoints = [];
  try {
    waypoints = JSON.parse(route.waypoints_json);
  } catch (e) {
    waypoints = [];
  }

  res.json({
    success: true,
    route: {
      ...route,
      waypoints,
      stops,
      disruptions
    }
  });
});

/**
 * Get all route disruptions and restricted geofenced zones
 */
router.get('/data/disruptions', (req, res) => {
  const disruptions = db.prepare(`
    SELECT rd.*, r.route_name 
    FROM route_disruptions rd
    JOIN routes r ON rd.route_id = r.id
    WHERE rd.is_active = 1
  `).all();

  res.json({
    success: true,
    disruptions,
    restrictedZones: RESTRICTED_ZONES
  });
});

/**
 * Alternative rural transport and emergency services
 */
router.get('/data/infrastructure', (req, res) => {
  const alternativeTransport = db.prepare('SELECT * FROM alternative_transport').all();
  const emergencyServices = db.prepare('SELECT * FROM emergency_services').all();

  res.json({
    success: true,
    alternativeTransport,
    emergencyServices,
    restrictedZones: RESTRICTED_ZONES
  });
});

module.exports = router;
