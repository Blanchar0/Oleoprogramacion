-- La cantidad de personas es opcional en las importaciones de ciclos.
-- NULL representa "sin dato" y no debe confundirse con 0 jornales.
ALTER TABLE public.cycle_executions
  ALTER COLUMN personnel_count DROP NOT NULL;
