-- Drop the broken set_user_photo_by_credentials function
-- It referenced the non-existent `password_hash` column (removed during Supabase Auth migration)
-- which caused PostgREST schema introspection issues
DROP FUNCTION IF EXISTS public.set_user_photo_by_credentials(text, text, text);

-- Force PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
