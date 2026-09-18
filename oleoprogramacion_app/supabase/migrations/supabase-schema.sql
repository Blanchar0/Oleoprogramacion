-- 1. EXTENSIÓN
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLAS
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  username_key TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  id_supervisor TEXT,
  supervisor_id TEXT,
  phone TEXT,
  phone_key TEXT,
  pin TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.supervisors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.personnel (
  id TEXT PRIMARY KEY,
  documento TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  job_title TEXT,
  cuadrilla TEXT,
  observaciones TEXT,
  tipo_personal TEXT,
  estado TEXT,
  actividad_cuadrilla TEXT,
  zona TEXT,
  labor_cargo TEXT,
  contratacion TEXT,
  orden_fuente NUMERIC,
  nombre_completo TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.labors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.activities (
  id TEXT PRIMARY KEY,
  labor_id TEXT,
  name TEXT NOT NULL,
  unit TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.locations (
  id TEXT PRIMARY KEY,
  zone TEXT,
  name TEXT NOT NULL,
  ano_siembra NUMERIC,
  ha NUMERIC,
  palmas_diferenciadas NUMERIC,
  palmas_totales NUMERIC,
  palmas_sin_manejo NUMERIC,
  estado_palma TEXT,
  ha_brutas NUMERIC,
  edad NUMERIC,
  ha_edad_siembra NUMERIC,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.equipment (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.machinery_operators (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.performance_references (
  id TEXT PRIMARY KEY,
  activity_id TEXT,
  measurement_type TEXT,
  unit TEXT,
  performance_per_person_day NUMERIC,
  active BOOLEAN DEFAULT true,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.personnel_novelties (
  id TEXT PRIMARY KEY,
  tipo TEXT,
  persona_documento TEXT,
  persona_nombre_fuente TEXT,
  fecha_inicio TEXT,
  fecha_fin TEXT,
  zona TEXT,
  estado TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.programming (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  date TEXT NOT NULL,
  supervisor_id TEXT NOT NULL,
  id_supervisor TEXT NOT NULL,
  labor_id TEXT,
  activity_id TEXT,
  location_id TEXT,
  zone_snapshot TEXT,
  lote_snapshot TEXT,
  personnel_ids JSONB DEFAULT '[]'::jsonb,
  observations TEXT,
  performance JSONB,
  status TEXT DEFAULT 'PENDIENTE',
  creation_method TEXT DEFAULT 'MANUAL',
  needs_review BOOLEAN DEFAULT false,
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.absences (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  date TEXT NOT NULL,
  supervisor_id TEXT NOT NULL,
  id_supervisor TEXT NOT NULL,
  personnel_id TEXT,
  personnel_doc TEXT,
  personnel_name TEXT,
  reason TEXT,
  custom_reason TEXT,
  observations TEXT,
  status TEXT DEFAULT 'REGISTRADA',
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.machinery_operations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  date TEXT NOT NULL,
  supervisor_id TEXT NOT NULL,
  id_supervisor TEXT NOT NULL,
  equipment_id TEXT,
  operator_id TEXT,
  operator_name TEXT,
  labor_id TEXT,
  activity_id TEXT,
  location_id TEXT,
  zone_snapshot TEXT,
  initial_hour_meter NUMERIC,
  final_hour_meter NUMERIC,
  effective_hours NUMERIC,
  created_by TEXT,
  observations TEXT,
  start_time TEXT,
  end_time TEXT,
  status TEXT DEFAULT 'CONFIRMADA',
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT,
  action TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. POLÍTICAS DE ACCESO
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supervisors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machinery_operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personnel_novelties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programming ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machinery_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on supervisors" ON public.supervisors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on personnel" ON public.personnel FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on labors" ON public.labors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on activities" ON public.activities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on locations" ON public.locations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on equipment" ON public.equipment FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on machinery_operators" ON public.machinery_operators FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on performance_references" ON public.performance_references FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on personnel_novelties" ON public.personnel_novelties FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on programming" ON public.programming FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on absences" ON public.absences FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on machinery_operations" ON public.machinery_operations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- 4. TIEMPO REAL
ALTER PUBLICATION supabase_realtime ADD TABLE public.programming;
ALTER PUBLICATION supabase_realtime ADD TABLE public.absences;
ALTER PUBLICATION supabase_realtime ADD TABLE public.machinery_operations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.personnel;
ALTER PUBLICATION supabase_realtime ADD TABLE public.labors;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.locations;
