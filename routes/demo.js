/**
 * ROUTELESS – Demonstration Mode Controller
 * Orchestrates hackathon simulation triggers, moving bus loops, synthetic camera feeds,
 * and incident scenarios with strict disclaimer transparency.
 */

const express = require('express');
const router = express.Router();
const { simulationEngine, RESTRICTED_ZONES } = require('../services/simulation.js');
const { db } = require('../database/database.js');

/**
 * Get current Demo Mode state
 */
router.get('/state', (req, res) => {
  res.json({
    success: true,
    isDemoActive: simulationEngine.isRunning,
    disclaimer: 'HACKATHON DEMONSTRATION MODE: Simulated GPS & Synthetic Neural Feeds',
    activeBusesSimulated: simulationEngine.busState.size,
    restrictedZones: RESTRICTED_ZONES,
    tickIntervalMs: simulationEngine.tickMs
  });
});

/**
 * Toggle Demo Mode (Enable/Disable)
 */
router.post('/toggle', (req, res) => {
  const { enabled } = req.body;
  const newState = simulationEngine.toggle(enabled);

  if (simulationEngine.io) {
    simulationEngine.io.emit('demo:toggle', { isDemoActive: newState });
  }

  res.json({
    success: true,
    isDemoActive: newState,
    message: newState ? 'Demo simulation started' : 'Demo simulation paused (Manual Mode active)'
  });
});

/**
 * Inject Instant Hackathon Scenario
 */
router.post('/scenario', (req, res) => {
  const { scenario } = req.body;

  switch (scenario) {
    case 'BREAKDOWN_BUS_102': {
      // Simulate breakdown on Bus 2 (KA-22-RT-102)
      const result = simulationEngine.triggerEmergency(2, 'Transmission Hydraulic Failure near Malhar Gaon', 'SIMULATION');
      return res.json({ success: true, message: 'Breakdown scenario triggered on Bus-102', result });
    }
    case 'OVERCROWDING_BUS_101': {
      // Set Bus 1 occupancy to 44/42
      const bus1 = simulationEngine.busState.get(1);
      if (bus1) {
        bus1.occupancy = 44;
        db.prepare('UPDATE buses SET current_occupancy = 44 WHERE id = 1').run();
        simulationEngine.createOvercrowdAlert(bus1);
      }
      return res.json({ success: true, message: 'Overcrowding scenario triggered on Bus-101 (44/42 passengers)' });
    }
    case 'GEOFENCE_APPROACH': {
      // Set Bus 1 near Old Kalu River Causeway
      const bus1 = simulationEngine.busState.get(1);
      if (bus1) {
        bus1.currentLat = 15.6780;
        bus1.currentLng = 74.6100;
        simulationEngine.checkGeofences(bus1, new Date().toISOString());
      }
      return res.json({ success: true, message: 'Geofence warning triggered at Old Kalu River Causeway' });
    }
    case 'DOOR_HAZARD': {
      const result = simulationEngine.triggerAIHazard(1, 'DOOR_OPEN');
      return res.json({ success: true, message: 'Door Open while in Motion hazard triggered on Bus-101', result });
    }
    case 'DRIVER_FATIGUE': {
      const result = simulationEngine.triggerAIHazard(3, 'DRIVER_FATIGUE');
      return res.json({ success: true, message: 'Driver fatigue alert triggered on Bus-103', result });
    }
    case 'RESOLVE_ALL': {
      // Resolve all active alerts
      const activeAlerts = db.prepare("SELECT id FROM bus_alerts WHERE status = 'ACTIVE'").all();
      for (const a of activeAlerts) {
        simulationEngine.resolveAlert(a.id);
      }
      return res.json({ success: true, message: `Resolved ${activeAlerts.length} active alerts. Fleet normal.` });
    }
    default:
      return res.status(400).json({ success: false, error: 'Unknown scenario' });
  }
});

module.exports = router;
