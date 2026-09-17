-- Ciclos de labores y productividad. Ejecutar una vez en el proyecto Supabase de Oleoflores.

CREATE TABLE IF NOT EXISTS public.cycle_labor_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  schedule_granularity TEXT NOT NULL CHECK (schedule_granularity IN ('DIA', 'SEMANA')),
  normal_days INTEGER NOT NULL CHECK (normal_days >= 0),
  alert_days INTEGER NOT NULL CHECK (alert_days >= normal_days),
  restart_days INTEGER NOT NULL CHECK (restart_days > 0),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cycle_imports (
  id TEXT PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  imported_by TEXT NOT NULL,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_rows INTEGER NOT NULL DEFAULT 0,
  accepted_rows INTEGER NOT NULL DEFAULT 0,
  rejected_rows INTEGER NOT NULL DEFAULT 0,
  errors JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS public.cycle_executions (
  id TEXT PRIMARY KEY,
  execution_date DATE NOT NULL,
  lote_code TEXT NOT NULL,
  labor_code TEXT NOT NULL REFERENCES public.cycle_labor_rules(id),
  personnel_count NUMERIC NOT NULL CHECK (personnel_count >= 0),
  import_id TEXT REFERENCES public.cycle_imports(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (execution_date, lote_code, labor_code)
);

CREATE INDEX IF NOT EXISTS cycle_executions_lote_labor_date_idx
  ON public.cycle_executions (lote_code, labor_code, execution_date DESC);

CREATE TABLE IF NOT EXISTS public.productivity_imports (
  id TEXT PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  imported_by TEXT NOT NULL,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_rows INTEGER NOT NULL DEFAULT 0,
  accepted_rows INTEGER NOT NULL DEFAULT 0,
  rejected_rows INTEGER NOT NULL DEFAULT 0,
  errors JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS public.productivity_records (
  id TEXT PRIMARY KEY,
  period DATE NOT NULL,
  lote_code TEXT NOT NULL,
  zona_snapshot TEXT,
  siembra_snapshot NUMERIC,
  racimos NUMERIC,
  kilograms NUMERIC,
  tons NUMERIC,
  average_weight NUMERIC,
  source TEXT NOT NULL CHECK (source IN ('MANUAL', 'IMPORTACION')),
  import_id TEXT REFERENCES public.productivity_imports(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (period, lote_code)
);

CREATE INDEX IF NOT EXISTS productivity_records_period_idx
  ON public.productivity_records (period DESC, lote_code);

INSERT INTO public.cycle_labor_rules
  (id, name, schedule_granularity, normal_days, alert_days, restart_days, sort_order)
VALUES
  ('COSECHA', 'Cosecha', 'DIA', 8, 14, 12, 1),
  ('PODA_SANITARIA', 'Poda sanitaria', 'SEMANA', 171, 179, 180, 2),
  ('PLATEO', 'Plateo', 'SEMANA', 24, 29, 30, 3),
  ('CONTROL_MALEZA', 'Control de Maleza', 'SEMANA', 24, 29, 30, 4)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.cycle_labor_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycle_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycle_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productivity_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productivity_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on cycle_labor_rules" ON public.cycle_labor_rules
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on cycle_imports" ON public.cycle_imports
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on cycle_executions" ON public.cycle_executions
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on productivity_records" ON public.productivity_records
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on productivity_imports" ON public.productivity_imports
  FOR ALL USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.cycle_labor_rules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cycle_imports;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cycle_executions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.productivity_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.productivity_imports;
