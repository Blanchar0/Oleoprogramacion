-- Cuenta directiva sin restricciones adicionales de secciones.
INSERT INTO public.users (
  id, username, username_key, name, role,
  id_supervisor, supervisor_id, phone, phone_key, pin, active
) VALUES (
  'USR-LGOMEZ-01', 'lgomez', 'lgomez', 'L. Gómez', 'DIRECTIVO',
  NULL, NULL, NULL, NULL, '0000', true
)
ON CONFLICT (username) DO UPDATE SET
  username_key = EXCLUDED.username_key,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  id_supervisor = NULL,
  supervisor_id = NULL,
  phone = NULL,
  phone_key = NULL,
  pin = EXCLUDED.pin,
  active = true;
