-- Reset admin password to 'admin123' using bcrypt (engineering standard)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

UPDATE users
SET
  password_hash = crypt('admin123', gen_salt('bf')),
  qr_token = encode(gen_random_bytes(32), 'hex'),
  role = 'admin',
  is_active = true
WHERE id_number = 'admin' OR lower(full_name) = 's1 admin';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE id_number = 'admin') THEN
    INSERT INTO users (id, id_number, full_name, role, is_active, password_hash, qr_token)
    VALUES (gen_random_uuid(), 'admin', 'S1 Admin', 'admin', true,
      crypt('admin123', gen_salt('bf')),
      encode(gen_random_bytes(32), 'hex'));
  END IF;
END
$$;
