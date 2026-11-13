/**
 * ROUTELESS – Emergency Monitoring & Rescue Coordinator Routes
 */

const express = require('express');
const router = express.Router();
const { db } = require('../database/database.js');
const { simulationEngine } = require('../services/simulation.js');
const { authenticate, requireRole } = require('../middleware/auth.js');

/**
 * List all active and recent alerts
 */
router.get('/', (req, res) => {
  const alerts = db.prepare(`
    SELECT ba.*, b.bus_number, b.driver_name, b.driver_phone, b.capacity, b.current_occupancy,
           r.route_name
    FROM bus_alerts ba
    JOIN buses b ON ba.bus_id = b.id
    JOIN routes r ON b.route_id = r.id
    ORDER BY CASE WHEN ba.status = 'ACTIVE' THEN 1 ELSE 2 END, ba.id DESC
    LIMIT 30
  `).all();

  const formatted = alerts.map(a => {
    let loc = { lat: 15.6780, lng: 74.6100 };
    try {
      loc = JSON.parse(a.location);
    } catch (e) {}

    // Attach nearest rescue bus if active
    let rescueBus = null;
    if (a.status === 'ACTIVE') {
      rescueBus = simulationEngine.findNearestRescueBus(a.bus_id);
    }

    return {
      ...a,
      locationParsed: loc,
      rescueBus,
      suggestedDetour: 'Bypass via State Highway 31 / Kittur Bypass Link'
    };
  });

  res.json({ success: true, count: formatted.length, alerts: formatted });
});

/**
 * Driver or Student triggers SOS Emergency
 */
router.post('/sos', authenticate, (req, res) => {
  const { busId, reason = 'Driver Emergency SOS Triggered', reporter = 'DRIVER' } = req.body;
  const targetBusId = busId ? parseInt(busId, 10) : 1;

  const result = simulationEngine.triggerEmergency(targetBusId, reason, req.user ? req.user.role.toUpperCase() : reporter);
  if (!result.success) {
    return res.status(400).json(result);
  }

  res.json({ success: true, alert: result.alert });
});

/**
 * Calculate Nearest Rescue Bus for any bus ID
 */
router.get('/rescue-bus/:busId', (req, res) => {
  const busId = parseInt(req.params.busId, 10);
  const rescueBus = simulationEngine.findNearestRescueBus(busId);

  if (!rescueBus) {
    return res.status(404).json({ success: false, error: 'No standby or alternative bus within operating radius' });
  }

  res.json({
    success: true,
    targetBusId: busId,
    rescueBus,
    suggestedDetour: 'Reroute via NH-48 Express Corridor Bypass',
    estimatedEvacuationTimeMin: rescueBus.etaMinutes + 5
  });
});

/**
 * Resolve emergency alert
 */
router.post('/:id/resolve', authenticate, requireRole('admin'), (req, res) => {
  const alertId = parseInt(req.params.id, 10);
  const result = simulationEngine.resolveAlert(alertId);

  if (!result.success) {
    return res.status(400).json(result);
  }

  res.json({ success: true, message: 'Emergency marked as resolved and bus status restored' });
});

module.exports = router;
