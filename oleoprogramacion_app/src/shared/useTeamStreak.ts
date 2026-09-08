import { useEffect, useMemo, useRef, useState } from 'react';
import type { ProgrammingReport, ProgrammingStreakDay } from '../types';
import { repository } from './AgronomicRepository';
import { useCatalogs } from './useCatalogs';
import { calculateTeamProgress, getActiveSupervisors } from './teamStreak';

const EMPTY_HISTORY = { protectedDays: [] as ProgrammingStreakDay[], reports: [] as ProgrammingReport[] };

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
  const protectedDays = history.protectedDays || [];
  const reports = history.reports || [];
  const protectedDateSet = useMemo(() => new Set(protectedDays.map(day => day.date)), [protectedDays]);
  const reportsForDate = useMemo(() => reports.filter(report => report.date === date), [reports, date]);
  const protectedToday = protectedDateSet.has(date);
  const contributingSupervisorIds = useMemo(() => [...new Set(
    programmings
      .filter(programming => programming.status === 'CONFIRMADA')
      .map(programming => programming.idSupervisor || programming.supervisorId || programming.id_supervisor || programming.supervisor_id)
      .filter(Boolean)
      .map(String),
  )], [programmings]);

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
        setHistory(current => current.protectedDays.some(day => day.date === date)
          ? current
          : {
              ...current,
              protectedDays: [{
                date,
                totalPersonnel: progress.availableCount,
                programmedPersonnel: progress.programmedCount,
                completedAt: new Date().toISOString(),
              }, ...current.protectedDays],
            });
      });
  }, [catalogsLoading, date, isCurrentOperationalDay, progress.achieved, progress.availableCount, progress.programmedCount, protectedToday]);

  useEffect(() => {
    // El reporte individual se registra al confirmar programación HOY. El
    // ranking solo lo contará si posteriormente el día queda protegido.
    if (!isCurrentOperationalDay || contributingSupervisorIds.length === 0) return;
    const reportedIds = new Set(reportsForDate.map(report => String(report.supervisorId)));
    const missingSupervisorIds = contributingSupervisorIds.filter(id => !reportedIds.has(id));
    if (missingSupervisorIds.length === 0) return;

    repository.recordAutomaticTeamReports({ date, supervisorIds: missingSupervisorIds })
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
            ...missingSupervisorIds
              .filter(id => !current.reports.some(report => report.date === date && String(report.supervisorId) === id))
              .map(supervisorId => ({ date, supervisorId, reportedAt: new Date().toISOString() })),
          ],
        }));
      });
  }, [date, isCurrentOperationalDay, contributingSupervisorIds, reportsForDate]);

  const reportedSupervisorIds = new Set(reportsForDate.map(report => String(report.supervisorId)));
  const activeReportsForDate = reportsForDate.filter(report => supervisors.some(supervisor => supervisor.id === String(report.supervisorId)));
  const pendingSupervisors = supervisors.filter(supervisor => !reportedSupervisorIds.has(supervisor.id));
  const nameForSupervisor = (id: string) => supervisors.find(supervisor => supervisor.id === id)?.name || id;
  const scoreBySupervisor = new Map<string, number>();
  reports
    .filter(report => protectedDateSet.has(report.date))
    .forEach(report => scoreBySupervisor.set(String(report.supervisorId), (scoreBySupervisor.get(String(report.supervisorId)) || 0) + 1));
  const ranking = supervisors
    .map(supervisor => ({ id: supervisor.id, name: supervisor.name, score: scoreBySupervisor.get(supervisor.id) || 0 }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));

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
