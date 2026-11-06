/**
 * SAG PREMIERE LEAGUES - Bids Route
 */

const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { placeBid } = require('../services/auction');
const { all } = require('../db/database');

// POST /api/bids - Place a bid (Authenticated Captain or Admin)
router.post('/', authenticate, requireRole('super_admin', 'auctioneer', 'captain'), async (req, res) => {
  const { teamId, amount } = req.body;

  if (!teamId || !amount) {
    return res.status(400).json({ error: 'Team ID and bid amount are required' });
  }

  try {
    const result = await placeBid({
      teamId,
      userId: req.user.id,
      amount: parseInt(amount, 10)
    });

    // Broadcast state and new bid via Socket.io
    if (req.app.get('io')) {
      req.app.get('io').emit('auction:bid', result.bid);
      req.app.get('io').emit('auction:state', result.state);
    }

    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/bids/player/:playerId - Bid log for specific player
router.get('/player/:playerId', (req, res) => {
  const bids = all(`
    SELECT b.*, t.name as team_name, t.short_name as team_short, t.primary_color as team_color,
           u.display_name as bidder_name
    FROM bids b
    JOIN teams t ON b.team_id = t.id
    JOIN users u ON b.bidder_user_id = u.id
    WHERE b.player_id = ?
    ORDER BY b.amount DESC, b.created_at DESC
  `, [req.params.playerId]);

  res.json(bids);
});

module.exports = router;
