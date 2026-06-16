-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Pull-Out System — Filters, Soft Delete, Cancel, Training Day
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Expand status CHECK to include CANCELLED, LATE, OVERDUE
ALTER TABLE pull_out_requests DROP CONSTRAINT IF EXISTS pull_out_requests_status_check;
ALTER TABLE pull_out_requests ADD CONSTRAINT pull_out_requests_status_check
  CHECK (status IN ('PENDING', 'APPROVED', 'PULL-OUT', 'RETURNED', 'CANCELLED', 'LATE', 'OVERDUE'));

-- 2. Add soft-delete columns
ALTER TABLE pull_out_requests ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE pull_out_requests ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id);
ALTER TABLE pull_out_requests ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 3. Add training_day column (Day 1, Day 2, etc.)
ALTER TABLE pull_out_requests ADD COLUMN IF NOT EXISTS training_day INT;

-- 4. Add cancelled metadata
ALTER TABLE pull_out_requests ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES users(id);
ALTER TABLE pull_out_requests ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE pull_out_requests ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- 5. Add indexes for date filtering and soft-delete
CREATE INDEX IF NOT EXISTS idx_pull_out_time_out ON pull_out_requests(time_out DESC);
CREATE INDEX IF NOT EXISTS idx_pull_out_is_deleted ON pull_out_requests(is_deleted);
CREATE INDEX IF NOT EXISTS idx_pull_out_training_day ON pull_out_requests(training_day);
