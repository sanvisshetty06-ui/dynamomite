/**
 * ROUTELESS – Student Bookings & Digital Pass Management
 * Preserves core student transit features: Seat booking, digital boarding pass, stop manifest.
 */

const express = require('express');
const router = express.Router();
const { db } = require('../database/database.js');
const { authenticate, requireAuth, requireRole } = require('../middleware/auth.js');

/**
 * Get active pass for authenticated student
 */
router.get('/my-pass', authenticate, requireAuth, (req, res) => {
  const studentId = req.user.id;
  const booking = db.prepare(`
    SELECT sb.*, b.bus_number, b.driver_name, b.driver_phone, b.model as bus_model,
           r.route_name, r.route_code, r.origin, r.destination, r.color as route_color,
           s.stop_name as pickup_stop_name, s.village_name, s.scheduled_time, s.landmark,
           s.latitude as stop_lat, s.longitude as stop_lng
    FROM student_bookings sb
    JOIN buses b ON sb.bus_id = b.id
    JOIN routes r ON sb.route_id = r.id
    JOIN stops s ON sb.pickup_stop_id = s.id
    WHERE sb.student_id = ? AND sb.status = 'CONFIRMED'
    ORDER BY sb.id DESC LIMIT 1
  `).get(studentId);

  if (!booking) {
    return res.json({ success: true, hasActivePass: false });
  }

  res.json({
    success: true,
    hasActivePass: true,
    pass: booking
  });
});

/**
 * Book seat on a bus
 */
router.post('/book', authenticate, requireAuth, (req, res) => {
  const studentId = req.user.id;
  const { busId, routeId, pickupStopId, seatNumber } = req.body;

  if (!busId || !routeId || !pickupStopId) {
    return res.status(400).json({ success: false, error: 'busId, routeId, and pickupStopId required' });
  }

  const bus = db.prepare('SELECT capacity, current_occupancy FROM buses WHERE id = ?').get(busId);
  if (!bus) return res.status(404).json({ success: false, error: 'Bus not found' });

  if (bus.current_occupancy >= bus.capacity) {
    return res.status(400).json({ success: false, error: 'Bus is currently at maximum capacity' });
  }

  // Use provided seat number or generate one
  const seatNum = seatNumber || `${Math.floor(Math.random() * 20) + 1}${['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)]}`;
  const passCode = `RTL-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`;
  const today = new Date().toISOString().split('T')[0];

  const result = db.prepare(`
    INSERT INTO student_bookings (student_id, bus_id, route_id, pickup_stop_id, booking_date, seat_number, pass_code, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'CONFIRMED')
  `).run(studentId, busId, routeId, pickupStopId, today, seatNum, passCode);

  // Increment occupancy in DB
  const newOccupancy = bus.current_occupancy + 1;
  db.prepare('UPDATE buses SET current_occupancy = ? WHERE id = ?').run(newOccupancy, busId);

  // Update simulation engine memory state if active
  const { simulationEngine } = require('../services/simulation.js');
  const simState = simulationEngine.busState.get(Number(busId));
  if (simState) {
    simState.occupancy = newOccupancy;
  }

  res.status(201).json({
    success: true,
    message: 'Seat confirmed! Digital pass generated.',
    bookingId: result.lastInsertRowid,
    seatNumber: seatNum,
    passCode
  });
});

/**
 * Passenger manifest for Driver Cockpit
 */
router.get('/manifest/:busId', authenticate, (req, res) => {
  const busId = parseInt(req.params.busId, 10);
  const students = db.prepare(`
    SELECT sb.id as booking_id, sb.seat_number, sb.pass_code, sb.status,
           u.name as student_name, u.college_id_card, u.phone,
           s.stop_name as pickup_stop_name, s.village_name
    FROM student_bookings sb
    JOIN users u ON sb.student_id = u.id
    JOIN stops s ON sb.pickup_stop_id = s.id
    WHERE sb.bus_id = ?
    ORDER BY s.sequence_order ASC, sb.seat_number ASC
  `).all(busId);

  res.json({ success: true, count: students.length, manifest: students });
});

module.exports = router;
