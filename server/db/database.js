/**
 * SAG PREMIERE LEAGUES - Database Connection & Helpers
 * Uses sql.js (pure JS SQLite implementation)
 * All monetary values stored as integers (paise - 1/100 of rupee)
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/sag_premiere.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

let db = null;
let SQL = null;

/**
 * Initialize and return the database instance
 * Creates the data directory and loads existing DB file if present
 */
async function getDb() {
  if (db) return db;

  SQL = await initSqlJs();

  // Ensure data directory exists
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Load existing database or create new one
  try {
    if (fs.existsSync(DB_PATH)) {
      const buffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(buffer);
      console.log('[DB] Loaded existing database from', DB_PATH);
    } else {
      db = new SQL.Database();
      console.log('[DB] Created new database');
    }
  } catch (err) {
    console.warn('[DB] Error loading database, creating new one:', err.message);
    db = new SQL.Database();
  }

  // Enable pragmas
  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = ON');
  db.run('PRAGMA busy_timeout = 5000');

  return db;
}

/**
 * Save the current database state to disk
 * MUST be called after every write operation
 */
function saveDb() {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error('[DB] Error saving database:', err.message);
    throw err;
  }
}

/**
 * Execute a SELECT query and return all matching rows as objects
 * @param {string} sql - SQL query string
 * @param {Array} params - Bind parameters
 * @returns {Array<Object>} Array of result objects
 */
function all(sql, params = []) {
  if (!db) throw new Error('Database not initialized. Call getDb() first.');
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

/**
 * Execute a SELECT query and return the first matching row
 * @param {string} sql - SQL query string
 * @param {Array} params - Bind parameters
 * @returns {Object|null} Result object or null
 */
function get(sql, params = []) {
  if (!db) throw new Error('Database not initialized. Call getDb() first.');
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const result = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return result;
}

/**
 * Execute an INSERT/UPDATE/DELETE query and save to disk
 * @param {string} sql - SQL statement
 * @param {Array} params - Bind parameters
 */
function run(sql, params = []) {
  if (!db) throw new Error('Database not initialized. Call getDb() first.');
  db.run(sql, params);
  saveDb();
}

/**
 * Execute a raw SQL statement without saving (used inside transactions)
 * @param {string} sql - SQL statement
 * @param {Array} params - Bind parameters
 */
function exec(sql, params = []) {
  if (!db) throw new Error('Database not initialized. Call getDb() first.');
  if (params.length > 0) {
    db.run(sql, params);
  } else {
    db.exec(sql);
  }
}

/**
 * Execute multiple statements in a transaction
 * Automatically rolls back on error
 * @param {Function} fn - Function containing database operations using exec()
 */
function transaction(fn) {
  if (!db) throw new Error('Database not initialized. Call getDb() first.');
  db.run('BEGIN IMMEDIATE');
  try {
    fn();
    db.run('COMMIT');
    saveDb();
  } catch (err) {
    db.run('ROLLBACK');
    throw err;
  }
}

/**
 * Initialize the schema from schema.sql
 */
async function initSchema() {
  await getDb();
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  db.exec(schema);

  const playerColumns = new Set(all('PRAGMA table_info(players)').map(({ name }) => name));
  const photoAdjustmentColumns = [
    ['photo_scale', 'REAL NOT NULL DEFAULT 1'],
    ['photo_x', 'REAL NOT NULL DEFAULT 0'],
    ['photo_y', 'REAL NOT NULL DEFAULT 0']
  ];
  photoAdjustmentColumns.forEach(([name, definition]) => {
    if (!playerColumns.has(name)) {
      db.run(`ALTER TABLE players ADD COLUMN ${name} ${definition}`);
    }
  });

  saveDb();
  console.log('[DB] Schema initialized successfully');
}

/**
 * Close the database connection
 */
function close() {
  if (db) {
    saveDb();
    db.close();
    db = null;
    console.log('[DB] Database connection closed');
  }
}

/**
 * Get the number of changes from the last INSERT/UPDATE/DELETE
 */
function changes() {
  if (!db) return 0;
  const result = get('SELECT changes() as count');
  return result ? result.count : 0;
}

/**
 * Get the last inserted row ID
 */
function lastInsertRowId() {
  if (!db) return 0;
  const result = get('SELECT last_insert_rowid() as id');
  return result ? result.id : 0;
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
  getDb,
  saveDb,
  all,
  get,
  run,
  exec,
  transaction,
  initSchema,
  close,
  changes,
  lastInsertRowId,
  formatMoney,
  DB_PATH
};
