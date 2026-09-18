-- Autor del registro de maquinaria.
-- Conserva los registros existentes y permite mostrar quién creó cada operación.
ALTER TABLE public.machinery_operations
  ADD COLUMN IF NOT EXISTS created_by TEXT;

-- Los registros históricos no tenían un autor separado. Se conserva como referencia
-- el supervisor que quedó asociado a la operación.
UPDATE public.machinery_operations
SET created_by = COALESCE(created_by, supervisor_id, id_supervisor)
WHERE created_by IS NULL;
