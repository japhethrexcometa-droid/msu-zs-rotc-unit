-- QR Token Regeneration Limit Migration
-- Adds columns to track and limit QR token regeneration to max 2 per user
-- This prevents abuse and ensures accountability

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS qr_regen_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_qr_regen_at TIMESTAMP WITH TIME ZONE;
