-- ==========================================
-- OLEOFLORES AGRONOMIC SYSTEM - SUPABASE SCHEMA
-- ==========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS & ROLES
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  username_key TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'DIRECTIVO', 'SUPERVISOR')),
  id_supervisor TEXT,
  supervisor_id TEXT,
  phone TEXT,
  phone_key TEXT,
  pin TEXT NOT NULL, -- PIN for authentication
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. SUPERVISORS
CREATE TABLE IF NOT EXISTS public.supervisors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PERSONNEL (178 workers)
CREATE TABLE IF NOT EXISTS public.personnel (
  id TEXT PRIMARY KEY,
  documento TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- DIRECTO / TEMPORAL
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

-- 4. LABORS
CREATE TABLE IF NOT EXISTS public.labors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ACTIVITIES
CREATE TABLE IF NOT EXISTS public.activities (
  id TEXT PRIMARY KEY,
  labor_id TEXT,
  name TEXT NOT NULL,
  unit TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. LOCATIONS (Lotes / Zonas)
CREATE TABLE IF NOT EXISTS public.locations (
  id TEXT PRIMARY KEY,
  zone TEXT,
  name TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. EQUIPMENT & MACHINERY OPERATORS
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

-- 8. PERFORMANCE REFERENCES
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

-- 9. PERSONNEL NOVELTIES (Incapacidades / Vacaciones)
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

-- 10. PROGRAMMING (Transaccional)
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

-- 11. ABSENCES
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

-- 12. MACHINERY OPERATIONS
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
  observations TEXT,
  start_time TEXT,
  end_time TEXT,
  status TEXT DEFAULT 'CONFIRMADA',
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure machinery_operations has all required columns if table already exists
ALTER TABLE public.machinery_operations ADD COLUMN IF NOT EXISTS operator_id TEXT;
ALTER TABLE public.machinery_operations ADD COLUMN IF NOT EXISTS labor_id TEXT;
ALTER TABLE public.machinery_operations ADD COLUMN IF NOT EXISTS zone_snapshot TEXT;
ALTER TABLE public.machinery_operations ADD COLUMN IF NOT EXISTS start_time TEXT;
ALTER TABLE public.machinery_operations ADD COLUMN IF NOT EXISTS end_time TEXT;

-- 13. AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT,
  action TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ENABLE ROW LEVEL SECURITY (RLS) FOR PUBLIC ACCESS VIA ANON KEY
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

-- POLICIES (Allow anon key full read/write for applet operation)
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

-- ENABLE REALTIME ON KEY TABLES
ALTER PUBLICATION supabase_realtime ADD TABLE public.programming;
ALTER PUBLICATION supabase_realtime ADD TABLE public.absences;
ALTER PUBLICATION supabase_realtime ADD TABLE public.machinery_operations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.personnel;
ALTER PUBLICATION supabase_realtime ADD TABLE public.labors;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.locations;

-- ==========================================
-- DATA INSERTS
-- ==========================================

-- USERS
INSERT INTO public.users (id, username, username_key, name, role, id_supervisor, supervisor_id, phone, phone_key, pin, active) VALUES ('USR-73ACD9A5', 'admin', 'admin', 'Administrador Agronomía', 'ADMIN', NULL, NULL, NULL, NULL, '0910', true) ON CONFLICT (id) DO UPDATE SET pin = EXCLUDED.pin, active = EXCLUDED.active;
INSERT INTO public.users (id, username, username_key, name, role, id_supervisor, supervisor_id, phone, phone_key, pin, active) VALUES ('USR-09EBDA48', 'lcruz', 'lcruz', 'Directivo Agronomía', 'DIRECTIVO', NULL, NULL, NULL, NULL, '0000', true) ON CONFLICT (id) DO UPDATE SET pin = EXCLUDED.pin, active = EXCLUDED.active;
INSERT INTO public.users (id, username, username_key, name, role, id_supervisor, supervisor_id, phone, phone_key, pin, active) VALUES ('USR-PCHAVEZ0', 'pchavez', 'pchavez', 'Paola Chavez', 'DIRECTIVO', NULL, NULL, NULL, NULL, '0000', true) ON CONFLICT (id) DO UPDATE SET pin = EXCLUDED.pin, active = EXCLUDED.active;
INSERT INTO public.users (id, username, username_key, name, role, id_supervisor, supervisor_id, phone, phone_key, pin, active) VALUES ('USR-JCARLOS0', 'jcarlos', 'jcarlos', 'Ingeniero Juan Carlos', 'DIRECTIVO', NULL, NULL, NULL, NULL, '0000', true) ON CONFLICT (id) DO UPDATE SET pin = EXCLUDED.pin, active = EXCLUDED.active;
INSERT INTO public.users (id, username, username_key, name, role, id_supervisor, supervisor_id, phone, phone_key, pin, active) VALUES ('USR-9DEC0023', '573207587860', '573207587860', 'Cuenta heredada pendiente de identificación', 'SUPERVISOR', 'SUP001', 'SUP001', '573207587860', '573207587860', '1234', false) ON CONFLICT (id) DO UPDATE SET pin = EXCLUDED.pin, active = EXCLUDED.active;
INSERT INTO public.users (id, username, username_key, name, role, id_supervisor, supervisor_id, phone, phone_key, pin, active) VALUES ('USR-02F2E9D9', 'josep', 'josep', 'José Pahuana', 'SUPERVISOR', 'SUP002', 'SUP002', '573175364429', '573175364429', '1234', true) ON CONFLICT (id) DO UPDATE SET pin = EXCLUDED.pin, active = EXCLUDED.active;
INSERT INTO public.users (id, username, username_key, name, role, id_supervisor, supervisor_id, phone, phone_key, pin, active) VALUES ('USR-12F86B0E', 'alvarom', 'alvarom', 'Alvaro Manjarrez', 'SUPERVISOR', 'SUP003', 'SUP003', '573168479957', '573168479957', '1234', true) ON CONFLICT (id) DO UPDATE SET pin = EXCLUDED.pin, active = EXCLUDED.active;
INSERT INTO public.users (id, username, username_key, name, role, id_supervisor, supervisor_id, phone, phone_key, pin, active) VALUES ('USR-9AD2EAC3', 'giovannya', 'giovannya', 'Giovanny Anaya', 'SUPERVISOR', 'SUP004', 'SUP004', '573167680373', '573167680373', '1234', true) ON CONFLICT (id) DO UPDATE SET pin = EXCLUDED.pin, active = EXCLUDED.active;
INSERT INTO public.users (id, username, username_key, name, role, id_supervisor, supervisor_id, phone, phone_key, pin, active) VALUES ('USR-C262C7D5', 'manuelb', 'manuelb', 'Manuel Blanco', 'SUPERVISOR', 'SUP005', 'SUP005', '573128840721', '573128840721', '1234', true) ON CONFLICT (id) DO UPDATE SET pin = EXCLUDED.pin, active = EXCLUDED.active;
INSERT INTO public.users (id, username, username_key, name, role, id_supervisor, supervisor_id, phone, phone_key, pin, active) VALUES ('USR-F9655361', 'luisb', 'luisb', 'Luis Barraza', 'SUPERVISOR', 'SUP006', 'SUP006', '573126116644', '573126116644', '1234', true) ON CONFLICT (id) DO UPDATE SET pin = EXCLUDED.pin, active = EXCLUDED.active;
INSERT INTO public.users (id, username, username_key, name, role, id_supervisor, supervisor_id, phone, phone_key, pin, active) VALUES ('USR-010BBE48', 'juanb', 'juanb', 'Juan Bohorquez', 'SUPERVISOR', 'SUP007', 'SUP007', '573217037675', '573217037675', '1234', true) ON CONFLICT (id) DO UPDATE SET pin = EXCLUDED.pin, active = EXCLUDED.active;

-- SUPERVISORS
INSERT INTO public.supervisors (id, name, phone, active) VALUES ('SUP002', 'José Pahuana', '573175364429', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.supervisors (id, name, phone, active) VALUES ('SUP006', 'Luis Barraza', '573126116644', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.supervisors (id, name, phone, active) VALUES ('SUP007', 'Juan Bohorquez', '573217037675', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.supervisors (id, name, phone, active) VALUES ('SUP003', 'Alvaro Manjarrez', '573168479957', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.supervisors (id, name, phone, active) VALUES ('SUP005', 'Manuel Blanco', '573128840721', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.supervisors (id, name, phone, active) VALUES ('SUP004', 'Giovanny Anaya', '573167680373', true) ON CONFLICT (id) DO NOTHING;

-- PERSONNEL (178 records)
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1067717650', '1067717650', 'JULIO CESAR BARON', 'DIRECTO', 'OPERARIO DE GUADAÑA', 'PLATEO Y CONTROL MECANICO', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - OLEOFLORES', 128, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-77159296', '77159296', 'ALVARO MANJARREZ QUINTERO', 'DIRECTO', 'SUPERVISOR', 'SUPERVISOR', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'NOMINA DIRECTA - OLEOFLORES', 5, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-78037015', '78037015', 'LEONEL FLOREZ SUAREZ', 'DIRECTO', 'OPERARIO DE COSECHA', 'CORTE Y RECOLECCIÓN RFF - TON', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - OLEOFLORES', 77, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1067713312', '1067713312', 'JUAN MANUEL ROJANO SANES', 'DIRECTO', 'OPERARIO DE SIEMBRA', 'SIEMBRA DE PALMA', '', NULL, NULL, NULL, 'EL CARMEN', NULL, 'A DESTAJO - OLEOFLORES', 74, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1007878203', '1007878203', 'RAMIRO PINEDA GARCIA', 'DIRECTO', 'OP PODA SANITARIA', 'CORTE Y RECOLECCIÓN RFF - PODA', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - OLEOFLORES', 133, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-13271179', '13271179', 'FRANCISCO PETRO ORTIZ', 'TEMPORAL', 'OPERADOR DE MOTOSIERRA', 'OPERADOR DE MOTOSIERRA', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'SU ALIADO TEMPORAL', 5, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-77156848', '77156848', 'GUILLERMO DOMINGUEZ FANDIÑO', 'DIRECTO', 'Riego por superficie Oleoflores', 'RIEGO & DRENAJES', '', NULL, NULL, NULL, 'SAN CARLOS', NULL, 'A DESTAJO - OLEOFLORES', 49, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1007551569', '1007551569', 'RONNY ANDRES ANGULO CHURIO', 'DIRECTO', 'OPERARIO DE COSECHA', 'CORTE Y RECOLECCIÓN RFF - TON', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - OLEOFLORES', 109, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-12566165', '12566165', 'HERNANDO CARDENAS SANCHEZ', 'DIRECTO', 'Riego - Hda El Carmen', 'RIEGO & DRENAJES', '', NULL, NULL, NULL, 'SAN CARLOS', NULL, 'NOMINA DIRECTA - C.M.G', 53, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1067722004', '1067722004', 'CARLOS EDUARDO CHINCHILLA OJEDA', 'TEMPORAL', 'OP SANIDAD', 'OPERARIO DE SANIDAD', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'SU ALIADO TEMPORAL', 4, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-78697543', '78697543', 'LUIS MARIANO HERNANDEZ ESPITIA', 'DIRECTO', 'OFICIOS VARIOS', 'SERVICIOS GENERALES', '', NULL, NULL, NULL, 'SUHAREZ', NULL, 'A DESTAJO - OLEOFLORES', 87, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1128192398', '1128192398', 'YOINER ANTONIO COBA TAMARA', 'TEMPORAL', 'OPERADOR DE TRACTOR', 'OPERADOR DE TRACTOR', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'SU ALIADO TEMPORAL', 2, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-19617533', '19617533', 'ARIDES ARROYO HERNANDEZ', 'DIRECTO', 'OPERARIO DE COSECHA', 'CORTE Y RECOLECCIÓN RFF - TON', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - OLEOFLORES', 8, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-77156205', '77156205', 'WILSON RAFAEL NUÑEZ GUTIERREZ', 'DIRECTO', 'BUFALERO', 'BUFALERO', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - OLEOFLORES', 120, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-77152547', '77152547', 'LUIS ALFREDO LASTRA', 'DIRECTO', 'OFICIOS VARIOS', 'SERVICIOS GENERALES', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'NOMINA DIRECTA - OLEOFLORES', 78, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-77153578', '77153578', 'EUGENIO MARTINEZ PRADO', 'DIRECTO', 'Cosecha palma adulta', 'CORTE Y RECOLECCIÓN RFF - TON', '', NULL, NULL, NULL, 'SUHAREZ', NULL, 'A DESTAJO - C.M.G', 38, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1067726156', '1067726156', 'ROSADO GUERRA EFREN LEONARDO', 'TEMPORAL', 'OPERARIO DE SIEMBRA', 'SIEMBRA DE PALMA- SUHAREZ', '', NULL, NULL, NULL, 'SUHAREZ', NULL, 'SU ALIADO TEMPORAL', 4, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1065621264', '1065621264', 'WILLIAN ENRIQUE CORONADO GAMARRA', 'TEMPORAL', 'Plateo mecanico (guadaña)', 'PLATEO Y CONTROL MECANICO', '', NULL, NULL, NULL, 'EL CARMEN', NULL, 'SU ALIADO TEMPORAL', 1, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1067716226', '1067716226', 'RAMON MENDOZA VERGARA', 'DIRECTO', 'Curaciones', 'SANIDAD VEGETAL', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'NOMINA DIRECTA - OLEOFLORES', 105, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1067725046', '1067725046', 'NESTOR QUIÑONES RINCON', 'TEMPORAL', 'OP SANIDAD', 'OPERARIO DE SANIDAD', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'SU ALIADO TEMPORAL', 1, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1067722645', '1067722645', 'YULEINIS VENERA ARRIETA', 'DIRECTO', 'Revision de enfermedades, curaciones, censo de plaga', 'SANIDAD VEGETAL', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'NOMINA DIRECTA - OLEOFLORES', 125, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-72071359', '72071359', 'FRANCISCO VEGA OCHOA', 'TEMPORAL', 'RIEGO Y DRENAJES', 'RIEGO & DRENAJES', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'SU ALIADO TEMPORAL', 1, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1037119710', '1037119710', 'PAULO GUERRA RAMOS', 'DIRECTO', 'PODA SANITARIA', 'CORTE Y RECOLECCIÓN RFF - TON', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - OLEOFLORES', 101, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1067716298', '1067716298', 'JAVIER ANTONIO ANGULO ATENCIO', 'DIRECTO', 'OPERARIO DE PODA', 'CORTE Y RECOLECCIÓN RFF - PODA', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - OLEOFLORES', 57, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1066350479', '1066350479', 'EVERT CASTAÑEDA BONILLA', 'TEMPORAL', 'OP PODA SANITARIA', 'CORTE Y RECOLECCIÓN RFF - PODA', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'SU ALIADO TEMPORAL', 10, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-73315834', '73315834', 'ROBERTO ROSALES OLAVE', 'DIRECTO', 'PLATEO Y CONTROL MANUAL', 'MANTENIMIENTO', '', NULL, NULL, NULL, 'SUHAREZ', NULL, 'A DESTAJO - OLEOFLORES', 107, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-18969462', '18969462', 'EUSTORGIO RANGEL MIRANDA', 'DIRECTO', 'Cosecha palma adulta', 'CORTE Y RECOLECCIÓN RFF - TON', '', NULL, NULL, NULL, 'SUHAREZ', NULL, 'A DESTAJO - OLEOFLORES', 39, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1152940432', '1152940432', 'LUIS DAVID CAMPO POLO', 'TEMPORAL', 'OPERADOR DE MOTOSIERRA', 'OPERADOR DE MOTOSIERRA', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'SU ALIADO TEMPORAL', 4, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-18959232', '18959232', 'GABRIEL DIAZ ARIZA', 'DIRECTO', 'PLATEO Y CONTROL MANUAL', 'MANTENIMIENTO', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - OLEOFLORES', 46, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1003040386', '1003040386', 'RODRIGUEZ NUÑEZ YESID RICARDO ALBE', 'TEMPORAL', 'OPERARIO DE SIEMBRA', 'SIEMBRA DE PALMA- SUHAREZ', '', NULL, NULL, NULL, 'SUHAREZ', NULL, 'SU ALIADO TEMPORAL', 6, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-18957138', '18957138', 'WILSON ANTONIO DIAZ CENTENO', 'DIRECTO', 'OPERARIO DE SIEMBRA', 'SIEMBRA DE PALMA', '', NULL, NULL, NULL, 'EL CARMEN', NULL, 'A DESTAJO - OLEOFLORES', 119, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1067715016', '1067715016', 'CAMILO ANDRES CONTRERAS GOMEZ', 'DIRECTO', 'Cosecha palma adulta', 'CORTE Y RECOLECCIÓN RFF - TON', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - OLEOFLORES', 13, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-77155783', '77155783', 'DAZA APOLINAR ARMANDO', 'DIRECTO', 'Riego Suharez', 'RIEGO & DRENAJES', '', NULL, NULL, NULL, 'SAN CARLOS', NULL, 'NOMINA DIRECTA - OLEOFLORES', 24, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-15610026', '15610026', 'GUILLERMO FUENTES GONZALEZ', 'DIRECTO', 'Operario de Riego', 'RIEGO & DRENAJES', '', NULL, NULL, NULL, 'SUHAREZ', NULL, 'NOMINA DIRECTA - C.M.G', 50, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1193154564', '1193154564', 'EDER ANTONIO FLOREZ IGLESIAS', 'DIRECTO', 'OPERARIO DE COSECHA', 'CORTE Y RECOLECCIÓN RFF - TON', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - OLEOFLORES', 29, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-7570201', '7570201', 'EDGAR APONTE PEDROZA', 'DIRECTO', 'Riego por aspersión', 'RIEGO & DRENAJES', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - C.M.G', 30, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-11076983', '11076983', 'JUAN BOHORQUEZ ESPITIA', 'DIRECTO', 'SUPERVISOR', 'SUPERVISOR', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'NOMINA DIRECTA - C.M.G', 71, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-502269', '502269', 'WILMER GAMARRA DE AVILA', 'DIRECTO', 'Cosecha palma joven', 'CORTE Y RECOLECCIÓN RFF - TON', '', NULL, NULL, NULL, 'SUHAREZ', NULL, 'A DESTAJO - OLEOFLORES', 118, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1067719289', '1067719289', 'JHON JAIRO MELENDEZ BUSTOS', 'DIRECTO', 'OPERARIO DE COSECHA', 'CORTE Y RECOLECCIÓN RFF - TON', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - OLEOFLORES', 62, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1067717060', '1067717060', 'HANER CERPA ARAMBULA', 'DIRECTO', 'OPERARIO TRACTORISTA', 'TRACTORISTA', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'NOMINA DIRECTA - OLEOFLORES', 51, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1067730327', '1067730327', 'JOSE FABIAN CARBONO PINTO', 'TEMPORAL', 'OP PODA SANITARIA', 'CORTE Y RECOLECCIÓN RFF - PODA', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'SU ALIADO TEMPORAL', 5, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-18959577', '18959577', 'ESNEIDER BARRERA RODRIGUEZ', 'DIRECTO', 'Riego por gravedad', 'RIEGO & DRENAJES', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - OLEOFLORES', 36, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-19872441', '19872441', 'LUIS BOLIVAR GARCIA', 'DIRECTO', 'Cosecha palma adulta', 'CORTE Y RECOLECCIÓN RFF - TON', '', NULL, NULL, NULL, 'SAN CARLOS', NULL, 'A DESTAJO - C.M.G', 81, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1063972671', '1063972671', 'HUMBERTO RODRIGUEZ OTERO', 'TEMPORAL', 'OPERADOR DE TRACTOR', 'OPERADOR DE TRACTOR', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'SU ALIADO TEMPORAL', 1, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1004275936', '1004275936', 'NESTOR WILLIAN RAMIREZ', 'TEMPORAL', 'OP SANIDAD', 'OPERARIO DE SANIDAD', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'SU ALIADO TEMPORAL', 6, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1003166895', '1003166895', 'ERMIDES CABALLERO QUINTERO', 'TEMPORAL', 'OP SANIDAD', 'OPERARIO DE SANIDAD', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'SU ALIADO TEMPORAL', 5, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-12567123', '12567123', 'CRISTOBAL PAJARO SABARIA', 'DIRECTO', 'Cosecha palma adulta', 'CORTE Y RECOLECCIÓN RFF - TON', '', NULL, NULL, NULL, 'SUHAREZ', NULL, 'A DESTAJO - OLEOFLORES', 19, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1066349360', '1066349360', 'EZEQUIEL MEJIA ATENCIA', 'DIRECTO', 'OPERARIO DE GUADAÑA', 'PLATEO Y CONTROL MECANICO', '', NULL, NULL, NULL, 'EL CARMEN', NULL, 'A DESTAJO - OLEOFLORES', 129, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-77158766', '77158766', 'MOISES LUIS BELEÑO BENITEZ', 'DIRECTO', 'Cosecha Hda. El Carmen', 'CORTE Y RECOLECCIÓN RFF - TON', '', NULL, NULL, NULL, 'SUHAREZ', NULL, 'A DESTAJO - C.M.G', 96, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1003039312', '1003039312', 'DAVID ENRIQUE DIAZ GONGORA', 'DIRECTO', 'OPERARIO DE GUADAÑA', 'CONTROL Y PLATEO MECANICO', '', NULL, NULL, NULL, 'EL CARMEN', NULL, 'A DESTAJO - OLEOFLORES', 22, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-7958195', '7958195', 'RAMON ANTONIO ESALAS', 'DIRECTO', 'Servicios generales', 'SERVICIOS GENERALES', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'NOMINA DIRECTA - OLEOFLORES', 104, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1067711340', '1067711340', 'ALBERTO CASTRO ARMENTA', 'TEMPORAL', 'OP PODA SANITARIA', 'CORTE Y RECOLECCIÓN RFF - PODA', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'SU ALIADO TEMPORAL', 3, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1066865551', '1066865551', 'SEBASTIAN DANIEL DIAZ BLANCHAR', 'DIRECTO', 'ANALISTA AGRONOMIA', 'ANALISTA AGRONOMIA', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'NOMINA DIRECTA - OLEOFLORES', 110, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1067710726', '1067710726', 'DAVINSON ANDRES CARO', 'DIRECTO', 'OPERARIO DE GUADAÑA', 'PLATEO Y CONTROL MECANICO', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - OLEOFLORES', 23, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1148199657', '1148199657', 'JHONATHAN DAVID HERNANDEZ PIEDRAHITA', 'DIRECTO', 'OPERARIO DE COSECHA', 'CORTE Y RECOLECCIÓN RFF - TON', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - OLEOFLORES', 63, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-8600523', '8600523', 'JOSE CABARCA', 'TEMPORAL', 'Aseo y conservación suharez', 'SERVICIOS GENERALES', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'SU ALIADO TEMPORAL', 2, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-73267494', '73267494', 'JAIRO ENRIQUE ORTIZ PADILLA', 'DIRECTO', 'Cosecha palma adulta', 'CORTE Y RECOLECCIÓN RFF - TON', '', NULL, NULL, NULL, 'SUHAREZ', NULL, 'A DESTAJO - OLEOFLORES', 55, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-3872016', '3872016', 'FERNANDO MARSIGLIA GARCIA', 'DIRECTO', 'Cosecha palma adulta', 'CORTE Y RECOLECCIÓN RFF - TON', '', NULL, NULL, NULL, 'SUHAREZ', NULL, 'A DESTAJO - OLEOFLORES', 43, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1062402757', '1062402757', 'LUIS BARRAZA MENDOZA', 'DIRECTO', 'SUPERVISOR', 'SUPERVISOR', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'NOMINA DIRECTA - OLEOFLORES', 80, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-7572766', '7572766', 'DAIRO MANUEL CORDOBA LOPEZ', 'DIRECTO', 'OPERARIO DE GUADAÑA', 'CONTROL Y PLATEO MECANICO', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - OLEOFLORES', 20, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-77149125', '77149125', 'LUIS DIAZ BOLIVAR', 'DIRECTO', 'PLATEO Y CONTROL MANUAL', 'MANTENIMIENTO', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - OLEOFLORES', 84, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1066351077', '1066351077', 'CHONA CLARO AGUSTÍN', 'TEMPORAL', 'OPERARIO DE SIEMBRA', 'SIEMBRA DE PALMA- SUHAREZ', '', NULL, NULL, NULL, 'SUHAREZ', NULL, 'SU ALIADO TEMPORAL', 8, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1128185882', '1128185882', 'JORGE ENRIQUE NAVARRO ZUÑIGA', 'DIRECTO', 'OPERARIO DE SIEMBRA', 'FERTILIZACIÓN MANUAL', '', NULL, NULL, NULL, 'EL CARMEN', NULL, 'A DESTAJO - OLEOFLORES', 64, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1067711614', '1067711614', 'POLO CASTELLAR SERGIO ANDRES', 'TEMPORAL', 'OPERARIO DE SIEMBRA', 'SIEMBRA DE PALMA- SUHAREZ', '', NULL, NULL, NULL, 'SUHAREZ', NULL, 'SU ALIADO TEMPORAL', 2, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-77029951', '77029951', 'ENRIQUE MAZA SANTANA', 'DIRECTO', 'Cosecha palma adulta', 'CORTE Y RECOLECCIÓN RFF - TON', '', NULL, NULL, NULL, 'SAN CARLOS', NULL, 'A DESTAJO - OLEOFLORES', 34, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1128203162', '1128203162', 'ALFONSO JULIO MARTINEZ', 'TEMPORAL', 'OP PODA SANITARIA', 'CORTE Y RECOLECCIÓN RFF - PODA', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'SU ALIADO TEMPORAL', 2, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1067725122', '1067725122', 'LUIS EDUARDO CAPERA PALACIO', 'DIRECTO', 'OPERARIO DE GUADAÑA', 'CONTROL Y PLATEO MECANICO', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - OLEOFLORES', 85, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1067714834', '1067714834', 'JESUS DAVID ROMERO PALLARES', 'DIRECTO', 'OPERARIO DE RIEGO', 'SIEMBRA DE PALMA- FERTILIZACION', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - OLEOFLORES', 132, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-8525645', '8525645', 'RAMIRO DE LA CRUZ PEREZ', 'TEMPORAL', 'OP PODA SANITARIA', 'CORTE Y RECOLECCIÓN RFF - PODA', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'SU ALIADO TEMPORAL', 9, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1065237746', '1065237746', 'ANGEL VILLAREAL VEGA', 'DIRECTO', 'OPERARIO DE PODA', 'CORTE Y RECOLECCIÓN RFF - PODA', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - OLEOFLORES', 7, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-77159201', '77159201', 'ALEXANDER ORTIZ RICAURTE', 'DIRECTO', 'Cosecha palma adulta', 'CORTE Y RECOLECCIÓN RFF - TON', '', NULL, NULL, NULL, 'SAN CARLOS', NULL, 'A DESTAJO - OLEOFLORES', 4, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-18959323', '18959323', 'CARRILLO CORONELL YEI JOSE', 'DIRECTO', 'Cosecha palma adulta', 'CORTE Y RECOLECCIÓN RFF - TON', '', NULL, NULL, NULL, 'SAN CARLOS', NULL, 'A DESTAJO - C.M.G', 18, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-18958341', '18958341', 'CARLOS ANTONIO BRIEVA TOLOZA', 'DIRECTO', 'OPERARIO DE COSECHA', 'CORTE Y RECOLECCIÓN RFF - TON', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - OLEOFLORES', 16, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1082490021', '1082490021', 'LUIYIS XAVIER DIAZ IBARRA', 'DIRECTO', 'OPERARIO DE GUADAÑA', 'CONTROL Y PLATEO MECANICO', '', NULL, NULL, NULL, 'EL CARMEN', NULL, 'A DESTAJO - OLEOFLORES', 89, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-77152933', '77152933', 'ROBERT OVIEDO OÑATE', 'DIRECTO', 'OFICIOS VARIOS', 'SERVICIOS GENERALES', '', NULL, NULL, NULL, 'SUHAREZ', NULL, 'A DESTAJO - C.M.G', 106, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-77155930', '77155930', 'EDINSON ALVAREZ FELIZZOLA', 'DIRECTO', 'Riego por aspersión', 'RIEGO & DRENAJES', '', NULL, NULL, NULL, 'EL CARMEN', NULL, 'NOMINA DIRECTA - C.M.G', 31, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1067817290', '1067817290', 'LAGARES TORRES FRANCISCO EDUARDO', 'TEMPORAL', 'OPERARIO DE SIEMBRA', 'SIEMBRA DE PALMA- SUHAREZ', '', NULL, NULL, NULL, 'SUHAREZ', NULL, 'SU ALIADO TEMPORAL', 7, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-18958059', '18958059', 'LUIS RAMON CASTELLAR DE ORO', 'DIRECTO', 'OPERARIO DE PODA', 'CORTE Y RECOLECCIÓN RFF - TON', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - OLEOFLORES', 88, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1064712265', '1064712265', 'FREDE RINCON ALVAREZ', 'DIRECTO', 'Operario de Riego', 'RIEGO & DRENAJES', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - OLEOFLORES', 45, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-18966776', '18966776', 'ARIEL PARRA SOTO', 'TEMPORAL', 'SENDERO', 'SERVICIOS GENERALES', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'SU ALIADO TEMPORAL', 3, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-77159140', '77159140', 'WILBER ANTONIO CESPEDES PORTO', 'DIRECTO', 'Revision de enfermedades, curaciones, censo de plaga', 'SANIDAD VEGETAL', '', NULL, NULL, NULL, 'EL CARMEN', NULL, 'NOMINA DIRECTA - C.M.G', 116, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-77153024', '77153024', 'JESÚS CABALLERO VANEGAS', 'DIRECTO', 'Cosecha palma adulta', 'CORTE Y RECOLECCIÓN RFF - TON', '', NULL, NULL, NULL, 'SAN CARLOS', NULL, 'A DESTAJO - OLEOFLORES', 59, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-77152346', '77152346', 'FRANCISCO OROZCO RODRIGUEZ', 'DIRECTO', 'Revision de enfermedades, curaciones, censo de plaga', 'SANIDAD VEGETAL', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'NOMINA DIRECTA - C.M.G', 44, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1003391495', '1003391495', 'HERNAN ARTURO JIMENEZ CANTILLO', 'TEMPORAL', 'OPERARIO DE FERTILIZACIÓN', 'SIEMBRA DE PALMA- FERTILIZACION', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'SU ALIADO TEMPORAL', 1, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-18958796', '18958796', 'ELIECER ENRIQUE BUELVAS GONZALEZ', 'TEMPORAL', 'OPERADOR DE TRACTOR', 'OPERADOR DE TRACTOR', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'SU ALIADO TEMPORAL', 3, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-12641886', '12641886', 'EVERTO ORTIZ PEÑALOZA', 'DIRECTO', 'OFICIOS VARIOS', 'SERVICIOS GENERALES', '', NULL, NULL, NULL, 'SAN CARLOS', NULL, 'A DESTAJO - OLEOFLORES', 41, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-7822457', '7822457', 'EDER DE JESUS PAJARO SAEZ', 'TEMPORAL', 'OP PODA SANITARIA', 'CORTE Y RECOLECCIÓN RFF - PODA', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'SU ALIADO TEMPORAL', 8, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1067715781', '1067715781', 'JHOHAN MARTINEZ PEDRAZA', 'DIRECTO', 'Revision de enfermedades, curaciones, censo de plaga', 'SANIDAD VEGETAL', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - OLEOFLORES', 61, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-73271403', '73271403', 'ROBERTO SANTANA RODRIGUEZ', 'DIRECTO', 'Cosecha palma adulta', 'CORTE Y RECOLECCIÓN RFF - TON', '', NULL, NULL, NULL, 'SAN CARLOS', NULL, 'A DESTAJO - OLEOFLORES', 108, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-77159931', '77159931', 'JAIME HERNANDEZ SARMIENTO', 'DIRECTO', 'OFICIOS VARIOS', 'CORTE Y RECOLECCIÓN RFF - TON', '', NULL, NULL, NULL, 'SAN CARLOS', NULL, 'A DESTAJO - C.M.G', 54, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1003275683', '1003275683', 'YEISON ENRIQUE GARCIA PAEZ', 'TEMPORAL', 'OP PODA SANITARIA', 'CORTE Y RECOLECCIÓN RFF - PODA', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'SU ALIADO TEMPORAL', 6, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-77154695', '77154695', 'CARDENAS GERMAN SANCHEZ', 'DIRECTO', 'Riego por superficie Oleoflores', 'RIEGO & DRENAJES', '', NULL, NULL, NULL, 'SUHAREZ', NULL, 'NOMINA DIRECTA - C.M.G', 14, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-77159387', '77159387', 'CARLOS FONTALVO DELAOSSA', 'DIRECTO', 'OFICIOS VARIOS', 'SERVICIOS GENERALES', '', NULL, NULL, NULL, 'SUHAREZ', NULL, 'A DESTAJO - C.M.G', 15, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-77153792', '77153792', 'VICTOR LOZANO SANGUINIO', 'DIRECTO', 'PLATEO Y CONTROL MANUAL', 'MANTENIMIENTO', '', NULL, NULL, NULL, 'EL CARMEN', NULL, 'A DESTAJO - C.M.G', 113, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1007777635', '1007777635', 'JAIME ALFONSO MERIÑO SANDOVAL', 'TEMPORAL', 'OP SANIDAD', 'OPERARIO DE SANIDAD', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'SU ALIADO TEMPORAL', 3, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-77156741', '77156741', 'HENRY ARAUJO RODRIGUEZ', 'TEMPORAL', 'Plateo mecanico (guadaña)', 'PLATEO Y CONTROL MECANICO', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'SU ALIADO TEMPORAL', 3, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1007596900', '1007596900', 'DEIVIS JOSE YEPES JIMENES', 'DIRECTO', 'OPERARIO DE SIEMBRA', 'FERTILIZACIÓN MANUAL', '', NULL, NULL, NULL, 'EL CARMEN', NULL, 'A DESTAJO - OLEOFLORES', 26, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-73271742', '73271742', 'MISAEL PEÑALOZA HERNANDEZ', 'DIRECTO', 'OPERARIO DE COSECHA', 'CORTE Y RECOLECCIÓN RFF - TON', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - OLEOFLORES', 95, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1065124018', '1065124018', 'SAMUEL DAVID BORJA MARTINEZ', 'DIRECTO', 'APRENDIZ AGRONOMIA', 'APRENDIZ AGRONOMIA', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'NOMINA DIRECTA - OLEOFLORES', 111, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-19597511', '19597511', 'JOSE GREGORIA SOSA CHARRIS', 'TEMPORAL', 'Limpia de orillos y potreros (con fuero de salud)', 'SERVICIOS GENERALES', '', NULL, NULL, NULL, 'SUHAREZ', NULL, 'SU ALIADO TEMPORAL', 7, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1067716685', '1067716685', 'BRAYAN DAVID CUJIA PINTO', 'DIRECTO', 'Revision de enfermedades, curaciones, censo de plaga', 'SANIDAD VEGETAL', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - OLEOFLORES', 11, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1082866085', '1082866085', 'EDWIN OLAVE DE LA CRUZ', 'DIRECTO', 'OPERARIO DE GUADAÑA', 'CONTROL Y PLATEO MECANICO', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - OLEOFLORES', 33, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1065575059', '1065575059', 'JHONAN ANDRES OROZCO RODRIGUEZ', 'TEMPORAL', 'SENDERO', 'SERVICIOS GENERALES', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'PROCESOS TERCERIZADOS', 8, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-77154393', '77154393', 'OSCAR HERRERA', 'TEMPORAL', 'Aseo y conservación Macho Solo (REUBICADO)', 'SERVICIOS GENERALES', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'SU ALIADO TEMPORAL', 5, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-18958026', '18958026', 'EUDES QUIÑONES RINCONES', 'DIRECTO', 'FUMIGACION QUIMICA', 'RIEGO & DRENAJES', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - OLEOFLORES', 37, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-12568474', '12568474', 'JOSE DE LOS REYES MADERO', 'DIRECTO', 'Riego por gravedad', 'RIEGO & DRENAJES', '', NULL, NULL, NULL, 'EL CARMEN', NULL, 'A DESTAJO - OLEOFLORES', 67, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1148140990', '1148140990', 'JUAN CARLOS ACUÑA RUA', 'DIRECTO', 'OPERARIO DE COSECHA', 'CORTE Y RECOLECCIÓN RFF - TON', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - OLEOFLORES', 72, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1066349353', '1066349353', 'DEINER ORTEGA CAMPUZANO', 'DIRECTO', 'OPERARIO DE COSECHA', 'CORTE Y RECOLECCIÓN RFF - TON', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - OLEOFLORES', 25, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1067715883', '1067715883', 'NOLBERTO CAPERA PALACIO', 'DIRECTO', 'OPERARIO DE GUADAÑA', 'CONTROL Y PLATEO MECANICO', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - OLEOFLORES', 97, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-74085143', '74085143', 'LUIS CRUZ ESTUPIÑAN', 'DIRECTO', 'COORDINADORA FINCAS PROPIAS CODAZZI', 'COORDINADORA FINCAS PROPIAS CODAZZI', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'NOMINA DIRECTA - OLEOFLORES', 83, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1007249760', '1007249760', 'JESUS LIÑAN ARIZA', 'DIRECTO', 'Operario de Riego', 'RIEGO & DRENAJES', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - OLEOFLORES', 60, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1081000461', '1081000461', 'TORRES ALMAZA CARLOS ANRES', 'TEMPORAL', 'OPERARIO DE SIEMBRA', 'SIEMBRA DE PALMA- SUHAREZ', '', NULL, NULL, NULL, 'SUHAREZ', NULL, 'SU ALIADO TEMPORAL', 12, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-77160156', '77160156', 'EPIFANIO DIAZ BOLIVAR', 'DIRECTO', 'PLATEO Y CONTROL MANUAL', 'MANTENIMIENTO', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - OLEOFLORES', 35, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1067031799', '1067031799', 'YORDANA NOVA ARMENTA', 'DIRECTO', 'FERTILIZACIÓN', 'NUTRICIÓN', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - OLEOFLORES', 123, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-19595282', '19595282', 'MANUEL MARTINEZ LOPEZ', 'DIRECTO', 'Riego B/2007', 'RIEGO & DRENAJES', '', NULL, NULL, NULL, 'SAN CARLOS', NULL, 'A DESTAJO - OLEOFLORES', 91, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1062811911', '1062811911', 'JOSE GUILLERMO AMADOR QUINTERO', 'DIRECTO', 'OPERARIO DE PODA', 'CORTE Y RECOLECCIÓN RFF - TON', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - OLEOFLORES', 70, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-18956465', '18956465', 'EVARISTO HERNANDEZ PAYARES', 'DIRECTO', 'Cosecha palma adulta', 'CORTE Y RECOLECCIÓN RFF - TON', '', NULL, NULL, NULL, 'SAN CARLOS', NULL, 'A DESTAJO - C.M.G', 40, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1148141654', '1148141654', 'GILBERTO TORRES CERVANTES', 'TEMPORAL', 'OP PODA SANITARIA', 'CORTE Y RECOLECCIÓN RFF - PODA', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'SU ALIADO TEMPORAL', 1, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-77152774', '77152774', 'BLANCO JULIO MANUEL LUCIO', 'DIRECTO', 'SUPERVISOR', 'SUPERVISOR', '', NULL, NULL, NULL, 'SAN CARLOS', NULL, 'NOMINA DIRECTA - C.M.G', 10, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-77158765', '77158765', 'CARLOS BUSTAMANTE MARIO', 'DIRECTO', 'COSECHA PALMA JOVEN', 'SERVICIOS GENERALES', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - OLEOFLORES', 17, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1067716540', '1067716540', 'ANDRES SOLANO RODRIGUEZ', 'DIRECTO', 'OFICIOS VARIOS', 'SERVICIOS GENERALES', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - OLEOFLORES', 6, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-77152074', '77152074', 'ARLEX HERNANDEZ YOSA', 'DIRECTO', 'OFICIOS VARIOS', 'SERVICIOS GENERALES', '', NULL, NULL, NULL, 'SAN CARLOS', NULL, 'A DESTAJO - C.M.G', 9, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-18958247', '18958247', 'JUAN CARLOS SANES VIÑA', 'DIRECTO', 'Operario de Riego', 'RIEGO & DRENAJES', '', NULL, NULL, NULL, 'SUHAREZ', NULL, 'A DESTAJO - OLEOFLORES', 73, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1066349267', '1066349267', 'JOSE GABRIEL BATISTA OCHOA', 'DIRECTO', 'OPERARIO DE COSECHA', 'CORTE Y RECOLECCIÓN RFF - TON', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - OLEOFLORES', 69, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1065984911', '1065984911', 'VICTOR ALFONSO MORENO FERRER', 'DIRECTO', 'OPERARIO DE GUADAÑA', 'PLATEO Y CONTROL MECANICO', '', NULL, NULL, NULL, 'EL CARMEN', NULL, 'A DESTAJO - OLEOFLORES', 131, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-77152521', '77152521', 'MIGUEL CARABALLO JIMENEZ', 'DIRECTO', 'Cosecha palma adulta', 'CORTE Y RECOLECCIÓN RFF - TON', '', NULL, NULL, NULL, 'SAN CARLOS', NULL, 'A DESTAJO - OLEOFLORES', 94, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1003390822', '1003390822', 'YEINER ANTONIO DE ÁVILA VILLAMIL', 'TEMPORAL', 'OPERARIO DE SIEMBRA', 'SIEMBRA DE PALMA- SUHAREZ', '', NULL, NULL, NULL, 'SUHAREZ', NULL, 'SU ALIADO TEMPORAL', 9, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-77152025', '77152025', 'JORGE ENRIQUE SIERRA MIELES', 'DIRECTO', 'TRACTORISTA', 'TRACTORISTA', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'NOMINA DIRECTA - C.M.G', 65, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1067730624', '1067730624', 'JOAN DAVID ALVAREZ LORA', 'DIRECTO', 'OPERARIO DE COSECHA', 'CORTE Y RECOLECCIÓN RFF - PODA', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - OLEOFLORES', 127, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-12567286', '12567286', 'OMAR ANTONIO ORTEGA DIAZ', 'DIRECTO', 'OFICIOS VARIOS', 'SERVICIOS GENERALES', '', NULL, NULL, NULL, 'SUHAREZ', NULL, 'A DESTAJO - C.M.G', 98, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1067716401', '1067716401', 'TOBIAS BARRAZA CASTILLO', 'TEMPORAL', 'BÚFALOS', 'AMANZADOR DE BUFALOS', '', NULL, NULL, NULL, 'LA DILIA', NULL, 'SU ALIADO TEMPORAL', 4, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-77153253', '77153253', 'EBER CASTAÑEDA ANGULO', 'DIRECTO', 'Cosecha palma adulta', 'CORTE Y RECOLECCIÓN RFF - TON', '', NULL, NULL, NULL, 'SAN CARLOS', NULL, 'A DESTAJO - OLEOFLORES', 28, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1067728677', '1067728677', 'JESUS ALBERTO LOPEZ PEREZ', 'DIRECTO', 'OPERARIO DE COSECHA', 'CORTE Y RECOLECCIÓN RFF - TON', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - OLEOFLORES', 58, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1067725738', '1067725738', 'WILLIAN JOSE ORTEGA ZEDAN', 'DIRECTO', 'OPERARIO DE COSECHA', 'CORTE Y RECOLECCIÓN RFF - TON', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - OLEOFLORES', 117, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-12567082', '12567082', 'VICTOR MEJIA BOJATO', 'DIRECTO', 'Cosecha Hda. El Carmen', 'CORTE Y RECOLECCIÓN RFF - TON', '', NULL, NULL, NULL, 'EL CARMEN', NULL, 'A DESTAJO - C.M.G', 115, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1128144472', '1128144472', 'MANUEL RIBON CAMARGO', 'DIRECTO', 'OPERARIO DE GUADAÑA', 'CONTROL Y PLATEO MECANICO', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - OLEOFLORES', 92, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1081798190', '1081798190', 'KEVIN HENRIQUEZ BARRIOS', 'DIRECTO', 'OPERARIO DE GUADAÑA', 'CONTROL Y PLATEO MECANICO', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - OLEOFLORES', 76, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-8648018', '8648018', 'DURANGO SANDOVAL EDGAR JAVIER', 'DIRECTO', 'Cosecha palma adulta', 'CORTE Y RECOLECCIÓN RFF - TON', '', NULL, NULL, NULL, 'SUHAREZ', NULL, 'A DESTAJO - OLEOFLORES', 27, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-73376918', '73376918', 'YONIS ALBERTO MONTERO TORRES', 'DIRECTO', 'OFICIOS VARIOS', 'SERVICIOS GENERALES', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - C.M.G', 122, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-72021011', '72021011', 'ADAN BOLIVAR GARCIA', 'DIRECTO', 'OPERARIO DE GUADAÑA', 'CONTROL Y PLATEO MECANICO', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - OLEOFLORES', 1, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1109496770', '1109496770', 'JUAN SEBASTIÁN HERRERA ARGUMEDO', 'TEMPORAL', 'OPERARIO DE SIEMBRA', 'SIEMBRA DE PALMA- SUHAREZ', '', NULL, NULL, NULL, 'SUHAREZ', NULL, 'SU ALIADO TEMPORAL', 11, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-77156198', '77156198', 'LUIS ARZUAGA', 'TEMPORAL', 'Aseo y conservación el carmen', 'SERVICIOS GENERALES', '', NULL, NULL, NULL, 'EL CARMEN', NULL, 'SU ALIADO TEMPORAL', 1, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1007855895', '1007855895', 'JOSE ALFONSO MENESES CERPA', 'DIRECTO', 'OPERARIO DE SIEMBRA', 'SIEMBRA DE PALMA', '', NULL, NULL, NULL, 'EL CARMEN', NULL, 'A DESTAJO - OLEOFLORES', 66, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-77152034', '77152034', 'LUIS ALFREDO QUINTERO PEDROZO', 'DIRECTO', 'Cosecha Hda. El Carmen', 'SERVICIOS GENERALES', '', NULL, NULL, NULL, 'SUHAREZ', NULL, 'A DESTAJO - C.M.G', 79, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-18958207', '18958207', 'RAFAEL ORTIZ BLANCO', 'DIRECTO', 'Cosecha palma adulta', 'CORTE Y RECOLECCIÓN RFF - TON', '', NULL, NULL, NULL, 'SUHAREZ', NULL, 'A DESTAJO - OLEOFLORES', 103, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-77153556', '77153556', 'PAHUANA OVIEDO JOSE GABRIEL', 'DIRECTO', 'SUPERVISOR', 'SUPERVISOR', '', NULL, NULL, NULL, 'SUHAREZ', NULL, 'NOMINA DIRECTA - C.M.G', 99, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-18957236', '18957236', 'HENRY MATUTE CERVANTES', 'DIRECTO', 'Riego por gravedad', 'RIEGO & DRENAJES', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - OLEOFLORES', 52, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1066348114', '1066348114', 'JULIO MANUEL BLANCO HERRERA', 'TEMPORAL', 'OPERARIO DE SIEMBRA', 'SIEMBRA DE PALMA- SUHAREZ', '', NULL, NULL, NULL, 'SUHAREZ', NULL, 'SU ALIADO TEMPORAL', 5, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-18957380', '18957380', 'JOSE DEL CARMEN CONTRERAS CHINCHILLA', 'DIRECTO', 'Cosecha palma joven', 'CORTE Y RECOLECCIÓN RFF - TON', '', NULL, NULL, NULL, 'SUHAREZ', NULL, 'A DESTAJO - OLEOFLORES', 68, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1007596985', '1007596985', 'DANIEL DAVID TOLOZA ORTIZ', 'DIRECTO', 'OPERARIO DE SIEMBRA', 'SIEMBRA DE PALMA', '', NULL, NULL, NULL, 'EL CARMEN', NULL, 'A DESTAJO - OLEOFLORES', 21, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1062812275', '1062812275', 'YOVANIS VILORIA NIÑO', 'DIRECTO', 'OPERARIO DE COSECHA', 'CORTE Y RECOLECCIÓN RFF - TON', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - OLEOFLORES', 124, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-77155676', '77155676', 'MANUEL ROSADO BRITO', 'DIRECTO', 'Riego por gravedad', 'RIEGO & DRENAJES', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - OLEOFLORES', 93, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-77143766', '77143766', 'ALBERTO MOLINA VEGA', 'DIRECTO', 'Cosecha palma adulta', 'CORTE Y RECOLECCIÓN RFF - TON', '', NULL, NULL, NULL, 'SAN CARLOS', NULL, 'A DESTAJO - OLEOFLORES', 2, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1065648744', '1065648744', 'DIANA MARIA GOMEZ MUÑOZ', 'TEMPORAL', 'OP SANIDAD', 'OPERARIO DE SANIDAD', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'SU ALIADO TEMPORAL', 2, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-77155076', '77155076', 'LUIS CARLOS RIVERO', 'DIRECTO', 'Censo de plaga', 'SANIDAD VEGETAL', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'NOMINA DIRECTA - C.M.G', 82, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-18856799', '18856799', 'BUSTAMANTE MENDOZA SANTIAGO', 'DIRECTO', 'Curaciones', 'SANIDAD VEGETAL', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'NOMINA DIRECTA - C.M.G', 12, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1193566426', '1193566426', 'GERSON RAMIIREZ ARANDA', 'DIRECTO', 'OPERARIO DE GUADAÑA', 'PLATEO Y CONTROL MECANICO', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - OLEOFLORES', 130, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-18933626', '18933626', 'PEDRO VALENTIN PATERNINA', 'DIRECTO', 'Riego por superficie Oleoflores', 'RIEGO & DRENAJES', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - OLEOFLORES', 102, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-49698568', '49698568', 'YULIBETH LARA GUERRA', 'DIRECTO', 'Censo de enfermedades', 'SANIDAD VEGETAL', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - OLEOFLORES', 126, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1067714489', '1067714489', 'YOINER DAVID LAMBRAÑO SALINAS', 'TEMPORAL', 'OPERARIO DE SIEMBRA', 'SIEMBRA DE PALMA- SUHAREZ', '', NULL, NULL, NULL, 'SUHAREZ', NULL, 'SU ALIADO TEMPORAL', 10, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1064787303', '1064787303', 'SARMIENTO OVALLE LUIS MIGUEL', 'TEMPORAL', 'OPERARIO DE SIEMBRA', 'SIEMBRA DE PALMA- SUHAREZ', '', NULL, NULL, NULL, 'SUHAREZ', NULL, 'SU ALIADO TEMPORAL', 13, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-15174559', '15174559', 'LUIS GABRIEL PINEDA MARTINEZ', 'DIRECTO', 'OPERARIO DE COSECHA', 'RIEGO & DRENAJES', '', NULL, NULL, NULL, 'EL CARMEN', NULL, 'A DESTAJO - OLEOFLORES', 86, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-18957253', '18957253', 'GILBERTO PONTON TORREJANO', 'DIRECTO', 'Cosecha palma adulta', 'CORTE Y RECOLECCIÓN RFF - TON', '', NULL, NULL, NULL, 'SUHAREZ', NULL, 'A DESTAJO - C.M.G', 47, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1067713545', '1067713545', 'JOSE MIGUEL DITTA ATENCIO', 'TEMPORAL', 'OP PODA SANITARIA', 'CORTE Y RECOLECCIÓN RFF - PODA', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'SU ALIADO TEMPORAL', 7, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-7618309', '7618309', 'ALFONSO PAZO', 'TEMPORAL', 'SENDERO', 'SERVICIOS GENERALES', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'SU ALIADO TEMPORAL', 6, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1081761258', '1081761258', 'SALINA RODRIGUEZ JOSE GREGORIO', 'TEMPORAL', 'OPERARIO DE SIEMBRA', 'SIEMBRA DE PALMA- SUHAREZ', '', NULL, NULL, NULL, 'SUHAREZ', NULL, 'SU ALIADO TEMPORAL', 3, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-12568186', '12568186', 'MANUEL ALCENDRA CARRASCAL', 'DIRECTO', 'Riego por gravedad', 'RIEGO & DRENAJES', '', NULL, NULL, NULL, 'SUHAREZ', NULL, 'A DESTAJO - OLEOFLORES', 90, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1067727273', '1067727273', 'EDINSON STITH BECERRA', 'DIRECTO', 'Revision de enfermedades, curaciones, censo de plaga', 'SANIDAD VEGETAL', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - OLEOFLORES', 32, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-18956039', '18956039', 'JULIO MANUEL BLANCO JULIO', 'DIRECTO', 'Cosecha palma adulta', 'CORTE Y RECOLECCIÓN RFF - TON', '', NULL, NULL, NULL, 'SUHAREZ', NULL, 'A DESTAJO - OLEOFLORES', 75, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-49796735', '49796735', 'PAOLA ESTHER CHAVEZ SOTO', 'DIRECTO', 'AUXILIAR ADMINISTRATIVO', 'AUXILIAR ADMINISTRATIVO', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'NOMINA DIRECTA - OLEOFLORES', 100, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-77154528', '77154528', 'ALEXANDER MACHADO JULIO', 'DIRECTO', 'Cosecha palma joven', 'CORTE Y RECOLECCIÓN RFF - TON', '', NULL, NULL, NULL, 'SAN CARLOS', NULL, 'A DESTAJO - OLEOFLORES', 3, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-18956397', '18956397', 'FELIX FLOREZ GARAVITO', 'DIRECTO', 'Operario de Riego', 'RIEGO & DRENAJES', '', NULL, NULL, NULL, 'SAN CARLOS', NULL, 'A DESTAJO - OLEOFLORES', 42, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1067716324', '1067716324', 'EDGAR BALCAZAR', 'DIRECTO', 'TRACTORISTA', 'TRACTORISTA', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'NOMINA DIRECTA - OLEOFLORES', 114, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-1003275332', '1003275332', 'YEFRI CORVACHO CARRILLO', 'DIRECTO', 'OPERARIO DE GUADAÑA', 'CONTROL Y PLATEO MECANICO', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - OLEOFLORES', 121, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-18956525', '18956525', 'VICTOR ALVAREZ FELIZZOLA', 'DIRECTO', 'PLATEO Y CONTROL MANUAL', 'MANTENIMIENTO', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - C.M.G', 112, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-73268370', '73268370', 'HUMBERTO PEÑALOZA', 'TEMPORAL', 'Limpia de orillos y potreros (REUBICADO)', 'SERVICIOS GENERALES', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'SU ALIADO TEMPORAL', 4, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-12735225', '12735225', 'JAUREGUI RUIDIAZ OLIVERO', 'DIRECTO', 'BUFALERO', 'BUFALERO', '', NULL, NULL, NULL, 'LAS FLORES', NULL, 'A DESTAJO - OLEOFLORES', 56, NULL, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel (id, documento, name, type, job_title, cuadrilla, observaciones, tipo_personal, estado, actividad_cuadrilla, zona, labor_cargo, contratacion, orden_fuente, nombre_completo, active) VALUES ('PER-77151704', '77151704', 'GIOVANNY ANAYA PADILLA', 'DIRECTO', 'SUPERVISOR', 'SUPERVISOR', '', NULL, NULL, NULL, 'SANIDAD VEGETAL', NULL, 'NOMINA DIRECTA - C.M.G', 48, NULL, true) ON CONFLICT (id) DO NOTHING;

-- LABORS
INSERT INTO public.labors (id, name, active) VALUES ('LAB-69F6C619', 'SANIDAD', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.labors (id, name, active) VALUES ('LAB-C006856E', 'TRACTORISTA', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.labors (id, name, active) VALUES ('LAB-B3B6D6B2', 'OPERADOR DE TRACTOR', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.labors (id, name, active) VALUES ('LAB-AB775E94', 'Servicios generales', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.labors (id, name, active) VALUES ('LAB-AC976AFE', 'GUADAÑA', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.labors (id, name, active) VALUES ('LAB-BBE82BC4', 'Riego B/2007', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.labors (id, name, active) VALUES ('LAB-4CD75B45', 'SANIDAD VEGETAL', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.labors (id, name, active) VALUES ('LAB-0298124D', 'COORDINADORA FINCAS PROPIAS CODAZZI', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.labors (id, name, active) VALUES ('LAB-738439C8', 'BUFALERO', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.labors (id, name, active) VALUES ('LAB-70C61BA2', 'RIEGO', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.labors (id, name, active) VALUES ('LAB-E27BBAA5', 'SIEMBRA', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.labors (id, name, active) VALUES ('LAB-D333C313', 'Riego por superficie Oleoflores', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.labors (id, name, active) VALUES ('LAB-1448B550', 'SUPERVISOR', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.labors (id, name, active) VALUES ('LAB-19ACA726', 'CONTROL DE MALEZA MECÁNICO', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.labors (id, name, active) VALUES ('LAB-F6CE43B5', 'Plateo mecanico (guadaña)', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.labors (id, name, active) VALUES ('LAB-4251C164', 'RIEGO Y DRENAJES', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.labors (id, name, active) VALUES ('LAB-69BB65F7', 'Riego Suharez', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.labors (id, name, active) VALUES ('LAB-A7EACE74', 'Cosecha Hda. El Carmen', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.labors (id, name, active) VALUES ('LAB-05A43530', 'Curaciones', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.labors (id, name, active) VALUES ('LAB-1DD6E5E3', 'Censo de plaga', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.labors (id, name, active) VALUES ('LAB-66C68661', 'COSECHA', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.labors (id, name, active) VALUES ('LAB-449FA937', 'Cosecha palma joven', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.labors (id, name, active) VALUES ('LAB-0206D6B7', 'PODA SANITARIA', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.labors (id, name, active) VALUES ('LAB-02C582EE', 'FUMIGACION QUIMICA', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.labors (id, name, active) VALUES ('LAB-381778A0', 'Riego por gravedad', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.labors (id, name, active) VALUES ('LAB-B032AE7B', 'OPERADOR DE MOTOSIERRA', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.labors (id, name, active) VALUES ('LAB-CF8D0761', 'Riego - Hda El Carmen', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.labors (id, name, active) VALUES ('LAB-C5027BA7', 'Aseo y conservación el carmen', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.labors (id, name, active) VALUES ('LAB-33F722EB', 'Revision de enfermedades, curaciones, censo de plaga', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.labors (id, name, active) VALUES ('LAB-4A8CCB5D', 'ANALISTA AGRONOMIA', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.labors (id, name, active) VALUES ('LAB-E32D9F3E', 'FERTILIZACIÓN', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.labors (id, name, active) VALUES ('LAB-A6966420', 'Riego por aspersión', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.labors (id, name, active) VALUES ('LAB-A518A762', 'OFICIOS VARIOS', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.labors (id, name, active) VALUES ('LAB-97CA42CF', 'PODA', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.labors (id, name, active) VALUES ('LAB-E67ED2F7', 'SENDERO', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.labors (id, name, active) VALUES ('LAB-6D7C7CAD', 'MANTENIMIENTO', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.labors (id, name, active) VALUES ('LAB-8691788E', 'Cosecha palma adulta', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.labors (id, name, active) VALUES ('LAB-45B90878', 'BÚFALOS', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.labors (id, name, active) VALUES ('LAB-12035002', 'OTROS', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.labors (id, name, active) VALUES ('LAB-ACD38944', 'PLATEO Y CONTROL MANUAL', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.labors (id, name, active) VALUES ('LAB-BC0A5508', 'Censo de enfermedades', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.labors (id, name, active) VALUES ('LAB-EEE010D0', 'AUXILIAR ADMINISTRATIVO', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.labors (id, name, active) VALUES ('LAB-1E23CFBB', 'NUTRICION', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.labors (id, name, active) VALUES ('LAB-DB4E3FA5', 'MAQUINARIA', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.labors (id, name, active) VALUES ('LAB-2330BD07', 'Limpia de orillos y potreros (REUBICADO)', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.labors (id, name, active) VALUES ('LAB-C1C03EFC', 'ADECUACION PREPARACION Y SIEMBRA', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.labors (id, name, active) VALUES ('LAB-2C8667BE', 'Aseo y conservación suharez', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.labors (id, name, active) VALUES ('LAB-155E41F6', 'Aseo y conservación Macho Solo (REUBICADO)', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.labors (id, name, active) VALUES ('LAB-648A46F0', 'Limpia de orillos y potreros (con fuero de salud)', false) ON CONFLICT (id) DO NOTHING;

-- ACTIVITIES
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-1D761951', 'LAB-66C68661', 'RIEGO & DRENAJES', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-DADE6BD0', 'LAB-70C61BA2', 'Auxiliar de campo riego', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-5C09B21F', 'LAB-4CD75B45', 'Control de plagas', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-FEC3798F', 'LAB-12035002', 'Diligencia personal', 'Jornal', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-A39CE7DA', 'LAB-B3B6D6B2', 'OPERADOR DE TRACTOR', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-5F62850D', 'LAB-C1C03EFC', 'Preparación de suelos', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-09EDFFE5', 'LAB-A7EACE74', 'SERVICIOS GENERALES', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-B8D63BF8', 'LAB-CF8D0761', 'RIEGO & DRENAJES', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-FB14258F', 'LAB-DB4E3FA5', 'Transporte de fertilizante', 'Palma', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-6DFD7450', 'LAB-70C61BA2', 'Recava de canal de riego', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-17D6EFDF', 'LAB-648A46F0', 'SERVICIOS GENERALES', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-A2674512', 'LAB-12035002', 'Suspendido', 'Jornal', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-4725DF8D', 'LAB-6D7C7CAD', 'Control de maleza mecanico', 'Ha', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-76DD9BBE', 'LAB-70C61BA2', 'Construcción de repartidores', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-9A1A5142', 'LAB-6D7C7CAD', 'Corte y repique de arboles', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-CC00D52C', 'LAB-12035002', 'Incapacidad', 'Jornal', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-C2F35884', 'LAB-70C61BA2', 'Fumigación canal de reigo', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-01677C90', 'LAB-4CD75B45', 'Auxiliar de campo', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-DE216C1D', 'LAB-DB4E3FA5', 'Taller', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-0C4802A7', 'LAB-E27BBAA5', 'SIEMBRA DE PALMA- SUHAREZ', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-F0A1FCCD', 'LAB-12035002', 'Ley maría', 'Jornal', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-0184CC97', 'LAB-12035002', 'Festivo', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-56BA13CC', 'LAB-1E23CFBB', 'Toma de muestras foliares', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-4A4E60F6', 'LAB-4CD75B45', 'Enderezando palmas', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-DA96A3E3', 'LAB-66C68661', 'Auxiliar de campo cosecha', 'Ton', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-2630E90A', 'LAB-70C61BA2', 'Mantenimiento y arreglo de sistema de riego', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-419F7771', 'LAB-6D7C7CAD', 'Arreglo de cercas', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-D653A7FE', 'LAB-DB4E3FA5', 'Aplicación de fertilizante organico', 'Palma', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-83E3C664', 'LAB-6D7C7CAD', 'Control de maleza manual', 'Ha', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-30D142C9', 'LAB-66C68661', 'Capataz de cosecha', 'Ton', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-2BFDC9D0', 'LAB-DB4E3FA5', 'Corales', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-6A3CB395', 'LAB-97CA42CF', 'CORTE Y RECOLECCIÓN RFF - TON', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-14A86C05', 'LAB-8691788E', 'CORTE Y RECOLECCIÓN RFF - TON', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-E3ECB675', 'LAB-A7EACE74', 'CORTE Y RECOLECCIÓN RFF - TON', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-CE0516CE', 'LAB-0206D6B7', 'CORTE Y RECOLECCIÓN RFF - TON', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-94DAC2C8', 'LAB-6D7C7CAD', 'Control de maleza químico', 'Ha', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-E6530635', 'LAB-12035002', 'Inasistencia', 'Jornal', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-D85CE519', 'LAB-C1C03EFC', 'Aplicación de abono resiembra palma', 'Palma', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-2E4218B9', 'LAB-70C61BA2', 'Drenaje de lote', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-209CF7FA', 'LAB-AC976AFE', 'PLATEO Y CONTROL MECANICO', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-EA3508FD', 'LAB-2C8667BE', 'SERVICIOS GENERALES', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-7531863C', 'LAB-C006856E', 'TRACTORISTA', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-EAEB441A', 'LAB-4CD75B45', 'Erradicación de palma', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-2742425D', 'LAB-4CD75B45', 'Colocación de guarapo', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-1D704317', 'LAB-ACD38944', 'MANTENIMIENTO', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-75E6147B', 'LAB-12035002', 'Dominical', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-D9A2D465', 'LAB-12035002', 'Cita médica', 'Jornal', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-AF31B0E0', 'LAB-70C61BA2', 'Limpieza canal de riego', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-D8561D6B', 'LAB-2330BD07', 'SERVICIOS GENERALES', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-FE84046A', 'LAB-6D7C7CAD', 'Desbejuque de palmas', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-1BD0170E', 'LAB-449FA937', 'SERVICIOS GENERALES', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-C36BD3DD', 'LAB-6D7C7CAD', 'Auxiliar de campo poda', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-78628753', 'LAB-97CA42CF', 'CORTE Y RECOLECCIÓN RFF - PODA', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-AC49A4A9', 'LAB-AC976AFE', 'CONTROL Y PLATEO MECANICO', 'Pal', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-65DA397E', 'LAB-6D7C7CAD', 'Limpia de orillos', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-F16E018D', 'LAB-6D7C7CAD', 'Aseo y conservación', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-1008A83B', 'LAB-1E23CFBB', 'Toma muestra de suelo', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-87E9727A', 'LAB-1E23CFBB', 'Cargue de abono organico', 'Palma', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-333DF694', 'LAB-4CD75B45', 'Captura de rynchophorus', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-9F7C362B', 'LAB-C1C03EFC', 'Llenado de sacos compostaje', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-027C7EE0', 'LAB-DB4E3FA5', 'Oficios varios', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-5DBB6DD0', 'LAB-1E23CFBB', 'Aplicación de abono organico', 'Palma', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-E163BC6F', 'LAB-70C61BA2', 'Mantenimiento de base de aspersores', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-E554AE28', 'LAB-1E23CFBB', 'Carga y descarga fertilizante', 'Palma', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-ACF53310', 'LAB-6D7C7CAD', 'Limpia de guardarraya', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-F4A13077', 'LAB-66C68661', 'Amansada de búfalos', 'Ton', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-F53C553F', 'LAB-66C68661', 'CORTE Y RECOLECCIÓN RFF - PODA', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-EB7C1D05', 'LAB-DB4E3FA5', 'Transporte de cebo vegetal', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-A9A712C7', 'LAB-12035002', 'Oficios varios', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-3AA28CD0', 'LAB-6D7C7CAD', 'Aserrada de tablon', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-16755577', 'LAB-4CD75B45', 'Control de strategus', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-D7A5419E', 'LAB-DB4E3FA5', 'Regando raquis', 'Palma', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-986AF1C6', 'LAB-0206D6B7', 'CORTE Y RECOLECCIÓN RFF - PODA', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-AB08BD0A', 'LAB-4CD75B45', 'Curación de palmas', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-7560540E', 'LAB-12035002', 'Examenes médicos', 'Jornal', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-94522B4C', 'LAB-66C68661', 'Mantenimiento de búfalos', 'Ton', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-9D937315', 'LAB-1E23CFBB', 'Ayudante boleadora de fertilizante químico', 'Palma', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-07A1C01C', 'LAB-DB4E3FA5', 'Corta maleza en lote', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-27821D15', 'LAB-6D7C7CAD', 'Plateo con azadon', 'Ha', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-7C974231', 'LAB-C1C03EFC', 'Ahoyado', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-DB8F3197', 'LAB-DB4E3FA5', 'Transporte de fruta', 'Ton', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-B3B7C25F', 'LAB-6D7C7CAD', 'Sellado de plato', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-A08D9AD1', 'LAB-4CD75B45', 'Mantenimiento de camas biologicas', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-26D282EC', 'LAB-69BB65F7', 'RIEGO & DRENAJES', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-3D72AF53', 'LAB-C1C03EFC', 'Estaquillado', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-030922DD', 'LAB-4CD75B45', 'Marcacion de palma', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-B81E882D', 'LAB-66C68661', 'Entrega de herramientas', 'Ton', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-7772C7E8', 'LAB-BC0A5508', 'SANIDAD VEGETAL', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-4C92BADD', 'LAB-6D7C7CAD', 'Limpieza de potrero', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-B7CF35BD', 'LAB-DB4E3FA5', 'Aplicación de fertilizante químico', 'Palma', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-C9566D8D', 'LAB-6D7C7CAD', 'Mantenimiento canal de riego', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-DED7E7DA', 'LAB-DB4E3FA5', 'Transporte de materiales resiembra', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-7A720AB2', 'LAB-A518A762', 'CORTE Y RECOLECCIÓN RFF - TON', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-BC13E4B9', 'LAB-6D7C7CAD', 'Aserrada de madrina', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-1F438BAF', 'LAB-B032AE7B', 'OPERADOR DE MOTOSIERRA', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-F0129A6E', 'LAB-45B90878', 'AMANZADOR DE BUFALOS', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-B2A22CE6', 'LAB-DB4E3FA5', 'Fumigación', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-531E2623', 'LAB-1DD6E5E3', 'SANIDAD VEGETAL', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-EB835B69', 'LAB-12035002', 'Día de la familia', 'Jornal', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-63C8E4DE', 'LAB-DB4E3FA5', 'Fabrica', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-DF1C72A4', 'LAB-66C68661', 'Corte y recolección de fruta', 'Ton', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-6F9BB9E8', 'LAB-DB4E3FA5', 'Roleando', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-97B49EA0', 'LAB-70C61BA2', 'Levantamiento de bordas', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-14C0A0AE', 'LAB-4CD75B45', 'Censo de palmas', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-83B36489', 'LAB-6D7C7CAD', 'Plateo manual', 'Ha', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-091CD9F0', 'LAB-738439C8', 'BUFALERO', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-92B931D6', 'LAB-D333C313', 'RIEGO & DRENAJES', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-20B72F71', 'LAB-70C61BA2', 'Limpia de canal de drenaje', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-4B500B2B', 'LAB-1E23CFBB', 'Aplicación raquis en lote', 'Palma', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-AF432C76', 'LAB-0298124D', 'COORDINADORA FINCAS PROPIAS CODAZZI', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-15200E06', 'LAB-12035002', 'Capacitación', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-ED8FC78F', 'LAB-66C68661', 'Recolección de fruta suelta', 'Ton', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-632C5335', 'LAB-1E23CFBB', 'Aplicación manual fertilizantes', 'Palma', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-4C66A50F', 'LAB-C1C03EFC', 'Siembra de cobertura', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-FA4061B2', 'LAB-66C68661', 'Censo de racimos', 'Ton', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-47619B02', 'LAB-6D7C7CAD', 'Fumigación de orillos', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-A4BB882C', 'LAB-E27BBAA5', 'SIEMBRA DE PALMA', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-BC765ABB', 'LAB-12035002', 'Fábrica', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-EB33682A', 'LAB-4CD75B45', 'Recolección de pupa', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-36524AF4', 'LAB-6D7C7CAD', 'Poda de swinglea', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-36DE5410', 'LAB-12035002', 'Ley de luto', 'Jornal', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-B220E13A', 'LAB-6D7C7CAD', 'Construcción de pase búfalos', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-B0865AAB', 'LAB-4A8CCB5D', 'ANALISTA AGRONOMIA', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-A0A74F56', 'LAB-66C68661', 'Evaluación calidad de fruto', 'Ton', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-AF682812', 'LAB-C1C03EFC', 'Auxiliar de campo resiembra', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-2AA4A9E2', 'LAB-C1C03EFC', 'Adecuación sistema de riego', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-97793D73', 'LAB-DB4E3FA5', 'Regando ceniza', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-581639C9', 'LAB-70C61BA2', 'Fumigación canal de drenajes', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-78AEEC3F', 'LAB-6D7C7CAD', 'Ayudante de motosierra', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-FA920DF4', 'LAB-381778A0', 'RIEGO & DRENAJES', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-33918B40', 'LAB-F6CE43B5', 'PLATEO Y CONTROL MECANICO', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-6B0A6A35', 'LAB-69F6C619', 'OPERARIO DE SANIDAD', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-17A562EE', 'LAB-1448B550', 'SUPERVISOR', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-81AD6AC3', 'LAB-6D7C7CAD', 'Mantenimiento de puente', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-B68C5066', 'LAB-05A43530', 'SANIDAD VEGETAL', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-E8594CED', 'LAB-6D7C7CAD', 'Sendero agronomía', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-3E7E06E0', 'LAB-70C61BA2', 'Recava canal de drenaje', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-034854F7', 'LAB-66C68661', 'Cargue de fruta', 'Ton', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-05A36A06', 'LAB-EEE010D0', 'AUXILIAR ADMINISTRATIVO', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-EC39B7BA', 'LAB-02C582EE', 'RIEGO & DRENAJES', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-64F7EA9C', 'LAB-BBE82BC4', 'RIEGO & DRENAJES', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-F06DED16', 'LAB-6D7C7CAD', 'Poda sanitaria', 'Pal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-AF92F5E6', 'LAB-A6966420', 'RIEGO & DRENAJES', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-D13E1863', 'LAB-E67ED2F7', 'SERVICIOS GENERALES', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-E1E274E6', 'LAB-DB4E3FA5', 'Vivero', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-7D5C9288', 'LAB-6D7C7CAD', 'Limpieza de plato con rastrillo', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-2E62EFB4', 'LAB-70C61BA2', 'Aplicación de riego', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-BC6826BE', 'LAB-6D7C7CAD', 'Adecuación de vías', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-A89225EC', 'LAB-C1C03EFC', 'Siembra de palma', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-20597C02', 'LAB-4CD75B45', 'Toma de medidas vegetativas', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-B13D5784', 'LAB-6D7C7CAD', 'Siembra de Kudzu', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-F0E49C77', 'LAB-DB4E3FA5', 'Regando agua vías internas', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-8E9248AF', 'LAB-12035002', 'Inducción', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-1948F52F', 'LAB-4251C164', 'RIEGO & DRENAJES', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-672161B9', 'LAB-70C61BA2', 'RIEGO & DRENAJES', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-58AFDF29', 'LAB-33F722EB', 'SANIDAD VEGETAL', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-6EAF3006', 'LAB-E32D9F3E', 'NUTRICIÓN', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-351D0E50', 'LAB-A518A762', 'SERVICIOS GENERALES', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-174AD942', 'LAB-4CD75B45', 'Censo de plagas', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-61C886E9', 'LAB-DB4E3FA5', 'Corta maleza en carretera', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-F6A48077', 'LAB-6D7C7CAD', 'Corte de postes', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-43852618', 'LAB-DB4E3FA5', 'Aplicación raquis en lote', 'Palma', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-4E7821F2', 'LAB-1E23CFBB', 'Ayudante boleadora de abono orgánico', 'Palma', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-5F073CDD', 'LAB-1E23CFBB', 'Conteo y organización de sacos vacíos', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-BD3C4AD5', 'LAB-AB775E94', 'SERVICIOS GENERALES', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-4443A064', 'LAB-12035002', 'Celebración navideña', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-0AD2BB7D', 'LAB-E27BBAA5', 'FERTILIZACIÓN MANUAL', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-75D237B3', 'LAB-6D7C7CAD', 'Plateo mecanico', 'Ha', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-23D67177', 'LAB-1E23CFBB', 'Auxiliar de campo nutrición', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-84F0B07D', 'LAB-4251C164', 'LIMPIEZA DE DRENAJES', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-F88A020D', 'LAB-DB4E3FA5', 'Transporte de materiales', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-16A6D161', 'LAB-DB4E3FA5', 'Transporte de ceniza', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-F7EFAF0A', 'LAB-1E23CFBB', 'Ayudante de fertilización', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-216D5D4A', 'LAB-DB4E3FA5', 'Transporte de tanque de agua', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-C5C6515E', 'LAB-70C61BA2', 'SIEMBRA DE PALMA- FERTILIZACION', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-5321C59B', 'LAB-6D7C7CAD', 'Aserrada de tablas', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-3EB13F2E', 'LAB-6D7C7CAD', 'Plateo químico', 'Ha', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-9073CFF8', 'LAB-6D7C7CAD', 'Poda de formación', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-4A75E05E', 'LAB-12035002', 'Permiso', 'Jornal', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-AAE7DE7E', 'LAB-449FA937', 'CORTE Y RECOLECCIÓN RFF - TON', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-55EBCE12', 'LAB-6D7C7CAD', 'Aserrada de vareta', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-102ECADC', 'LAB-4CD75B45', 'Siembra de nectariferas', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-69672542', 'LAB-6D7C7CAD', 'Sello químico en plato', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-55B7EA12', 'LAB-4CD75B45', 'Censo de enfermedades', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-B10931A5', 'LAB-6D7C7CAD', 'Auxiliar de campo guadaña', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-5D3FD187', 'LAB-6D7C7CAD', 'Acarreo de postes', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-46ADAE81', 'LAB-70C61BA2', 'Ayudante de infraestructura de riego', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-510DDD25', 'LAB-12035002', 'Cargue de torta', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-C7A6701E', 'LAB-70C61BA2', 'Plateo manual de aspersores', 'Ha', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-B0E2EF84', 'LAB-155E41F6', 'SERVICIOS GENERALES', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-AEF6641F', 'LAB-E32D9F3E', 'SIEMBRA DE PALMA- FERTILIZACION', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-3C94E04F', 'LAB-66C68661', 'CORTE Y RECOLECCIÓN RFF - TON', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-FA300B9E', 'LAB-C1C03EFC', 'Corte estacas', 'Jornal', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-6EB290BE', 'LAB-C5027BA7', 'SERVICIOS GENERALES', NULL, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, labor_id, name, unit, active) VALUES ('ACT-89B2DF0C', 'LAB-DB4E3FA5', 'Mantenimiento máquina agrícola', 'Jornal', true) ON CONFLICT (id) DO NOTHING;

-- LOCATIONS
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09F014', 'LAS FLORES', '09F014', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09E008', 'SAN CARLOS', '09E008', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-06A004', 'SUHAREZ', '06A004', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09F018', 'LAS FLORES', '09F018', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09E004', 'MACHO SOLO', '09E004', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09B007', 'SAN CARLOS', '09B007', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-03C005', 'EL CARMEN', '03C005', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09E010', 'SAN CARLOS', '09E010', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-03C001', 'EL CARMEN', '03C001', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09A007', 'EL CARMEN', '09A007', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-03A006', 'EL CARMEN', '03A006', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09C008', 'SAN CARLOS', '09C008', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-03A002', 'EL CARMEN', '03A002', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09G013', 'LAS FLORES', '09G013', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09D007', 'SAN CARLOS', '09D007', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09D003', 'MACHO SOLO', '09D003', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09F020', 'LAS FLORES', '09F020', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09C004', 'MACHO SOLO', '09C004', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09C010', 'SAN CARLOS', '09C010', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-03B006', 'EL CARMEN', '03B006', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-03B002', 'EL CARMEN', '03B002', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09D013', 'SAN CARLOS', '09D013', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-03B003', 'EL CARMEN', '03B003', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09C011', 'SAN CARLOS', '09C011', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09G012', 'LAS FLORES', '09G012', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09C009', 'SAN CARLOS', '09C009', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-03A003', 'EL CARMEN', '03A003', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-03A007', 'EL CARMEN', '03A007', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09C005', 'MACHO SOLO', '09C005', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09D002', 'MACHO SOLO', '09D002', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09D006', 'SAN CARLOS', '09D006', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09C001', 'MACHO SOLO', '09C001', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-06B005', 'SUHAREZ', '06B005', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09E011', 'SAN CARLOS', '09E011', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-06B001', 'SUHAREZ', '06B001', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-03C004', 'EL CARMEN', '03C004', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-06A005', 'SUHAREZ', '06A005', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09E009', 'SAN CARLOS', '09E009', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09F015', 'LAS FLORES', '09F015', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-06A001', 'SUHAREZ', '06A001', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09B006', 'SAN CARLOS', '09B006', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09F140', 'LAS FLORES', '09F140', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09E005', 'MACHO SOLO', '09E005', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09B010', 'SAN CARLOS', '09B010', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-06B003', 'SUHAREZ', '06B003', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09A008', 'EL CARMEN', '09A008', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-03C002', 'EL CARMEN', '03C002', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09E013', 'SAN CARLOS', '09E013', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09E007', 'SAN CARLOS', '09E007', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09E003', 'MACHO SOLO', '09E003', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09B004', 'SUHAREZ', '09B004', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09F017', 'LAS FLORES', '09F017', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-06A003', 'SUHAREZ', '06A003', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09B008', 'SAN CARLOS', '09B008', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09F013', 'LAS FLORES', '09F013', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-03B005', 'EL CARMEN', '03B005', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09D014', 'SAN CARLOS', '09D014', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-03B001', 'EL CARMEN', '03B001', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-03A009', 'EL CARMEN', '03A009', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09C003', 'MACHO SOLO', '09C003', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09D004', 'MACHO SOLO', '09D004', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09D100', 'SAN CARLOS', '09D100', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09C007', 'SAN CARLOS', '09C007', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-03A005', 'EL CARMEN', '03A005', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09G014', 'LAS FLORES', '09G014', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09D008', 'SAN CARLOS', '09D008', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09G010', 'LAS FLORES', '09G010', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-03A001', 'EL CARMEN', '03A001', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09C006', 'SAN CARLOS', '09C006', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09D005', 'MACHO SOLO', '09D005', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-03A008', 'EL CARMEN', '03A008', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09C002', 'MACHO SOLO', '09C002', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09G011', 'LAS FLORES', '09G011', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09D009', 'SAN CARLOS', '09D009', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09G015', 'LAS FLORES', '09G015', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-03A004', 'EL CARMEN', '03A004', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09D015', 'SAN CARLOS', '09D015', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-03B004', 'EL CARMEN', '03B004', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09E002', 'MACHO SOLO', '09E002', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09E006', 'SAN CARLOS', '09E006', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09F012', 'LAS FLORES', '09F012', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09B009', 'SAN CARLOS', '09B009', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-06A002', 'SUHAREZ', '06A002', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09F016', 'LAS FLORES', '09F016', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09E012', 'SAN CARLOS', '09E012', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-09A009', 'EL CARMEN', '09A009', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-03C003', 'EL CARMEN', '03C003', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, zone, name, active) VALUES ('UBI-06B002', 'SUHAREZ', '06B002', true) ON CONFLICT (id) DO NOTHING;

-- EQUIPMENT
INSERT INTO public.equipment (id, name, type, active) VALUES ('EQ-001', 'FORD 16', 'TRACTOR', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.equipment (id, name, type, active) VALUES ('EQ-005', 'KUBOTA 11', 'TRACTOR', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.equipment (id, name, type, active) VALUES ('EQ-004', 'KUBOTA 10', 'TRACTOR', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.equipment (id, name, type, active) VALUES ('EQ-008', 'NEW HOLLAND', 'TRACTOR', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.equipment (id, name, type, active) VALUES ('EQ-002', 'FORD 21', 'TRACTOR', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.equipment (id, name, type, active) VALUES ('EQ-006', 'KUBOTA 12', 'TRACTOR', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.equipment (id, name, type, active) VALUES ('EQ-007', 'JHON DEERE', 'TRACTOR', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.equipment (id, name, type, active) VALUES ('EQ-003', 'FORD 23', 'TRACTOR', true) ON CONFLICT (id) DO NOTHING;

-- PERFORMANCE REFERENCES
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-DADE6BD0', 'ACT-DADE6BD0', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-5C09B21F', 'ACT-5C09B21F', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-FEC3798F', 'ACT-FEC3798F', NULL, 'Jornal', 1, false, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-5F62850D', 'ACT-5F62850D', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-FB14258F', 'ACT-FB14258F', NULL, 'Palma', 900, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-6DFD7450', 'ACT-6DFD7450', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-A2674512', 'ACT-A2674512', NULL, 'Jornal', 1, false, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-4725DF8D', 'ACT-4725DF8D', NULL, 'Ha', 2.3, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-76DD9BBE', 'ACT-76DD9BBE', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-9A1A5142', 'ACT-9A1A5142', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-CC00D52C', 'ACT-CC00D52C', NULL, 'Jornal', 1, false, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-C2F35884', 'ACT-C2F35884', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-01677C90', 'ACT-01677C90', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-DE216C1D', 'ACT-DE216C1D', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-F0A1FCCD', 'ACT-F0A1FCCD', NULL, 'Jornal', 1, false, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-0184CC97', 'ACT-0184CC97', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-56BA13CC', 'ACT-56BA13CC', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-4A4E60F6', 'ACT-4A4E60F6', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-DA96A3E3', 'ACT-DA96A3E3', NULL, 'Ton', 2.6, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-2630E90A', 'ACT-2630E90A', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-419F7771', 'ACT-419F7771', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-D653A7FE', 'ACT-D653A7FE', NULL, 'Palma', 900, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-83E3C664', 'ACT-83E3C664', NULL, 'Ha', 2.3, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-30D142C9', 'ACT-30D142C9', NULL, 'Ton', 2.6, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-2BFDC9D0', 'ACT-2BFDC9D0', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-94DAC2C8', 'ACT-94DAC2C8', NULL, 'Ha', 2.3, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-E6530635', 'ACT-E6530635', NULL, 'Jornal', 1, false, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-D85CE519', 'ACT-D85CE519', NULL, 'Palma', 900, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-2E4218B9', 'ACT-2E4218B9', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-EAEB441A', 'ACT-EAEB441A', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-2742425D', 'ACT-2742425D', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-75E6147B', 'ACT-75E6147B', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-D9A2D465', 'ACT-D9A2D465', NULL, 'Jornal', 1, false, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-AF31B0E0', 'ACT-AF31B0E0', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-FE84046A', 'ACT-FE84046A', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-C36BD3DD', 'ACT-C36BD3DD', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-65DA397E', 'ACT-65DA397E', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-F16E018D', 'ACT-F16E018D', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-1008A83B', 'ACT-1008A83B', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-87E9727A', 'ACT-87E9727A', NULL, 'Palma', 900, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-333DF694', 'ACT-333DF694', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-9F7C362B', 'ACT-9F7C362B', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-027C7EE0', 'ACT-027C7EE0', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-5DBB6DD0', 'ACT-5DBB6DD0', NULL, 'Palma', 900, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-E163BC6F', 'ACT-E163BC6F', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-E554AE28', 'ACT-E554AE28', NULL, 'Palma', 900, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-ACF53310', 'ACT-ACF53310', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-F4A13077', 'ACT-F4A13077', NULL, 'Ton', 2.6, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-EB7C1D05', 'ACT-EB7C1D05', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-A9A712C7', 'ACT-A9A712C7', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-3AA28CD0', 'ACT-3AA28CD0', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-16755577', 'ACT-16755577', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-D7A5419E', 'ACT-D7A5419E', NULL, 'Palma', 900, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-AB08BD0A', 'ACT-AB08BD0A', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-7560540E', 'ACT-7560540E', NULL, 'Jornal', 1, false, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-94522B4C', 'ACT-94522B4C', NULL, 'Ton', 2.6, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-9D937315', 'ACT-9D937315', NULL, 'Palma', 900, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-07A1C01C', 'ACT-07A1C01C', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-27821D15', 'ACT-27821D15', NULL, 'Ha', 2.3, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-7C974231', 'ACT-7C974231', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-DB8F3197', 'ACT-DB8F3197', NULL, 'Ton', 2.6, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-B3B7C25F', 'ACT-B3B7C25F', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-A08D9AD1', 'ACT-A08D9AD1', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-3D72AF53', 'ACT-3D72AF53', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-030922DD', 'ACT-030922DD', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-B81E882D', 'ACT-B81E882D', NULL, 'Ton', 2.6, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-4C92BADD', 'ACT-4C92BADD', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-B7CF35BD', 'ACT-B7CF35BD', NULL, 'Palma', 900, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-C9566D8D', 'ACT-C9566D8D', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-DED7E7DA', 'ACT-DED7E7DA', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-BC13E4B9', 'ACT-BC13E4B9', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-B2A22CE6', 'ACT-B2A22CE6', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-EB835B69', 'ACT-EB835B69', NULL, 'Jornal', 1, false, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-63C8E4DE', 'ACT-63C8E4DE', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-DF1C72A4', 'ACT-DF1C72A4', NULL, 'Ton', 2.6, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-6F9BB9E8', 'ACT-6F9BB9E8', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-97B49EA0', 'ACT-97B49EA0', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-14C0A0AE', 'ACT-14C0A0AE', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-83B36489', 'ACT-83B36489', NULL, 'Ha', 2.3, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-20B72F71', 'ACT-20B72F71', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-4B500B2B', 'ACT-4B500B2B', NULL, 'Palma', 900, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-15200E06', 'ACT-15200E06', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-ED8FC78F', 'ACT-ED8FC78F', NULL, 'Ton', 2.6, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-632C5335', 'ACT-632C5335', NULL, 'Palma', 900, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-4C66A50F', 'ACT-4C66A50F', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-FA4061B2', 'ACT-FA4061B2', NULL, 'Ton', 2.6, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-47619B02', 'ACT-47619B02', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-BC765ABB', 'ACT-BC765ABB', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-EB33682A', 'ACT-EB33682A', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-36524AF4', 'ACT-36524AF4', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-36DE5410', 'ACT-36DE5410', NULL, 'Jornal', 1, false, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-B220E13A', 'ACT-B220E13A', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-A0A74F56', 'ACT-A0A74F56', NULL, 'Ton', 2.6, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-AF682812', 'ACT-AF682812', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-2AA4A9E2', 'ACT-2AA4A9E2', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-97793D73', 'ACT-97793D73', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-581639C9', 'ACT-581639C9', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-78AEEC3F', 'ACT-78AEEC3F', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-81AD6AC3', 'ACT-81AD6AC3', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-E8594CED', 'ACT-E8594CED', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-3E7E06E0', 'ACT-3E7E06E0', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-034854F7', 'ACT-034854F7', NULL, 'Ton', 2.6, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-F06DED16', 'ACT-F06DED16', NULL, 'Pal', 80, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-E1E274E6', 'ACT-E1E274E6', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-7D5C9288', 'ACT-7D5C9288', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-2E62EFB4', 'ACT-2E62EFB4', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-BC6826BE', 'ACT-BC6826BE', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-A89225EC', 'ACT-A89225EC', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-20597C02', 'ACT-20597C02', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-B13D5784', 'ACT-B13D5784', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-F0E49C77', 'ACT-F0E49C77', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-8E9248AF', 'ACT-8E9248AF', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-174AD942', 'ACT-174AD942', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-61C886E9', 'ACT-61C886E9', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-F6A48077', 'ACT-F6A48077', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-43852618', 'ACT-43852618', NULL, 'Palma', 900, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-4E7821F2', 'ACT-4E7821F2', NULL, 'Palma', 900, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-5F073CDD', 'ACT-5F073CDD', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-4443A064', 'ACT-4443A064', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-75D237B3', 'ACT-75D237B3', NULL, 'Ha', 2.3, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-23D67177', 'ACT-23D67177', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-F88A020D', 'ACT-F88A020D', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-16A6D161', 'ACT-16A6D161', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-F7EFAF0A', 'ACT-F7EFAF0A', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-216D5D4A', 'ACT-216D5D4A', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-5321C59B', 'ACT-5321C59B', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-3EB13F2E', 'ACT-3EB13F2E', NULL, 'Ha', 2.3, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-9073CFF8', 'ACT-9073CFF8', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-4A75E05E', 'ACT-4A75E05E', NULL, 'Jornal', 1, false, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-55EBCE12', 'ACT-55EBCE12', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-102ECADC', 'ACT-102ECADC', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-69672542', 'ACT-69672542', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-55B7EA12', 'ACT-55B7EA12', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-B10931A5', 'ACT-B10931A5', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-5D3FD187', 'ACT-5D3FD187', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-46ADAE81', 'ACT-46ADAE81', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-510DDD25', 'ACT-510DDD25', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-C7A6701E', 'ACT-C7A6701E', NULL, 'Ha', 2.3, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-FA300B9E', 'ACT-FA300B9E', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.performance_references (id, activity_id, measurement_type, unit, performance_per_person_day, active, source) VALUES ('ACT-89B2DF0C', 'ACT-89B2DF0C', NULL, 'Jornal', 1, true, 'EXCEL_2026') ON CONFLICT (id) DO NOTHING;

-- NOVELTIES
INSERT INTO public.personnel_novelties (id, tipo, persona_documento, persona_nombre_fuente, fecha_inicio, fecha_fin, zona, estado) VALUES ('NOV-2026-003', NULL, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel_novelties (id, tipo, persona_documento, persona_nombre_fuente, fecha_inicio, fecha_fin, zona, estado) VALUES ('NOV-2026-002', NULL, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel_novelties (id, tipo, persona_documento, persona_nombre_fuente, fecha_inicio, fecha_fin, zona, estado) VALUES ('NOV-2026-004', NULL, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.personnel_novelties (id, tipo, persona_documento, persona_nombre_fuente, fecha_inicio, fecha_fin, zona, estado) VALUES ('NOV-2026-001', NULL, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT (id) DO NOTHING;
