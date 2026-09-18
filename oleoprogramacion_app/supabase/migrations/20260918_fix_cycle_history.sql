-- Corrección de catálogo e índice para el histórico de ciclos.
-- Ejecutar una vez después de 20260917_add_cycles_and_productivity.sql.

-- 01F020 es el código operativo correcto. Los registros de ciclos ya usan
-- este código, por lo que solo se corrige el nombre mostrado en Catálogos.
UPDATE public.locations
SET name = '01F020'
WHERE name = '09F020'
  AND NOT EXISTS (
    SELECT 1 FROM public.locations WHERE name = '01F020'
  );

-- Acelera las consultas cronológicas e históricas paginadas.
CREATE INDEX IF NOT EXISTS cycle_executions_date_lote_labor_idx
  ON public.cycle_executions (execution_date DESC, lote_code, labor_code);
