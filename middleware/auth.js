/**
 * ROUTELESS – Authentication & Authorization Middleware
 * Cryptographically signed bearer tokens, role checks, and camera access control.
 */

const crypto = require('node:crypto');
const { db } = require('../database/database.js');

const SECRET_KEY = process.env.JWT_SECRET || 'routeless-rural-transit-key-sec-990812';

/**
 * Generate secure session token
 */
function generateToken(user) {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    timestamp: Date.now()
  };
  const jsonStr = JSON.stringify(payload);
  const base64Payload = Buffer.from(jsonStr).toString('base64url');
  const signature = crypto.createHmac('sha256', SECRET_KEY).update(base64Payload).digest('base64url');
  return `${base64Payload}.${signature}`;
}

/**
 * Verify and parse session token
 */
function verifyToken(tokenStr) {
  if (!tokenStr || typeof tokenStr !== 'string') return null;
  const parts = tokenStr.split('.');
  if (parts.length !== 2) return null;
  const [base64Payload, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', SECRET_KEY).update(base64Payload).digest('base64url');
  if (signature !== expectedSig) return null;

  try {
    const payload = JSON.parse(Buffer.from(base64Payload, 'base64url').toString('utf8'));
    // Valid for 7 days
    if (Date.now() - payload.timestamp > 7 * 24 * 60 * 60 * 1000) return null;
    return payload;
  } catch (err) {
    return null;
  }
}

/**
 * Express middleware to authenticate user
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    req.user = null;
    return next();
  }

  const payload = verifyToken(token);
  if (!payload) {
    req.user = null;
    return next();
  }

  const user = db.prepare('SELECT id, name, email, role, phone, college_id_card, pickup_stop_id FROM users WHERE id = ?').get(payload.userId);
  req.user = user || null;
  next();
}

/**
 * Guard middleware for requiring login
 */
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  next();
}

/**
 * Guard middleware for requiring specific role
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: `Access denied. Requires one of: ${roles.join(', ')}` });
    }
    next();
  };
}

module.exports = {
  generateToken,
  verifyToken,
  authenticate,
  requireAuth,
  requireRole
};
