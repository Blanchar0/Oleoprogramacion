-- Reconciliación de la racha compartida.
-- Es segura si ya ejecutaste la migración inicial con programming_reports y
-- programming_streak_days. No crea tablas team_* ni borra datos existentes.

CREATE TABLE IF NOT EXISTS public.programming_streak_days (
  date TEXT PRIMARY KEY,
  total_personnel INTEGER NOT NULL,
  programmed_personnel INTEGER NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.programming_reports (
  date TEXT NOT NULL,
  supervisor_id TEXT NOT NULL,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (date, supervisor_id)
);

-- Las restricciones NOT VALID se aplican a nuevas escrituras sin invalidar
-- registros históricos que ya existieran antes de esta reconciliación.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'programming_streak_days_total_positive') THEN
    ALTER TABLE public.programming_streak_days
      ADD CONSTRAINT programming_streak_days_total_positive CHECK (total_personnel > 0) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'programming_streak_days_completed_total') THEN
    ALTER TABLE public.programming_streak_days
      ADD CONSTRAINT programming_streak_days_completed_total
      CHECK (programmed_personnel = total_personnel) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'programming_reports_protected_day_fk') THEN
    ALTER TABLE public.programming_reports
      ADD CONSTRAINT programming_reports_protected_day_fk
      FOREIGN KEY (date) REFERENCES public.programming_streak_days(date) ON DELETE RESTRICT NOT VALID;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS programming_reports_supervisor_idx
  ON public.programming_reports (supervisor_id, date);

ALTER TABLE public.programming_streak_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programming_reports ENABLE ROW LEVEL SECURITY;

-- La autenticación actual es propia y las tablas operativas existentes usan el
-- mismo patrón compartido de RLS.
DROP POLICY IF EXISTS "Allow all on programming_streak_days" ON public.programming_streak_days;
DROP POLICY IF EXISTS "Allow shared access on programming_streak_days" ON public.programming_streak_days;
CREATE POLICY "Allow shared access on programming_streak_days"
  ON public.programming_streak_days FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on programming_reports" ON public.programming_reports;
DROP POLICY IF EXISTS "Allow shared access on programming_reports" ON public.programming_reports;
CREATE POLICY "Allow shared access on programming_reports"
  ON public.programming_reports FOR ALL USING (true) WITH CHECK (true);

-- Mantiene inmutable el instante y los totales con los que se protegió el día.
CREATE OR REPLACE FUNCTION public.lock_programming_streak_day()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.date <> OLD.date
     OR NEW.total_personnel <> OLD.total_personnel
     OR NEW.programmed_personnel <> OLD.programmed_personnel
     OR NEW.completed_at <> OLD.completed_at THEN
    RAISE EXCEPTION 'Los días protegidos no se pueden modificar';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lock_programming_streak_day_update ON public.programming_streak_days;
CREATE TRIGGER lock_programming_streak_day_update
  BEFORE UPDATE ON public.programming_streak_days
  FOR EACH ROW EXECUTE FUNCTION public.lock_programming_streak_day();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'programming_streak_days'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.programming_streak_days;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'programming_reports'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.programming_reports;
  END IF;
END;
$$;
