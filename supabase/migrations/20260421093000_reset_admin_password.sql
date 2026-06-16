-- Password set to 'admin123' (stored as SHA-256 hash)

UPDATE users
SET
  password_hash = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
  qr_token = '10a4c7c9fc5206d6f36dc6944a81bb6f4a3cb0e25014ae3b12e6c3e52712292a',
  role = 'admin',
  is_active = true
WHERE id_number = 'admin' OR lower(full_name) = 's1 admin';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE id_number = 'admin') THEN
    INSERT INTO users (id, id_number, full_name, role, is_active, password_hash, qr_token)
    VALUES (gen_random_uuid(), 'admin', 'S1 Admin', 'admin', true,
      '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
      '10a4c7c9fc5206d6f36dc6944a81bb6f4a3cb0e25014ae3b12e6c3e52712292a');
  END IF;
END
$$;
