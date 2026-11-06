/**
 * SAG PREMIERE LEAGUES - Auth Routes
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { get, run, all } = require('../db/database');
const { authenticate, JWT_SECRET, JWT_EXPIRES_IN } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password, displayName } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const trimmedUsername = String(username).trim();
  const trimmedPassword = String(password).trim();

  // 1. Check if matching a registered database user (admin, auctioneer, captain)
  const registeredUser = get('SELECT * FROM users WHERE username = ? COLLATE NOCASE', [trimmedUsername]);
  if (registeredUser && registeredUser.password_hash) {
    const validPassword = bcrypt.compareSync(trimmedPassword, registeredUser.password_hash);
    if (validPassword) {
      if (!registeredUser.is_active) {
        return res.status(403).json({ error: 'Account is deactivated' });
      }

      run("UPDATE users SET last_login = datetime('now') WHERE id = ?", [registeredUser.id]);

      let team = null;
      if (registeredUser.team_id) {
        team = get('SELECT * FROM teams WHERE id = ?', [registeredUser.team_id]);
      }

      const token = jwt.sign(
        { userId: registeredUser.id, username: registeredUser.username, role: registeredUser.role, teamId: registeredUser.team_id },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      return res.json({
        token,
        user: {
          id: registeredUser.id,
          username: registeredUser.username,
          displayName: registeredUser.display_name,
          role: registeredUser.role,
          photoUrl: registeredUser.photo_url,
          teamId: registeredUser.team_id,
          team
        }
      });
    }
  }

  // 2. Spectator Guest Access: Password must be '111' (default username is 'player' or any spectator name)
  if (trimmedPassword === '111' || trimmedUsername.toLowerCase() === 'player') {
    if (trimmedPassword !== '111') {
      return res.status(401).json({ error: 'Spectator password must be 111' });
    }

    const safeUsername = trimmedUsername || 'player';
    const guestDisplayName = typeof displayName === 'string' && displayName.trim()
      ? displayName.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 32)
      : safeUsername;

    const guestId = 'spectator-guest-' + Date.now();
    const token = jwt.sign(
      { userId: guestId, username: safeUsername, role: 'spectator', displayName: guestDisplayName },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.json({
      token,
      user: {
        id: guestId,
        username: safeUsername,
        displayName: guestDisplayName,
        role: 'spectator',
        photoUrl: '',
        teamId: null,
        team: null
      }
    });
  }

  return res.status(401).json({ error: 'Invalid username or password' });
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  let team = null;
  if (req.user.team_id) {
    team = get('SELECT * FROM teams WHERE id = ?', [req.user.team_id]);
  }

  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      displayName: req.user.display_name,
      role: req.user.role,
      photoUrl: req.user.photo_url,
      teamId: req.user.team_id,
      team
    }
  });
});

// GET /api/auth/users (Admin only)
router.get('/users', authenticate, (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Admin privileges required' });
  }

  const users = all(`
    SELECT u.id, u.username, u.display_name, u.role, u.photo_url, u.team_id, u.is_active, u.last_login,
           t.name as team_name
    FROM users u
    LEFT JOIN teams t ON u.team_id = t.id
    ORDER BY u.role, u.username
  `);

  res.json(users);
});

module.exports = router;
