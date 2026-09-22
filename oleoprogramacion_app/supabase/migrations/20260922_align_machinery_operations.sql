-- Alinea instalaciones antiguas con los campos actuales de Maquinaria.
-- Es segura para ejecutar una única vez (o repetirla) en el proyecto Supabase correcto.
ALTER TABLE public.machinery_operations
  ADD COLUMN IF NOT EXISTS operator_id TEXT,
  ADD COLUMN IF NOT EXISTS operator_name TEXT,
  ADD COLUMN IF NOT EXISTS labor_id TEXT,
  ADD COLUMN IF NOT EXISTS activity_id TEXT,
  ADD COLUMN IF NOT EXISTS location_id TEXT,
  ADD COLUMN IF NOT EXISTS zone_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS created_by TEXT,
  ADD COLUMN IF NOT EXISTS operation_key TEXT,
  ADD COLUMN IF NOT EXISTS observations TEXT,
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Impide una segunda operación con la misma máquina y el mismo tractorista en la fecha.
-- Los duplicados históricos se conservan para revisión; al no tener clave no bloquean el índice.
CREATE UNIQUE INDEX IF NOT EXISTS machinery_operations_unique_operation_idx
  ON public.machinery_operations (operation_key)
  WHERE operation_key IS NOT NULL;

-- Recarga el esquema expuesto por PostgREST para que los nuevos campos estén
-- disponibles inmediatamente para la aplicación.
NOTIFY pgrst, 'reload schema';
