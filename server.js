/**
 * ROUTELESS – THE LAST MILE
 * Real-Time Intelligent Rural Transportation Platform
 * Core Application Server (Express + Socket.IO + Native SQLite)
 */

const express = require('express');
const http = require('node:http');
const path = require('node:path');
const { Server } = require('socket.io');

const { db } = require('./database/database.js');
const { simulationEngine } = require('./services/simulation.js');
const { authenticate } = require('./middleware/auth.js');

// Route modules
const authRoutes = require('./routes/auth.js');
const busRoutes = require('./routes/buses.js');
const routeRoutes = require('./routes/routes.js');
const trackingRoutes = require('./routes/tracking.js');
const cameraRoutes = require('./routes/cameras.js');
const aiRoutes = require('./routes/ai_analysis.js');
const alertRoutes = require('./routes/alerts.js');
const bookingRoutes = require('./routes/bookings.js');
const demoRoutes = require('./routes/demo.js');
const studentRoutes = require('./routes/students.js');

const app = express();
const server = http.createServer(app);

// Socket.IO configuration
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Pass Socket.IO instance to simulation engine
simulationEngine.setSocketIO(io);
simulationEngine.init();

// Express Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Global API Logging
app.use('/api', (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (res.statusCode >= 400) {
      console.warn(`[HTTP] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Mount API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/buses', busRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/cameras', cameraRoutes);
app.use('/api/ai-analysis', aiRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/demo', demoRoutes);
app.use('/api/students', studentRoutes);

// Fleet Summary KPI endpoint
app.get('/api/dashboard/kpis', (req, res) => {
  const totalBuses = db.prepare('SELECT COUNT(*) as count FROM buses').get().count;
  const movingBuses = Array.from(simulationEngine.busState.values()).filter(b => b.status === 'IN_TRANSIT' && b.speed > 0).length;
  const delayedBuses = db.prepare("SELECT COUNT(*) as count FROM buses WHERE status = 'DELAYED'").get().count;
  const emergencyAlerts = db.prepare("SELECT COUNT(*) as count FROM bus_alerts WHERE status = 'ACTIVE'").get().count;

  let totalStudents = 0;
  let totalCapacity = 0;
  for (const b of simulationEngine.busState.values()) {
    totalStudents += b.occupancy;
    totalCapacity += b.capacity;
  }

  const activeCameras = db.prepare("SELECT COUNT(*) as count FROM cameras WHERE connection_status IN ('ONLINE', 'STREAMING')").get().count;

  res.json({
    success: true,
    kpis: {
      totalActiveBuses: totalBuses,
      busesCurrentlyMoving: movingBuses,
      studentsTravelling: totalStudents,
      availableSeats: Math.max(0, totalCapacity - totalStudents),
      delayedBuses,
      cancelledRoutes: 0,
      activeCameras,
      emergencyAlerts
    }
  });
});

// SPA Fallback: serve index.html for frontend navigation
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Central Error Handler
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error occurred',
    message: process.env.NODE_ENV === 'production' ? undefined : err.message
  });
});

// Socket.IO Real-Time Channels & WebRTC Signaling
io.on('connection', (socket) => {
  // console.log(`[Socket.IO] Client connected: ${socket.id}`);

  // Send initial fleet state immediately upon connection
  socket.emit('fleet:initial_state', {
    buses: Array.from(simulationEngine.busState.values()).map(b => ({
      busId: b.busId,
      busNumber: b.busNumber,
      latitude: b.currentLat,
      longitude: b.currentLng,
      speed: b.speed,
      heading: b.heading,
      occupancy: b.occupancy,
      capacity: b.capacity,
      status: b.status,
      etaMinutes: simulationEngine.calculateETA(b),
      progressPct: simulationEngine.calculateProgressPct(b)
    })),
    isDemoActive: simulationEngine.isRunning
  });

  // Driver GPS location sharing from device geolocation
  socket.on('driver:location_ping', (data) => {
    if (!data || !data.busId) return;
    simulationEngine.updateDriverLocation(
      parseInt(data.busId, 10),
      parseFloat(data.latitude),
      parseFloat(data.longitude),
      parseFloat(data.speed || 0),
      parseFloat(data.heading || 0)
    );
  });

  // Driver SOS trigger
  socket.on('driver:sos', (data) => {
    if (!data || !data.busId) return;
    simulationEngine.triggerEmergency(parseInt(data.busId, 10), data.reason || 'Driver SOS Emergency Button Activated', 'DRIVER');
  });

  // WebRTC Signaling for camera stream relay
  socket.on('webrtc:offer', (data) => {
    socket.broadcast.emit('webrtc:offer', data);
  });

  socket.on('webrtc:answer', (data) => {
    socket.broadcast.emit('webrtc:answer', data);
  });

  socket.on('webrtc:ice_candidate', (data) => {
    socket.broadcast.emit('webrtc:ice_candidate', data);
  });

  socket.on('disconnect', () => {
    // console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// Automatic Port Hunting (5000 -> 5001 -> 5002...)
const START_PORT = parseInt(process.env.PORT || '5000', 10);

function startServer(port) {
  server.listen(port, () => {
    console.log(`
========================================================================
🚀 ROUTELESS – Real-Time Intelligent Rural Transportation Platform
========================================================================
🌐 Local Server URL: http://localhost:${port}
📍 Live GPS Tracking: Active (Leaflet + OpenStreetMap)
📹 Camera Gateway: WebRTC + Secure RTSP Proxy Ready
🧠 AI Computer Vision: Anonymous Silhouette Occupancy Engine Active
🚨 Emergency System: SOS Trigger & Rescue Bus Coordinator Ready
🎮 Demonstration Mode: ${simulationEngine.isRunning ? 'ENABLED (Simulated Fleet in Motion)' : 'MANUAL'}
========================================================================
    `);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[Port ${port} in use, trying port ${port + 1}...]`);
      startServer(port + 1);
    } else {
      console.error('[Server listen error]', err);
    }
  });
}

startServer(START_PORT);

module.exports = { app, server, io };
