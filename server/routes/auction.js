/**
 * SAG PREMIERE LEAGUES - Auction Controller Routes (Enhanced)
 */

const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const {
  getActiveSession,
  getFullAuctionState,
  nominatePlayer,
  setActiveIncrement,
  placeBid,
  confirmSale,
  markUnsold,
  pauseBidding,
  resumeBidding,
  extendTimer,
  skipPlayer
} = require('../services/auction');
const { get, all } = require('../db/database');

// GET /api/auction/current - Authoritative current auction state
router.get('/current', (req, res) => {
  try {
    const state = getFullAuctionState();
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auction/nominate/:playerId - Nominate player with optional inline overrides (Auctioneer/Admin)
router.post('/nominate/:playerId', authenticate, requireAdmin, (req, res) => {
  try {
    const { name, base_price, primary_position } = req.body || {};
    const state = nominatePlayer(req.params.playerId, req.user.id, {
      name,
      base_price,
      primary_position
    });
    
    if (req.app.get('io')) {
      req.app.get('io').emit('auction:state', state);
      req.app.get('io').emit('auction:player', state.currentPlayer);
    }

    res.json(state);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/auction/increment - Set active bid step (+50 vs +100) (Auctioneer/Admin)
router.post('/increment', authenticate, requireAdmin, (req, res) => {
  try {
    const { increment } = req.body;
    const state = setActiveIncrement(increment);

    if (req.app.get('io')) {
      req.app.get('io').emit('auction:state', state);
    }

    res.json(state);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/auction/manual-bid - Auctioneer manual bid on behalf of a team
router.post('/manual-bid', authenticate, requireAdmin, async (req, res) => {
  try {
    const { teamId, amount } = req.body;
    const result = await placeBid({
      teamId,
      userId: req.user.id,
      amount: parseInt(amount, 10)
    });

    if (req.app.get('io')) {
      const io = req.app.get('io');
      io.emit('auction:bid', result.bid);
      io.emit('auction:state', result.state);

      // Anti-Inflation: Check if current highest bid is 2x or more of base price
      try {
        const { all, formatMoney } = require('../db/database');
        const currentPlayer = result.state?.currentPlayer;
        const currentBid = result.state?.session?.current_highest_bid || 0;
        const basePrice = currentPlayer?.base_price || 0;
        if (currentPlayer && basePrice > 0 && currentBid >= 2 * basePrice) {
          const biddingTeams = all(
            'SELECT DISTINCT team_id FROM bids WHERE session_id = ? AND player_id = ?',
            [result.state.session.id, currentPlayer.id]
          );
          const upcoming = all(
            "SELECT id, name, primary_position, base_price FROM players WHERE primary_position = ? AND status = 'upcoming' AND id != ? ORDER BY base_price ASC LIMIT 5",
            [currentPlayer.primary_position, currentPlayer.id]
          );
          io.emit('auction:double-price-alert', {
            playerId: currentPlayer.id,
            playerName: currentPlayer.name,
            position: currentPlayer.primary_position,
            basePrice,
            currentBid,
            biddingTeamIds: (biddingTeams || []).map(b => b.team_id),
            upcomingPlayers: upcoming || [],
            message: `⚠️ PRICE INFLATION WARNING: ${currentPlayer.name} bid has doubled from ${formatMoney(basePrice)} to ${formatMoney(currentBid)}! Losing bids may incur tax deductions. Consider alternative ${currentPlayer.primary_position} players upcoming.`
          });
        }
      } catch (alertErr) {
        console.error('[Route] Double price alert check error:', alertErr);
      }
    }

    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/auction/sold - Confirm sale to highest bidder (Auctioneer, Admin)
router.post('/sold', authenticate, requireAdmin, (req, res) => {
  try {
    const result = confirmSale(req.user.id);

    if (req.app.get('io')) {
      req.app.get('io').emit('auction:sold', result.sale);
      req.app.get('io').emit('auction:state', result.state);
    }

    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/auction/unsold - Mark current player unsold (Auctioneer, Admin)
router.post('/unsold', authenticate, requireAdmin, (req, res) => {
  try {
    const result = markUnsold(req.user.id);

    if (req.app.get('io')) {
      req.app.get('io').emit('auction:unsold', result.player);
      req.app.get('io').emit('auction:state', result.state);
    }

    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/auction/pause-bidding
router.post('/pause-bidding', authenticate, requireAdmin, (req, res) => {
  try {
    const state = pauseBidding(req.user.id);
    if (req.app.get('io')) req.app.get('io').emit('auction:state', state);
    res.json(state);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/auction/resume-bidding
router.post('/resume-bidding', authenticate, requireAdmin, (req, res) => {
  try {
    const state = resumeBidding(req.user.id);
    if (req.app.get('io')) req.app.get('io').emit('auction:state', state);
    res.json(state);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/auction/extend
router.post('/extend', authenticate, requireAdmin, (req, res) => {
  try {
    const seconds = req.body.seconds || 15;
    const state = extendTimer(seconds);
    if (req.app.get('io')) req.app.get('io').emit('auction:state', state);
    res.json(state);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/auction/tax-deduction - Apply losing bid tax / anti-inflation point deduction
router.post('/tax-deduction', authenticate, requireAdmin, (req, res) => {
  try {
    const { teamId, percentage = 5, customAmount, bidAmount, reason } = req.body;
    if (!teamId) {
      return res.status(400).json({ error: 'Team ID is required' });
    }

    const { get, run, all, formatMoney, transaction, exec } = require('../db/database');
    const { v4: uuidv4 } = require('uuid');

    const team = get('SELECT * FROM teams WHERE id = ?', [teamId]);
    if (!team) {
      return res.status(404).json({ error: 'Franchise not found' });
    }

    // Calculate tax deduction amount in paise
    let taxPaise = 0;
    if (customAmount && !isNaN(customAmount)) {
      taxPaise = Math.round(parseFloat(customAmount) * 100);
    } else if (bidAmount && !isNaN(bidAmount)) {
      const pct = parseFloat(percentage) || 5;
      taxPaise = Math.round((parseFloat(bidAmount) * pct) / 100);
    } else {
      // Fallback: 5% of highest bid
      const session = require('../services/auction').getActiveSession();
      const basis = session.current_highest_bid || 10000;
      taxPaise = Math.round((basis * (parseFloat(percentage) || 5)) / 100);
    }

    if (taxPaise <= 0) {
      return res.status(400).json({ error: 'Tax deduction amount must be greater than 0' });
    }

    const newPurse = Math.max(0, team.initial_purse - taxPaise);

    transaction(() => {
      // Update team initial_purse
      exec('UPDATE teams SET initial_purse = ?, updated_at = datetime("now") WHERE id = ?', [newPurse, team.id]);

      // Record in budget ledger
      const ledgerDesc = reason || `Anti-Inflation Tax: ${percentage}% losing bid deduction (-${formatMoney(taxPaise)})`;
      exec(`
        INSERT INTO budget_ledger (
          id, team_id, entry_type, amount, balance_after, description, created_by
        ) VALUES (?, ?, 'adjustment', ?, ?, ?, ?)
      `, [uuidv4(), team.id, -taxPaise, newPurse, ledgerDesc, req.user.id]);

      // Audit log
      exec(`
        INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, new_value)
        VALUES (?, ?, 'TAX_DEDUCTION', 'teams', ?, ?)
      `, [uuidv4(), req.user.id, team.id, JSON.stringify({
        teamName: team.name,
        taxPaise,
        percentage,
        newPurse
      })]);
    });

    const fullState = require('../services/auction').getFullAuctionState();

    if (req.app.get('io')) {
      req.app.get('io').emit('auction:state', fullState);
      req.app.get('io').emit('auction:tax-alert', {
        teamId: team.id,
        teamName: team.name,
        percentage,
        deductedAmount: taxPaise,
        formattedDeducted: formatMoney(taxPaise),
        remainingPurse: newPurse,
        formattedRemaining: formatMoney(newPurse),
        message: `⚠️ Anti-Inflation Penalty: ${team.name} has been charged a ${percentage}% losing bid tax (${formatMoney(taxPaise)}).`
      });
    }

    res.json({
      success: true,
      teamId: team.id,
      deductedAmount: taxPaise,
      formattedDeducted: formatMoney(taxPaise),
      newPurse,
      formattedPurse: formatMoney(newPurse),
      state: fullState
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to apply tax deduction: ' + err.message });
  }
});

// POST /api/auction/set-increment
router.post('/set-increment', authenticate, requireAdmin, (req, res) => {
  try {
    const { increment } = req.body;
    const state = setActiveIncrement(increment);
    if (req.app.get('io')) req.app.get('io').emit('auction:state', state);
    res.json(state);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/auction/nominate
router.post('/nominate', authenticate, requireAdmin, (req, res) => {
  try {
    const { playerId, overrides } = req.body;
    const state = nominatePlayer(playerId, overrides);
    if (req.app.get('io')) req.app.get('io').emit('auction:state', state);
    res.json(state);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/auction/skip
router.post('/skip', authenticate, requireAdmin, (req, res) => {
  try {
    const state = skipPlayer(req.user.id);
    if (req.app.get('io')) req.app.get('io').emit('auction:state', state);
    res.json(state);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/auction/kick-player - Kick / remove a signed player from a team
router.post('/kick-player', authenticate, requireAdmin, (req, res) => {
  try {
    const { playerId, teamId, reason } = req.body;
    if (!playerId) {
      return res.status(400).json({ error: 'Player ID is required' });
    }

    const { get, run, all, formatMoney, transaction, exec } = require('../db/database');
    const { v4: uuidv4 } = require('uuid');

    const player = get('SELECT * FROM players WHERE id = ?', [playerId]);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    if (player.auction_status !== 'sold' && !player.sold_to_team_id) {
      return res.status(400).json({ error: 'Player is not signed to any team' });
    }

    const targetTeamId = teamId || player.sold_to_team_id;
    const team = get('SELECT * FROM teams WHERE id = ?', [targetTeamId]);
    const purchase = get('SELECT * FROM purchases WHERE player_id = ? ORDER BY created_at DESC LIMIT 1', [player.id]);
    const refundPaise = purchase ? purchase.purchase_price : (player.sold_price || 0);

    transaction(() => {
      // 1. Reset player auction status back to upcoming and detach from team
      exec(`
        UPDATE players
        SET auction_status = 'upcoming',
            sold_to_team_id = NULL,
            sold_price = 0,
            sold_at = NULL,
            updated_at = datetime('now')
        WHERE id = ?
      `, [player.id]);

      // 2. Remove purchase record
      exec('DELETE FROM purchases WHERE player_id = ?', [player.id]);

      // 3. If there was a purchase price and team, refund purse via budget_ledger reversal
      if (team && refundPaise > 0) {
        const teamPurse = team.initial_purse;
        const refundDesc = reason || `Auctioneer Kick: ${player.name} removed from roster. +${formatMoney(refundPaise)} returned to purse.`;

        exec(`
          INSERT INTO budget_ledger (
            id, team_id, entry_type, amount, balance_after, reference_id, description, created_by
          ) VALUES (?, ?, 'reversal', ?, ?, ?, ?, ?)
        `, [uuidv4(), team.id, refundPaise, teamPurse, player.id, refundDesc, req.user.id]);
      }

      // 4. Audit Log
      exec(`
        INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, new_value)
        VALUES (?, ?, 'PLAYER_KICKED', 'players', ?, ?)
      `, [uuidv4(), req.user.id, player.id, JSON.stringify({
        playerName: player.name,
        teamId: targetTeamId,
        teamName: team?.name,
        refundedAmount: refundPaise,
        reason: reason || 'Kicked by Auctioneer'
      })]);
    });

    const fullState = require('../services/auction').getFullAuctionState();

    if (req.app.get('io')) {
      const io = req.app.get('io');
      io.emit('auction:state', fullState);
      io.emit('auction:player-kicked', {
        playerId: player.id,
        playerName: player.name,
        teamId: targetTeamId,
        teamName: team?.name || 'Team',
        refundedAmount: refundPaise,
        formattedRefund: formatMoney(refundPaise),
        message: `🚨 Player Kick: ${player.name} has been removed from ${team?.name || 'their team'} by the auctioneer. Returned to pool.`
      });
    }

    res.json({
      success: true,
      message: `${player.name} removed from team and returned to upcoming pool`,
      refundedAmount: refundPaise,
      state: fullState
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to kick player: ' + err.message });
  }
});

// GET /api/auction/history
router.get('/history', (req, res) => {
  const { teamId, playerId, limit = 50 } = req.query;

  let query = `
    SELECT pur.*, p.name as player_name, p.primary_position, p.photo_url,
           t.name as team_name, t.short_name as team_short, t.primary_color as team_color,
           u.display_name as confirmed_by_name
    FROM purchases pur
    JOIN players p ON pur.player_id = p.id
    JOIN teams t ON pur.team_id = t.id
    LEFT JOIN users u ON pur.confirmed_by = u.id
    WHERE 1=1
  `;
  const params = [];

  if (teamId) {
    query += ' AND pur.team_id = ?';
    params.push(teamId);
  }

  if (playerId) {
    query += ' AND pur.player_id = ?';
    params.push(playerId);
  }

  query += ' ORDER BY pur.created_at DESC LIMIT ?';
  params.push(parseInt(limit, 10));

  const history = all(query, params);
  res.json(history);
});

module.exports = router;
