import { Flame, Snowflake, TriangleAlert } from 'lucide-react';
import { useTeamStreak } from '../useTeamStreak';

export function TeamStreakIndicator() {
  const date = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  const { progress, protectedDays, protectedToday } = useTeamStreak(date);
  const achieved = progress.achieved || protectedToday;
  const label = achieved
    ? `Racha protegida: ${protectedDays.length} días. La meta global de hoy está cumplida.`
    : `Racha congelada: ${protectedDays.length} días. Falta programación global para proteger hoy; requiere atención.`;

  return (
    <div
      title={label}
      aria-label={label}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-sm font-extrabold ${achieved ? 'border-orange-200 bg-orange-50 text-orange-600' : 'border-blue-300 bg-sky-50 text-blue-700'}`}
    >
      {achieved ? (
        <Flame size={18} fill="currentColor" aria-hidden="true" className="text-orange-500" style={{ animation: 'streak-flame 1.4s ease-in-out infinite' }} />
      ) : (
        <span className="relative flex h-5 w-5 items-center justify-center" aria-hidden="true">
          <Flame size={18} fill="currentColor" className="text-sky-500" />
          <Snowflake size={10} className="absolute -bottom-1 -left-1 text-blue-700" />
          <TriangleAlert size={10} className="absolute -right-1 -top-1 rounded-full bg-amber-100 text-amber-700" />
        </span>
      )}
      <span>{protectedDays.length}</span>
      <span className="sr-only">{label}</span>
    </div>
  );
}
