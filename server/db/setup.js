/**
 * SAG PREMIERE LEAGUES - Database Setup Script
 * Creates tables from schema.sql and inserts the default league configuration
 * 
 * Usage: node db/setup.js
 */

const { getDb, initSchema, run, get, saveDb } = require('./database');
const { v4: uuidv4 } = require('uuid');

async function setup() {
  console.log('=== SAG PREMIERE LEAGUES - Database Setup ===\n');

  try {
    // Initialize schema (creates all tables)
    await initSchema();

    // Check if default league exists
    const existingLeague = get("SELECT id FROM leagues WHERE id = 'default'");
    
    if (!existingLeague) {
      // Insert default league configuration
      run(`
        INSERT INTO leagues (
          id, name, season, venue, auction_date, logo_url,
          currency, initial_purse, max_squad_size, min_squad_size,
          min_bid_increment, countdown_duration, countdown_extension,
          extend_on_late_bid, late_bid_threshold,
          public_budgets_visible, public_squads_visible,
          auction_status, require_gk, min_gk, min_def, min_mid, min_fwd
        ) VALUES (
          'default', 'SAG PREMIERE LEAGUES', '2026', 'SAG Arena', '',  '',
          '₹', 2000000, 15, 7,
          10000, 30, 10,
          1, 5,
          1, 1,
          'pre_auction', 1, 1, 2, 2, 1
        )
      `);
      console.log('[Setup] Default league configuration created');
    } else {
      console.log('[Setup] Default league configuration already exists');
    }

    console.log('\n=== Setup Complete ===');
    console.log('Run "npm run seed" or "node db/seed.js" to populate with sample data.');

  } catch (err) {
    console.error('[Setup] Error:', err.message);
    process.exit(1);
  }
}

setup().then(() => {
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
