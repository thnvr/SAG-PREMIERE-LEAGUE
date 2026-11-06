/**
 * SAG PREMIERE LEAGUES - Reports and CSV Export Engine
 */

const express = require('express');
const router = express.Router();
const { all, get, formatMoney } = require('../db/database');
const { getTeamFinancials } = require('../services/budget');
const { stringify } = require('csv-stringify/sync');

// Helper to send CSV response
function sendCsv(res, filename, data, columns) {
  const output = stringify(data, { header: true, columns });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(output);
}

// GET /api/reports/teams - Team Report CSV
router.get('/teams', (req, res) => {
  const teams = all('SELECT * FROM teams WHERE is_active = 1 ORDER BY name');
  const rows = [];

  for (const team of teams) {
    const fin = getTeamFinancials(team.id);
    const captain = get("SELECT display_name FROM users WHERE team_id = ? AND role = 'captain'", [team.id]);
    
    // Squad members
    const squad = all(`
      SELECT p.name, p.primary_position, pur.purchase_price
      FROM players p
      JOIN purchases pur ON p.id = pur.player_id
      WHERE p.sold_to_team_id = ? AND pur.is_reversed = 0
    `, [team.id]);

    const squadSummary = squad.map(s => `${s.name} (${s.primary_position} - ${formatMoney(s.purchase_price)})`).join('; ');

    rows.push({
      'Team Name': team.name,
      'Short Name': team.short_name,
      'Captain': captain ? captain.display_name : 'Unassigned',
      'Initial Purse (₹)': (team.initial_purse / 100).toFixed(2),
      'Total Spent (₹)': (fin.totalSpent / 100).toFixed(2),
      'Remaining Purse (₹)': (fin.remainingPurse / 100).toFixed(2),
      'Players Purchased': fin.playersPurchased,
      'Max Squad Size': team.max_squad_size,
      'Squad List': squadSummary
    });
  }

  sendCsv(res, 'teams_report.csv', rows);
});

// GET /api/reports/players - Player Report CSV
router.get('/players', (req, res) => {
  const players = all(`
    SELECT p.*, t.name as winning_team_name
    FROM players p
    LEFT JOIN teams t ON p.sold_to_team_id = t.id
    ORDER BY p.name
  `);

  const rows = players.map(p => ({
    'Player ID': p.player_number || p.id,
    'Player Name': p.name,
    'Primary Position': p.primary_position,
    'Base Price (₹)': (p.base_price / 100).toFixed(2),
    'Auction Status': p.auction_status.toUpperCase(),
    'Winning Team': p.winning_team_name || 'N/A',
    'Final Price (₹)': p.sold_price ? (p.sold_price / 100).toFixed(2) : 'N/A',
    'Overall Rating': p.overall_rating,
    'Category': p.category,
    'Sold Timestamp': p.sold_at || 'N/A'
  }));

  sendCsv(res, 'players_report.csv', rows);
});

// GET /api/reports/financial - Financial Summary Report CSV
router.get('/financial', (req, res) => {
  const teams = all('SELECT * FROM teams WHERE is_active = 1');
  const rows = [];

  let totalInitial = 0;
  let totalSpent = 0;

  for (const team of teams) {
    const fin = getTeamFinancials(team.id);
    totalInitial += team.initial_purse;
    totalSpent += fin.totalSpent;

    rows.push({
      'Entity': team.name,
      'Type': 'Team',
      'Initial Budget (₹)': (team.initial_purse / 100).toFixed(2),
      'Spent (₹)': (fin.totalSpent / 100).toFixed(2),
      'Remaining (₹)': (fin.remainingPurse / 100).toFixed(2),
      'Average Price/Player (₹)': (fin.averagePurchasePrice / 100).toFixed(2),
      'Highest Purchase (₹)': (fin.highestPurchasePrice / 100).toFixed(2)
    });
  }

  // Summary row
  rows.push({
    'Entity': 'LEAGUE TOTAL',
    'Type': 'Summary',
    'Initial Budget (₹)': (totalInitial / 100).toFixed(2),
    'Spent (₹)': (totalSpent / 100).toFixed(2),
    'Remaining (₹)': ((totalInitial - totalSpent) / 100).toFixed(2),
    'Average Price/Player (₹)': 'N/A',
    'Highest Purchase (₹)': 'N/A'
  });

  sendCsv(res, 'financial_report.csv', rows);
});

// GET /api/reports/auction-summary - Auction Summary CSV
router.get('/auction-summary', (req, res) => {
  const totalPlayers = get('SELECT COUNT(*) as c FROM players').c;
  const soldPlayers = get("SELECT COUNT(*) as c FROM players WHERE auction_status = 'sold'").c;
  const unsoldPlayers = get("SELECT COUNT(*) as c FROM players WHERE auction_status = 'unsold'").c;
  const totalPurchases = get('SELECT COUNT(*) as c FROM purchases WHERE is_reversed = 0').c;
  const totalSpent = get('SELECT COALESCE(SUM(purchase_price),0) as s FROM purchases WHERE is_reversed = 0').s;

  const rows = [
    { 'Metric': 'Total Registered Players', 'Value': totalPlayers },
    { 'Metric': 'Players Sold', 'Value': soldPlayers },
    { 'Metric': 'Players Unsold', 'Value': unsoldPlayers },
    { 'Metric': 'Total Transactions Completed', 'Value': totalPurchases },
    { 'Metric': 'Total Money Spent (₹)', 'Value': (totalSpent / 100).toFixed(2) }
  ];

  sendCsv(res, 'auction_summary.csv', rows);
});

module.exports = router;
