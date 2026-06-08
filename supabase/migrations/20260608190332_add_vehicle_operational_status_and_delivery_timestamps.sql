-- Add operational_status to vehicles (active, busy, repair, inactive)
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS operational_status TEXT NOT NULL DEFAULT 'active'
  CHECK (operational_status IN ('active', 'busy', 'repair', 'inactive'));

-- Sync initial operational_status from is_active
UPDATE vehicles SET operational_status = CASE WHEN is_active THEN 'active' ELSE 'inactive' END;

-- Add started_at and completed_at to deliveries
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
