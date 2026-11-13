/**
 * ROUTELESS – Student Management & Registration Routes
 * Allows registering single or bulk students, auto-generating passes,
 * and listing all registered students across rural corridors.
 */

const express = require('express');
const router = express.Router();
const { db, hashPassword } = require('../database/database.js');
const { generateToken, authenticate } = require('../middleware/auth.js');

/**
 * List all registered students with their pickup stops and active passes
 */
router.get('/', (req, res) => {
  const students = db.prepare(`
    SELECT u.id, u.name, u.email, u.phone, u.college_id_card, u.pickup_stop_id, u.created_at,
           s.stop_name as pickup_stop_name, s.village_name, s.scheduled_time,
           sb.id as booking_id, sb.seat_number, sb.pass_code, sb.status as pass_status,
           b.bus_number, b.id as bus_id, r.route_name
    FROM users u
    LEFT JOIN stops s ON u.pickup_stop_id = s.id
    LEFT JOIN student_bookings sb ON u.id = sb.student_id AND sb.status = 'CONFIRMED'
    LEFT JOIN buses b ON sb.bus_id = b.id
    LEFT JOIN routes r ON sb.route_id = r.id
    WHERE u.role = 'student'
    ORDER BY u.id DESC
  `).all();

  res.json({ success: true, count: students.length, students });
});

/**
 * Register a single new student
 */
router.post('/', (req, res) => {
  const { 
    name, 
    email, 
    password = 'student123', 
    phone, 
    college_id_card, 
    pickup_stop_id,
    autoBookBusId,
    preferredSeat
  } = req.body;

  if (!name || !email) {
    return res.status(400).json({ success: false, error: 'Name and email are required' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (existing) {
    return res.status(409).json({ success: false, error: 'A student with this email is already registered' });
  }

  const pwdHash = hashPassword(password);
  const stopId = pickup_stop_id ? Number(pickup_stop_id) : 2;

  const userResult = db.prepare(`
    INSERT INTO users (name, email, password_hash, role, phone, college_id_card, pickup_stop_id)
    VALUES (?, ?, ?, 'student', ?, ?, ?)
  `).run(
    name.trim(), 
    email.trim().toLowerCase(), 
    pwdHash, 
    phone || '+91 91234 00000', 
    college_id_card || `RIT-STU-${Date.now().toString().slice(-4)}`, 
    stopId
  );

  const studentId = userResult.lastInsertRowid;
  let bookingData = null;

  // Auto-book seat if bus is specified
  if (autoBookBusId) {
    const bus = db.prepare('SELECT id, route_id, capacity, current_occupancy FROM buses WHERE id = ?').get(Number(autoBookBusId));
    if (bus && bus.current_occupancy < bus.capacity) {
      const seatNum = preferredSeat || `${Math.floor(Math.random() * 18) + 1}${['A', 'B'][Math.floor(Math.random() * 2)]}`;
      const passCode = `RTL-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`;
      const today = new Date().toISOString().split('T')[0];

      db.prepare(`
        INSERT INTO student_bookings (student_id, bus_id, route_id, pickup_stop_id, booking_date, seat_number, pass_code, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'CONFIRMED')
      `).run(studentId, bus.id, bus.route_id, stopId, today, seatNum, passCode);

      db.prepare('UPDATE buses SET current_occupancy = current_occupancy + 1 WHERE id = ?').run(bus.id);

      bookingData = { seatNumber: seatNum, passCode, busId: bus.id };
    }
  }

  const newUser = {
    id: studentId,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    role: 'student',
    phone,
    college_id_card,
    pickup_stop_id: stopId
  };

  const token = generateToken(newUser);

  res.status(201).json({
    success: true,
    message: `Student ${name} registered successfully!`,
    token,
    student: newUser,
    booking: bookingData
  });
});

/**
 * Batch Seed / Add Sample Rural Students
 * Instantly adds realistic rural college students across different villages
 */
router.post('/seed-batch', (req, res) => {
  const sampleStudents = [
    {
      name: 'Rohan Patil',
      email: 'rohan.patil@routeless.org',
      phone: '+91 94490 11221',
      college_id_card: 'RIT-AIML-2024-012',
      pickup_stop_id: 3, // Bidi Panchayat Cross
      bus_id: 1,
      seat: '06A'
    },
    {
      name: 'Sneha Kulkarni',
      email: 'sneha.k@routeless.org',
      phone: '+91 94490 33442',
      college_id_card: 'RIT-ECE-2024-035',
      pickup_stop_id: 4, // Kittur Fort Cross
      bus_id: 1,
      seat: '10B'
    },
    {
      name: 'Vikram Deshmukh',
      email: 'vikram.d@routeless.org',
      phone: '+91 94490 55663',
      college_id_card: 'RIT-MECH-2024-028',
      pickup_stop_id: 2, // Parishwad Rural Stop
      bus_id: 2,
      seat: '08A'
    },
    {
      name: 'Kavita Naik',
      email: 'kavita.naik@routeless.org',
      phone: '+91 94490 77884',
      college_id_card: 'RIT-CIVIL-2024-019',
      pickup_stop_id: 1, // Jamboti Forest Junction
      bus_id: 3,
      seat: '12B'
    },
    {
      name: 'Pooja Marathe',
      email: 'pooja.m@routeless.org',
      phone: '+91 94490 99005',
      college_id_card: 'RIT-CSE-2024-077',
      pickup_stop_id: 5, // Alnavar Rural Cross
      bus_id: 1,
      seat: '16A'
    },
    {
      name: 'Arjun Belagavi',
      email: 'arjun.b@routeless.org',
      phone: '+91 94490 22336',
      college_id_card: 'RIT-EEE-2024-014',
      pickup_stop_id: 3, // Desur Village Junction
      bus_id: 3,
      seat: '14A'
    }
  ];

  let addedCount = 0;
  const defaultPwdHash = hashPassword('student123');
  const today = new Date().toISOString().split('T')[0];

  for (const s of sampleStudents) {
    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(s.email);
    if (!exists) {
      const userRes = db.prepare(`
        INSERT INTO users (name, email, password_hash, role, phone, college_id_card, pickup_stop_id)
        VALUES (?, ?, ?, 'student', ?, ?, ?)
      `).run(s.name, s.email, defaultPwdHash, s.phone, s.college_id_card, s.pickup_stop_id);

      const studentId = userRes.lastInsertRowid;
      const passCode = `RTL-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`;

      // Book seat
      const bus = db.prepare('SELECT id, route_id FROM buses WHERE id = ?').get(s.bus_id);
      if (bus) {
        db.prepare(`
          INSERT INTO student_bookings (student_id, bus_id, route_id, pickup_stop_id, booking_date, seat_number, pass_code, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'CONFIRMED')
        `).run(studentId, s.bus_id, bus.route_id, s.pickup_stop_id, today, s.seat, passCode);

        db.prepare('UPDATE buses SET current_occupancy = current_occupancy + 1 WHERE id = ?').run(s.bus_id);
      }

      addedCount++;
    }
  }

  res.json({
    success: true,
    message: `Batch added ${addedCount} rural college students with verified passes!`,
    addedCount
  });
});

module.exports = router;
