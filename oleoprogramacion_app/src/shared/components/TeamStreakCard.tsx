import { CheckCircle2, Flame, Snowflake, TriangleAlert, Trophy, UsersRound } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useTeamStreak } from '../useTeamStreak';

function Ranking({ ranking, limit }: { ranking: Array<{ id: string; name: string; score: number }>; limit?: number }) {
  const rows = limit ? ranking.slice(0, limit) : ranking;
  if (rows.length === 0) return <p className="text-sm text-amber-900">Aún no hay supervisores para mostrar.</p>;

  return (
    <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((supervisor, index) => (
        <li key={supervisor.id} className="flex items-center gap-3 rounded-xl border border-amber-100 bg-white px-3 py-2.5 shadow-sm">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-black text-amber-900">{index + 1}</span>
          <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-800">{supervisor.name}</span>
          <span className="flex items-center gap-1 rounded-full bg-orange-50 px-2 py-1 text-sm font-black text-orange-600"><Flame size={14} fill="currentColor" aria-hidden="true" />{supervisor.score}</span>
        </li>
      ))}
    </ol>
  );
}

function StreakStatusIcon({ achieved, compact = false }: { achieved: boolean; compact?: boolean }) {
  const iconSize = compact ? 25 : 36;
  if (achieved) return <Flame size={iconSize} fill="currentColor" aria-hidden="true" className="text-orange-500" style={{ animation: 'streak-flame 1.4s ease-in-out infinite' }} />;

  return (
    <div className={`relative flex items-center justify-center ${compact ? 'h-8 w-8' : 'h-11 w-11'}`} aria-hidden="true">
      <Flame size={iconSize} fill="currentColor" className="text-sky-500" />
      <Snowflake size={compact ? 14 : 19} className="absolute -bottom-1 -left-1 text-blue-700 drop-shadow-sm" />
      <TriangleAlert size={compact ? 13 : 16} className="absolute -right-2 -top-2 rounded-full bg-amber-100 text-amber-700" />
    </div>
  );
}

export function TeamStreakCard({ date }: { date: string }) {
  const { user } = useAuth();
  const {
    catalogsLoading,
    progress,
    protectedDays,
    protectedToday,
    supervisors,
    activeReportsForDate,
    pendingSupervisors,
    ranking,
    persistenceError,
  } = useTeamStreak(date);

  const isSupervisor = user?.role === 'SUPERVISOR';
  const isAchieved = progress.achieved || protectedToday;

  // Los supervisores ven únicamente el resumen útil para iniciar su jornada.
  if (isSupervisor) {
    return (
      <section aria-label="Resumen de racha del equipo" className="rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${isAchieved ? 'bg-orange-100 text-orange-500' : 'bg-slate-100 text-slate-500'}`}>
              <StreakStatusIcon achieved={isAchieved} compact />
            </div>
            <div>
              <h2 className="font-extrabold text-amber-950">Racha del equipo</h2>
              <p className="text-xs font-medium text-amber-900/80">{isAchieved ? 'Meta global protegida' : 'Racha congelada'}</p>
            </div>
          </div>
          <div className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-right">
            <p className="flex items-center justify-end gap-1 text-lg font-black text-amber-700"><Flame size={16} fill="currentColor" /> {protectedDays.length}</p>
            <p className="text-[10px] font-bold uppercase tracking-wide text-amber-900">días de racha</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex justify-between text-xs font-bold text-amber-950">
            <span>Progreso global</span>
            <span>{catalogsLoading ? '…' : `${progress.percentage}%`}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-amber-100" role="progressbar" aria-label="Programación global del personal disponible" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percentage}>
            <div className={`h-full rounded-full transition-[width] duration-500 ${isAchieved ? 'bg-gradient-to-r from-orange-400 to-amber-400' : 'bg-slate-400'}`} style={{ width: `${progress.percentage}%` }} />
          </div>
          <p className="mt-1.5 text-xs font-semibold text-amber-950">{progress.programmedCount} de {progress.availableCount} personas disponibles programadas</p>
        </div>

        {persistenceError && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">No se pudo sincronizar la racha: {persistenceError}</p>}

        <div className="mt-4 border-t border-amber-200 pt-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-extrabold text-amber-950"><Trophy size={17} className="text-amber-500" /> Top 3 de la racha</div>
          <Ranking ranking={ranking} limit={3} />
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Racha del equipo" className="overflow-hidden rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100 shadow-[0_10px_30px_rgba(245,158,11,0.16)]">
      <div className="p-5 md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 shadow-sm ${isAchieved ? 'border-orange-300 bg-orange-100' : 'border-slate-300 bg-slate-100'}`}>
              <StreakStatusIcon achieved={isAchieved} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h2 className="text-xl font-extrabold tracking-tight text-amber-950">Racha del equipo</h2>
                <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${isAchieved ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-700'}`}>{isAchieved ? '¡Racha protegida!' : 'Racha congelada'}</span>
              </div>
              <p className="mt-1 text-sm font-medium text-amber-900/80">{isAchieved ? 'El 100% global está confirmado. La racha y los puntajes se acreditaron automáticamente.' : 'La racha no se reinicia: queda congelada hasta el próximo 100%.'}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-amber-300 bg-white/80 px-5 py-3 text-center shadow-sm">
            <div className="flex items-center justify-center gap-1 text-amber-700"><Flame size={18} fill="currentColor" /><span className="text-3xl font-black leading-none">{protectedDays.length}</span></div>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-amber-900">días protegidos</p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-amber-200 bg-white/75 p-4">
          <div className="mb-2 flex items-end justify-between gap-3"><span className="text-sm font-bold text-amber-950">Progreso global</span><span className="text-lg font-black text-amber-800">{catalogsLoading ? '…' : `${progress.percentage}%`}</span></div>
          <div className="h-4 overflow-hidden rounded-full bg-amber-100 ring-1 ring-amber-200" role="progressbar" aria-label="Programación global del personal disponible" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percentage}><div className={`h-full rounded-full transition-[width] duration-500 ${isAchieved ? 'bg-gradient-to-r from-orange-400 to-amber-400' : 'bg-slate-400'}`} style={{ width: `${progress.percentage}%` }} /></div>
          <p className="mt-2 text-sm font-semibold text-amber-950">{progress.availableCount === 0 ? 'No hay personas disponibles para programar.' : `${progress.programmedCount} de ${progress.availableCount} personas disponibles programadas`}</p>
        </div>

        <div className="mt-4 rounded-xl border border-amber-200 bg-white/65 p-3.5">
          <div className="flex items-center gap-2 text-sm font-bold text-amber-950"><UsersRound size={17} /><span>Activación individual hoy: {activeReportsForDate.length} de {supervisors.length} supervisores</span></div>
          {pendingSupervisors.length > 0 && <p className="mt-2 text-sm text-amber-900"><span className="font-bold">Sin programación confirmada: </span>{pendingSupervisors.map(supervisor => supervisor.name).join(', ')}</p>}
          {isAchieved && pendingSupervisors.length === 0 && <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-emerald-800"><CheckCircle2 size={16} /> Todos acreditaron racha hoy.</p>}
        </div>
        {persistenceError && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">No se pudo sincronizar la racha: {persistenceError}</p>}
      </div>

      <div className="border-t border-amber-200 bg-white/70 p-5 md:px-6">
        <div className="mb-3 flex items-center gap-2 text-amber-950"><Trophy size={20} className="text-amber-500" /><h3 className="font-extrabold">Ranking amistoso</h3><span className="text-xs font-medium text-amber-900/75">por días protegidos; empates por primer reporte</span></div>
        <Ranking ranking={ranking} />
      </div>
    </section>
  );
}
