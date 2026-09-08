import { useEffect, useMemo, useRef, useState } from 'react';
import type { ProgrammingReport, ProgrammingStreakDay } from '../types';
import { repository } from './AgronomicRepository';
import { useCatalogs } from './useCatalogs';
import { calculateTeamProgress, getActiveSupervisors } from './teamStreak';

const EMPTY_HISTORY = { protectedDays: [] as ProgrammingStreakDay[], reports: [] as ProgrammingReport[] };
const protectingDates = new Set<string>();

export function useTeamStreak(date: string) {
  const { catalogs, loading: catalogsLoading } = useCatalogs();
  const [programmings, setProgrammings] = useState<any[]>([]);
  const [absences, setAbsences] = useState<any[]>([]);
  const [machineries, setMachineries] = useState<any[]>([]);
  const [history, setHistory] = useState(EMPTY_HISTORY);
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

  useEffect(() => {
    if (catalogsLoading || !progress.achieved || protectedToday) return;
    const protectKey = `${date}:${progress.availableCount}:${progress.programmedCount}`;
    if (lastProtectKey.current === protectKey || protectingDates.has(date)) return;

    lastProtectKey.current = protectKey;
    protectingDates.add(date);
    repository.protectTeamDay({
      date,
      totalPersonnel: progress.availableCount,
      programmedPersonnel: progress.programmedCount,
    }).then(result => {
      if (!result.ok) {
        lastProtectKey.current = '';
        console.warn('No fue posible proteger la racha:', result.error);
      }
    }).finally(() => {
      protectingDates.delete(date);
    });
  }, [catalogsLoading, date, progress.achieved, progress.availableCount, progress.programmedCount, protectedToday]);

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
    supervisors,
    reportsForDate,
    activeReportsForDate,
    pendingSupervisors,
    ranking,
    report: async (supervisorId: string) => {
      if (progress.achieved && !protectedToday) {
        const protectedResult = await repository.protectTeamDay({
          date,
          totalPersonnel: progress.availableCount,
          programmedPersonnel: progress.programmedCount,
        });
        if (!protectedResult.ok) return protectedResult;
      }
      return repository.reportTeamProgramming({ date, supervisorId });
    },
  };
}
