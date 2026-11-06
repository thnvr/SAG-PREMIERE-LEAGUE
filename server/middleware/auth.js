/**
 * SAG PREMIERE LEAGUES - Authentication Middleware
 * JWT verification and role-based access control
 */

const jwt = require('jsonwebtoken');
const { get } = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'sag-premiere-leagues-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';

/**
 * Verify JWT token from Authorization header
 * Attaches user object to req.user on success
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header provided' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Invalid authorization format. Use: Bearer <token>' });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (
      decoded.role === 'spectator' &&
      typeof decoded.userId === 'string' &&
      decoded.userId.startsWith('spectator-guest')
    ) {
      req.user = {
        id: decoded.userId,
        username: decoded.username || 'player',
        display_name: decoded.displayName || decoded.username || 'Spectator',
        role: 'spectator',
        team_id: null,
        is_active: 1,
        photo_url: ''
      };
      return next();
    }

    // Fetch fresh user data from database
    const user = get(
      'SELECT id, username, display_name, role, team_id, is_active, photo_url FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token', code: 'INVALID_TOKEN' });
    }
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * Require specific roles for access
 * @param  {...string} roles - Allowed roles ('super_admin', 'auctioneer', 'captain', 'viewer')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: roles,
        current: req.user.role
      });
    }

    next();
  };
}

/**
 * Require admin, auctioneer or captain role
 */
function requireAdminOrCaptain(req, res, next) {
  return requireRole('super_admin', 'auctioneer', 'captain')(req, res, next);
}

/**
 * Require admin or auctioneer role
 */
function requireAdmin(req, res, next) {
  return requireRole('super_admin', 'auctioneer')(req, res, next);
}

/**
 * Require super admin role only
 */
function requireSuperAdmin(req, res, next) {
  return requireRole('super_admin')(req, res, next);
}

/**
 * Optional authentication - sets req.user if token present, but doesn't fail
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    req.user = null;
    return next();
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(parts[1], JWT_SECRET);
    const user = get(
      'SELECT id, username, display_name, role, team_id, is_active, photo_url FROM users WHERE id = ?',
      [decoded.userId]
    );
    req.user = user && user.is_active ? user : null;
  } catch {
    req.user = null;
  }

  next();
}

/**
 * Generate JWT token for a user
 * @param {Object} user - User object with id, username, role, team_id
 * @returns {string} JWT token
 */
function generateToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      username: user.username,
      role: user.role,
      teamId: user.team_id || null
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Verify a JWT token and return decoded payload
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded payload or null
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

module.exports = {
  authenticate,
  requireRole,
  requireAdmin,
  requireAdminOrCaptain,
  requireSuperAdmin,
  optionalAuth,
  generateToken,
  verifyToken,
  JWT_SECRET,
  JWT_EXPIRES_IN
};
