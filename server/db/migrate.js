const { getDb, run } = require('./database');

async function migrate() {
  await getDb();
  console.log('[Migrate] Applying database column upgrades...');

  try {
    run('ALTER TABLE players ADD COLUMN is_shortlisted INTEGER DEFAULT 1');
    console.log('[Migrate] Added is_shortlisted to players');
  } catch (e) {
    console.log('[Migrate] is_shortlisted check:', e.message);
  }

  try {
    run('ALTER TABLE players ADD COLUMN futbin_rating REAL DEFAULT 80.0');
    console.log('[Migrate] Added futbin_rating to players');
  } catch (e) {
    console.log('[Migrate] futbin_rating check:', e.message);
  }

  try {
    run('ALTER TABLE players ADD COLUMN club TEXT DEFAULT "SAG FC"');
  } catch (e) {}

  try {
    run('ALTER TABLE auction_sessions ADD COLUMN active_increment INTEGER DEFAULT 5000');
    console.log('[Migrate] Added active_increment to auction_sessions');
  } catch (e) {
    console.log('[Migrate] active_increment check:', e.message);
  }

  try {
    run('ALTER TABLE teams ADD COLUMN captain_name TEXT DEFAULT ""');
    console.log('[Migrate] Added captain_name to teams');
  } catch (e) {
    console.log('[Migrate] captain_name check:', e.message);
  }

  // Set default captain names if empty
  run("UPDATE teams SET captain_name = 'Alpha Leader' WHERE id = 'team-alpha' AND (captain_name IS NULL OR captain_name = '')");
  run("UPDATE teams SET captain_name = 'Bravo Tactician' WHERE id = 'team-bravo' AND (captain_name IS NULL OR captain_name = '')");
  run("UPDATE teams SET captain_name = 'Charlie Boss' WHERE id = 'team-charlie' AND (captain_name IS NULL OR captain_name = '')");

  console.log('[Migrate] Upgrades applied successfully.');
}

migrate().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
