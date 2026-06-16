ALTER TABLE public.users ADD COLUMN IF NOT EXISTS qr_needs_review BOOLEAN DEFAULT false;
