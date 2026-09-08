import { useState } from 'react';
import { CheckCircle2, Flame, Snowflake, Trophy, UsersRound } from 'lucide-react';
import { Button } from '@/src/components/ui';
import { useAuth } from '../../auth/AuthContext';
import { useTeamStreak } from '../useTeamStreak';

export function TeamStreakCard({ date }: { date: string }) {
  const { user } = useAuth();
  const [reportError, setReportError] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const {
    catalogsLoading,
    progress,
    protectedDays,
    protectedToday,
    supervisors,
    reportsForDate,
    activeReportsForDate,
    pendingSupervisors,
    ranking,
    report,
  } = useTeamStreak(date);

  const isAchieved = progress.achieved || protectedToday;
  const supervisorId = user?.idSupervisor || user?.supervisorId;
  const isSupervisor = user?.role === 'SUPERVISOR' && Boolean(supervisorId);
  const hasReported = Boolean(supervisorId && reportsForDate.some(item => String(item.supervisorId) === String(supervisorId)));
  const canReport = isSupervisor && isAchieved && !hasReported;

  const handleReport = async () => {
    if (!supervisorId || !isAchieved) return;
    setIsReporting(true);
    setReportError('');
    const result = await report(String(supervisorId));
    setIsReporting(false);
    if (!result.ok) setReportError(result.error || 'No fue posible registrar el reporte. Inténtalo de nuevo.');
  };

  const helpText = isAchieved
    ? 'Todo el personal disponible está confirmado. Quien no reporte no bloquea la racha; solo deja de sumar este día en el ranking.'
    : 'La racha no se reinicia: queda congelada hasta el próximo 100%. Completen la programación confirmada del personal disponible.';

  return (
    <section
      aria-label="Racha del equipo"
      className="overflow-hidden rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100 shadow-[0_10px_30px_rgba(245,158,11,0.16)]"
    >
      <div className="p-5 md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 shadow-sm ${isAchieved ? 'border-orange-300 bg-orange-100' : 'border-slate-300 bg-slate-100'}`}>
              {isAchieved ? (
                <Flame aria-hidden="true" className="h-9 w-9 text-orange-500" fill="currentColor" style={{ animation: 'streak-flame 1.4s ease-in-out infinite' }} />
              ) : (
                <Snowflake aria-hidden="true" className="h-8 w-8 text-slate-500" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h2 className="text-xl font-extrabold tracking-tight text-amber-950">Racha del equipo</h2>
                <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${isAchieved ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  {isAchieved ? '¡Racha protegida!' : 'Racha congelada'}
                </span>
              </div>
              <p className="mt-1 text-sm font-medium text-amber-900/80">{helpText}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-300 bg-white/80 px-5 py-3 text-center shadow-sm">
            <div className="flex items-center justify-center gap-1 text-amber-700">
              <Flame size={18} fill="currentColor" aria-hidden="true" />
              <span className="text-3xl font-black leading-none">{protectedDays.length}</span>
            </div>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-amber-900">días protegidos</p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-amber-200 bg-white/75 p-4">
          <div className="mb-2 flex items-end justify-between gap-3">
            <span className="text-sm font-bold text-amber-950">Progreso global</span>
            <span className="text-lg font-black text-amber-800">{catalogsLoading ? '…' : `${progress.percentage}%`}</span>
          </div>
          <div className="h-4 overflow-hidden rounded-full bg-amber-100 ring-1 ring-amber-200" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percentage} aria-label="Programación global del personal disponible">
            <div className={`h-full rounded-full transition-[width] duration-500 ${isAchieved ? 'bg-gradient-to-r from-orange-400 to-amber-400' : 'bg-slate-400'}`} style={{ width: `${progress.percentage}%` }} />
          </div>
          <p className="mt-2 text-sm font-semibold text-amber-950">
            {progress.availableCount === 0
              ? 'No hay personas disponibles para programar.'
              : `${progress.programmedCount} de ${progress.availableCount} personas disponibles programadas`}
          </p>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="rounded-xl border border-amber-200 bg-white/65 p-3.5">
            <div className="flex items-center gap-2 text-sm font-bold text-amber-950">
              <UsersRound size={17} aria-hidden="true" />
              <span>Reportaron {activeReportsForDate.length} de {supervisors.length} supervisores</span>
            </div>
            {pendingSupervisors.length > 0 ? (
              <div className="mt-2">
                <p className="text-sm font-bold text-amber-900">Pendientes de reportar</p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {pendingSupervisors.map(supervisor => (
                    <li key={supervisor.id} className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-950">
                      {supervisor.name}
                    </li>
                  ))}
                </ul>
              </div>
            ) : supervisors.length > 0 ? (
              <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-emerald-800"><CheckCircle2 size={16} /> Todos los supervisores reportaron.</p>
            ) : (
              <p className="mt-2 text-sm text-amber-900">No hay supervisores activos configurados.</p>
            )}
          </div>

          {isSupervisor && (
            <div className="flex flex-col items-stretch gap-1.5">
              <Button
                type="button"
                onClick={handleReport}
                disabled={!canReport || isReporting}
                className="h-11 bg-orange-500 px-5 text-sm font-extrabold text-white hover:bg-orange-600"
                title={!isAchieved ? 'Disponible cuando la programación global llegue al 100%.' : undefined}
              >
                {hasReported ? <><CheckCircle2 size={17} /> Reporte registrado</> : isReporting ? 'Registrando…' : 'Reporté mi programación'}
              </Button>
              {!isAchieved && <p className="max-w-56 text-center text-[11px] font-medium text-amber-900">Se habilita al alcanzar el 100% global.</p>}
              {reportError && <p role="alert" className="max-w-56 text-center text-xs font-medium text-red-700">{reportError}</p>}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-amber-200 bg-white/70 p-5 md:px-6">
        <div className="mb-3 flex items-center gap-2 text-amber-950">
          <Trophy size={20} className="text-amber-500" aria-hidden="true" />
          <h3 className="font-extrabold">Ranking amistoso</h3>
          <span className="text-xs font-medium text-amber-900/75">por días protegidos reportados</span>
        </div>
        {ranking.length === 0 ? (
          <p className="text-sm text-amber-900">Aún no hay supervisores para mostrar.</p>
        ) : (
          <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {ranking.map((supervisor, index) => (
              <li key={supervisor.id} className="flex items-center gap-3 rounded-xl border border-amber-100 bg-white px-3 py-2.5 shadow-sm">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-black text-amber-900">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-800">{supervisor.name}</span>
                <span className="flex items-center gap-1 rounded-full bg-orange-50 px-2 py-1 text-sm font-black text-orange-600"><Flame size={14} fill="currentColor" aria-hidden="true" />{supervisor.score}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
