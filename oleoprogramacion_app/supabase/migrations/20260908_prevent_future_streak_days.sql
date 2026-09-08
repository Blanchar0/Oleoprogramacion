-- La racha compartida solo puede proteger el día operativo actual en Colombia.
-- La programación futura continúa permitida; solo se bloquea usarla para sumar racha.

-- El reporte individual se guarda al confirmar programación hoy, incluso antes
-- del 100% global. Los puntos se calculan en la app únicamente para fechas que
-- ya existen en programming_streak_days.
ALTER TABLE public.programming_reports
  DROP CONSTRAINT IF EXISTS programming_reports_protected_day_fk;

CREATE OR REPLACE FUNCTION public.prevent_future_programming_streak_day()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  colombia_today TEXT := to_char((now() AT TIME ZONE 'America/Bogota')::date, 'YYYY-MM-DD');
BEGIN
  IF NEW.date > colombia_today THEN
    RAISE EXCEPTION 'No se puede proteger una racha futura. Fecha operativa actual: %', colombia_today;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_future_programming_streak_day_insert ON public.programming_streak_days;
CREATE TRIGGER prevent_future_programming_streak_day_insert
  BEFORE INSERT ON public.programming_streak_days
  FOR EACH ROW EXECUTE FUNCTION public.prevent_future_programming_streak_day();
