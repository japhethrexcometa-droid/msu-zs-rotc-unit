-- ═══════════════════════════════════════════════════════════════════════════════
-- Senior Stack Audit Fixes — 2026-05-01
-- BUG-1: Unique partial index prevents race-condition duplicate pull-outs
-- IDX-1: Composite index for scanPullOut active lookup
-- IDX-2: Attendance scan_time index for dashboard "present today" count
-- IDX-3: Users role+active composite for autoMarkAbsents
-- QP-1:  Drop duplicate attendance index (wastes storage + slows writes)
-- ═══════════════════════════════════════════════════════════════════════════════

-- BUG-1: UNIQUE partial index to prevent TOCTOU race conditions in createPullOutRequest.
-- Two simultaneous requests for the same cadet will now fail at the DB level
-- instead of both passing the client-side check.
CREATE UNIQUE INDEX IF NOT EXISTS idx_pull_out_active_unique_cadet
ON pull_out_requests (cadet_id)
WHERE status IN ('PENDING', 'APPROVED', 'PULL-OUT') AND is_deleted = false;

-- IDX-1: Composite index for scanPullOut() queries
-- Replaces 3 separate single-column index bitmap-ANDs with 1 index-only scan
CREATE INDEX IF NOT EXISTS idx_pull_out_active_lookup
ON pull_out_requests (cadet_id, status, is_deleted)
WHERE is_deleted = false;

-- IDX-2: Attendance scan_time for admin dashboard "present today" count
-- Dashboard query: .gte("scan_time", todayStr) — currently full seq scan
CREATE INDEX IF NOT EXISTS idx_attendance_scan_time
ON attendance (scan_time DESC);

-- IDX-3: Users role+active composite for autoMarkAbsents and populateCadetCache
CREATE INDEX IF NOT EXISTS idx_users_role_active
ON users (role)
WHERE is_deleted = false AND is_active = true;

-- QP-1: Drop duplicate index on attendance (cadet_id, session_id)
-- The UNIQUE constraint already creates an identical index
DROP INDEX IF EXISTS idx_attendance_cadet_session;
