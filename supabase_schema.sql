-- ==============================================================================
-- SAG PREMIERE LEAGUE — SUPABASE COMPLETE DATABASE SCHEMA & SEED SCRIPT
-- ==============================================================================
-- Run this script in your Supabase Project: SQL Editor -> New query -> Run (Ctrl+Enter)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE (Links Supabase Auth Users to Roles and Franchises)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'spectator', -- 'auctioneer', 'super_admin', 'captain', 'spectator'
  team_id TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TEAMS TABLE
CREATE TABLE IF NOT EXISTS public.teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  primary_color TEXT DEFAULT '#ffd000',
  logo_url TEXT DEFAULT '',
  initial_purse BIGINT DEFAULT 200000000, -- in paise: ₹20,00,000 (20 Lakhs)
  remaining_purse BIGINT DEFAULT 200000000,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PLAYERS TABLE
CREATE TABLE IF NOT EXISTS public.players (
  id TEXT PRIMARY KEY DEFAULT ('ply_' || substr(md5(random()::text), 1, 8)),
  name TEXT NOT NULL,
  position TEXT NOT NULL CHECK(position IN ('GK', 'DEF', 'MID', 'FWD')),
  rating INTEGER DEFAULT 75,
  nationality TEXT DEFAULT 'India',
  age INTEGER DEFAULT 22,
  base_price BIGINT DEFAULT 500000, -- ₹5,000 (in paise)
  sold_price BIGINT DEFAULT NULL,
  status TEXT DEFAULT 'available' CHECK(status IN ('available', 'sold', 'unsold', 'withdrawn')),
  team_id TEXT REFERENCES public.teams(id) ON DELETE SET NULL,
  photo_url TEXT DEFAULT '',
  photo_scale REAL DEFAULT 1,
  photo_x REAL DEFAULT 0,
  photo_y REAL DEFAULT 0,
  is_shortlisted BOOLEAN DEFAULT FALSE,
  badges TEXT DEFAULT '',
  category TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. AUCTION SESSIONS TABLE (Live Auction State)
CREATE TABLE IF NOT EXISTS public.auction_sessions (
  id SERIAL PRIMARY KEY,
  status TEXT DEFAULT 'pre_auction', -- 'pre_auction', 'active', 'paused', 'sold', 'unsold'
  current_player_id TEXT REFERENCES public.players(id) ON DELETE SET NULL,
  current_bid BIGINT DEFAULT 0,
  leading_team_id TEXT REFERENCES public.teams(id) ON DELETE SET NULL,
  bid_increment BIGINT DEFAULT 50000, -- ₹500 in paise
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. BIDS HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.bids (
  id BIGSERIAL PRIMARY KEY,
  player_id TEXT REFERENCES public.players(id) ON DELETE CASCADE,
  team_id TEXT REFERENCES public.teams(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. MATCHES / FIXTURES TABLE
CREATE TABLE IF NOT EXISTS public.matches (
  id SERIAL PRIMARY KEY,
  match_number INTEGER,
  home_team_id TEXT REFERENCES public.teams(id) ON DELETE CASCADE,
  away_team_id TEXT REFERENCES public.teams(id) ON DELETE CASCADE,
  match_date TIMESTAMPTZ,
  venue TEXT DEFAULT 'SAG Arena',
  home_score INTEGER DEFAULT 0,
  away_score INTEGER DEFAULT 0,
  status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'live', 'completed', 'postponed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. POINTS TABLE / STANDINGS TABLE
CREATE TABLE IF NOT EXISTS public.points_table (
  team_id TEXT PRIMARY KEY REFERENCES public.teams(id) ON DELETE CASCADE,
  played INTEGER DEFAULT 0,
  won INTEGER DEFAULT 0,
  drawn INTEGER DEFAULT 0,
  lost INTEGER DEFAULT 0,
  goals_for INTEGER DEFAULT 0,
  goals_against INTEGER DEFAULT 0,
  goal_difference INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. LEAGUE SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.league_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  league_name TEXT DEFAULT 'SAG PREMIERE LEAGUE',
  season TEXT DEFAULT '2026',
  total_purse BIGINT DEFAULT 200000000,
  min_bid_increment BIGINT DEFAULT 50000,
  timer_duration_seconds INTEGER DEFAULT 30,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. AUDIT LOG TABLE
CREATE TABLE IF NOT EXISTS public.audit_log (
  id SERIAL PRIMARY KEY,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  reversed BOOLEAN DEFAULT FALSE,
  reversal_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. SPECTATOR COMMENTS TABLE
CREATE TABLE IF NOT EXISTS public.spectator_comments (
  id BIGSERIAL PRIMARY KEY,
  author_name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. STORAGE BUCKET FOR PLAYER PHOTOS
INSERT INTO storage.buckets (id, name, public) 
VALUES ('player-photos', 'player-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policy: Allow public read
CREATE POLICY "Public Read Player Photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'player-photos');

-- Storage Policy: Allow public upload
CREATE POLICY "Public Upload Player Photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'player-photos');

CREATE POLICY "Public Update Player Photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'player-photos');

-- 12. ROW LEVEL SECURITY (RLS) POLICIES
-- To allow smooth operation for the web platform, grant anon/authenticated full access:
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_table ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spectator_comments ENABLE ROW LEVEL SECURITY;

-- Allow public read & write access for tables
CREATE POLICY "Public Access Profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Teams" ON public.teams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Players" ON public.players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Auction Sessions" ON public.auction_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Bids" ON public.bids FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Matches" ON public.matches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Points Table" ON public.points_table FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access League Settings" ON public.league_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Audit Log" ON public.audit_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Spectator Comments" ON public.spectator_comments FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime publication for live auction and comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bids;
ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.spectator_comments;

-- 13. SEED INITIAL TEAMS & POINTS TABLE
INSERT INTO public.teams (id, name, short_name, primary_color, logo_url, initial_purse, remaining_purse)
VALUES
  ('team-alpha', 'SAAG STRIKERS', 'STRIKERS', '#ff6b35', '', 200000000, 200000000),
  ('team-bravo', 'SAAG UNITED', 'UNITED', '#4ecdc4', '', 200000000, 200000000),
  ('team-charlie', 'SAAG FC', 'SAAGFC', '#45b7d1', '', 200000000, 200000000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.points_table (team_id, played, won, drawn, lost, goals_for, goals_against, goal_difference, points)
VALUES
  ('team-alpha', 0, 0, 0, 0, 0, 0, 0, 0),
  ('team-bravo', 0, 0, 0, 0, 0, 0, 0, 0),
  ('team-charlie', 0, 0, 0, 0, 0, 0, 0, 0)
ON CONFLICT (team_id) DO NOTHING;

-- Initial League Settings
INSERT INTO public.league_settings (id, league_name, season, total_purse, min_bid_increment)
VALUES (1, 'SAG PREMIERE LEAGUE', '2026', 200000000, 50000)
ON CONFLICT (id) DO NOTHING;

-- Initial Auction Session
INSERT INTO public.auction_sessions (id, status, current_bid, bid_increment)
VALUES (1, 'pre_auction', 0, 50000)
ON CONFLICT (id) DO NOTHING;


-- 14. SEED ALL 25 PLAYERS
INSERT INTO public.players (id, name, position, rating, nationality, age, base_price, sold_price, status, team_id, photo_url, photo_scale, photo_x, photo_y, is_shortlisted, badges, category)
VALUES
  ('dfb05d6a-9b9a-4358-b0ef-178f8828767d', 'THANVEER', 'FWD', 78, 'Indian', 28, 80000, NULL, 'available', NULL, '/uploads/players/player-1793986778780-437223229.png', 0.82, 21, 37, TRUE, '[]', 'standard'),
  ('3ef4825c-4ca7-490f-98e0-e8ccf1d1ccb6', 'Vikram Desai', 'FWD', 72, 'Indian', 24, 30000, NULL, 'available', NULL, '', 1, 0, 0, TRUE, '[]', 'standard'),
  ('26f3783c-37de-4d43-9764-6a0db4d97908', 'Ravi Menon', 'FWD', 65, 'Indian', 22, 20000, NULL, 'available', NULL, '', 1, 0, 0, TRUE, '[]', 'standard'),
  ('5dce88e4-a359-4e10-a9cd-306f4c28039b', 'Mohammed Khan', 'FWD', 80, 'Indian', 27, 60000, NULL, 'available', NULL, '', 1, 0, 0, TRUE, '[]', 'premium'),
  ('d35b2a7c-a78c-4b02-9361-ea8d5723cb20', 'Suresh Nair', 'FWD', 75, 'Indian', 26, 40000, NULL, 'available', NULL, '', 1, 0, 0, TRUE, '[]', 'standard'),
  ('53cd8170-c8e3-4a7c-9c66-893808f34d34', 'FOUZAN', 'FWD', 73, 'Indian', 25, 35000, NULL, 'available', NULL, '', 1, 0, 0, TRUE, '[]', 'standard'),
  ('3d375c2e-050e-4865-b3bb-af821b55a648', 'SAMEER', 'FWD', 68, 'Indian', 23, 25000, NULL, 'available', NULL, '/uploads/players/player-1793642623318-781164184.png', 1, 0, 0, TRUE, '[]', 'special'),
  ('fc5215a5-c06b-4de4-b64e-d81718f7cb66', 'Pranav Yadav', 'FWD', 76, 'Indian', 25, 45000, NULL, 'available', NULL, '', 1, 0, 0, TRUE, '[]', 'premium'),
  ('0314c4c9-68f3-4e75-ac58-81bffe0ea90b', 'MUHAMMED', 'FWD', 74, 'Indian', 26, 40000, NULL, 'available', NULL, '', 1, 0, 0, TRUE, '[]', 'standard'),
  ('081088ea-eaf2-4b83-b557-bb4b07631b93', 'AFEEF', 'FWD', 66, 'Indian', 22, 20000, NULL, 'available', NULL, '', 1, 0, 0, TRUE, '[]', 'special'),
  ('7cdcef96-f6df-4739-8ed7-62959c2f0382', 'Rohit Gupta', 'FWD', 82, 'Indian', 29, 70000, NULL, 'available', NULL, '', 1, 0, 0, TRUE, '[]', 'star'),
  ('458ec33d-c120-4e96-bdba-cbf11b4c5fc7', 'Siddharth Iyer', 'FWD', 79, 'Indian', 27, 55000, NULL, 'available', NULL, '', 1, 0, 0, TRUE, '[]', 'premium'),
  ('293adf16-c231-45b8-81da-55821a3e50ee', 'MASHQOOR', 'FWD', 74, 'Indian', 25, 40000, NULL, 'available', NULL, '', 1, 0, 0, TRUE, '[]', 'standard'),
  ('eca8e154-bc09-4dd2-9cdb-d4f357adc4f9', 'HANAN', 'FWD', 70, 'Indian', 24, 30000, NULL, 'available', NULL, '', 1, 0, 0, TRUE, '[]', 'standard'),
  ('0800ca0a-77a3-4d7b-9849-ed3f1556063a', 'Rajesh Kumar', 'FWD', 84, 'Indian', 26, 80000, NULL, 'available', NULL, '', 1, 0, 0, TRUE, '[]', 'star'),
  ('25296d54-7bca-4521-835d-f381cd7266b6', 'Nikhil Verma', 'FWD', 75, 'Indian', 24, 45000, NULL, 'available', NULL, '', 1, 0, 0, TRUE, '[]', 'premium'),
  ('6bf4f86c-1741-44d1-86b6-d9de7326e099', 'Vishal Choudhury', 'FWD', 67, 'Indian', 21, 25000, NULL, 'available', NULL, '', 1, 0, 0, TRUE, '[]', 'standard'),
  ('cf9d59cf-f13a-4630-ac05-02aade55f21b', 'Farhan ', 'FWD', 85, 'Indian', 25, 90000, NULL, 'available', NULL, '', 1, 0, 0, TRUE, '[]', 'star'),
  ('46213147-7ab5-4e32-a390-a9d97220ab0e', 'SHIYAM', 'FWD', 78, 'Indian', 24, 60000, NULL, 'available', NULL, '', 1, 0, 0, TRUE, '[]', 'premium'),
  ('42c191d3-9c6e-4124-80b3-99b55e0d0484', 'Santosh Pillai', 'FWD', 72, 'Indian', 23, 35000, NULL, 'available', NULL, '', 1, 0, 0, TRUE, '[]', 'standard'),
  ('f92ce6dc-7709-4a9c-998c-d5c1581d301d', 'Manoj Singh', 'FWD', 68, 'Indian', 22, 25000, NULL, 'available', NULL, '', 1, 0, 0, TRUE, '[]', 'standard'),
  ('4dda2310-406b-4e5c-9997-ab7ff5d93aa7', 'Vikrant Thapa', 'FWD', 86, 'Indian', 27, 100000, NULL, 'available', NULL, '', 1, 0, 0, TRUE, '[]', 'star'),
  ('e0abd0f7-5afe-49a5-9d94-00dd4207e572', 'AKMAL', 'FWD', 80, 'Indian', 26, 70000, NULL, 'available', NULL, '/uploads/players/player-1793771163906-682820612.png', 1, 0, 0, TRUE, '["Finisher++","Golden Boot","Safe Hands","Playmaker","Defensive Wall","Speed Demon"]', 'premium'),
  ('a079dfc3-2895-45cd-844c-ecdd0205eecb', 'HAYAN', 'FWD', 77, 'Indian', 25, 55000, NULL, 'available', NULL, '', 1, 0, 0, TRUE, '[]', 'premium'),
  ('b4cfe8dd-1292-455c-a629-775b1533ef05', 'SAMEER', 'FWD', 62, 'Indian', 20, 10000, NULL, 'available', NULL, '/uploads/players/player-1793697098843-618333225.webp', 1, 0, 0, TRUE, '[]', 'standard')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  position = EXCLUDED.position,
  rating = EXCLUDED.rating,
  base_price = EXCLUDED.base_price,
  photo_url = EXCLUDED.photo_url,
  photo_scale = EXCLUDED.photo_scale,
  photo_x = EXCLUDED.photo_x,
  photo_y = EXCLUDED.photo_y,
  badges = EXCLUDED.badges,
  category = EXCLUDED.category;
