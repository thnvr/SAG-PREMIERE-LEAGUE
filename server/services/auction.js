/**
 * SAG PREMIERE LEAGUES - Auction Engine Service (Enhanced)
 * Authoritative auction session state, auctioneer master control, dynamic increments (+50 / +100),
 * and transparent franchise roster reconciliation.
 */

const { get, all, run, exec, transaction, formatMoney } = require('../db/database');
const { v4: uuidv4 } = require('uuid');
const { 
  getTeamFinancials, 
  getAvailableBiddingPurse, 
  getSquadCount, 
  canBid 
} = require('./budget');

let bidLock = false;

/**
 * Get or create active auction session
 */
function getActiveSession() {
  let session = get(`
    SELECT * FROM auction_sessions 
    WHERE status IN ('pending', 'active', 'paused') 
    ORDER BY created_at DESC LIMIT 1
  `);

  if (!session) {
    const sessionId = uuidv4();
    run(`
      INSERT INTO auction_sessions (
        id, league_id, status, current_player_id, current_highest_bid, 
        current_highest_team_id, bidding_status, countdown_end_time,
        total_players_sold, total_players_unsold, active_increment, started_at
      ) VALUES (
        ?, 'default', 'pending', NULL, 0, NULL, 'waiting', NULL, 0, 0, 5000, datetime('now')
      )
    `, [sessionId]);

    session = get('SELECT * FROM auction_sessions WHERE id = ?', [sessionId]);
  }

  return session;
}

/**
 * Get full authoritative auction state for clients
 */
function getFullAuctionState() {
  const session = getActiveSession();
  const league = get("SELECT * FROM leagues WHERE id = 'default'") || {};

  let currentPlayer = null;
  if (session && session.current_player_id) {
    currentPlayer = get('SELECT * FROM players WHERE id = ?', [session.current_player_id]);
    if (currentPlayer) {
      try {
        currentPlayer.secondary_positions = JSON.parse(currentPlayer.secondary_positions || '[]');
        currentPlayer.badges = JSON.parse(currentPlayer.badges || '[]');
      } catch (e) {}
    }
  }

  let leadingTeam = null;
  if (session && session.current_highest_team_id) {
    leadingTeam = get('SELECT id, name, short_name, primary_color, secondary_color, logo_url FROM teams WHERE id = ?', [session.current_highest_team_id]);
  }

  // Active increment: default 5000 paise (₹50)
  const activeIncrement = session ? (session.active_increment || 5000) : 5000;

  // Get all teams with live calculated financials AND their purchased squad list
  const rawTeams = all("SELECT * FROM teams WHERE is_active = 1 ORDER BY display_order ASC, name ASC");
  const teams = rawTeams.map(t => {
    const fin = getTeamFinancials(t.id);
    const captain = get("SELECT id, display_name, username, photo_url FROM users WHERE team_id = ? AND role = 'captain'", [t.id]);
    
    // Squad members acquired by this franchise
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

  // Recent bids for active player
  let recentBids = [];
  if (session && session.current_player_id) {
    recentBids = all(`
      SELECT b.*, t.name as team_name, t.short_name as team_short, t.primary_color as team_color,
             u.display_name as bidder_name
      FROM bids b
      JOIN teams t ON b.team_id = t.id
      JOIN users u ON b.bidder_user_id = u.id
      WHERE b.player_id = ? AND b.is_valid = 1
      ORDER BY b.created_at DESC LIMIT 20
    `, [session.current_player_id]);
  }

  // Recent sales
  const recentSales = all(`
    SELECT pur.*, p.name as player_name, p.photo_url, p.primary_position,
           t.name as team_name, t.short_name as team_short, t.primary_color as team_color
    FROM purchases pur
    JOIN players p ON pur.player_id = p.id
    JOIN teams t ON pur.team_id = t.id
    WHERE pur.is_reversed = 0
    ORDER BY pur.created_at DESC LIMIT 15
  `);

  // Top Paid Players (for dashboard slideshow)
  const topPaidPlayers = all(`
    SELECT pur.*, p.name as player_name, p.photo_url, p.primary_position, p.overall_rating,
           t.name as team_name, t.short_name as team_short, t.primary_color as team_color
    FROM purchases pur
    JOIN players p ON pur.player_id = p.id
    JOIN teams t ON pur.team_id = t.id
    WHERE pur.is_reversed = 0
    ORDER BY pur.purchase_price DESC LIMIT 5
  `).map(p => ({ ...p, formattedPrice: formatMoney(p.purchase_price) }));

  // Best Value / Low Paid Players (for dashboard slideshow)
  const lowPaidPlayers = all(`
    SELECT pur.*, p.name as player_name, p.photo_url, p.primary_position, p.overall_rating,
           t.name as team_name, t.short_name as team_short, t.primary_color as team_color
    FROM purchases pur
    JOIN players p ON pur.player_id = p.id
    JOIN teams t ON pur.team_id = t.id
    WHERE pur.is_reversed = 0
    ORDER BY pur.purchase_price ASC LIMIT 5
  `).map(p => ({ ...p, formattedPrice: formatMoney(p.purchase_price) }));

  // Curated Available Player Pool (Tick List filtered) - Available to teams without exposing secret queue sequence
  const availablePool = all(`
    SELECT id, player_number, name, photo_url, primary_position, base_price, overall_rating, category, card_style, is_shortlisted
    FROM players
    WHERE is_shortlisted = 1 AND auction_status IN ('upcoming', 'bidding')
    ORDER BY name ASC
  `).map(p => ({
    ...p,
    formattedBasePrice: formatMoney(p.base_price)
  }));

  return {
    session,
    league,
    currentPlayer,
    leadingTeam,
    teams,
    recentBids,
    recentSales,
    topPaidPlayers,
    lowPaidPlayers,
    availablePool,
    activeIncrement,
    formattedIncrement: formatMoney(activeIncrement),
    timestamp: new Date().toISOString()
  };
}

/**
 * Nominate a player for auction with optional inline overrides by Auctioneer
 */
function nominatePlayer(playerId, userId, overrides = {}) {
  const session = getActiveSession();
  const player = get('SELECT * FROM players WHERE id = ?', [playerId]);

  if (!player) {
    throw new Error('Player not found');
  }

  if (player.auction_status === 'sold') {
    throw new Error('Player has already been sold');
  }

  // Apply auctioneer overrides if provided (name, base_price, position)
  let newName = overrides.name ? overrides.name.trim() : player.name;
  let newBasePrice = overrides.base_price ? parseInt(overrides.base_price, 10) : player.base_price;
  let newPosition = overrides.primary_position ? overrides.primary_position.trim() : player.primary_position;

  const league = get("SELECT * FROM leagues WHERE id = 'default'");
  const countdownDuration = league ? league.countdown_duration : 30;
  const countdownEnd = new Date(Date.now() + countdownDuration * 1000).toISOString();

  transaction(() => {
    // Reset previous active player if any was left in 'bidding' status
    if (session.current_player_id && session.current_player_id !== playerId) {
      exec("UPDATE players SET auction_status = 'upcoming' WHERE id = ? AND auction_status = 'bidding'", [session.current_player_id]);
    }

    // Update player with potential overrides and set to bidding status
    exec(`
      UPDATE players SET
        name = ?,
        base_price = ?,
        primary_position = ?,
        auction_status = 'bidding',
        updated_at = datetime('now')
      WHERE id = ?
    `, [newName, newBasePrice, newPosition, playerId]);

    // Update session
    exec(`
      UPDATE auction_sessions SET
        status = 'active',
        current_player_id = ?,
        current_highest_bid = 0,
        current_highest_team_id = NULL,
        bidding_status = 'open',
        countdown_end_time = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `, [playerId, countdownEnd, session.id]);

    // Update queue if present
    exec("UPDATE auction_queue SET status = 'current' WHERE session_id = ? AND player_id = ?", [session.id, playerId]);

    // Log auction event
    exec(`
      INSERT INTO auction_events (id, session_id, event_type, player_id, user_id, data)
      VALUES (?, ?, 'nominate', ?, ?, ?)
    `, [uuidv4(), session.id, playerId, userId, JSON.stringify({ name: newName, basePrice: newBasePrice, position: newPosition })]);
  });

  return getFullAuctionState();
}

/**
 * Set active bid increment (+50 / +100 / custom) controlled by auctioneer
 */
function setActiveIncrement(incrementPaise) {
  const session = getActiveSession();
  const inc = Math.max(1000, parseInt(incrementPaise, 10) || 5000);
  run("UPDATE auction_sessions SET active_increment = ?, updated_at = datetime('now') WHERE id = ?", [inc, session.id]);
  return getFullAuctionState();
}

/**
 * Authoritative Server-side Bid Validation & Concurrency Locked Execution
 */
async function placeBid({ teamId, userId, amount }) {
  while (bidLock) {
    await new Promise(r => setTimeout(r, 20));
  }
  bidLock = true;

  try {
    const session = getActiveSession();

    if (session.status !== 'active' || session.bidding_status !== 'open') {
      throw new Error('Bidding is currently closed or paused');
    }

    if (!session.current_player_id) {
      throw new Error('No player is currently nominated for auction');
    }

    const player = get('SELECT * FROM players WHERE id = ?', [session.current_player_id]);
    if (!player) {
      throw new Error('Current player record not found');
    }

    const team = get('SELECT * FROM teams WHERE id = ? AND is_active = 1', [teamId]);
    if (!team) {
      throw new Error('Invalid or inactive team');
    }

    const user = get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      throw new Error('User not found');
    }

    const isAdminOrAuctioneer = user.role === 'super_admin' || user.role === 'auctioneer';
    const isTeamCaptain = user.role === 'captain' && user.team_id === teamId;

    if (!isAdminOrAuctioneer && !isTeamCaptain) {
      throw new Error(`User is not authorized to bid for ${team.name}`);
    }

    // Active increment: dynamic from session (default ₹50 = 5000 paise)
    const minIncrement = session.active_increment || 5000;

    let minAllowedBid = 0;
    if (session.current_highest_bid === 0) {
      minAllowedBid = player.base_price;
    } else {
      minAllowedBid = session.current_highest_bid + minIncrement;
    }

    const bidAmount = parseInt(amount, 10);
    if (isNaN(bidAmount) || bidAmount < minAllowedBid) {
      throw new Error(`Bid amount must be at least ${formatMoney(minAllowedBid)} (+${formatMoney(minIncrement)} step)`);
    }

    if (session.current_highest_team_id === teamId) {
      throw new Error(`${team.name} already holds the highest bid`);
    }

    const currentSquadCount = getSquadCount(teamId);
    if (currentSquadCount >= team.max_squad_size) {
      throw new Error(`${team.name} squad is full (${team.max_squad_size} players max)`);
    }

    const availablePurse = getAvailableBiddingPurse(teamId);
    if (bidAmount > availablePurse) {
      throw new Error(`Bid exceeds available purse of ${formatMoney(availablePurse)} for ${team.name}`);
    }

    const league = get("SELECT * FROM leagues WHERE id = 'default'");
    let newCountdownEnd = session.countdown_end_time;
    if (league && league.extend_on_late_bid) {
      const now = Date.now();
      const currentEnd = new Date(session.countdown_end_time).getTime();
      const secondsRemaining = (currentEnd - now) / 1000;

      if (secondsRemaining <= league.late_bid_threshold) {
        newCountdownEnd = new Date(now + league.countdown_extension * 1000).toISOString();
      }
    }

    const bidCountResult = get('SELECT COUNT(*) as count FROM bids WHERE player_id = ?', [player.id]);
    const nextBidNumber = (bidCountResult ? bidCountResult.count : 0) + 1;
    const bidId = uuidv4();

    transaction(() => {
      exec('UPDATE bids SET is_winning = 0 WHERE player_id = ?', [player.id]);

      exec(`
        INSERT INTO bids (
          id, session_id, player_id, team_id, bidder_user_id,
          amount, bid_number, is_winning, is_valid
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)
      `, [bidId, session.id, player.id, teamId, userId, bidAmount, nextBidNumber]);

      exec(`
        UPDATE auction_sessions SET
          current_highest_bid = ?,
          current_highest_team_id = ?,
          countdown_end_time = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `, [bidAmount, teamId, newCountdownEnd, session.id]);

      exec(`
        INSERT INTO auction_events (id, session_id, event_type, player_id, team_id, user_id, data)
        VALUES (?, ?, 'bid', ?, ?, ?, ?)
      `, [uuidv4(), session.id, player.id, teamId, userId, JSON.stringify({ amount: bidAmount, bidNumber: nextBidNumber })]);
    });

    const updatedState = getFullAuctionState();
    return {
      success: true,
      bid: {
        id: bidId,
        amount: bidAmount,
        teamId,
        teamName: team.name,
        bidNumber: nextBidNumber,
        formattedAmount: formatMoney(bidAmount)
      },
      state: updatedState
    };
  } finally {
    bidLock = false;
  }
}

/**
 * Confirm Sale: Atomically deduct purse, assign player, write ledger & transaction
 */
function confirmSale(confirmedByUserId) {
  const session = getActiveSession();

  if (!session.current_player_id) {
    throw new Error('No active player to mark as sold');
  }

  if (!session.current_highest_team_id || session.current_highest_bid === 0) {
    throw new Error('Cannot sell player with no bids. Mark as unsold instead.');
  }

  const player = get('SELECT * FROM players WHERE id = ?', [session.current_player_id]);
  const team = get('SELECT * FROM teams WHERE id = ?', [session.current_highest_team_id]);
  const winningBid = get('SELECT * FROM bids WHERE player_id = ? AND is_winning = 1', [player.id]);

  if (!player || !team) {
    throw new Error('Player or winning franchise record not found');
  }

  const purchasePrice = session.current_highest_bid;
  const purchaseId = uuidv4();
  const txNumber = `TX-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 1000)}`;

  const remaining = team.initial_purse - (get('SELECT COALESCE(SUM(purchase_price),0) as t FROM purchases WHERE team_id = ? AND is_reversed = 0', [team.id]).t || 0);
  if (purchasePrice > remaining) {
    throw new Error(`Insufficient funds: ${team.name} has only ${formatMoney(remaining)} remaining.`);
  }

  const newBalance = remaining - purchasePrice;

  transaction(() => {
    exec(`
      INSERT INTO purchases (
        id, session_id, player_id, team_id, purchase_price, base_price,
        winning_bid_id, confirmed_by, transaction_number
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [purchaseId, session.id, player.id, team.id, purchasePrice, player.base_price, winningBid ? winningBid.id : null, confirmedByUserId, txNumber]);

    exec(`
      UPDATE players SET
        auction_status = 'sold',
        sold_to_team_id = ?,
        sold_price = ?,
        sold_at = datetime('now'),
        updated_at = datetime('now')
      WHERE id = ?
    `, [team.id, purchasePrice, player.id]);

    exec(`
      INSERT INTO budget_ledger (
        id, team_id, entry_type, amount, balance_after,
        reference_id, description, created_by
      ) VALUES (?, ?, 'purchase', ?, ?, ?, ?, ?)
    `, [
      uuidv4(), team.id, -purchasePrice, newBalance, purchaseId,
      `Purchased ${player.name} (${player.primary_position}) for ${formatMoney(purchasePrice)}`,
      confirmedByUserId
    ]);

    exec(`
      UPDATE auction_sessions SET
        current_player_id = NULL,
        current_highest_bid = 0,
        current_highest_team_id = NULL,
        bidding_status = 'closed',
        total_players_sold = total_players_sold + 1,
        countdown_end_time = NULL,
        updated_at = datetime('now')
      WHERE id = ?
    `, [session.id]);

    exec("UPDATE auction_queue SET status = 'completed' WHERE session_id = ? AND player_id = ?", [session.id, player.id]);

    exec(`
      INSERT INTO auction_events (id, session_id, event_type, player_id, team_id, user_id, data)
      VALUES (?, ?, 'sold', ?, ?, ?, ?)
    `, [uuidv4(), session.id, player.id, team.id, confirmedByUserId, JSON.stringify({
      price: purchasePrice,
      txNumber,
      teamName: team.name,
      playerName: player.name
    })]);

    exec(`
      INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, new_value)
      VALUES (?, ?, 'PLAYER_SOLD', 'purchases', ?, ?)
    `, [uuidv4(), confirmedByUserId, purchaseId, JSON.stringify({
      playerId: player.id,
      teamId: team.id,
      price: purchasePrice,
      txNumber
    })]);
  });

  return {
    sale: {
      purchaseId,
      txNumber,
      player,
      team,
      price: purchasePrice,
      formattedPrice: formatMoney(purchasePrice)
    },
    state: getFullAuctionState()
  };
}

/**
 * Mark player as UNSOLD
 */
function markUnsold(userId) {
  const session = getActiveSession();

  if (!session.current_player_id) {
    throw new Error('No active player to mark as unsold');
  }

  const player = get('SELECT * FROM players WHERE id = ?', [session.current_player_id]);
  if (!player) {
    throw new Error('Player not found');
  }

  transaction(() => {
    exec("UPDATE players SET auction_status = 'unsold', updated_at = datetime('now') WHERE id = ?", [player.id]);

    exec(`
      UPDATE auction_sessions SET
        current_player_id = NULL,
        current_highest_bid = 0,
        current_highest_team_id = NULL,
        bidding_status = 'closed',
        total_players_unsold = total_players_unsold + 1,
        countdown_end_time = NULL,
        updated_at = datetime('now')
      WHERE id = ?
    `, [session.id]);

    exec("UPDATE auction_queue SET status = 'completed' WHERE session_id = ? AND player_id = ?", [session.id, player.id]);

    exec(`
      INSERT INTO auction_events (id, session_id, event_type, player_id, user_id, data)
      VALUES (?, ?, 'unsold', ?, ?, '{}')
    `, [uuidv4(), session.id, player.id, userId]);

    exec(`
      INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, new_value)
      VALUES (?, ?, 'PLAYER_UNSOLD', 'players', ?, ?)
    `, [uuidv4(), userId, player.id, JSON.stringify({ name: player.name })]);
  });

  return {
    player,
    state: getFullAuctionState()
  };
}

function pauseBidding(userId) {
  const session = getActiveSession();
  run("UPDATE auction_sessions SET bidding_status = 'paused', updated_at = datetime('now') WHERE id = ?", [session.id]);
  return getFullAuctionState();
}

function resumeBidding(userId) {
  const session = getActiveSession();
  const league = get("SELECT countdown_duration FROM leagues WHERE id = 'default'");
  const duration = league ? league.countdown_duration : 30;
  const newEnd = new Date(Date.now() + duration * 1000).toISOString();

  run("UPDATE auction_sessions SET bidding_status = 'open', countdown_end_time = ?, updated_at = datetime('now') WHERE id = ?", [newEnd, session.id]);
  return getFullAuctionState();
}

function extendTimer(seconds = 15) {
  const session = getActiveSession();
  const current = session.countdown_end_time ? new Date(session.countdown_end_time).getTime() : Date.now();
  const newEnd = new Date(Math.max(Date.now(), current) + seconds * 1000).toISOString();

  run("UPDATE auction_sessions SET countdown_end_time = ?, updated_at = datetime('now') WHERE id = ?", [newEnd, session.id]);
  return getFullAuctionState();
}

function skipPlayer(userId) {
  const session = getActiveSession();
  if (!session.current_player_id) throw new Error('No active player to skip');

  const playerId = session.current_player_id;

  transaction(() => {
    exec("UPDATE players SET auction_status = 'upcoming', updated_at = datetime('now') WHERE id = ?", [playerId]);
    exec(`
      UPDATE auction_sessions SET
        current_player_id = NULL,
        current_highest_bid = 0,
        current_highest_team_id = NULL,
        bidding_status = 'waiting',
        countdown_end_time = NULL,
        updated_at = datetime('now')
      WHERE id = ?
    `, [session.id]);
    exec("UPDATE auction_queue SET status = 'skipped' WHERE session_id = ? AND player_id = ?", [session.id, playerId]);
  });

  return getFullAuctionState();
}

module.exports = {
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
};
