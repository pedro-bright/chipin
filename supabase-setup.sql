-- Bills
CREATE TABLE IF NOT EXISTS bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  host_key text NOT NULL,
  host_name text NOT NULL,
  restaurant_name text,
  receipt_image_url text,
  subtotal numeric(10,2),
  tax numeric(10,2),
  tip numeric(10,2),
  total numeric(10,2),
  person_count int,
  venmo_handle text,
  zelle_info text,
  cashapp_handle text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'settled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Bill line items
CREATE TABLE IF NOT EXISTS bill_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id uuid REFERENCES bills(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric(10,2) NOT NULL,
  quantity int DEFAULT 1,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Contributions (who paid what)
CREATE TABLE IF NOT EXISTS contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id uuid REFERENCES bills(id) ON DELETE CASCADE,
  person_name text NOT NULL,
  amount numeric(10,2) NOT NULL,
  payment_method text DEFAULT 'venmo',
  claimed_item_ids uuid[] DEFAULT '{}',
  note text,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bills_slug ON bills(slug);
CREATE INDEX IF NOT EXISTS idx_bill_items_bill_id ON bill_items(bill_id);
CREATE INDEX IF NOT EXISTS idx_contributions_bill_id ON contributions(bill_id);

-- Row Level Security
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read published" ON bills;
DROP POLICY IF EXISTS "Public read with host key" ON bills;
DROP POLICY IF EXISTS "Anyone can create" ON bills;
DROP POLICY IF EXISTS "Host can update" ON bills;
DROP POLICY IF EXISTS "Anyone can read bills" ON bills;

CREATE POLICY "Anyone can read bills" ON bills FOR SELECT USING (true);
CREATE POLICY "Anyone can create" ON bills FOR INSERT WITH CHECK (true);
CREATE POLICY "Host can update" ON bills FOR UPDATE USING (true);

ALTER TABLE bill_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read" ON bill_items;
DROP POLICY IF EXISTS "Anyone can insert" ON bill_items;
DROP POLICY IF EXISTS "Anyone can update" ON bill_items;
DROP POLICY IF EXISTS "Anyone can delete" ON bill_items;

CREATE POLICY "Public read" ON bill_items FOR SELECT USING (true);
CREATE POLICY "Anyone can insert" ON bill_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update" ON bill_items FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete" ON bill_items FOR DELETE USING (true);

ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read" ON contributions;
DROP POLICY IF EXISTS "Anyone can insert" ON contributions;
DROP POLICY IF EXISTS "Public read contributions" ON contributions;
DROP POLICY IF EXISTS "Anyone can insert contributions" ON contributions;

CREATE POLICY "Public read contributions" ON contributions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert contributions" ON contributions FOR INSERT WITH CHECK (true);

-- Enable Realtime for contributions table
ALTER PUBLICATION supabase_realtime ADD TABLE contributions;
ALTER PUBLICATION supabase_realtime ADD TABLE bills;

-- Create storage bucket for receipts
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', true) ON CONFLICT (id) DO NOTHING;

-- Storage policy for receipts
DROP POLICY IF EXISTS "Anyone can upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Public read receipts" ON storage.objects;

CREATE POLICY "Anyone can upload receipts" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'receipts');
CREATE POLICY "Public read receipts" ON storage.objects FOR SELECT USING (bucket_id = 'receipts');
