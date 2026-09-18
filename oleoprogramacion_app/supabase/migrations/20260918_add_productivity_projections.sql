-- Metas y proyecciones mensuales de productividad.
-- Ejecutar una vez después de 20260917_add_cycles_and_productivity.sql.

CREATE TABLE IF NOT EXISTS public.productivity_projections (
  id TEXT PRIMARY KEY,
  period DATE NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('GLOBAL', 'ZONA', 'SIEMBRA', 'LOTE')),
  scope_value TEXT NOT NULL DEFAULT 'GLOBAL',
  projected_tons NUMERIC NOT NULL CHECK (projected_tons >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (period, scope, scope_value)
);

CREATE INDEX IF NOT EXISTS productivity_projections_period_idx
  ON public.productivity_projections (period DESC, scope, scope_value);

ALTER TABLE public.productivity_projections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on productivity_projections" ON public.productivity_projections
  FOR ALL USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.productivity_projections;
