/**
 * ROUTELESS – Secure Camera Gateway & Media Controller
 * Access restricted strictly to Transport Administrators.
 * RTSP passwords and internal network endpoints are completely sanitized.
 */

const express = require('express');
const router = express.Router();
const { db } = require('../database/database.js');
const { authenticate, requireRole } = require('../middleware/auth.js');
const { cameraGateway } = require('../services/camera_gateway.js');
const { aiVisionEngine } = require('../services/ai_vision.js');

/**
 * List all fleet cameras (Admin Only)
 */
router.get('/', authenticate, requireRole('admin'), (req, res) => {
  const cameras = cameraGateway.getCameras();
  res.json({ success: true, count: cameras.length, cameras });
});

/**
 * Get single camera details & secure stream tokens
 */
router.get('/:id', authenticate, requireRole('admin'), (req, res) => {
  const cameraId = parseInt(req.params.id, 10);
  const camera = cameraGateway.getCameraById(cameraId);

  if (!camera) return res.status(404).json({ success: false, error: 'Camera not found' });

  // Attach live AI analysis frame metadata
  const aiAnalysis = aiVisionEngine.analyzeFeed(camera.busId, camera.cameraType);

  res.json({
    success: true,
    camera,
    aiAnalysis
  });
});

/**
 * Stream Gateway Endpoint
 * Provides WebRTC signaling / stream session tokens without leaking RTSP secrets
 */
router.get('/:id/stream', authenticate, requireRole('admin'), (req, res) => {
  const cameraId = parseInt(req.params.id, 10);
  const camera = cameraGateway.getCameraById(cameraId);

  if (!camera) return res.status(404).json({ success: false, error: 'Camera not found' });

  // Update status to STREAMING
  cameraGateway.updateStatus(cameraId, 'STREAMING');

  res.json({
    success: true,
    streamId: `stream-${cameraId}-${Date.now()}`,
    protocol: 'webrtc_synthetic_gateway',
    isDemoFeed: true,
    watermark: '[DEMO SIMULATED STREAM - HACKATHON MODE]',
    resolution: camera.resolution,
    fps: 30,
    bitrateKbps: 2400,
    cameraType: camera.cameraType,
    busNumber: camera.busNumber,
    sessionId: `sess_${Math.random().toString(36).substring(2, 10)}`
  });
});

/**
 * Get Camera Events from CAMERA_EVENTS table
 */
router.get('/:id/events', authenticate, requireRole('admin'), (req, res) => {
  const cameraId = parseInt(req.params.id, 10);
  const events = db.prepare(`
    SELECT * FROM camera_events 
    WHERE camera_id = ? 
    ORDER BY id DESC LIMIT 20
  `).all(cameraId);

  res.json({ success: true, cameraId, count: events.length, events });
});

/**
 * Update Camera Connection Status
 */
router.patch('/:id/status', authenticate, requireRole('admin'), (req, res) => {
  const cameraId = parseInt(req.params.id, 10);
  const { status } = req.body;

  const valid = ['ONLINE', 'STREAMING', 'OFFLINE', 'STANDBY'];
  if (!valid.includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid connection status' });
  }

  cameraGateway.updateStatus(cameraId, status);
  res.json({ success: true, cameraId, status });
});

module.exports = router;
