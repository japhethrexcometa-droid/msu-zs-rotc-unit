ALTER TABLE users
ADD COLUMN IF NOT EXISTS blood_type text,
ADD COLUMN IF NOT EXISTS emergency_contact_name text,
ADD COLUMN IF NOT EXISTS emergency_contact_number text;

-- Notify PostgREST to reload the schema cache so it instantly recognizes the new columns
NOTIFY pgrst, 'reload schema';
