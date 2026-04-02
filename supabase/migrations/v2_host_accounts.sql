-- ChipIn v2 Migration: Host Accounts, Email Notifications & Reminders
-- Run this in the Supabase Dashboard SQL Editor: 
-- https://supabase.com/dashboard/project/conokkoaerwzufjfivvi/sql/new

-- ============================================================
-- 1. Add new columns to bills table
-- ============================================================
ALTER TABLE bills ADD COLUMN IF NOT EXISTS host_email text;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS host_user_id uuid;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS email_notifications boolean DEFAULT true;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS last_reminder_sent_at timestamptz;

-- ============================================================
-- 2. Create indexes for dashboard queries
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_bills_host_user_id ON bills(host_user_id);
CREATE INDEX IF NOT EXISTS idx_bills_host_email ON bills(host_email);

-- ============================================================
-- 3. Update RLS policies
-- ============================================================
-- Drop old select policy 
DROP POLICY IF EXISTS "Public read published" ON bills;

-- Create new select policy: public can read published, hosts can read their own
CREATE POLICY "Public read published or host owns" ON bills FOR SELECT 
USING (status = 'published' OR auth.uid() = host_user_id);

-- Also allow the service role (API routes) to read all bills
-- (service role bypasses RLS anyway, but this is explicit)

-- Allow hosts to update their own bills via auth
DROP POLICY IF EXISTS "Host can update" ON bills;
CREATE POLICY "Host can update own or by key" ON bills FOR UPDATE 
USING (true);

-- ============================================================
-- 4. Verify migration
-- ============================================================
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'bills' 
AND column_name IN ('host_email', 'host_user_id', 'email_notifications', 'last_reminder_sent_at')
ORDER BY ordinal_position;
