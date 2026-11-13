/**
 * ROUTELESS – Authentication Routes
 */

const express = require('express');
const router = express.Router();
const { db, hashPassword, verifyPassword } = require('../database/database.js');
const { generateToken, authenticate, requireAuth } = require('../middleware/auth.js');

/**
 * Login
 */
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ success: false, error: 'Invalid email or password' });
  }

  const token = generateToken(user);
  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    college_id_card: user.college_id_card,
    pickup_stop_id: user.pickup_stop_id
  };

  res.json({ success: true, token, user: safeUser });
});

/**
 * Register Student
 */
router.post('/register', (req, res) => {
  const { name, email, password, role = 'student', phone, college_id_card, pickup_stop_id } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, error: 'Name, email, and password required' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (existing) {
    return res.status(409).json({ success: false, error: 'An account with this email already exists' });
  }

  const passwordHash = hashPassword(password);
  const result = db.prepare(`
    INSERT INTO users (name, email, password_hash, role, phone, college_id_card, pickup_stop_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(name.trim(), email.trim().toLowerCase(), passwordHash, role, phone || null, college_id_card || null, pickup_stop_id || null);

  const newUser = {
    id: result.lastInsertRowid,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    role,
    phone,
    college_id_card,
    pickup_stop_id
  };

  const token = generateToken(newUser);
  res.status(201).json({ success: true, token, user: newUser });
});

/**
 * Get current user
 */
router.get('/me', authenticate, requireAuth, (req, res) => {
  res.json({ success: true, user: req.user });
});

/**
 * Hackathon 1-Click Demo Accounts (Dynamically includes all registered students)
 */
router.get('/demo-users', (req, res) => {
  const dbStudents = db.prepare(`
    SELECT u.id, u.name, u.email, u.college_id_card, s.village_name
    FROM users u
    LEFT JOIN stops s ON u.pickup_stop_id = s.id
    WHERE u.role = 'student'
    ORDER BY u.id ASC
  `).all();

  const studentAccounts = dbStudents.map(s => ({
    role: 'student',
    name: `${s.name} (${s.college_id_card || 'Student'})`,
    email: s.email,
    password: 'student123',
    collegeId: s.college_id_card,
    description: `Village: ${s.village_name || 'Rural Corridor'} • Live ETA & Digital Pass`
  }));

  res.json({
    success: true,
    accounts: [
      {
        role: 'admin',
        name: 'Priya Sharma (Transport Controller)',
        email: 'admin@routeless.org',
        password: 'admin123',
        description: 'Command center access: Full fleet map, AI cameras, emergency dispatch'
      },
      {
        role: 'driver',
        name: 'Ramesh Kulkarni (Bus-101 Driver)',
        email: 'driver.ramesh@routeless.org',
        password: 'driver123',
        busNumber: 'KA-22-RT-101',
        busId: 1,
        description: 'Driver cockpit: Start/stop trip, live GPS sharing, SOS trigger, stop manifest'
      },
      ...studentAccounts
    ]
  });
});

module.exports = router;
