import { isOperative, isReubicado } from './personnelClassification';
import { matchPerson } from './AgronomicRepository';

export type TeamSupervisor = {
  id: string;
  name: string;
};

const normalized = (value: unknown) => String(value || '').trim().toUpperCase();

export function getActiveSupervisors(catalogs: any): TeamSupervisor[] {
  const byId = new Map<string, TeamSupervisor>();

  (catalogs.supervisors || []).forEach((supervisor: any) => {
    if (supervisor.active !== false && supervisor.id) {
      byId.set(String(supervisor.id), { id: String(supervisor.id), name: supervisor.name || String(supervisor.id) });
    }
  });

  // Algunos despliegues históricos solo tienen el vínculo en users. Se usa como
  // respaldo sin crear ni asignar supervisores nuevos a trabajadores.
  (catalogs.users || []).forEach((user: any) => {
    const supervisorId = user.idSupervisor || user.id_supervisor || user.supervisorId || user.supervisor_id;
    if (user.role === 'SUPERVISOR' && user.active !== false && supervisorId && !byId.has(String(supervisorId))) {
      byId.set(String(supervisorId), { id: String(supervisorId), name: user.name || String(supervisorId) });
    }
  });

  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
}

function noveltyIsCurrent(novelty: any, date: string) {
  const start = novelty.fechaInicio || novelty.fecha_inicio;
  const end = novelty.fechaFin || novelty.fecha_fin;
  const estado = normalized(novelty.estado);
  if (estado === 'CANCELADA' || estado === 'ANULADA' || estado === 'INACTIVA') return false;
  if (!start || start > date) return false;
  return !end || normalized(end) === 'N/A' || end >= date;
}

function recordMatchesPerson(person: any, record: any) {
  return [
    record.personnelId,
    record.personnel_id,
    record.personnelDoc,
    record.personnel_doc,
    record.personaDocumento,
    record.persona_documento,
    record.personnelName,
    record.personnel_name,
    record.personaNombreFuente,
    record.persona_nombre_fuente,
    record.operatorId,
    record.operator_id,
    record.operatorName,
    record.operator_name,
  ].some(value => value && matchPerson(person, value));
}

function isPersonnelActive(person: any) {
  if (person.active === false) return false;
  const estado = normalized(person.estado);
  return estado !== 'INACTIVO' && estado !== 'RETIRADO';
}

function isProgrammablePersonnel(person: any) {
  return isPersonnelActive(person) && (isOperative(person) || isReubicado(person));
}

export function calculateTeamProgress({
  date,
  catalogs,
  programmings,
  absences,
  machineries = [],
}: {
  date: string;
  catalogs: any;
  programmings: any[];
  absences: any[];
  machineries?: any[];
}) {
  const activeAbsences = (absences || []).filter(absence => absence.status !== 'CANCELADA');
  const currentNovelties = (catalogs.personnelNovelties || []).filter((novelty: any) => noveltyIsCurrent(novelty, date));
  const assignedMachinery = (machineries || []).filter(machine => machine.status !== 'CANCELADA');

  const availablePersonnel = (catalogs.personnel || []).filter((person: any) => {
    if (!isProgrammablePersonnel(person)) return false;
    if (activeAbsences.some(absence => recordMatchesPerson(person, absence))) return false;
    if (currentNovelties.some((novelty: any) => recordMatchesPerson(person, novelty))) return false;
    // Quien ya está en maquinaria no bloquea el 100% de programación de campo.
    if (assignedMachinery.some(machine => recordMatchesPerson(person, machine))) return false;
    return true;
  });

  const programmedIds = new Set<string>();
  (programmings || [])
    .filter(programming => programming.status === 'CONFIRMADA')
    .forEach(programming => {
      (programming.personnelIds || programming.personnel_ids || []).forEach((rawPersonId: unknown) => {
        const person = availablePersonnel.find((candidate: any) => matchPerson(candidate, rawPersonId));
        if (person?.id) programmedIds.add(String(person.id));
      });
    });

  const availableCount = availablePersonnel.length;
  const programmedCount = programmedIds.size;
  const achieved = availableCount > 0 && programmedCount === availableCount;

  return {
    availableCount,
    programmedCount,
    percentage: availableCount ? Math.round((programmedCount / availableCount) * 100) : 0,
    achieved,
  };
}
