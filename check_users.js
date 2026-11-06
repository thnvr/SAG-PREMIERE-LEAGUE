const { getDb, all } = require('./server/db/database');

async function main() {
  await getDb();
  const users = all('SELECT id, username, role, team_id, display_name FROM users');
  console.log('USERS_LIST:\n' + JSON.stringify(users, null, 2));
  const teams = all('SELECT id, name, short_name FROM teams');
  console.log('TEAMS_LIST:\n' + JSON.stringify(teams, null, 2));
}

main().catch(console.error);
