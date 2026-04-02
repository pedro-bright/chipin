-- Add PayPal payment method support
ALTER TABLE bills ADD COLUMN IF NOT EXISTS paypal_handle TEXT;
ALTER TABLE group_members ADD COLUMN IF NOT EXISTS paypal_handle TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS paypal_handle TEXT;
