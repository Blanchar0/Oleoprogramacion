import { isOperative } from '../dashboard/Dashboard';

const normalizeString = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export interface ExtractedData {
  dateText: string;
  laborText: string;
  activityText: string;
  zoneText: string;
  lotText: string;
  personnelTexts: string[];
  observations: string;
  transcript: string;
}

export interface ResolvedField<T> {
  originalText: string | null;
  status: 'RECONOCIDO' | 'AMBIGUO' | 'INVALIDO' | 'PENDIENTE';
  value: T | null;
  canonicalId: string | null;
  candidates: { id: string; label: string }[];
  message: string | null;
}

export function resolveVoiceData(
  extraction: ExtractedData, 
  catalogs: any,
  programmings: any[],
  machineries: any[]
) {
  const { labors = [], activities = [], locations = [], personnel = [], personnelNovelties = [] } = catalogs;
  const operativePersonnel = personnel.filter((p: any) => isOperative(p));
  const zones = Array.from(new Set(locations.map((l: any) => l.zone)));

  const dateText = extraction.dateText || new Date().toISOString().split('T')[0];

  const resolveLabor = (): ResolvedField<string> => {
    if (!extraction.laborText) return { originalText: null, status: 'PENDIENTE', value: null, canonicalId: null, candidates: [], message: 'No se mencionó labor' };
    const norm = normalizeString(extraction.laborText);
    const matches = labors.filter((l:any) => normalizeString(l.name).includes(norm) || norm.includes(normalizeString(l.name)));
    if (matches.length === 1) return { originalText: extraction.laborText, status: 'RECONOCIDO', value: matches[0].name, canonicalId: matches[0].id, candidates: [], message: null };
    if (matches.length > 1) return { originalText: extraction.laborText, status: 'AMBIGUO', value: null, canonicalId: null, candidates: matches.map((m:any) => ({ id: m.id, label: m.name })), message: 'Múltiples labores coinciden' };
    return { originalText: extraction.laborText, status: 'INVALIDO', value: null, canonicalId: null, candidates: [], message: 'Labor no encontrada' };
  };
  const resolvedLabor = resolveLabor();

  const resolveActivity = (): ResolvedField<string> => {
    if (!extraction.activityText) return { originalText: null, status: 'PENDIENTE', value: null, canonicalId: null, candidates: [], message: 'No se mencionó actividad' };
    const norm = normalizeString(extraction.activityText);
    let possibleActivities = activities;
    if (resolvedLabor.canonicalId) {
      possibleActivities = activities.filter((a:any) => a.laborId === resolvedLabor.canonicalId);
    }
    const matches = possibleActivities.filter((a:any) => normalizeString(a.name).includes(norm) || norm.includes(normalizeString(a.name)));
    if (matches.length === 1) return { originalText: extraction.activityText, status: 'RECONOCIDO', value: matches[0].name, canonicalId: matches[0].id, candidates: [], message: null };
    if (matches.length > 1) return { originalText: extraction.activityText, status: 'AMBIGUO', value: null, canonicalId: null, candidates: matches.map((m:any) => ({ id: m.id, label: m.name })), message: 'Múltiples actividades coinciden' };
    return { originalText: extraction.activityText, status: 'INVALIDO', value: null, canonicalId: null, candidates: [], message: 'Actividad no encontrada' };
  };
  const resolvedActivity = resolveActivity();

  const resolveZone = (): ResolvedField<string> => {
    if (!extraction.zoneText) return { originalText: null, status: 'PENDIENTE', value: null, canonicalId: null, candidates: [], message: 'No se mencionó zona' };
    const norm = normalizeString(extraction.zoneText);
    const matches = zones.filter(z => normalizeString(z as string).includes(norm) || norm.includes(normalizeString(z as string)));
    if (matches.length === 1) return { originalText: extraction.zoneText, status: 'RECONOCIDO', value: matches[0] as string, canonicalId: matches[0] as string, candidates: [], message: null };
    if (matches.length > 1) return { originalText: extraction.zoneText, status: 'AMBIGUO', value: null, canonicalId: null, candidates: matches.map(m => ({ id: m as string, label: m as string })), message: 'Múltiples zonas coinciden' };
    return { originalText: extraction.zoneText, status: 'INVALIDO', value: null, canonicalId: null, candidates: [], message: 'Zona no encontrada' };
  };
  let resolvedZone = resolveZone();

  const resolveLot = (): ResolvedField<string> => {
    if (!extraction.lotText) return { originalText: null, status: 'PENDIENTE', value: null, canonicalId: null, candidates: [], message: 'No se mencionó lote' };
    const norm = normalizeString(extraction.lotText).replace(/\s/g, '');
    const possibleLotes = resolvedZone.canonicalId ? locations.filter((l:any) => l.zone === resolvedZone.canonicalId) : locations;
    const matches = possibleLotes.filter((l:any) => normalizeString(l.name).replace(/\s/g, '').includes(norm));
    if (matches.length === 1) {
      if (!resolvedZone.canonicalId) {
        resolvedZone = { originalText: matches[0].zone, status: 'RECONOCIDO', value: matches[0].zone, canonicalId: matches[0].zone, candidates: [], message: 'Inferida por lote' };
      }
      return { originalText: extraction.lotText, status: 'RECONOCIDO', value: matches[0].name, canonicalId: matches[0].id, candidates: [], message: null };
    }
    if (matches.length > 1) return { originalText: extraction.lotText, status: 'AMBIGUO', value: null, canonicalId: null, candidates: matches.map((m:any) => ({ id: m.id, label: m.name })), message: 'Múltiples lotes coinciden' };
    return { originalText: extraction.lotText, status: 'INVALIDO', value: null, canonicalId: null, candidates: [], message: 'Lote no encontrado' };
  };
  const resolvedLot = resolveLot();

  const checkAvailability = (pId: string, doc: string, name: string): string | null => {
    const activeNovedad = personnelNovelties.find((n:any) => 
      n.personaDocumento === doc && n.fechaInicio <= dateText && n.fechaFin >= dateText
    );
    if (activeNovedad) return `"${name}" tiene ${activeNovedad.tipo} hasta ${activeNovedad.fechaFin}`;

    const isProgrammed = programmings.some(prog => prog.date === dateText && prog.status === 'CONFIRMADA' && (prog.personnelIds || []).includes(pId));
    if (isProgrammed) return `"${name}" ya está programado para el ${dateText}`;

    const isMachinery = machineries.some(m => m.date === dateText && m.operatorId === pId && m.status !== 'CANCELADA');
    if (isMachinery) return `"${name}" está asignado a maquinaria el ${dateText}`;

    return null;
  }

  const resolvePersonnel = (): ResolvedField<string[]> => {
    if (!extraction.personnelTexts || extraction.personnelTexts.length === 0) {
      return { originalText: null, status: 'PENDIENTE', value: [], canonicalId: null, candidates: [], message: 'No se mencionaron personas' };
    }
    const recognizedIds: string[] = [];
    let hasAmbiguous = false;
    let hasInvalid = false;
    let hasUnavailable = false;
    let messages: string[] = [];
    const uniqueNames = Array.from(new Set(extraction.personnelTexts.map(n => n.trim())));
    for (const name of uniqueNames) {
      const norm = normalizeString(name);
      const exactMatches = operativePersonnel.filter((p:any) => normalizeString(p.name) === norm);
      if (exactMatches.length === 1) {
        const unavailabilityMsg = checkAvailability(exactMatches[0].id, exactMatches[0].documento, name);
        if (unavailabilityMsg) {
          hasUnavailable = true;
          messages.push(unavailabilityMsg);
        } else {
          recognizedIds.push(exactMatches[0].id);
        }
        continue;
      }
      const partialMatches = operativePersonnel.filter((p:any) => normalizeString(p.name).includes(norm));
      if (partialMatches.length === 1) {
        const unavailabilityMsg = checkAvailability(partialMatches[0].id, partialMatches[0].documento, name);
        if (unavailabilityMsg) {
          hasUnavailable = true;
          messages.push(unavailabilityMsg);
        } else {
          recognizedIds.push(partialMatches[0].id);
        }
      } else if (partialMatches.length > 1) {
        hasAmbiguous = true;
        messages.push(`"${name}" es ambiguo`);
      } else {
        hasInvalid = true;
        messages.push(`"${name}" no encontrado`);
      }
    }
    if (hasInvalid) {
      return { originalText: uniqueNames.join(', '), status: 'INVALIDO', value: recognizedIds, canonicalId: null, candidates: [], message: messages.join('; ') };
    }
    if (hasAmbiguous) { 
      return { originalText: uniqueNames.join(', '), status: 'AMBIGUO', value: recognizedIds, canonicalId: null, candidates: [], message: messages.join('; ') };
    }
    if (hasUnavailable) { 
      return { originalText: uniqueNames.join(', '), status: 'PENDIENTE', value: recognizedIds, canonicalId: null, candidates: [], message: messages.join('; ') };
    }
    return { originalText: uniqueNames.join(', '), status: 'RECONOCIDO', value: recognizedIds, canonicalId: null, candidates: [], message: null };
  };
  const resolvedPersonnel = resolvePersonnel();

  return {
    date: { originalText: extraction.dateText, status: 'RECONOCIDO', value: dateText, canonicalId: dateText, candidates: [], message: null },
    labor: resolvedLabor,
    activity: resolvedActivity,
    zone: resolvedZone,
    lot: resolvedLot,
    personnel: resolvedPersonnel,
    observations: { originalText: extraction.observations, status: 'RECONOCIDO', value: extraction.observations, canonicalId: null, candidates: [], message: null },
    transcript: extraction.transcript
  };
}
