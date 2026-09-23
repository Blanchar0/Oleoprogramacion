-- Aplicar después de desplegar la restricción de rutas para esta cuenta.
-- Cuenta directiva con acceso en la aplicación solo a Dashboard y Programación General.
INSERT INTO public.users (
  id, username, username_key, name, role,
  id_supervisor, supervisor_id, phone, phone_key, pin, active
) VALUES (
  'USR-ALDO-01', 'aldo', 'aldo', 'Aldo', 'DIRECTIVO',
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
