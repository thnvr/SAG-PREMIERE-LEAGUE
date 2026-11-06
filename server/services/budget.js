/**
 * SAG PREMIERE LEAGUES - Budget Calculation Engine
 * Handles all budget-related calculations for teams
 * All monetary values in paise (1/100 of rupee)
 */

const { get, all } = require('../db/database');

/**
 * Get the total amount spent by a team (sum of purchases)
 * @param {string} teamId - Team ID
 * @returns {number} Total spent in paise
 */
function getTotalSpent(teamId) {
  const result = get(
    `SELECT COALESCE(SUM(purchase_price), 0) as total 
     FROM purchases 
     WHERE team_id = ? AND is_reversed = 0`,
    [teamId]
  );
  return result ? result.total : 0;
}

/**
 * Get the remaining purse for a team
 * @param {string} teamId - Team ID
 * @returns {number} Remaining purse in paise
 */
function getRemainingPurse(teamId) {
  const team = get('SELECT initial_purse FROM teams WHERE id = ?', [teamId]);
  if (!team) return 0;
  const spent = getTotalSpent(teamId);
  return team.initial_purse - spent;
}

/**
 * Get the number of players currently in a team's squad
 * @param {string} teamId - Team ID
 * @returns {number} Squad count
 */
function getSquadCount(teamId) {
  const result = get(
    `SELECT COUNT(*) as count 
     FROM players 
     WHERE sold_to_team_id = ? AND auction_status = 'sold'`,
    [teamId]
  );
  return result ? result.count : 0;
}

/**
 * Get remaining squad slots for a team
 * @param {string} teamId - Team ID
 * @returns {number} Available slots
 */
function getRemainingSlots(teamId) {
  const team = get('SELECT max_squad_size FROM teams WHERE id = ?', [teamId]);
  if (!team) return 0;
  return team.max_squad_size - getSquadCount(teamId);
}

/**
 * Calculate the reserved amount for minimum remaining bids
 * This ensures a team can still fill minimum required slots at base price
 * @param {string} teamId - Team ID
 * @returns {number} Reserved amount in paise
 */
function getReservedAmount(teamId) {
  const team = get('SELECT max_squad_size FROM teams WHERE id = ?', [teamId]);
  const league = get("SELECT min_squad_size, initial_purse FROM leagues WHERE id = 'default'");
  if (!team || !league) return 0;

  const currentSquadCount = getSquadCount(teamId);
  const minSquadSize = league.min_squad_size;

  // If we already have enough players to meet minimum, no reservation needed
  if (currentSquadCount >= minSquadSize) return 0;

  // Calculate how many more players are needed at minimum
  // Each future player needs at least the minimum base price (₹100 = 10000 paise)
  const slotsNeeded = minSquadSize - currentSquadCount;
  
  // Reserve slots excluding the current bid (slotsNeeded - 1 because one slot is for current bid)
  const slotsToReserve = Math.max(0, slotsNeeded - 1);
  const minBasePrice = 10000; // ₹100 minimum

  return slotsToReserve * minBasePrice;
}

/**
 * Calculate the available bidding purse for a team
 * This is what the team can actually bid with right now
 * Available = Initial Purse - Total Spent - Reserved for future minimum purchases
 * @param {string} teamId - Team ID
 * @returns {number} Available bidding purse in paise
 */
function getAvailableBiddingPurse(teamId) {
  const remaining = getRemainingPurse(teamId);
  const reserved = getReservedAmount(teamId);
  return Math.max(0, remaining - reserved);
}

/**
 * Get complete budget breakdown for a team
 * @param {string} teamId - Team ID
 * @returns {Object} Budget breakdown
 */
function getTeamBudget(teamId) {
  const team = get('SELECT id, name, short_name, initial_purse, max_squad_size FROM teams WHERE id = ?', [teamId]);
  if (!team) return null;

  const totalSpent = getTotalSpent(teamId);
  const remainingPurse = team.initial_purse - totalSpent;
  const reserved = getReservedAmount(teamId);
  const availablePurse = Math.max(0, remainingPurse - reserved);
  const squadCount = getSquadCount(teamId);
  const remainingSlots = team.max_squad_size - squadCount;

  const purchases = all(
    'SELECT purchase_price FROM purchases WHERE team_id = ? AND is_reversed = 0',
    [teamId]
  );
  const highestPurchasePrice = purchases.reduce((max, p) => Math.max(max, p.purchase_price), 0);
  const averagePurchasePrice = purchases.length > 0 ? Math.round(totalSpent / purchases.length) : 0;

  return {
    teamId: team.id,
    teamName: team.name,
    shortName: team.short_name,
    initialPurse: team.initial_purse,
    initialPurseFormatted: formatMoney(team.initial_purse),
    totalSpent,
    totalSpentFormatted: formatMoney(totalSpent),
    remainingPurse,
    remainingPurseFormatted: formatMoney(remainingPurse),
    availableBiddingPurse: availablePurse,
    reserved,
    reservedFormatted: formatMoney(reserved),
    availablePurse,
    availablePurseFormatted: formatMoney(availablePurse),
    squadCount,
    playersPurchased: squadCount,
    maxSquadSize: team.max_squad_size,
    remainingSlots,
    highestPurchasePrice,
    averagePurchasePrice
  };
}

/**
 * Get budget summaries for all teams
 * @returns {Array} Array of team budget breakdowns
 */
function getAllTeamBudgets() {
  const teams = all('SELECT id FROM teams WHERE is_active = 1 ORDER BY display_order');
  return teams.map(t => getTeamBudget(t.id));
}

/**
 * Check if a team can afford a specific bid amount
 * @param {string} teamId - Team ID
 * @param {number} bidAmount - Bid amount in paise
 * @returns {Object} { canAfford: boolean, availablePurse: number, reason?: string }
 */
function canTeamAfford(teamId, bidAmount) {
  const available = getAvailableBiddingPurse(teamId);
  const remainingSlots = getRemainingSlots(teamId);

  if (remainingSlots <= 0) {
    return {
      canAfford: false,
      availablePurse: available,
      reason: 'Team squad is full. No more player slots available.'
    };
  }

  if (bidAmount > available) {
    return {
      canAfford: false,
      availablePurse: available,
      reason: `Bid of ${formatMoney(bidAmount)} exceeds available bidding purse of ${formatMoney(available)}`
    };
  }

  return { canAfford: true, availablePurse: available };
}

/**
 * Get all purchases for a team
 * @param {string} teamId - Team ID
 * @returns {Array} Purchase records
 */
function getTeamPurchases(teamId) {
  return all(
    `SELECT p.*, pl.name as player_name, pl.primary_position, pl.photo_url as player_photo
     FROM purchases p
     JOIN players pl ON p.player_id = pl.id
     WHERE p.team_id = ? AND p.is_reversed = 0
     ORDER BY p.created_at DESC`,
    [teamId]
  );
}

/**
 * Get budget ledger entries for a team
 * @param {string} teamId - Team ID
 * @returns {Array} Ledger entries
 */
function getTeamLedger(teamId) {
  return all(
    `SELECT bl.*, u.display_name as created_by_name
     FROM budget_ledger bl
     LEFT JOIN users u ON bl.created_by = u.id
     WHERE bl.team_id = ?
     ORDER BY bl.created_at DESC`,
    [teamId]
  );
}

/**
 * Format monetary value from paise to display string
 * @param {number} paise - Amount in paise
 * @returns {string} Formatted string like "₹20,000"
 */
function formatMoney(paise) {
  const rupees = paise / 100;
  return '₹' + rupees.toLocaleString('en-IN');
}

module.exports = {
  getTotalSpent,
  getRemainingPurse,
  getSquadCount,
  getRemainingSlots,
  getReservedAmount,
  getAvailableBiddingPurse,
  getTeamBudget,
  getTeamFinancials: getTeamBudget,
  getAllTeamBudgets,
  canTeamAfford,
  canBid: canTeamAfford,
  getTeamPurchases,
  getTeamLedger,
  formatMoney
};
