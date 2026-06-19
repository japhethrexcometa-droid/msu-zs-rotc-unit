-- Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
  id TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES public.users(id)
);

-- RLS Policies
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings (needed for frontend to know if enrollment is open)
CREATE POLICY "settings_select_all" ON public.system_settings FOR SELECT TO anon, authenticated USING (true);

-- Only admins/officers can update
CREATE POLICY "settings_update_admin" ON public.system_settings FOR UPDATE TO anon USING (public.check_access()) WITH CHECK (public.check_access());
CREATE POLICY "settings_insert_admin" ON public.system_settings FOR INSERT TO anon WITH CHECK (public.check_access());

-- Insert default value for enrollment
INSERT INTO public.system_settings (id, value, description) 
VALUES ('enrollment_open', 'true'::jsonb, 'Toggle to allow or block new enrollment requests')
ON CONFLICT (id) DO NOTHING;

-- Grant permissions so the frontend can read/update settings
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_settings TO anon, authenticated;
