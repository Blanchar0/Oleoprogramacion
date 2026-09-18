-- Inventario de palma F-GA: actualización masiva de Catálogos > Ubicaciones.
-- Fuente: Inventario de Palma (2).xlsx, hoja F-GA, 88 lotes.
-- Ejecutar una vez en el SQL Editor del proyecto Supabase de Oleoflores.

BEGIN;

ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS palmas_totales NUMERIC;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS palmas_sin_manejo NUMERIC;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS estado_palma TEXT;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS ha_brutas NUMERIC;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS edad NUMERIC;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS ha_edad_siembra NUMERIC;

CREATE TEMP TABLE inventory_locations_stage (
  ano_siembra NUMERIC,
  zone TEXT,
  lote_code TEXT PRIMARY KEY,
  palmas_totales NUMERIC,
  palmas_diferenciadas NUMERIC,
  palmas_sin_manejo NUMERIC,
  ha_netas NUMERIC,
  estado_palma TEXT,
  ha_brutas NUMERIC,
  edad NUMERIC,
  ha_edad_siembra NUMERIC
) ON COMMIT DROP;

INSERT INTO inventory_locations_stage
  (ano_siembra, zone, lote_code, palmas_totales, palmas_diferenciadas, palmas_sin_manejo, ha_netas, estado_palma, ha_brutas, edad, ha_edad_siembra)
VALUES
  (1995, 'EL CARMEN', '03A001', 2740, 0, 2740, 19.16083916083916, 'improductiva', 20.433566433566433, 31, 37.6013986013986),
  (1995, 'EL CARMEN', '03A002', 2637, 0, 2637, 18.44055944055944, 'improductiva', 19.335664335664337, 31, NULL),
  (1995, 'EL CARMEN', '03A003', 2466, 0, 2466, 17.244755244755243, 'improductiva', 17.944055944055943, 31, 73.76223776223776),
  (1994, 'EL CARMEN', '03A004', 2566, 0, 2566, 17.944055944055943, 'en civilizacion', 18.81118881118881, 32, NULL),
  (1994, 'EL CARMEN', '03A005', 2809, 0, 2809, 19.643356643356643, 'civilizada y en produccion', 20.762237762237763, 32, NULL),
  (1995, 'EL CARMEN', '03A006', 2707, 0, 2707, 18.93006993006993, 'civilizada y en produccion', 20.04895104895105, 31, NULL),
  (1996, 'EL CARMEN', '03A007', 2741, 0, 2741, 19.167832167832167, 'civilizada y en produccion', 20.58041958041958, 30, 67.62937062937063),
  (1996, 'EL CARMEN', '03A008', 2881, 0, 2881, 20.146853146853147, 'civilizada y en produccion', 21.545454545454547, 30, NULL),
  (1996, 'EL CARMEN', '03A009', 4049, 0, 4049, 28.314685314685313, 'civilizada y en produccion', 30.44055944055944, 30, NULL),
  (1999, 'SUHAREZ', '06A001', 950, 0, 950, 6.643356643356643, 'en erradicacion', 6.944055944055944, 27, 105.97902097902097),
  (1999, 'SUHAREZ', '06A002', 1030, 0, 1030, 7.2027972027972025, 'en erradicacion', 7.4475524475524475, 27, NULL),
  (1999, 'SUHAREZ', '06A003', 1297, 0, 1297, 9.06993006993007, 'en erradicacion', 9.34965034965035, 27, NULL),
  (1999, 'SUHAREZ', '06A004', 1728, 0, 1728, 12.083916083916083, 'en erradicacion', 12.643356643356643, 27, NULL),
  (1999, 'SUHAREZ', '06A005', 1463, 0, 1463, 10.23076923076923, 'en erradicacion', 11.391608391608392, 27, NULL),
  (1999, 'SUHAREZ', '06B001', 2210, 492, 1718, 15.454545454545455, 'en erradicacion', 15.041958041958042, 27, NULL),
  (1999, 'SUHAREZ', '06B002', 1417, 39, 1378, 9.909090909090908, 'en erradicacion', 10.58041958041958, 27, NULL),
  (1999, 'SUHAREZ', '06B003', 2135, 52, 2083, 14.93006993006993, 'en erradicacion', 15.321678321678322, 27, NULL),
  (1999, 'SUHAREZ', '06B005', 1422, 75, 1347, 9.944055944055943, 'en erradicacion', 10.160839160839162, 27, NULL),
  (1999, 'SUHAREZ', '09B004', 1503, 98, 1405, 10.51048951048951, 'Produccion', 11.202797202797203, 27, NULL),
  (2005, 'SAN CARLOS', '09C007', 2732, 0, 2732, 19.104895104895103, 'Produccion', 19.363636363636363, 21, 50.72727272727273),
  (2005, 'SAN CARLOS', '09D007', 2742, 0, 2742, 19.174825174825173, 'Produccion', 19.482517482517483, 21, NULL),
  (2005, 'SAN CARLOS', '09E007', 1780, 0, 1780, 12.447552447552448, 'Produccion', 12.664335664335665, 21, NULL),
  (2007, 'SAN CARLOS', '09B006', 1620, 0, 1620, 11.328671328671328, 'Produccion', 11.538461538461538, 19, 126.86013986013987),
  (2007, 'SAN CARLOS', '09B007', 1949, 0, 1949, 13.62937062937063, 'Produccion', 13.888111888111888, 19, NULL),
  (2007, 'SAN CARLOS', '09B008', 2122, 0, 2122, 14.839160839160838, 'Produccion', 14.86013986013986, 19, NULL),
  (2007, 'SAN CARLOS', '09B009', 2155, 0, 2155, 15.06993006993007, 'Produccion', 15.37062937062937, 19, NULL),
  (2007, 'SAN CARLOS', '09B010', 1990, 0, 1990, 13.916083916083917, 'Produccion', 14.006993006993007, 19, NULL),
  (2007, 'MACHO SOLO', '09D002', 467, 0, 467, 3.265734265734266, 'Produccion', 3.195804195804196, 19, NULL),
  (2007, 'MACHO SOLO', '09D003', 2280, 0, 2280, 15.944055944055943, 'Produccion', 16.27972027972028, 19, NULL),
  (2007, 'MACHO SOLO', '09D004', 2317, 0, 2317, 16.202797202797203, 'Produccion', 16.251748251748253, 19, NULL),
  (2007, 'MACHO SOLO', '09D005', 3241, 0, 3241, 22.664335664335663, 'Produccion', 23.167832167832167, 19, NULL),
  (2011, 'SAN CARLOS', '09C011', 431, 14, 417, 3.013986013986014, 'Produccion', 3.055944055944056, 15, 3.013986013986014),
  (2009, 'MACHO SOLO', '09C001', 893, 0, 893, 6.244755244755245, 'Produccion', 6.20979020979021, 17, 91.12587412587413),
  (2009, 'MACHO SOLO', '09C002', 2947, 0, 2947, 20.60839160839161, 'Produccion', 20.916083916083917, 17, NULL),
  (2009, 'MACHO SOLO', '09C003', 2951, 0, 2951, 20.636363636363637, 'Produccion', 20.90909090909091, 17, NULL),
  (2009, 'MACHO SOLO', '09C004', 3029, 0, 3029, 21.181818181818183, 'Produccion', 20.664335664335663, 17, NULL),
  (2009, 'MACHO SOLO', '09C005', 3211, 0, 3211, 22.454545454545453, 'Produccion', 22.37062937062937, 17, NULL),
  (2010, 'SAN CARLOS', '09C006', 2876, 0, 2876, 20.111888111888113, 'Produccion', 20.41958041958042, 16, 77.45454545454547),
  (2010, 'SAN CARLOS', '09D006', 2380, 0, 2380, 16.643356643356643, 'Produccion', 16.76923076923077, 16, NULL),
  (2010, 'MACHO SOLO', '09E002', 815, 0, 815, 5.699300699300699, 'Produccion', 5.769230769230769, 16, NULL),
  (2011, 'SAN CARLOS', '09D009', 1461, 109, 1352, 10.216783216783217, 'Produccion', 10.6993006993007, 15, NULL),
  (2017, 'SAN CARLOS', '09D013', 2032, 29, 2003, 14.20979020979021, 'Produccion', 14.251748251748252, 9, NULL),
  (2017, 'SAN CARLOS', '09D014', 1266, 55, 1211, 8.853146853146853, 'Produccion', 9.216783216783217, 9, NULL),
  (2017, 'SAN CARLOS', '09D015', 246, 10, 236, 1.7202797202797202, 'Produccion', 1.7622377622377623, 9, NULL),
  (2011, 'SAN CARLOS', '09C008', 2264, 0, 2264, 15.832167832167832, 'Produccion', 16.13986013986014, 15, 125.6993006993007),
  (2011, 'SAN CARLOS', '09C009', 2498, 0, 2498, 17.46853146853147, 'Produccion', 17.83916083916084, 15, NULL),
  (2011, 'SAN CARLOS', '09C010', 1867, 0, 1867, 13.055944055944057, 'Produccion', 13.391608391608392, 15, NULL),
  (2015, 'SAN CARLOS', '09D100', 2131, 37, 2094, 14.902097902097902, 'Produccion', 15.41958041958042, 11, NULL),
  (2011, 'SAN CARLOS', '09D008', 2468, 0, 2468, 17.25874125874126, 'Produccion', 17.895104895104897, 15, NULL),
  (2010, 'MACHO SOLO', '09E003', 3185, 7, 3178, 22.272727272727273, 'Produccion', 22.58041958041958, 16, NULL),
  (2010, 'MACHO SOLO', '09E004', 3562, 53, 3509, 24.90909090909091, 'Produccion', 25.23076923076923, 16, NULL),
  (2010, 'MACHO SOLO', '09E005', 1630, 58, 1572, 11.398601398601398, 'Produccion', 11.573426573426573, 16, 82.77622377622377),
  (2010, 'SAN CARLOS', '09E006', 2426, 11, 2415, 16.965034965034967, 'Produccion', 17.412587412587413, 16, NULL),
  (2008, 'SAN CARLOS', '09E008', 1384, 51, 1333, 9.678321678321678, 'Produccion', 10.195804195804195, 18, NULL),
  (2011, 'SAN CARLOS', '09E009', 466, 87, 379, 3.2587412587412588, 'Produccion', 3.3636363636363638, 15, NULL),
  (2015, 'SAN CARLOS', '09E010', 1927, 363, 1564, 13.475524475524475, 'Produccion', 13.552447552447552, 11, NULL),
  (2015, 'SAN CARLOS', '09E011', 1384, 566, 818, 9.678321678321678, 'Produccion', 9.944055944055943, 11, NULL),
  (2012, 'LAS FLORES', '09F012', 828, 11, 817, 5.79020979020979, 'Produccion', 6, 14, NULL),
  (2012, 'LAS FLORES', '09F140', 795, 0, 795, 5.559440559440559, 'Produccion', 5.79020979020979, 14, NULL),
  (2012, 'LAS FLORES', '09G014', 849, 0, 849, 5.937062937062937, 'Produccion', 6.370629370629371, 14, NULL),
  (2012, 'LAS FLORES', '01F020', 148, 0, 148, 1.034965034965035, 'Produccion', 1.034965034965035, 14, NULL),
  (2013, 'LAS FLORES', '09G010', 3084, 0, 3084, 21.566433566433567, 'Produccion', 22.58041958041958, 13, 60.909090909090914),
  (2013, 'LAS FLORES', '09G011', 881, 0, 881, 6.160839160839161, 'Produccion', 6.174825174825175, 13, NULL),
  (2013, 'LAS FLORES', '09G012', 1215, 0, 1215, 8.496503496503497, 'Produccion', 8.636363636363637, 13, NULL),
  (2013, 'LAS FLORES', '09G013', 2909, 0, 2909, 20.342657342657343, 'Produccion', 20.594405594405593, 13, NULL),
  (2013, 'LAS FLORES', '09G015', 621, 0, 621, 4.3426573426573425, 'Produccion', 4.433566433566433, 13, NULL),
  (2012, 'LAS FLORES', '09F013', 1210, 24, 1186, 8.461538461538462, 'Produccion', 8.944055944055943, 14, 25.25174825174825),
  (2012, 'LAS FLORES', '09F014', 846, 70, 776, 5.916083916083916, 'Produccion', 5.993006993006993, 14, NULL),
  (2012, 'LAS FLORES', '09F015', 1555, 68, 1487, 10.874125874125873, 'Produccion', 11.111888111888112, 14, NULL),
  (2012, 'LAS FLORES', '09F016', 1329, 90, 1239, 9.293706293706293, 'Produccion', 9.461538461538462, 14, 19.587412587412587),
  (2012, 'LAS FLORES', '09F017', 1047, 46, 1001, 7.321678321678322, 'Produccion', 7.741258741258742, 14, NULL),
  (2012, 'LAS FLORES', '09F018', 425, 27, 398, 2.972027972027972, 'Produccion', 3.0489510489510487, 14, NULL),
  (2021, 'SAN CARLOS', '09E012', 2316, 0, 2316, 16.195804195804197, 'Produccion', 16.237762237762237, 5, 30.923076923076923),
  (2021, 'SAN CARLOS', '09E013', 2106, 0, 2106, 14.727272727272727, 'Produccion', 15.972027972027972, 5, NULL),
  (2025, 'EL CARMEN', '03B001', 1088, 0, 1088, 7.608391608391608, 'N/A', 9.972027972027972, 1, 23.06293706293706),
  (2025, 'EL CARMEN', '03B002', 1112, 0, 1112, 7.776223776223776, 'N/A', 9.608391608391608, 1, NULL),
  (2025, 'EL CARMEN', '03B003', 1098, 0, 1098, 7.678321678321678, 'N/A', 9.6993006993007, 1, NULL),
  (2025, 'EL CARMEN', '03B004', 853, 0, 853, 5.965034965034965, 'N/A', 8.538461538461538, 1, 114.9160839160839),
  (2025, 'EL CARMEN', '03B005', 1117, 0, 1117, 7.811188811188811, 'N/A', 8.657342657342657, 1, NULL),
  (2025, 'EL CARMEN', '03B006', 1611, 0, 1611, 11.265734265734265, 'N/A', 12.146853146853147, 1, NULL),
  (2025, 'EL CARMEN', '03C001', 1066, 0, 1066, 7.454545454545454, 'N/A', 7.888111888111888, 1, NULL),
  (2025, 'EL CARMEN', '03C002', 1208, 0, 1208, 8.447552447552448, 'N/A', 9.083916083916083, 1, NULL),
  (2025, 'EL CARMEN', '03C003', 1294, 0, 1294, 9.048951048951048, 'N/A', 9.79020979020979, 1, NULL),
  (2025, 'EL CARMEN', '03C004', 812, 0, 812, 5.678321678321678, 'N/A', 6.454545454545454, 1, NULL),
  (2025, 'EL CARMEN', '03C005', 1398, 0, 1398, 9.776223776223777, 'N/A', 10.188811188811188, 1, NULL),
  (2024, 'EL CARMEN', '09A007', 2099, 0, 2099, 14.678321678321678, 'N/A', 16, 2, NULL),
  (2024, 'EL CARMEN', '09A008', 2188, 0, 2188, 15.3006993006993, 'N/A', 16.818181818181817, 2, NULL),
  (2024, 'EL CARMEN', '09A009', 2787, 0, 2787, 19.48951048951049, 'N/A', 21.20979020979021, 2, NULL);

-- Unifica las variantes existentes de zona antes de actualizar el inventario.
WITH preferred_legacy_lot AS (
  SELECT id
  FROM public.locations
  WHERE regexp_replace(upper(name), '[^A-Z0-9]', '', 'g') IN ('09F020', '10F020')
    AND NOT EXISTS (
      SELECT 1 FROM public.locations
      WHERE regexp_replace(upper(name), '[^A-Z0-9]', '', 'g') = '01F020'
    )
  ORDER BY CASE regexp_replace(upper(name), '[^A-Z0-9]', '', 'g') WHEN '09F020' THEN 0 ELSE 1 END, id
  LIMIT 1
)
UPDATE public.locations AS location
SET name = '01F020', updated_at = NOW()
FROM preferred_legacy_lot
WHERE location.id = preferred_legacy_lot.id;

UPDATE public.locations
SET active = false, updated_at = NOW()
WHERE regexp_replace(upper(name), '[^A-Z0-9]', '', 'g') IN ('09F020', '10F020')
  AND EXISTS (
    SELECT 1 FROM public.locations
    WHERE regexp_replace(upper(name), '[^A-Z0-9]', '', 'g') = '01F020'
  );

UPDATE public.locations
SET zone = CASE regexp_replace(upper(coalesce(zone, '')), '[^A-Z0-9]', '', 'g')
  WHEN 'ELCARMEN' THEN 'EL CARMEN'
  WHEN 'LASFLORES' THEN 'LAS FLORES'
  WHEN 'MACHOSOLO' THEN 'MACHO SOLO'
  WHEN 'SANCARLOS' THEN 'SAN CARLOS'
  WHEN 'SUHAREZ' THEN 'SUHAREZ'
  ELSE zone
END,
updated_at = NOW()
WHERE regexp_replace(upper(coalesce(zone, '')), '[^A-Z0-9]', '', 'g') IN ('ELCARMEN', 'LASFLORES', 'MACHOSOLO', 'SANCARLOS', 'SUHAREZ');

UPDATE public.productivity_records
SET zona_snapshot = CASE regexp_replace(upper(coalesce(zona_snapshot, '')), '[^A-Z0-9]', '', 'g')
  WHEN 'ELCARMEN' THEN 'EL CARMEN'
  WHEN 'LASFLORES' THEN 'LAS FLORES'
  WHEN 'MACHOSOLO' THEN 'MACHO SOLO'
  WHEN 'SANCARLOS' THEN 'SAN CARLOS'
  WHEN 'SUHAREZ' THEN 'SUHAREZ'
  ELSE zona_snapshot
END,
updated_at = NOW()
WHERE regexp_replace(upper(coalesce(zona_snapshot, '')), '[^A-Z0-9]', '', 'g') IN ('ELCARMEN', 'LASFLORES', 'MACHOSOLO', 'SANCARLOS', 'SUHAREZ');

-- Coincide por el código visible del lote; por ello conserva los identificadores internos existentes.
UPDATE public.locations AS location
SET
  name = source.lote_code,
  zone = source.zone,
  ano_siembra = source.ano_siembra,
  ha = source.ha_netas,
  palmas_diferenciadas = source.palmas_diferenciadas,
  palmas_totales = source.palmas_totales,
  palmas_sin_manejo = source.palmas_sin_manejo,
  estado_palma = source.estado_palma,
  ha_brutas = source.ha_brutas,
  edad = source.edad,
  ha_edad_siembra = source.ha_edad_siembra,
  updated_at = NOW()
FROM inventory_locations_stage AS source
WHERE regexp_replace(upper(location.name), '[^A-Z0-9]', '', 'g') = source.lote_code;

-- Agrega únicamente los lotes del inventario que aún no existen en Catálogos.
INSERT INTO public.locations
  (id, name, zone, ano_siembra, ha, palmas_diferenciadas, palmas_totales, palmas_sin_manejo, estado_palma, ha_brutas, edad, ha_edad_siembra, active, created_at, updated_at)
SELECT
  'UBI-' || source.lote_code,
  source.lote_code,
  source.zone,
  source.ano_siembra,
  source.ha_netas,
  source.palmas_diferenciadas,
  source.palmas_totales,
  source.palmas_sin_manejo,
  source.estado_palma,
  source.ha_brutas,
  source.edad,
  source.ha_edad_siembra,
  true,
  NOW(),
  NOW()
FROM inventory_locations_stage AS source
WHERE NOT EXISTS (
  SELECT 1
  FROM public.locations AS location
  WHERE regexp_replace(upper(location.name), '[^A-Z0-9]', '', 'g') = source.lote_code
)
ON CONFLICT (id) DO NOTHING;

-- Corrección histórica confirmada: imports con 09F020 o 10F020 pertenecen al lote 01F020.
DELETE FROM public.productivity_records AS wrong
USING public.productivity_records AS correct
WHERE wrong.lote_code IN ('09F020', '10F020')
  AND correct.lote_code = '01F020'
  AND wrong.period = correct.period;

DELETE FROM public.productivity_records AS duplicate
USING public.productivity_records AS retained
WHERE duplicate.lote_code IN ('09F020', '10F020')
  AND retained.lote_code IN ('09F020', '10F020')
  AND duplicate.period = retained.period
  AND duplicate.id > retained.id;

UPDATE public.productivity_records
SET lote_code = '01F020',
    id = 'productivity:' || to_char(period, 'YYYY-MM') || ':01F020',
    updated_at = NOW()
WHERE lote_code IN ('09F020', '10F020');

DO $$
BEGIN
  IF to_regclass('public.productivity_projections') IS NOT NULL THEN
    DELETE FROM public.productivity_projections AS wrong
    USING public.productivity_projections AS correct
    WHERE wrong.scope = 'LOTE'
      AND wrong.scope_value IN ('09F020', '10F020')
      AND correct.scope = 'LOTE'
      AND correct.scope_value = '01F020'
      AND wrong.period = correct.period;

    DELETE FROM public.productivity_projections AS duplicate
    USING public.productivity_projections AS retained
    WHERE duplicate.scope = 'LOTE'
      AND duplicate.scope_value IN ('09F020', '10F020')
      AND retained.scope = 'LOTE'
      AND retained.scope_value IN ('09F020', '10F020')
      AND duplicate.period = retained.period
      AND duplicate.id > retained.id;

    UPDATE public.productivity_projections
    SET scope_value = '01F020',
        id = 'productivity-projection:' || to_char(period, 'YYYY-MM') || ':LOTE:01F020',
        updated_at = NOW()
    WHERE scope = 'LOTE' AND scope_value IN ('09F020', '10F020');
  END IF;
END $$;

COMMIT;
