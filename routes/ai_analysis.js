/**
 * ROUTELESS – AI Computer Vision & Safety Analytics Endpoints
 */

const express = require('express');
const router = express.Router();
const { aiVisionEngine } = require('../services/ai_vision.js');
const { simulationEngine, RESTRICTED_ZONES } = require('../services/simulation.js');
const { authenticate, requireRole } = require('../middleware/auth.js');

/**
 * Fleet-wide AI Analytics Dashboard (Admin & Controller)
 */
router.get('/fleet', authenticate, (req, res) => {
  const analytics = aiVisionEngine.getFleetAnalytics();
  res.json({ success: true, analytics });
});

/**
 * Live AI Analysis for a specific bus
 */
router.get('/bus/:busId', authenticate, (req, res) => {
  const busId = parseInt(req.params.busId, 10);
  const cameraType = req.query.type || 'inside_cabin';

  const analysis = aiVisionEngine.analyzeFeed(busId, cameraType);
  if (!analysis) {
    return res.status(404).json({ success: false, error: 'Bus not found or no feed available' });
  }

  res.json({ success: true, analysis });
});

/**
 * Trigger Simulated AI Hazard Event (Admin Demo Tool)
 */
router.post('/hazard', authenticate, requireRole('admin'), (req, res) => {
  const { busId, hazardType } = req.body;
  if (!busId || !hazardType) {
    return res.status(400).json({ success: false, error: 'busId and hazardType required' });
  }

  const result = simulationEngine.triggerAIHazard(parseInt(busId, 10), hazardType);
  res.json(result);
});

/**
 * Get Geofence definitions
 */
router.get('/geofences', (req, res) => {
  res.json({ success: true, restrictedZones: RESTRICTED_ZONES });
});

module.exports = router;
