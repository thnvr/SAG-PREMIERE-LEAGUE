-- SAG PREMIERE LEAGUES - Database Schema
-- All monetary values stored as integers (paise/cents) for precision

-- League configuration
CREATE TABLE IF NOT EXISTS leagues (
  id TEXT PRIMARY KEY DEFAULT 'default',
  name TEXT NOT NULL DEFAULT 'SAG PREMIERE LEAGUES',
  season TEXT NOT NULL DEFAULT '2026',
  venue TEXT DEFAULT '',
  auction_date TEXT DEFAULT '',
  logo_url TEXT DEFAULT '',
  currency TEXT NOT NULL DEFAULT '₹',
  initial_purse INTEGER NOT NULL DEFAULT 2000000, -- in base units (paise): ₹20,000 = 2000000
  max_squad_size INTEGER NOT NULL DEFAULT 15,
  min_squad_size INTEGER NOT NULL DEFAULT 7,
  min_bid_increment INTEGER NOT NULL DEFAULT 10000, -- ₹100 = 10000 paise
  countdown_duration INTEGER NOT NULL DEFAULT 30, -- seconds
  countdown_extension INTEGER NOT NULL DEFAULT 10, -- seconds added on late bid
  extend_on_late_bid INTEGER NOT NULL DEFAULT 1, -- boolean
  late_bid_threshold INTEGER NOT NULL DEFAULT 5, -- seconds before end
  public_budgets_visible INTEGER NOT NULL DEFAULT 1,
  public_squads_visible INTEGER NOT NULL DEFAULT 1,
  auction_status TEXT NOT NULL DEFAULT 'pre_auction' CHECK(auction_status IN ('pre_auction','active','paused','completed')),
  require_gk INTEGER NOT NULL DEFAULT 1,
  min_gk INTEGER NOT NULL DEFAULT 1,
  min_def INTEGER NOT NULL DEFAULT 2,
  min_mid INTEGER NOT NULL DEFAULT 2,
  min_fwd INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Users table (admins, auctioneers, captains)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('super_admin','auctioneer','captain','viewer')),
  photo_url TEXT DEFAULT '',
  team_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  last_login TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Persistent spectator broadcast chat
CREATE TABLE IF NOT EXISTS spectator_chat_messages (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  message TEXT NOT NULL,
  reaction TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_spectator_chat_created_at
  ON spectator_chat_messages(created_at, id);

-- Teams
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  logo_url TEXT DEFAULT '',
  primary_color TEXT NOT NULL DEFAULT '#22c55e',
  secondary_color TEXT NOT NULL DEFAULT '#16a34a',
  captain_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  initial_purse INTEGER NOT NULL DEFAULT 2000000,
  max_squad_size INTEGER NOT NULL DEFAULT 15,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Players
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  player_number TEXT UNIQUE,
  name TEXT NOT NULL,
  photo_url TEXT DEFAULT '',
  photo_scale REAL NOT NULL DEFAULT 1,
  photo_x REAL NOT NULL DEFAULT 0,
  photo_y REAL NOT NULL DEFAULT 0,
  primary_position TEXT NOT NULL CHECK(primary_position IN ('GK','CB','LB','RB','CDM','CM','CAM','LW','RW','ST','CF')),
  secondary_positions TEXT DEFAULT '[]', -- JSON array
  base_price INTEGER NOT NULL DEFAULT 10000, -- ₹100
  age INTEGER,
  jersey_number INTEGER,
  nationality TEXT DEFAULT '',
  preferred_foot TEXT DEFAULT '' CHECK(preferred_foot IN ('','Left','Right','Both')),
  height TEXT DEFAULT '',
  biography TEXT DEFAULT '',
  overall_rating INTEGER DEFAULT 0 CHECK(overall_rating >= 0 AND overall_rating <= 99),
  speed_rating INTEGER DEFAULT 0 CHECK(speed_rating >= 0 AND speed_rating <= 99),
  shooting_rating INTEGER DEFAULT 0 CHECK(shooting_rating >= 0 AND shooting_rating <= 99),
  passing_rating INTEGER DEFAULT 0 CHECK(passing_rating >= 0 AND passing_rating <= 99),
  dribbling_rating INTEGER DEFAULT 0 CHECK(dribbling_rating >= 0 AND dribbling_rating <= 99),
  defensive_rating INTEGER DEFAULT 0 CHECK(defensive_rating >= 0 AND defensive_rating <= 99),
  physical_rating INTEGER DEFAULT 0 CHECK(physical_rating >= 0 AND physical_rating <= 99),
  category TEXT DEFAULT 'standard' CHECK(category IN ('standard','premium','star','special')),
  card_style TEXT DEFAULT 'standard' CHECK(card_style IN ('standard','premium','star','goalkeeper','special')),
  badges TEXT DEFAULT '[]', -- JSON array of badge strings
  auction_status TEXT NOT NULL DEFAULT 'upcoming' CHECK(auction_status IN ('upcoming','bidding','sold','unsold','withdrawn')),
  sold_to_team_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
  sold_price INTEGER DEFAULT 0,
  sold_at TEXT,
  auction_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Auction sessions (one active at a time)
CREATE TABLE IF NOT EXISTS auction_sessions (
  id TEXT PRIMARY KEY,
  league_id TEXT NOT NULL REFERENCES leagues(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','paused','completed')),
  current_player_id TEXT REFERENCES players(id),
  current_highest_bid INTEGER DEFAULT 0,
  current_highest_team_id TEXT REFERENCES teams(id),
  bidding_status TEXT DEFAULT 'waiting' CHECK(bidding_status IN ('waiting','open','paused','closed')),
  countdown_end_time TEXT,
  total_players_sold INTEGER DEFAULT 0,
  total_players_unsold INTEGER DEFAULT 0,
  started_at TEXT,
  completed_at TEXT,
  started_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Bid records
CREATE TABLE IF NOT EXISTS bids (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES auction_sessions(id),
  player_id TEXT NOT NULL REFERENCES players(id),
  team_id TEXT NOT NULL REFERENCES teams(id),
  bidder_user_id TEXT NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL,
  bid_number INTEGER NOT NULL, -- sequential per player auction
  is_winning INTEGER NOT NULL DEFAULT 0,
  is_valid INTEGER NOT NULL DEFAULT 1,
  rejection_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Purchase transactions (finalized sales)
CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES auction_sessions(id),
  player_id TEXT NOT NULL UNIQUE, -- a player can only be sold once
  team_id TEXT NOT NULL REFERENCES teams(id),
  purchase_price INTEGER NOT NULL,
  base_price INTEGER NOT NULL,
  winning_bid_id TEXT REFERENCES bids(id),
  confirmed_by TEXT NOT NULL REFERENCES users(id),
  is_reversed INTEGER NOT NULL DEFAULT 0,
  reversed_by TEXT REFERENCES users(id),
  reversed_at TEXT,
  reversal_reason TEXT,
  transaction_number TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Team budget ledger (audit trail for all financial changes)
CREATE TABLE IF NOT EXISTS budget_ledger (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id),
  entry_type TEXT NOT NULL CHECK(entry_type IN ('initial','purchase','reversal','adjustment')),
  amount INTEGER NOT NULL, -- negative for deductions, positive for additions
  balance_after INTEGER NOT NULL,
  reference_id TEXT, -- purchase_id or adjustment reference
  description TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Auction event log (real-time events)
CREATE TABLE IF NOT EXISTS auction_events (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES auction_sessions(id),
  event_type TEXT NOT NULL,
  player_id TEXT REFERENCES players(id),
  team_id TEXT REFERENCES teams(id),
  user_id TEXT REFERENCES users(id),
  data TEXT DEFAULT '{}', -- JSON
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Audit log for admin actions
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  old_value TEXT, -- JSON
  new_value TEXT, -- JSON
  ip_address TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Auction queue (order of players for auction)
CREATE TABLE IF NOT EXISTS auction_queue (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES auction_sessions(id),
  player_id TEXT NOT NULL REFERENCES players(id),
  queue_order INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','current','completed','skipped')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_players_status ON players(auction_status);
CREATE INDEX IF NOT EXISTS idx_players_position ON players(primary_position);
CREATE INDEX IF NOT EXISTS idx_players_team ON players(sold_to_team_id);
CREATE INDEX IF NOT EXISTS idx_bids_session ON bids(session_id);
CREATE INDEX IF NOT EXISTS idx_bids_player ON bids(player_id);
CREATE INDEX IF NOT EXISTS idx_bids_team ON bids(team_id);
CREATE INDEX IF NOT EXISTS idx_purchases_team ON purchases(team_id);
CREATE INDEX IF NOT EXISTS idx_purchases_player ON purchases(player_id);
CREATE INDEX IF NOT EXISTS idx_budget_ledger_team ON budget_ledger(team_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_auction_events_session ON auction_events(session_id);
CREATE INDEX IF NOT EXISTS idx_auction_queue_session ON auction_queue(session_id);
CREATE INDEX IF NOT EXISTS idx_users_team ON users(team_id);

-- Tournament Awards & Summary
CREATE TABLE IF NOT EXISTS tournament_awards (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL UNIQUE,
  title_line1 TEXT NOT NULL,
  title_line2 TEXT NOT NULL,
  title_line3 TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  hashtag TEXT NOT NULL DEFAULT '#SAGAwards2026',
  finalists_json TEXT NOT NULL DEFAULT '[]',
  stats_summary_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Custom Badges
CREATE TABLE IF NOT EXISTS custom_badges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'playstyle',
  icon TEXT NOT NULL DEFAULT 'Award',
  color TEXT NOT NULL DEFAULT '#ffd000',
  description TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
