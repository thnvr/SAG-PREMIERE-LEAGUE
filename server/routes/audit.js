/**
 * SAG PREMIERE LEAGUES - Audit Log Routes
 */

const express = require('express');
const router = express.Router();
const { all, get, run, transaction, exec, formatMoney } = require('../db/database');
const { authenticate, requireSuperAdmin } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// GET /api/audit-log - View audit logs (Admin only)
router.get('/', authenticate, requireSuperAdmin, (req, res) => {
  const logs = all(`
    SELECT a.*, u.username, u.display_name
    FROM audit_log a
    LEFT JOIN users u ON a.user_id = u.id
    ORDER BY a.created_at DESC LIMIT 100
  `);

  res.json(logs);
});

// POST /api/audit-log/reverse-sale/:purchaseId - Reversal of a completed transaction
router.post('/reverse-sale/:purchaseId', authenticate, requireSuperAdmin, (req, res) => {
  const { reason } = req.body;
  const purchase = get('SELECT * FROM purchases WHERE id = ?', [req.params.purchaseId]);

  if (!purchase) {
    return res.status(404).json({ error: 'Purchase record not found' });
  }

  if (purchase.is_reversed) {
    return res.status(400).json({ error: 'This transaction has already been reversed' });
  }

  const player = get('SELECT * FROM players WHERE id = ?', [purchase.player_id]);
  const team = get('SELECT * FROM teams WHERE id = ?', [purchase.team_id]);

  transaction(() => {
    // 1. Mark purchase reversed
    exec(`
      UPDATE purchases SET
        is_reversed = 1,
        reversed_by = ?,
        reversed_at = datetime('now'),
        reversal_reason = ?
      WHERE id = ?
    `, [req.user.id, reason || 'Administrative correction', purchase.id]);

    // 2. Return player to unsold status
    exec(`
      UPDATE players SET
        auction_status = 'unsold',
        sold_to_team_id = NULL,
        sold_price = 0,
        sold_at = NULL,
        updated_at = datetime('now')
      WHERE id = ?
    `, [purchase.player_id]);

    // 3. Add reversal entry to budget ledger (credit back)
    const curBalance = team.initial_purse - (get('SELECT COALESCE(SUM(purchase_price),0) as s FROM purchases WHERE team_id = ? AND is_reversed = 0', [team.id]).s || 0);
    exec(`
      INSERT INTO budget_ledger (
        id, team_id, entry_type, amount, balance_after,
        reference_id, description, created_by
      ) VALUES (?, ?, 'reversal', ?, ?, ?, ?, ?)
    `, [
      uuidv4(), team.id, purchase.purchase_price, curBalance,
      purchase.id, `Sale Reversal: ${player.name} (${reason || 'Admin Correction'})`, req.user.id
    ]);

    // 4. Log in audit log
    exec(`
      INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, new_value)
      VALUES (?, ?, 'REVERSE_PURCHASE', 'purchases', ?, ?)
    `, [uuidv4(), req.user.id, purchase.id, JSON.stringify({ reason, refundAmount: purchase.purchase_price })]);
  });

  res.json({ success: true, message: 'Sale reversed and team purse refunded successfully' });
});

module.exports = router;
