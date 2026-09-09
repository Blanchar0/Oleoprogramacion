-- Habilita el rol de solo lectura REVISOR para Programación General y crea
-- la cuenta inicial de revisión.
DO $$
DECLARE
  role_constraint_name text;
BEGIN
  SELECT conname
    INTO role_constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.users'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%role%'
  LIMIT 1;

  IF role_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.users DROP CONSTRAINT %I', role_constraint_name);
  END IF;
END $$;

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('ADMIN', 'DIRECTIVO', 'SUPERVISOR', 'REVISOR'));

INSERT INTO public.users (
  id, username, username_key, name, role,
  id_supervisor, supervisor_id, phone, phone_key, pin, active
) VALUES (
  'USR-REVISOR-01', 'revisor', 'revisor', 'Revisor de Programación', 'REVISOR',
  NULL, NULL, NULL, NULL, '0000', true
)
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  username_key = EXCLUDED.username_key,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  id_supervisor = NULL,
  supervisor_id = NULL,
  phone = NULL,
  phone_key = NULL,
  pin = EXCLUDED.pin,
  active = true;
