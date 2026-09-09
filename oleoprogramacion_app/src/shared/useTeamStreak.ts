import { useEffect, useMemo, useRef, useState } from 'react';
import type { ProgrammingReport, ProgrammingStreakDay } from '../types';
import { repository } from './AgronomicRepository';
import { useCatalogs } from './useCatalogs';
import { calculateTeamProgress, getActiveSupervisors } from './teamStreak';

const EMPTY_HISTORY = { protectedDays: [] as ProgrammingStreakDay[], reports: [] as ProgrammingReport[] };

function colombiaDateFromTimestamp(value: string) {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return '';
  return timestamp.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
}

function earliestTimestamp(first: string, candidate: string) {
  const firstTime = new Date(first).getTime();
  const candidateTime = new Date(candidate).getTime();
  if (Number.isNaN(firstTime)) return candidate;
  if (Number.isNaN(candidateTime)) return first;
  return candidateTime < firstTime ? candidate : first;
}

export function useTeamStreak(date: string) {
  const currentColombiaDate = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  const isCurrentOperationalDay = date === currentColombiaDate;
  const { catalogs, loading: catalogsLoading } = useCatalogs();
  const [programmings, setProgrammings] = useState<any[]>([]);
  const [absences, setAbsences] = useState<any[]>([]);
  const [machineries, setMachineries] = useState<any[]>([]);
  const [history, setHistory] = useState(EMPTY_HISTORY);
  const [persistenceError, setPersistenceError] = useState('');
  const lastProtectKey = useRef('');

  useEffect(() => {
    const unsubscribeProgramming = repository.subscribeProgramming({ date }, setProgrammings);
    const unsubscribeAbsences = repository.subscribeAbsences({ date }, setAbsences);
    const unsubscribeMachinery = repository.subscribeMachinery({ date }, setMachineries);
    return () => {
      unsubscribeProgramming();
      unsubscribeAbsences();
      unsubscribeMachinery();
    };
  }, [date]);

  useEffect(() => repository.subscribeTeamStreak(setHistory), []);

  const progress = useMemo(
    () => calculateTeamProgress({ date, catalogs, programmings, absences, machineries }),
    [date, catalogs, programmings, absences, machineries],
  );
  const supervisors = useMemo(() => getActiveSupervisors(catalogs), [catalogs]);
  // Nunca se cuentan días futuros ni filas imposibles creadas antes de su
  // propia fecha. Estas últimas provenían de la versión anterior y no son una
  // meta realmente cumplida.
  const protectedDays = useMemo(
    () => (history.protectedDays || []).filter(day => (
      day.date <= currentColombiaDate
      && colombiaDateFromTimestamp(day.completedAt) >= day.date
    )),
    [history.protectedDays, currentColombiaDate],
  );
  const reports = history.reports || [];
  const protectedDateSet = useMemo(() => new Set(protectedDays.map(day => day.date)), [protectedDays]);
  const reportsForDate = useMemo(() => reports.filter(report => report.date === date), [reports, date]);
  const protectedToday = protectedDateSet.has(date);
  const contributingReports = useMemo(() => {
    const firstReportBySupervisor = new Map<string, string>();
    programmings
      .filter(programming => programming.status === 'CONFIRMADA')
      .forEach(programming => {
        const supervisorId = programming.idSupervisor || programming.supervisorId || programming.id_supervisor || programming.supervisor_id;
        if (!supervisorId) return;
        const id = String(supervisorId);
        const reportedAt = programming.updatedAt || programming.updated_at || programming.createdAt || programming.created_at || new Date().toISOString();
        const current = firstReportBySupervisor.get(id);
        firstReportBySupervisor.set(id, current ? earliestTimestamp(current, reportedAt) : reportedAt);
      });
    return [...firstReportBySupervisor.entries()].map(([supervisorId, reportedAt]) => ({ supervisorId, reportedAt }));
  }, [programmings]);

  useEffect(() => {
    // La fecha elegida puede servir para consultar programación futura, pero
    // nunca para proteger una racha: esta se gana exclusivamente hoy.
    if (!isCurrentOperationalDay || catalogsLoading || !progress.achieved || protectedToday) return;
    const protectKey = `${date}:${progress.availableCount}:${progress.programmedCount}`;
    if (lastProtectKey.current === protectKey) return;

    lastProtectKey.current = protectKey;
    repository.protectTeamDay({
      date,
      totalPersonnel: progress.availableCount,
      programmedPersonnel: progress.programmedCount,
      }).then(result => {
        if (!result.ok) {
          lastProtectKey.current = '';
          console.warn('No fue posible proteger la racha:', result.error);
          setPersistenceError(result.error || 'No fue posible guardar la racha en Supabase.');
          return;
        }
        // La fila ya fue confirmada en Supabase. Esto evita depender
        // exclusivamente de la notificación Realtime para actualizar el contador.
        setPersistenceError('');
        setHistory(current => ({
          ...current,
          protectedDays: [{
            date,
            totalPersonnel: progress.availableCount,
            programmedPersonnel: progress.programmedCount,
            completedAt: new Date().toISOString(),
          }, ...current.protectedDays.filter(day => day.date !== date)],
        }));
      });
  }, [catalogsLoading, date, isCurrentOperationalDay, progress.achieved, progress.availableCount, progress.programmedCount, protectedToday]);

  useEffect(() => {
    // El reporte individual se registra al confirmar programación HOY. El
    // ranking solo lo contará si posteriormente el día queda protegido.
    if (!isCurrentOperationalDay || contributingReports.length === 0) return;
    const reportedIds = new Set(reportsForDate.map(report => String(report.supervisorId)));
    const missingReports = contributingReports.filter(report => !reportedIds.has(report.supervisorId));
    if (missingReports.length === 0) return;

    repository.recordAutomaticTeamReports({ date, reports: missingReports })
      .then(result => {
        if (!result.ok) {
          console.warn('No fue posible acreditar la racha automáticamente:', result.error);
          setPersistenceError(result.error || 'No fue posible acreditar la racha de los supervisores.');
          return;
        }
        setPersistenceError('');
        setHistory(current => ({
          ...current,
          reports: [
            ...current.reports,
            ...missingReports
              .filter(item => !current.reports.some(report => report.date === date && String(report.supervisorId) === item.supervisorId))
              .map(item => ({ date, supervisorId: item.supervisorId, reportedAt: item.reportedAt })),
          ],
        }));
      });
  }, [date, isCurrentOperationalDay, contributingReports, reportsForDate]);

  const reportedSupervisorIds = new Set(reportsForDate.map(report => String(report.supervisorId)));
  const activeReportsForDate = reportsForDate.filter(report => supervisors.some(supervisor => supervisor.id === String(report.supervisorId)));
  const pendingSupervisors = supervisors.filter(supervisor => !reportedSupervisorIds.has(supervisor.id));
  const scoreBySupervisor = new Map<string, { score: number; firstReportedAt?: string }>();
  reports
    .filter(report => protectedDateSet.has(report.date))
    .forEach(report => {
      const supervisorId = String(report.supervisorId);
      const current = scoreBySupervisor.get(supervisorId) || { score: 0 };
      scoreBySupervisor.set(supervisorId, {
        score: current.score + 1,
        firstReportedAt: current.firstReportedAt
          ? earliestTimestamp(current.firstReportedAt, report.reportedAt)
          : report.reportedAt,
      });
    });
  const ranking = supervisors
    .map(supervisor => {
      const score = scoreBySupervisor.get(supervisor.id);
      return score && score.score > 0
        ? { id: supervisor.id, name: supervisor.name, score: score.score, firstReportedAt: score.firstReportedAt }
        : null;
    })
    .filter((supervisor): supervisor is { id: string; name: string; score: number; firstReportedAt?: string } => supervisor !== null)
    .sort((a, b) => {
      const scoreDifference = b.score - a.score;
      if (scoreDifference !== 0) return scoreDifference;
      const aTime = a.firstReportedAt ? new Date(a.firstReportedAt).getTime() : Number.POSITIVE_INFINITY;
      const bTime = b.firstReportedAt ? new Date(b.firstReportedAt).getTime() : Number.POSITIVE_INFINITY;
      if (aTime !== bTime) return aTime - bTime;
      return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
    });

  return {
    catalogsLoading,
    progress,
    protectedDays,
    protectedToday,
    isCurrentOperationalDay,
    supervisors,
    reportsForDate,
    activeReportsForDate,
    pendingSupervisors,
    ranking,
    persistenceError,
  };
}
