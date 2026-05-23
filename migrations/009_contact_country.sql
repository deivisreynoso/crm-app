-- Country for contact address + timezone auto-mapping
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS country TEXT;
