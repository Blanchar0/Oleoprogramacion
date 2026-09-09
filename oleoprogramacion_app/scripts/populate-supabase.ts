import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const SUPABASE_URL = 'https://giwlnwbcfudnlkagzpxb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_y5iIfWQCeJDmLnLEJsb-_g_0kxDWHOo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function populateData() {
  const exportData = JSON.parse(fs.readFileSync('firestore-export.json', 'utf8'));

  console.log('Iniciando carga de datos a Supabase...');

  // 1. Users
  const usersWithPins = [
    { id: 'USR-73ACD9A5', username: 'admin', username_key: 'admin', name: 'Administrador Agronomía', role: 'ADMIN', id_supervisor: null, supervisor_id: null, phone: null, phone_key: null, pin: '0910', active: true },
    { id: 'USR-09EBDA48', username: 'lcruz', username_key: 'lcruz', name: 'Directivo Agronomía', role: 'DIRECTIVO', id_supervisor: null, supervisor_id: null, phone: null, phone_key: null, pin: '0000', active: true },
    { id: 'USR-PCHAVEZ0', username: 'pchavez', username_key: 'pchavez', name: 'Paola Chavez', role: 'DIRECTIVO', id_supervisor: null, supervisor_id: null, phone: null, phone_key: null, pin: '0000', active: true },
    { id: 'USR-JCARLOS0', username: 'jcarlos', username_key: 'jcarlos', name: 'Ingeniero Juan Carlos', role: 'DIRECTIVO', id_supervisor: null, supervisor_id: null, phone: null, phone_key: null, pin: '0000', active: true },
    { id: 'USR-REVISOR-01', username: 'revisor', username_key: 'revisor', name: 'Revisor de Programación', role: 'REVISOR', id_supervisor: null, supervisor_id: null, phone: null, phone_key: null, pin: '0000', active: true },
    { id: 'USR-9DEC0023', username: '573207587860', username_key: '573207587860', name: 'Cuenta heredada pendiente de identificación', role: 'SUPERVISOR', id_supervisor: 'SUP001', supervisor_id: 'SUP001', phone: '573207587860', phone_key: '573207587860', pin: '1234', active: false },
    { id: 'USR-02F2E9D9', username: 'josep', username_key: 'josep', name: 'José Pahuana', role: 'SUPERVISOR', id_supervisor: 'SUP002', supervisor_id: 'SUP002', phone: '573175364429', phone_key: '573175364429', pin: '1234', active: true },
    { id: 'USR-12F86B0E', username: 'alvarom', username_key: 'alvarom', name: 'Alvaro Manjarrez', role: 'SUPERVISOR', id_supervisor: 'SUP003', supervisor_id: 'SUP003', phone: '573168479957', phone_key: '573168479957', pin: '1234', active: true },
    { id: 'USR-9AD2EAC3', username: 'giovannya', username_key: 'giovannya', name: 'Giovanny Anaya', role: 'SUPERVISOR', id_supervisor: 'SUP004', supervisor_id: 'SUP004', phone: '573167680373', phone_key: '573167680373', pin: '1234', active: true },
    { id: 'USR-C262C7D5', username: 'manuelb', username_key: 'manuelb', name: 'Manuel Blanco', role: 'SUPERVISOR', id_supervisor: 'SUP005', supervisor_id: 'SUP005', phone: '573128840721', phone_key: '573128840721', pin: '1234', active: true },
    { id: 'USR-F9655361', username: 'luisb', username_key: 'luisb', name: 'Luis Barraza', role: 'SUPERVISOR', id_supervisor: 'SUP006', supervisor_id: 'SUP006', phone: '573126116644', phone_key: '573126116644', pin: '1234', active: true },
    { id: 'USR-010BBE48', username: 'juanb', username_key: 'juanb', name: 'Juan Bohorquez', role: 'SUPERVISOR', id_supervisor: 'SUP007', supervisor_id: 'SUP007', phone: '573217037675', phone_key: '573217037675', pin: '1234', active: true },
  ];
  await supabase.from('users').upsert(usersWithPins);
  console.log('✅ Users cargados');

  // 2. Supervisors
  const supervisors = (exportData.supervisors || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    phone: s.phone,
    active: s.active ?? true,
  }));
  if (supervisors.length) await supabase.from('supervisors').upsert(supervisors);
  console.log('✅ Supervisors cargados');

  // 3. Personnel
  const personnel = (exportData.personnel || []).map((p: any) => ({
    id: p.id,
    documento: p.documento,
    name: p.name || p.nombreCompleto,
    type: p.type || p.tipoPersonal || 'DIRECTO',
    job_title: p.jobTitle || p.laborCargo,
    cuadrilla: p.cuadrilla || p.actividadCuadrilla,
    observaciones: p.observaciones,
    tipo_personal: p.tipoPersonal,
    estado: p.estado,
    actividad_cuadrilla: p.actividadCuadrilla,
    zona: p.zona,
    labor_cargo: p.laborCargo,
    contratacion: p.contratacion,
    orden_fuente: p.ordenFuente,
    nombre_completo: p.nombreCompleto,
    active: p.active ?? true,
  }));
  if (personnel.length) await supabase.from('personnel').upsert(personnel);
  console.log(`✅ Personnel cargados (${personnel.length} registros)`);

  // 4. Labors
  const labors = (exportData.labors || []).map((l: any) => ({
    id: l.id,
    name: l.name,
    active: l.active ?? true,
  }));
  if (labors.length) await supabase.from('labors').upsert(labors);
  console.log(`✅ Labors cargados (${labors.length} registros)`);

  // 5. Activities
  const activities = (exportData.activities || []).map((a: any) => ({
    id: a.id,
    labor_id: a.laborId,
    name: a.name,
    unit: a.unit,
    active: a.active ?? true,
  }));
  if (activities.length) await supabase.from('activities').upsert(activities);
  console.log(`✅ Activities cargadas (${activities.length} registros)`);

  // 6. Locations
  const locations = (exportData.locations || []).map((loc: any) => ({
    id: loc.id,
    zone: loc.zone,
    name: loc.name,
    active: loc.active ?? true,
  }));
  if (locations.length) await supabase.from('locations').upsert(locations);
  console.log(`✅ Locations cargadas (${locations.length} registros)`);

  // 7. Equipment
  const equipment = (exportData.equipment || []).map((eq: any) => ({
    id: eq.id,
    name: eq.name,
    type: eq.type,
    active: eq.active ?? true,
  }));
  if (equipment.length) await supabase.from('equipment').upsert(equipment);
  console.log(`✅ Equipment cargados (${equipment.length} registros)`);

  // 8. Performance references
  const perf = (exportData.performanceReferences || []).map((pr: any) => ({
    id: pr.id,
    activity_id: pr.activityId,
    measurement_type: pr.measurementType,
    unit: pr.unit,
    performance_per_person_day: pr.performancePerPersonDay,
    active: pr.active ?? true,
    source: pr.source,
  }));
  if (perf.length) await supabase.from('performance_references').upsert(perf);
  console.log(`✅ Performance references cargados (${perf.length} registros)`);

  // 9. Novelties
  const novelties = (exportData.personnelNovelties || []).map((n: any) => ({
    id: n.id,
    tipo: n.tipo,
    persona_documento: n.personaDocumento,
    persona_nombre_fuente: n.personaNombreFuente,
    fecha_inicio: n.fechaInicio,
    fecha_fin: n.fechaFin,
    zona: n.zona,
    estado: n.estado,
  }));
  if (novelties.length) await supabase.from('personnel_novelties').upsert(novelties);
  console.log(`✅ Novelties cargadas (${novelties.length} registros)`);

  console.log('🚀 Migración a Supabase completada con éxito!');
}

populateData().catch(console.error);
