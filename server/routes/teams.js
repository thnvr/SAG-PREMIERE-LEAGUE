/**
 * SAG PREMIERE LEAGUES - Teams Routes (Enhanced)
 */

const express = require('express');
const router = express.Router();
const { get, all, run, formatMoney, transaction, exec } = require('../db/database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { getTeamFinancials, getSquadCount } = require('../services/budget');
const { v4: uuidv4 } = require('uuid');

// GET /api/teams - List all teams with live calculated financial summaries and bought squads
router.get('/', (req, res) => {
  const teams = all('SELECT * FROM teams WHERE is_active = 1 ORDER BY display_order ASC, name ASC');
  const enriched = teams.map(t => {
    const fin = getTeamFinancials(t.id);
    const captain = get("SELECT id, display_name, username, photo_url FROM users WHERE team_id = ? AND role = 'captain'", [t.id]);
    
    const squad = all(`
      SELECT p.*, pur.purchase_price, pur.transaction_number, pur.created_at as purchase_time
      FROM players p
      JOIN purchases pur ON p.id = pur.player_id
      WHERE p.sold_to_team_id = ? AND p.auction_status = 'sold' AND pur.is_reversed = 0
      ORDER BY pur.created_at ASC
    `, [t.id]).map(p => {
      try {
        p.secondary_positions = JSON.parse(p.secondary_positions || '[]');
        p.badges = JSON.parse(p.badges || '[]');
      } catch (e) {}
      p.formattedPurchasePrice = formatMoney(p.purchase_price || 0);
      return p;
    });

    return {
      ...t,
      captain_name: t.captain_name || captain?.display_name || 'Captain',
      captain,
      ...fin,
      squad
    };
  });
  res.json(enriched);
});

// GET /api/teams/:id - Single team details with squad list
router.get('/:id', (req, res) => {
  const team = get('SELECT * FROM teams WHERE id = ?', [req.params.id]);
  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }

  const captain = get("SELECT id, display_name, username, photo_url FROM users WHERE team_id = ? AND role = 'captain'", [team.id]);
  const fin = getTeamFinancials(team.id);

  const squad = all(`
    SELECT p.*, pur.purchase_price, pur.transaction_number, pur.created_at as purchase_time
    FROM players p
    JOIN purchases pur ON p.id = pur.player_id
    WHERE p.sold_to_team_id = ? AND p.auction_status = 'sold' AND pur.is_reversed = 0
    ORDER BY pur.created_at ASC
  `, [team.id]).map(p => {
    try {
      p.secondary_positions = JSON.parse(p.secondary_positions || '[]');
      p.badges = JSON.parse(p.badges || '[]');
    } catch (e) {}
    p.formattedPurchasePrice = formatMoney(p.purchase_price || 0);
    return p;
  });

  const groupedSquad = {
    goalkeepers: squad.filter(p => p.primary_position === 'GK'),
    defenders: squad.filter(p => ['CB', 'LB', 'RB'].includes(p.primary_position)),
    midfielders: squad.filter(p => ['CDM', 'CM', 'CAM'].includes(p.primary_position)),
    forwards: squad.filter(p => ['LW', 'RW', 'ST', 'CF'].includes(p.primary_position))
  };

  res.json({
    ...team,
    captain_name: team.captain_name || captain?.display_name || 'Captain',
    captain,
    ...fin,
    squad,
    groupedSquad
  });
});

// GET /api/teams/:id/squad
router.get('/:id/squad', (req, res) => {
  const squad = all(`
    SELECT p.*, pur.purchase_price, pur.transaction_number, pur.created_at as purchase_time
    FROM players p
    JOIN purchases pur ON p.id = pur.player_id
    WHERE p.sold_to_team_id = ? AND p.auction_status = 'sold' AND pur.is_reversed = 0
    ORDER BY p.primary_position, p.name
  `, [req.params.id]);

  res.json(squad);
});

// POST /api/teams - Create a new team (Auctioneer & Super Admin)
router.post('/', authenticate, requireAdmin, (req, res) => {
  const { name, short_name, primary_color, secondary_color, initial_purse, max_squad_size, logo_url, captain_name } = req.body;

  if (!name || !short_name) {
    return res.status(400).json({ error: 'Team name and short name are required' });
  }

  const league = get("SELECT initial_purse, max_squad_size FROM leagues WHERE id = 'default'");
  const purse = initial_purse || (league ? league.initial_purse : 2000000);
  const maxSquad = max_squad_size || (league ? league.max_squad_size : 15);
  const teamId = 'team-' + short_name.toLowerCase().replace(/[^a-z0-9]/g, '');

  run(`
    INSERT INTO teams (id, name, short_name, primary_color, secondary_color, initial_purse, max_squad_size, logo_url, captain_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    teamId, name, short_name.toUpperCase(),
    primary_color || '#22c55e', secondary_color || '#16a34a',
    purse, maxSquad, logo_url || '', captain_name || 'Captain'
  ]);

  run(`
    INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, new_value)
    VALUES (?, ?, 'CREATE_TEAM', 'teams', ?, ?)
  `, [uuidv4(), req.user.id, teamId, JSON.stringify({ name, short_name, purse, captain_name })]);

  const created = get('SELECT * FROM teams WHERE id = ?', [teamId]);
  res.status(201).json(created);
});

// PUT /api/teams/:id - Edit team settings & purse (Auctioneer & Super Admin)
router.put('/:id', authenticate, requireAdmin, (req, res) => {
  const { name, short_name, primary_color, secondary_color, initial_purse, max_squad_size, logo_url, is_active, captain_name } = req.body;
  const team = get('SELECT * FROM teams WHERE id = ?', [req.params.id]);

  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }

  if (initial_purse !== undefined) {
    const totalSpent = getTeamFinancials(team.id).totalSpent;
    if (initial_purse < totalSpent) {
      return res.status(400).json({ 
        error: `Cannot set initial budget (${formatMoney(initial_purse)}) lower than current spent amount (${formatMoney(totalSpent)})` 
      });
    }
  }

  run(`
    UPDATE teams SET
      name = COALESCE(?, name),
      short_name = COALESCE(?, short_name),
      primary_color = COALESCE(?, primary_color),
      secondary_color = COALESCE(?, secondary_color),
      initial_purse = COALESCE(?, initial_purse),
      max_squad_size = COALESCE(?, max_squad_size),
      logo_url = COALESCE(?, logo_url),
      captain_name = COALESCE(?, captain_name),
      is_active = COALESCE(?, is_active),
      updated_at = datetime('now')
    WHERE id = ?
  `, [
    name, short_name, primary_color, secondary_color,
    initial_purse, max_squad_size, logo_url, captain_name,
    is_active !== undefined ? (is_active ? 1 : 0) : null,
    team.id
  ]);

  // Update associated captain display name if provided
  if (captain_name && team.captain_id) {
    run("UPDATE users SET display_name = ? WHERE id = ?", [captain_name, team.captain_id]);
  }

  // Broadcast state update via Socket.io
  if (req.app.get('io')) {
    const { getFullAuctionState } = require('../services/auction');
    req.app.get('io').emit('auction:state', getFullAuctionState());
  }

  const updated = get('SELECT * FROM teams WHERE id = ?', [team.id]);
  res.json(updated);
});

// DELETE /api/teams/:id - Remove franchise (Auctioneer & Super Admin)
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const teamId = req.params.id;
  const team = get('SELECT * FROM teams WHERE id = ?', [teamId]);

  if (!team) {
    return res.status(404).json({ error: 'Franchise not found' });
  }

  // Check if team has active sold players
  const soldCount = get('SELECT COUNT(*) as c FROM players WHERE sold_to_team_id = ?', [teamId]).c;
  if (soldCount > 0) {
    return res.status(400).json({
      error: `Cannot remove franchise "${team.name}" because it has ${soldCount} acquired player(s). Please reset or reassign players first.`
    });
  }

  // Safe delete within transaction
  try {
    transaction(() => {
      // 1. Unlink any users tied to this team
      exec('UPDATE users SET team_id = NULL WHERE team_id = ?', [teamId]);
      // 2. Unlink any bids tied to this team
      exec('DELETE FROM bids WHERE team_id = ?', [teamId]);
      // 3. Unlink any purchases
      exec('DELETE FROM purchases WHERE team_id = ?', [teamId]);
      // 4. Delete the team record
      exec('DELETE FROM teams WHERE id = ?', [teamId]);
    });

    // Audit log
    run(`
      INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, old_value)
      VALUES (?, ?, 'DELETE_TEAM', 'teams', ?, ?)
    `, [uuidv4(), req.user.id, teamId, JSON.stringify({ name: team.name, short_name: team.short_name })]);

    // Broadcast updated auction state
    if (req.app.get('io')) {
      const { getFullAuctionState } = require('../services/auction');
      req.app.get('io').emit('auction:state', getFullAuctionState());
    }

    res.json({ success: true, message: `Franchise "${team.name}" removed successfully.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove franchise: ' + err.message });
  }
});

module.exports = router;
