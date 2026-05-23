-- ClickIn 360 business-specific contact fields

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS preferred_contact_method TEXT,
  ADD COLUMN IF NOT EXISTS signals TEXT,
  ADD COLUMN IF NOT EXISTS platform TEXT,
  ADD COLUMN IF NOT EXISTS friction_area TEXT,
  ADD COLUMN IF NOT EXISTS communication_channels TEXT,
  ADD COLUMN IF NOT EXISTS street_address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS timezone TEXT;
