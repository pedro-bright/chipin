-- TidyTab v4 Migration: Bill Attendees
-- Enables attendee-based balance computation for group bills.
-- Run this in the Supabase Dashboard SQL Editor:
-- https://supabase.com/dashboard/project/conokkoaerwzufjfivvi/sql/new
-- STATUS: APPLIED 2026-02-07

CREATE TABLE IF NOT EXISTS bill_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID REFERENCES bills(id) ON DELETE CASCADE,
  group_member_id UUID REFERENCES group_members(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  expected_amount DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bill_id, group_member_id)
);

CREATE INDEX IF NOT EXISTS idx_bill_attendees_bill ON bill_attendees(bill_id);
ALTER TABLE bill_attendees ENABLE ROW LEVEL SECURITY;
CREATE POLICY bill_attendees_all ON bill_attendees FOR ALL USING (true) WITH CHECK (true);
