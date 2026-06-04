-- DartClub database schema voor Supabase
-- Voer dit uit in Supabase Dashboard > SQL Editor

-- Profielen
CREATE TABLE IF NOT EXISTS profiles (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Games
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id BIGINT REFERENCES profiles(id) ON DELETE CASCADE,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Statistieken per speler per game
CREATE TABLE IF NOT EXISTS dart_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  player_id BIGINT REFERENCES profiles(id) ON DELETE CASCADE,
  three_dart_avg DOUBLE PRECISION,
  first9_avg DOUBLE PRECISION,
  finish INTEGER,
  highest_finish INTEGER,
  doubles_hit INTEGER,
  doubles_thrown INTEGER,
  checkout_percentage DOUBLE PRECISION,
  double_percentage DOUBLE PRECISION,
  highest_score INTEGER,
  one_eighties INTEGER,
  scores_140_plus INTEGER,
  scores_100_plus INTEGER,
  scores_80_plus INTEGER,
  total_turns INTEGER,
  total_darts INTEGER,
  leg_darts JSONB,
  best_leg INTEGER,
  worst_leg INTEGER,
  legs_played INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (game_id, player_id)
);

-- Storage bucket voor profielfoto's (maak aan via Storage > New bucket)
-- Naam: profiles
-- Public bucket: aan

CREATE INDEX IF NOT EXISTS idx_dart_stats_player_id ON dart_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_games_profile_id ON games(profile_id);

-- Standaard spelers
INSERT INTO profiles (username) VALUES ('Tim'), ('Jeroen')
ON CONFLICT (username) DO NOTHING;
