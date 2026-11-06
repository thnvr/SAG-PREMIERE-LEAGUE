const bcrypt = require('bcryptjs');
const dbModule = require('C:/Users/thanveer/Documents/SAG/sag-premiere-leagues/server/db/database');

async function fix() {
  await dbModule.getDb();
  const hash = bcrypt.hashSync('captain123', 10);
  
  // Update existing captains to captain123
  dbModule.run('UPDATE users SET password_hash = ? WHERE role = ?', [hash, 'captain']);
  
  // Also ensure alias usernames exist if needed or ensure teams match
  const teams = dbModule.all('SELECT id, name, short_name FROM teams');
  console.log('Current teams:', teams);
  
  dbModule.saveDb();
  console.log('Successfully updated all captain passwords to captain123');
  
  // Verify
  const users = dbModule.all('SELECT id, username, password_hash, role, team_id, is_active FROM users');
  for (const u of users) {
    const pw = (u.role === 'super_admin' ? 'admin123' : (u.role === 'auctioneer' ? 'auction123' : 'captain123'));
    console.log(`User: ${u.username} | Matches '${pw}': ${bcrypt.compareSync(pw, u.password_hash)}`);
  }
}

fix().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
