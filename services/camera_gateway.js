/**
 * ROUTELESS – Secure Media & Camera Gateway
 * Mediates WebRTC, RTSP proxies, and synthetic camera pipelines.
 * Sanitizes URLs: Never exposes camera passwords or private RTSP endpoints to clients.
 */

const { db } = require('../database/database.js');

class CameraGateway {
  constructor() {
    this.activeStreams = new Map();
  }

  /**
   * Get sanitized camera list for administrator view
   * Strips out raw internal RTSP credentials
   */
  getCameras() {
    const rawCameras = db.prepare(`
      SELECT c.id, c.bus_id, c.camera_type, c.connection_status, c.resolution, c.last_ping,
             b.bus_number, b.driver_name, b.status as bus_status,
             bl.latitude, bl.longitude, bl.speed
      FROM cameras c
      JOIN buses b ON c.bus_id = b.id
      LEFT JOIN (
        SELECT bus_id, latitude, longitude, speed, MAX(id) as max_id 
        FROM bus_locations GROUP BY bus_id
      ) bl ON b.id = bl.bus_id
      ORDER BY c.bus_id ASC, c.camera_type ASC
    `).all();

    return rawCameras.map(cam => ({
      id: cam.id,
      busId: cam.bus_id,
      busNumber: cam.bus_number,
      driverName: cam.driver_name,
      cameraType: cam.camera_type,
      connectionStatus: cam.connection_status,
      resolution: cam.resolution || '1080p @ 30fps',
      lastPing: cam.last_ping,
      location: {
        latitude: cam.latitude || 15.6780,
        longitude: cam.longitude || 74.6100,
        speed: cam.speed || 0
      },
      // Sanitized Gateway URL - NO PASSWORDS OR RTSP EXPOSED
      streamGatewayUrl: `/api/cameras/${cam.id}/stream`,
      webrtcGatewayUrl: `/api/cameras/${cam.id}/webrtc`,
      isDemoFeed: true,
      demoDisclaimer: '[DEMO SIMULATED STREAM - HACKATHON MODE]',
      feedSource: 'Edge Rural Gateway (Simulated Synthetic Stream)'
    }));
  }

  /**
   * Get single camera metadata (Sanitized)
   */
  getCameraById(cameraId) {
    const cam = db.prepare(`
      SELECT c.id, c.bus_id, c.camera_type, c.connection_status, c.resolution, c.last_ping,
             b.bus_number, b.driver_name, b.status as bus_status
      FROM cameras c
      JOIN buses b ON c.bus_id = b.id
      WHERE c.id = ?
    `).get(cameraId);

    if (!cam) return null;

    return {
      id: cam.id,
      busId: cam.bus_id,
      busNumber: cam.bus_number,
      driverName: cam.driver_name,
      cameraType: cam.camera_type,
      connectionStatus: cam.connection_status,
      resolution: cam.resolution,
      streamGatewayUrl: `/api/cameras/${cam.id}/stream`,
      webrtcGatewayUrl: `/api/cameras/${cam.id}/webrtc`,
      isDemoFeed: true,
      demoDisclaimer: '[DEMO SIMULATED STREAM - HACKATHON MODE]',
      feedSource: 'Edge Rural Gateway (Simulated Synthetic Stream)'
    };
  }

  /**
   * Update camera connection status
   */
  updateStatus(cameraId, status) {
    db.prepare(`
      UPDATE cameras 
      SET connection_status = ?, last_ping = datetime('now')
      WHERE id = ?
    `).run(status, cameraId);
    return true;
  }
}

const cameraGateway = new CameraGateway();

module.exports = {
  cameraGateway
};
