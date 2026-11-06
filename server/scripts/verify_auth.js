const bcrypt = require('bcryptjs');
const dbModule = require('C:/Users/thanveer/Documents/SAG/sag-premiere-leagues/server/db/database');

async function test() {
  await dbModule.getDb();
  const users = dbModule.all('SELECT id, username, password_hash, role, team_id, is_active FROM users');
  console.log('Total users:', users.length);
  for (const u of users) {
    const defaultPw = (u.role === 'super_admin' ? 'admin123' : (u.role === 'auctioneer' ? 'auction123' : 'captain123'));
    const pwMatch = bcrypt.compareSync(defaultPw, u.password_hash);
    console.log(`User: ${u.username} | Role: ${u.role} | Team: ${u.team_id} | Active: ${u.is_active} | Matches '${defaultPw}': ${pwMatch}`);
  }
}
test().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
