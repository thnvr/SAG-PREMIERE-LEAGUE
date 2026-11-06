/**
 * SAG PREMIERE LEAGUES - Admin & League Config Routes
 */

const express = require('express');
const router = express.Router();
const { get, all, run, formatMoney } = require('../db/database');
const { authenticate, requireSuperAdmin, requireAdmin } = require('../middleware/auth');
const { getTeamFinancials } = require('../services/budget');
const { v4: uuidv4 } = require('uuid');

// GET /api/admin/dashboard - High-level statistics
router.get('/dashboard', authenticate, requireAdmin, (req, res) => {
  const totalTeams = get('SELECT COUNT(*) as count FROM teams WHERE is_active = 1').count;
  const totalPlayers = get('SELECT COUNT(*) as count FROM players').count;
  const soldPlayers = get("SELECT COUNT(*) as count FROM players WHERE auction_status = 'sold'").count;
  const unsoldPlayers = get("SELECT COUNT(*) as count FROM players WHERE auction_status = 'unsold'").count;
  const remainingPlayers = get("SELECT COUNT(*) as count FROM players WHERE auction_status = 'upcoming'").count;

  const totalSpentResult = get('SELECT COALESCE(SUM(purchase_price), 0) as total FROM purchases WHERE is_reversed = 0');
  const totalSpent = totalSpentResult ? totalSpentResult.total : 0;

  const teams = all('SELECT id, name, short_name, primary_color, initial_purse FROM teams WHERE is_active = 1');
  const totalInitialPurse = teams.reduce((acc, t) => acc + t.initial_purse, 0);
  const totalRemainingPurse = totalInitialPurse - totalSpent;

  // Position breakdown
  const positionDistribution = all(`
    SELECT primary_position, COUNT(*) as count,
           SUM(CASE WHEN auction_status = 'sold' THEN 1 ELSE 0 END) as sold_count
    FROM players
    GROUP BY primary_position
    ORDER BY count DESC
  `);

  // Team spending comparison
  const teamSpending = teams.map(t => {
    const fin = getTeamFinancials(t.id);
    return {
      id: t.id,
      name: t.name,
      shortName: t.short_name,
      color: t.primary_color,
      initialPurse: t.initial_purse,
      totalSpent: fin.totalSpent,
      remainingPurse: fin.remainingPurse,
      playersPurchased: fin.playersPurchased,
      formattedSpent: formatMoney(fin.totalSpent),
      formattedRemaining: formatMoney(fin.remainingPurse)
    };
  });

  // Recent transactions
  const recentPurchases = all(`
    SELECT pur.*, p.name as player_name, p.primary_position, p.photo_url,
           t.name as team_name, t.short_name as team_short, t.primary_color as team_color
    FROM purchases pur
    JOIN players p ON pur.player_id = p.id
    JOIN teams t ON pur.team_id = t.id
    WHERE pur.is_reversed = 0
    ORDER BY pur.created_at DESC LIMIT 10
  `);

  const league = get("SELECT * FROM leagues WHERE id = 'default'");

  res.json({
    stats: {
      totalTeams,
      totalPlayers,
      soldPlayers,
      unsoldPlayers,
      remainingPlayers,
      totalSpent,
      totalRemainingPurse,
      totalInitialPurse,
      formattedTotalSpent: formatMoney(totalSpent),
      formattedTotalRemaining: formatMoney(totalRemainingPurse),
      formattedTotalPurse: formatMoney(totalInitialPurse),
      auctionStatus: league ? league.auction_status : 'pre_auction'
    },
    positionDistribution,
    teamSpending,
    recentPurchases,
    league
  });
});

// GET /api/admin/league - League configuration
router.get('/league', (req, res) => {
  const league = get("SELECT * FROM leagues WHERE id = 'default'");
  if (!league) {
    return res.status(404).json({ error: 'League settings not found' });
  }
  res.json({
    ...league,
    formattedInitialPurse: formatMoney(league.initial_purse),
    formattedMinIncrement: formatMoney(league.min_bid_increment)
  });
});

// PUT /api/admin/league - Update league configuration (Super Admin only)
router.put('/league', authenticate, requireSuperAdmin, (req, res) => {
  const {
    name, season, venue, auction_date, logo_url,
    initial_purse, max_squad_size, min_squad_size,
    min_bid_increment, countdown_duration, countdown_extension,
    extend_on_late_bid, late_bid_threshold,
    public_budgets_visible, public_squads_visible,
    min_gk, min_def, min_mid, min_fwd
  } = req.body;

  // Check if auction is already active with sales
  const salesCount = get('SELECT COUNT(*) as count FROM purchases WHERE is_reversed = 0').count;
  if (salesCount > 0 && initial_purse) {
    // Check if initial purse change would invalidate existing purchases
    const currentLeague = get("SELECT initial_purse FROM leagues WHERE id = 'default'");
    if (initial_purse !== currentLeague.initial_purse) {
      return res.status(400).json({ 
        error: 'Cannot modify baseline purse once players have already been sold in the auction.' 
      });
    }
  }

  run(`
    UPDATE leagues SET
      name = COALESCE(?, name),
      season = COALESCE(?, season),
      venue = COALESCE(?, venue),
      auction_date = COALESCE(?, auction_date),
      logo_url = COALESCE(?, logo_url),
      initial_purse = COALESCE(?, initial_purse),
      max_squad_size = COALESCE(?, max_squad_size),
      min_squad_size = COALESCE(?, min_squad_size),
      min_bid_increment = COALESCE(?, min_bid_increment),
      countdown_duration = COALESCE(?, countdown_duration),
      countdown_extension = COALESCE(?, countdown_extension),
      extend_on_late_bid = COALESCE(?, extend_on_late_bid),
      late_bid_threshold = COALESCE(?, late_bid_threshold),
      public_budgets_visible = COALESCE(?, public_budgets_visible),
      public_squads_visible = COALESCE(?, public_squads_visible),
      min_gk = COALESCE(?, min_gk),
      min_def = COALESCE(?, min_def),
      min_mid = COALESCE(?, min_mid),
      min_fwd = COALESCE(?, min_fwd),
      updated_at = datetime('now')
    WHERE id = 'default'
  `, [
    name, season, venue, auction_date, logo_url,
    initial_purse, max_squad_size, min_squad_size,
    min_bid_increment, countdown_duration, countdown_extension,
    extend_on_late_bid !== undefined ? (extend_on_late_bid ? 1 : 0) : null,
    late_bid_threshold,
    public_budgets_visible !== undefined ? (public_budgets_visible ? 1 : 0) : null,
    public_squads_visible !== undefined ? (public_squads_visible ? 1 : 0) : null,
    min_gk, min_def, min_mid, min_fwd
  ]);

  // Log to audit log
  run(`
    INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, new_value)
    VALUES (?, ?, 'UPDATE_LEAGUE_CONFIG', 'leagues', 'default', ?)
  `, [uuidv4(), req.user.id, JSON.stringify(req.body)]);

  const updated = get("SELECT * FROM leagues WHERE id = 'default'");
  res.json({ success: true, league: updated });
});

// GET /api/admin/badges - List all badges (built-in + custom)
router.get('/badges', authenticate, requireAdmin, (req, res) => {
  try {
    run(`CREATE TABLE IF NOT EXISTS custom_badges (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL DEFAULT 'playstyle',
      icon TEXT NOT NULL DEFAULT 'Award',
      color TEXT NOT NULL DEFAULT '#ffd000',
      description TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);

    const defaults = [
      { id: 'b-finisher', name: 'Finisher++', code: 'finisher', category: 'striker', icon: 'Zap', color: '#ffd000', description: 'Deadly clinical inside the 18-yard box.' },
      { id: 'b-goldenboot', name: 'Golden Boot', code: 'golden_boot', category: 'award', icon: 'Trophy', color: '#ffd000', description: 'Top tournament goalscorer award holder.' },
      { id: 'b-safehands', name: 'Safe Hands', code: 'safe_hands', category: 'goalkeeper', icon: 'Shield', color: '#38bdf8', description: 'Unbeatable aerial reflex & clean-sheet king.' },
      { id: 'b-playmaker', name: 'Playmaker', code: 'playmaker', category: 'midfield', icon: 'Sparkles', color: '#a855f7', description: 'Visionary through-balls and key assists maestro.' },
      { id: 'b-wall', name: 'Defensive Wall', code: 'wall', category: 'defense', icon: 'Shield', color: '#f97316', description: 'Impenetrable standing & slide tackles champion.' },
      { id: 'b-speed', name: 'Speed Demon', code: 'speed_demon', category: 'playstyle', icon: 'Zap', color: '#eab308', description: 'Explosive wing sprint and counter-attack acceleration.' },
      { id: 'b-deadball', name: 'Dead Ball', code: 'dead_ball', category: 'playstyle', icon: 'Crosshair', color: '#ec4899', description: 'Curling free-kicks and precision set-piece delivery.' },
      { id: 'b-acrobatic', name: 'Acrobatic', code: 'acrobatic', category: 'playstyle', icon: 'Star', color: '#06b6d4', description: 'Bicycle kicks, diving headers, and acrobatic finishes.' },
      { id: 'b-emerging', name: 'Emerging Star', code: 'emerging_star', category: 'award', icon: 'Award', color: '#10b981', description: 'Breakout prodigy & youth sensation of the tournament.' },
      { id: 'b-captain', name: 'Franchise Leader', code: 'captain_leader', category: 'leadership', icon: 'Crown', color: '#ffd000', description: 'Inspiring captaincy and team morale booster.' },
      { id: 'b-tikitaka', name: 'Tiki-Taka', code: 'tiki_taka', category: 'midfield', icon: 'Activity', color: '#6366f1', description: 'Rapid one-touch triangles and ball control mastery.' }
    ];

    const customs = all('SELECT * FROM custom_badges ORDER BY name ASC');
    res.json({ defaults, customs, all: [...defaults, ...customs] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/badges - Create custom badge
router.post('/badges', authenticate, requireAdmin, (req, res) => {
  try {
    const { name, category, icon, color, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Badge name is required' });

    const code = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const id = 'badge-' + uuidv4().slice(0, 8);

    run(`
      INSERT INTO custom_badges (id, name, code, category, icon, color, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id, name, code, category || 'playstyle', icon || 'Award', color || '#ffd000', description || '']);

    res.status(201).json({ id, name, code, category, icon, color, description });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/admin/players/:id/badge - Toggle/assign badge to player
router.post('/players/:id/badge', authenticate, requireAdmin, (req, res) => {
  try {
    const { badgeName, action } = req.body;
    const player = get('SELECT id, badges FROM players WHERE id = ?', [req.params.id]);
    if (!player) return res.status(404).json({ error: 'Player not found' });

    let currentBadges = [];
    try {
      currentBadges = JSON.parse(player.badges || '[]');
    } catch {
      currentBadges = [];
    }

    if (action === 'remove') {
      currentBadges = currentBadges.filter(b => b !== badgeName);
    } else {
      if (!currentBadges.includes(badgeName)) {
        currentBadges.push(badgeName);
      }
    }

    run('UPDATE players SET badges = ? WHERE id = ?', [JSON.stringify(currentBadges), player.id]);

    if (req.app.get('io')) {
      const { getFullAuctionState } = require('../services/auction');
      req.app.get('io').emit('auction:state', getFullAuctionState());
    }

    res.json({ success: true, playerId: player.id, badges: currentBadges });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/admin/teams/:id/fix-purse - Fix / update team purse amount directly
router.post('/teams/:id/fix-purse', authenticate, requireAdmin, (req, res) => {
  try {
    const { initial_purse } = req.body;
    if (initial_purse === undefined || isNaN(initial_purse)) {
      return res.status(400).json({ error: 'Valid purse amount in paise is required' });
    }

    const team = get('SELECT * FROM teams WHERE id = ?', [req.params.id]);
    if (!team) return res.status(404).json({ error: 'Team not found' });

    const totalSpent = getTeamFinancials(team.id).totalSpent;
    if (initial_purse < totalSpent) {
      return res.status(400).json({
        error: `Cannot fix purse to ${formatMoney(initial_purse)} because team has already spent ${formatMoney(totalSpent)}.`
      });
    }

    run('UPDATE teams SET initial_purse = ?, updated_at = datetime("now") WHERE id = ?', [parseInt(initial_purse, 10), team.id]);

    run(`
      INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, old_value, new_value)
      VALUES (?, ?, 'FIX_TEAM_PURSE', 'teams', ?, ?, ?)
    `, [uuidv4(), req.user.id, team.id, JSON.stringify({ oldPurse: team.initial_purse }), JSON.stringify({ newPurse: initial_purse })]);

    if (req.app.get('io')) {
      const { getFullAuctionState } = require('../services/auction');
      req.app.get('io').emit('auction:state', getFullAuctionState());
    }

    const updated = get('SELECT * FROM teams WHERE id = ?', [team.id]);
    res.json({ success: true, team: updated, financials: getTeamFinancials(team.id) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/admin/awards - Get all tournament award summaries & poster data
router.get('/awards', authenticate, requireAdmin, (req, res) => {
  try {
    run(`CREATE TABLE IF NOT EXISTS tournament_awards (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL UNIQUE,
      title_line1 TEXT NOT NULL,
      title_line2 TEXT NOT NULL,
      title_line3 TEXT NOT NULL,
      subtitle TEXT NOT NULL,
      hashtag TEXT NOT NULL DEFAULT '#SAGAwards2026',
      finalists_json TEXT NOT NULL DEFAULT '[]',
      stats_summary_json TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);

    const awards = all('SELECT * FROM tournament_awards');
    const parsed = awards.map(a => {
      try {
        a.finalists = JSON.parse(a.finalists_json || '[]');
        a.statsSummary = JSON.parse(a.stats_summary_json || '{}');
      } catch {
        a.finalists = [];
        a.statsSummary = {};
      }
      return a;
    });

    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/awards - Save/update tournament award summary & poster configuration
router.post('/awards', authenticate, requireAdmin, (req, res) => {
  try {
    const {
      category,
      title_line1,
      title_line2,
      title_line3,
      subtitle,
      hashtag,
      finalists,
      statsSummary
    } = req.body;

    if (!category) return res.status(400).json({ error: 'Award category is required' });

    run(`CREATE TABLE IF NOT EXISTS tournament_awards (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL UNIQUE,
      title_line1 TEXT NOT NULL,
      title_line2 TEXT NOT NULL,
      title_line3 TEXT NOT NULL,
      subtitle TEXT NOT NULL,
      hashtag TEXT NOT NULL DEFAULT '#SAGAwards2026',
      finalists_json TEXT NOT NULL DEFAULT '[]',
      stats_summary_json TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);

    const existing = get('SELECT id FROM tournament_awards WHERE category = ?', [category]);
    const id = existing ? existing.id : 'award-' + uuidv4().slice(0, 8);

    const finJson = JSON.stringify(finalists || []);
    const statsJson = JSON.stringify(statsSummary || {});

    if (existing) {
      run(`
        UPDATE tournament_awards SET
          title_line1 = ?,
          title_line2 = ?,
          title_line3 = ?,
          subtitle = ?,
          hashtag = ?,
          finalists_json = ?,
          stats_summary_json = ?,
          updated_at = datetime('now')
        WHERE category = ?
      `, [
        title_line1 || 'PLAYER',
        title_line2 || 'OF THE YEAR',
        title_line3 || 'FINALISTS',
        subtitle || 'MEN • SAG PREMIERE LEAGUE 2026',
        hashtag || '#SAGAwards2026',
        finJson,
        statsJson,
        category
      ]);
    } else {
      run(`
        INSERT INTO tournament_awards (
          id, category, title_line1, title_line2, title_line3, subtitle, hashtag, finalists_json, stats_summary_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id,
        category,
        title_line1 || 'PLAYER',
        title_line2 || 'OF THE YEAR',
        title_line3 || 'FINALISTS',
        subtitle || 'MEN • SAG PREMIERE LEAGUE 2026',
        hashtag || '#SAGAwards2026',
        finJson,
        statsJson
      ]);
    }

    const saved = get('SELECT * FROM tournament_awards WHERE category = ?', [category]);
    try {
      saved.finalists = JSON.parse(saved.finalists_json || '[]');
      saved.statsSummary = JSON.parse(saved.stats_summary_json || '{}');
    } catch {}

    res.json({ success: true, award: saved });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
