-- ROTC System Performance Optimization Indexes
-- Run this in your Supabase SQL Editor

-- 1. Index for Enrollment Status (Dramatically speeds up the Pending/Approved/Rejected tabs)
CREATE INDEX IF NOT EXISTS idx_enrollment_requests_status 
ON enrollment_requests(status);

-- 2. Index for School Filter (Speeds up the school dropdown filtering)
CREATE INDEX IF NOT EXISTS idx_enrollment_requests_school 
ON enrollment_requests(school);

-- 3. Index for Cadet ID Number (Speeds up scanning and searching)
CREATE INDEX IF NOT EXISTS idx_users_id_number 
ON users(id_number);

-- 4. Index for Active Cadets by Role
CREATE INDEX IF NOT EXISTS idx_users_role 
ON users(role);

-- 5. Index for Attendance queries (Speeds up attendance fetching by date)
CREATE INDEX IF NOT EXISTS idx_attendance_date 
ON attendance(date);
