-- v3: Badges & Gamification System
-- Run this migration against your Supabase database

-- Add badge tracking / host streak to bills
ALTER TABLE bills ADD COLUMN IF NOT EXISTS host_streak int DEFAULT 0;

-- Create user_badges table
CREATE TABLE IF NOT EXISTS user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL,
  badge_type text NOT NULL,
  badge_data jsonb DEFAULT '{}',
  earned_at timestamptz DEFAULT now(),
  UNIQUE(user_email, badge_type)
);

-- Enable RLS
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Policies: public read, service insert/update
CREATE POLICY "Public read badges" ON user_badges
  FOR SELECT USING (true);

CREATE POLICY "Service insert badges" ON user_badges
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service update badges" ON user_badges
  FOR UPDATE USING (true);

-- Index for fast lookups by email
CREATE INDEX IF NOT EXISTS idx_user_badges_email ON user_badges(user_email);

-- Index for badge type lookups
CREATE INDEX IF NOT EXISTS idx_user_badges_type ON user_badges(badge_type);
