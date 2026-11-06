const { getDb, run, saveDb } = require('./server/db/database');
const bcrypt = require('bcryptjs');

async function fix() {
  await getDb();
  const hash = bcrypt.hashSync('captain123', 10);
  
  // Update all captain passwords to captain123
  run("UPDATE users SET password_hash = ? WHERE role = 'captain'", [hash]);
  
  // Also ensure captain_tb, captain_rp, captain_ge exist as aliases or add them if missing
  run(`
    INSERT OR REPLACE INTO users (id, username, password_hash, display_name, role, team_id, is_active)
    VALUES 
      ('c2ece857-8010-48d1-a454-7d847a07fb13', 'captain_alpha', ?, 'Captain Alpha', 'captain', 'team-alpha', 1),
      ('30ffc596-b014-4361-8b28-f73ae6cd4371', 'captain_bravo', ?, 'Captain Bravo', 'captain', 'team-bravo', 1),
      ('c737846c-a787-41e5-9be1-28c9e11962ae', 'captain_charlie', ?, 'Captain Charlie', 'captain', 'team-charlie', 1),
      ('user-cap-tb', 'captain_tb', ?, 'Captain Alpha', 'captain', 'team-alpha', 1),
      ('user-cap-rp', 'captain_rp', ?, 'Captain Bravo', 'captain', 'team-bravo', 1),
      ('user-cap-ge', 'captain_ge', ?, 'Captain Charlie', 'captain', 'team-charlie', 1)
  `, [hash, hash, hash, hash, hash, hash]);

  saveDb();
  console.log('CAPTAIN_PASSWORDS_FIXED_SUCCESSFULLY');
}

fix().catch(console.error);
