/**
 * SAG PREMIERE LEAGUES - Database Seed Script
 * Populates the database with sample data:
 * - Admin user, Auctioneer user
 * - 3 Teams with Captain users
 * - 25 diverse football players
 * 
 * Usage: node db/seed.js
 */

const { getDb, initSchema, run, get, all, exec, transaction, saveDb } = require('./database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function seed() {
  console.log('=== SAG PREMIERE LEAGUES - Seeding Database ===\n');

  try {
    // Ensure schema exists
    await initSchema();

    // Check if already seeded
    const existingAdmin = get("SELECT id FROM users WHERE username = 'admin'");
    if (existingAdmin) {
      console.log('[Seed] Database already seeded. Skipping...');
      console.log('[Seed] To re-seed, delete the database file and run setup + seed again.');
      process.exit(0);
      return;
    }

    const SALT_ROUNDS = 10;

    // --- User IDs ---
    const adminId = uuidv4();
    const auctioneerId = uuidv4();
    const captainAlphaId = uuidv4();
    const captainBravoId = uuidv4();
    const captainCharlieId = uuidv4();

    // --- Team IDs ---
    const teamAlphaId = 'team-alpha';
    const teamBravoId = 'team-bravo';
    const teamCharlieId = 'team-charlie';

    // Hash passwords
    console.log('[Seed] Hashing passwords...');
    const adminHash = bcrypt.hashSync('admin123', SALT_ROUNDS);
    const auctioneerHash = bcrypt.hashSync('auction123', SALT_ROUNDS);
    const alphaHash = bcrypt.hashSync('alpha123', SALT_ROUNDS);
    const bravoHash = bcrypt.hashSync('bravo123', SALT_ROUNDS);
    const charlieHash = bcrypt.hashSync('charlie123', SALT_ROUNDS);

    transaction(() => {
      // --- Ensure default league exists ---
      const league = get("SELECT id FROM leagues WHERE id = 'default'");
      if (!league) {
        exec(`
          INSERT INTO leagues (id, name, season, currency, initial_purse, max_squad_size, min_squad_size, min_bid_increment)
          VALUES ('default', 'SAG PREMIERE LEAGUES', '2026', '₹', 2000000, 15, 7, 10000)
        `);
      }

      // --- Create Teams (before users, since users reference teams) ---
      console.log('[Seed] Creating teams...');

      exec(`INSERT INTO teams (id, name, short_name, primary_color, secondary_color, initial_purse, max_squad_size, display_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [teamAlphaId, 'Team Alpha', 'ALP', '#22c55e', '#16a34a', 2000000, 15, 1]);

      exec(`INSERT INTO teams (id, name, short_name, primary_color, secondary_color, initial_purse, max_squad_size, display_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [teamBravoId, 'Team Bravo', 'BRV', '#3b82f6', '#2563eb', 2000000, 15, 2]);

      exec(`INSERT INTO teams (id, name, short_name, primary_color, secondary_color, initial_purse, max_squad_size, display_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [teamCharlieId, 'Team Charlie', 'CHR', '#ef4444', '#dc2626', 2000000, 15, 3]);

      // --- Create Users ---
      console.log('[Seed] Creating users...');

      // Admin
      exec(`INSERT INTO users (id, username, password_hash, display_name, role, is_active)
            VALUES (?, ?, ?, ?, ?, ?)`,
        [adminId, 'admin', adminHash, 'Super Admin', 'super_admin', 1]);

      // Auctioneer
      exec(`INSERT INTO users (id, username, password_hash, display_name, role, is_active)
            VALUES (?, ?, ?, ?, ?, ?)`,
        [auctioneerId, 'auctioneer', auctioneerHash, 'Auctioneer', 'auctioneer', 1]);

      // Captain Alpha
      exec(`INSERT INTO users (id, username, password_hash, display_name, role, team_id, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [captainAlphaId, 'captain_alpha', alphaHash, 'Captain Alpha', 'captain', teamAlphaId, 1]);

      // Captain Bravo
      exec(`INSERT INTO users (id, username, password_hash, display_name, role, team_id, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [captainBravoId, 'captain_bravo', bravoHash, 'Captain Bravo', 'captain', teamBravoId, 1]);

      // Captain Charlie
      exec(`INSERT INTO users (id, username, password_hash, display_name, role, team_id, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [captainCharlieId, 'captain_charlie', charlieHash, 'Captain Charlie', 'captain', teamCharlieId, 1]);

      // --- Update teams with captain IDs ---
      exec(`UPDATE teams SET captain_id = ? WHERE id = ?`, [captainAlphaId, teamAlphaId]);
      exec(`UPDATE teams SET captain_id = ? WHERE id = ?`, [captainBravoId, teamBravoId]);
      exec(`UPDATE teams SET captain_id = ? WHERE id = ?`, [captainCharlieId, teamCharlieId]);

      // --- Create 25 Sample Players ---
      console.log('[Seed] Creating 25 sample players...');

      const players = [
        // Goalkeepers (3)
        {
          name: 'Arjun Sharma', position: 'GK', base_price: 50000, age: 28,
          jersey: 1, nationality: 'Indian', foot: 'Right', height: '188cm',
          overall: 78, speed: 55, shooting: 25, passing: 60, dribbling: 40, defensive: 80, physical: 75,
          category: 'premium', card_style: 'goalkeeper', number: 'P001'
        },
        {
          name: 'Vikram Desai', position: 'GK', base_price: 30000, age: 24,
          jersey: 12, nationality: 'Indian', foot: 'Right', height: '185cm',
          overall: 72, speed: 50, shooting: 20, passing: 55, dribbling: 35, defensive: 74, physical: 70,
          category: 'standard', card_style: 'goalkeeper', number: 'P002'
        },
        {
          name: 'Ravi Menon', position: 'GK', base_price: 20000, age: 22,
          jersey: 22, nationality: 'Indian', foot: 'Left', height: '182cm',
          overall: 65, speed: 48, shooting: 18, passing: 50, dribbling: 30, defensive: 68, physical: 65,
          category: 'standard', card_style: 'goalkeeper', number: 'P003'
        },
        // Center Backs (4)
        {
          name: 'Mohammed Khan', position: 'CB', base_price: 60000, age: 27,
          jersey: 4, nationality: 'Indian', foot: 'Right', height: '186cm',
          overall: 80, speed: 60, shooting: 35, passing: 55, dribbling: 45, defensive: 85, physical: 82,
          category: 'premium', card_style: 'premium', number: 'P004'
        },
        {
          name: 'Suresh Nair', position: 'CB', base_price: 40000, age: 26,
          jersey: 5, nationality: 'Indian', foot: 'Right', height: '184cm',
          overall: 75, speed: 55, shooting: 30, passing: 52, dribbling: 40, defensive: 80, physical: 78,
          category: 'standard', card_style: 'standard', number: 'P005'
        },
        {
          name: 'Daniel Fernandes', position: 'CB', base_price: 35000, age: 25,
          jersey: 3, nationality: 'Indian', foot: 'Left', height: '183cm',
          overall: 73, speed: 58, shooting: 28, passing: 50, dribbling: 38, defensive: 78, physical: 76,
          category: 'standard', card_style: 'standard', number: 'P006'
        },
        {
          name: 'Aakash Reddy', position: 'CB', base_price: 25000, age: 23,
          jersey: 15, nationality: 'Indian', foot: 'Right', height: '181cm',
          overall: 68, speed: 52, shooting: 25, passing: 48, dribbling: 35, defensive: 72, physical: 70,
          category: 'standard', card_style: 'standard', number: 'P007'
        },
        // Full Backs (3)
        {
          name: 'Pranav Yadav', position: 'LB', base_price: 45000, age: 25,
          jersey: 6, nationality: 'Indian', foot: 'Left', height: '176cm',
          overall: 76, speed: 78, shooting: 40, passing: 68, dribbling: 65, defensive: 72, physical: 70,
          category: 'premium', card_style: 'premium', number: 'P008'
        },
        {
          name: 'Kiran Thomas', position: 'RB', base_price: 40000, age: 26,
          jersey: 2, nationality: 'Indian', foot: 'Right', height: '175cm',
          overall: 74, speed: 76, shooting: 38, passing: 65, dribbling: 62, defensive: 70, physical: 68,
          category: 'standard', card_style: 'standard', number: 'P009'
        },
        {
          name: 'Ankit Patel', position: 'RB', base_price: 20000, age: 22,
          jersey: 17, nationality: 'Indian', foot: 'Right', height: '174cm',
          overall: 66, speed: 72, shooting: 30, passing: 55, dribbling: 52, defensive: 62, physical: 60,
          category: 'standard', card_style: 'standard', number: 'P010'
        },
        // Central Midfielders (4)
        {
          name: 'Rohit Gupta', position: 'CDM', base_price: 70000, age: 29,
          jersey: 8, nationality: 'Indian', foot: 'Right', height: '180cm',
          overall: 82, speed: 65, shooting: 55, passing: 78, dribbling: 72, defensive: 76, physical: 80,
          category: 'star', card_style: 'star', number: 'P011'
        },
        {
          name: 'Siddharth Iyer', position: 'CM', base_price: 55000, age: 27,
          jersey: 10, nationality: 'Indian', foot: 'Right', height: '178cm',
          overall: 79, speed: 68, shooting: 65, passing: 80, dribbling: 75, defensive: 60, physical: 65,
          category: 'premium', card_style: 'premium', number: 'P012'
        },
        {
          name: 'Amir Hussain', position: 'CM', base_price: 40000, age: 25,
          jersey: 14, nationality: 'Indian', foot: 'Both', height: '177cm',
          overall: 74, speed: 65, shooting: 55, passing: 72, dribbling: 68, defensive: 55, physical: 62,
          category: 'standard', card_style: 'standard', number: 'P013'
        },
        {
          name: 'Deepak Joshi', position: 'CDM', base_price: 30000, age: 24,
          jersey: 16, nationality: 'Indian', foot: 'Right', height: '179cm',
          overall: 70, speed: 60, shooting: 40, passing: 65, dribbling: 55, defensive: 70, physical: 72,
          category: 'standard', card_style: 'standard', number: 'P014'
        },
        // Attacking Midfielders (3)
        {
          name: 'Rajesh Kumar', position: 'CAM', base_price: 80000, age: 26,
          jersey: 7, nationality: 'Indian', foot: 'Left', height: '175cm',
          overall: 84, speed: 75, shooting: 78, passing: 82, dribbling: 85, defensive: 35, physical: 55,
          category: 'star', card_style: 'star', number: 'P015'
        },
        {
          name: 'Nikhil Verma', position: 'CAM', base_price: 45000, age: 24,
          jersey: 20, nationality: 'Indian', foot: 'Right', height: '173cm',
          overall: 75, speed: 72, shooting: 68, passing: 75, dribbling: 78, defensive: 30, physical: 50,
          category: 'premium', card_style: 'premium', number: 'P016'
        },
        {
          name: 'Vishal Choudhury', position: 'CAM', base_price: 25000, age: 21,
          jersey: 21, nationality: 'Indian', foot: 'Right', height: '172cm',
          overall: 67, speed: 70, shooting: 60, passing: 65, dribbling: 70, defensive: 28, physical: 48,
          category: 'standard', card_style: 'standard', number: 'P017'
        },
        // Wingers (4)
        {
          name: 'Farhan Ali', position: 'LW', base_price: 90000, age: 25,
          jersey: 11, nationality: 'Indian', foot: 'Right', height: '174cm',
          overall: 85, speed: 88, shooting: 75, passing: 72, dribbling: 88, defensive: 28, physical: 55,
          category: 'star', card_style: 'star', number: 'P018'
        },
        {
          name: 'Jayesh Mishra', position: 'RW', base_price: 60000, age: 24,
          jersey: 19, nationality: 'Indian', foot: 'Left', height: '172cm',
          overall: 78, speed: 82, shooting: 70, passing: 68, dribbling: 80, defensive: 25, physical: 52,
          category: 'premium', card_style: 'premium', number: 'P019'
        },
        {
          name: 'Santosh Pillai', position: 'LW', base_price: 35000, age: 23,
          jersey: 23, nationality: 'Indian', foot: 'Left', height: '170cm',
          overall: 72, speed: 80, shooting: 62, passing: 60, dribbling: 75, defensive: 22, physical: 48,
          category: 'standard', card_style: 'standard', number: 'P020'
        },
        {
          name: 'Manoj Singh', position: 'RW', base_price: 25000, age: 22,
          jersey: 24, nationality: 'Indian', foot: 'Right', height: '171cm',
          overall: 68, speed: 78, shooting: 58, passing: 55, dribbling: 72, defensive: 20, physical: 45,
          category: 'standard', card_style: 'standard', number: 'P021'
        },
        // Strikers / Forwards (4)
        {
          name: 'Vikrant Thapa', position: 'ST', base_price: 100000, age: 27,
          jersey: 9, nationality: 'Indian', foot: 'Right', height: '182cm',
          overall: 86, speed: 82, shooting: 88, passing: 60, dribbling: 78, defensive: 25, physical: 75,
          category: 'star', card_style: 'star', number: 'P022'
        },
        {
          name: 'Harsh Banerjee', position: 'ST', base_price: 70000, age: 26,
          jersey: 18, nationality: 'Indian', foot: 'Left', height: '180cm',
          overall: 80, speed: 78, shooting: 82, passing: 55, dribbling: 72, defensive: 22, physical: 72,
          category: 'premium', card_style: 'premium', number: 'P023'
        },
        {
          name: 'Gaurav Chauhan', position: 'CF', base_price: 55000, age: 25,
          jersey: 13, nationality: 'Indian', foot: 'Right', height: '179cm',
          overall: 77, speed: 75, shooting: 78, passing: 62, dribbling: 70, defensive: 30, physical: 68,
          category: 'premium', card_style: 'premium', number: 'P024'
        },
        {
          name: 'Ajay Chhetri', position: 'ST', base_price: 10000, age: 20,
          jersey: 25, nationality: 'Indian', foot: 'Right', height: '176cm',
          overall: 62, speed: 72, shooting: 60, passing: 45, dribbling: 58, defensive: 18, physical: 55,
          category: 'standard', card_style: 'standard', number: 'P025'
        }
      ];

      players.forEach((p, index) => {
        const playerId = uuidv4();
        exec(`INSERT INTO players (
          id, player_number, name, primary_position, base_price, age,
          jersey_number, nationality, preferred_foot, height,
          overall_rating, speed_rating, shooting_rating, passing_rating,
          dribbling_rating, defensive_rating, physical_rating,
          category, card_style, auction_status, auction_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
          playerId, p.number, p.name, p.position, p.base_price, p.age,
          p.jersey, p.nationality, p.foot, p.height,
          p.overall, p.speed, p.shooting, p.passing,
          p.dribbling, p.defensive, p.physical,
          p.category, p.card_style, 'upcoming', index + 1
        ]);
      });

      console.log(`[Seed] Created ${players.length} players`);
    });

    // Print summary
    const userCount = get('SELECT COUNT(*) as count FROM users');
    const teamCount = get('SELECT COUNT(*) as count FROM teams');
    const playerCount = get('SELECT COUNT(*) as count FROM players');

    console.log('\n=== Seed Summary ===');
    console.log(`Users:   ${userCount.count}`);
    console.log(`Teams:   ${teamCount.count}`);
    console.log(`Players: ${playerCount.count}`);
    console.log('\n--- Login Credentials ---');
    console.log('Admin:           admin / admin123');
    console.log('Auctioneer:      auctioneer / auction123');
    console.log('Captain Alpha:   captain_alpha / alpha123');
    console.log('Captain Bravo:   captain_bravo / bravo123');
    console.log('Captain Charlie: captain_charlie / charlie123');
    console.log('\n=== Seeding Complete ===');

  } catch (err) {
    console.error('[Seed] Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

seed().then(() => {
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
