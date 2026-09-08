import { Flame } from 'lucide-react';
import { useTeamStreak } from '../useTeamStreak';

export function TeamStreakIndicator() {
  const date = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  const { progress, protectedDays, protectedToday } = useTeamStreak(date);
  const achieved = progress.achieved || protectedToday;
  const label = achieved
    ? `Racha protegida: ${protectedDays.length} días. La meta global de hoy está cumplida.`
    : `Racha congelada: ${protectedDays.length} días. Falta programación global para proteger hoy.`;

  return (
    <div
      title={label}
      aria-label={label}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-sm font-extrabold ${achieved ? 'border-orange-200 bg-orange-50 text-orange-600' : 'border-slate-300 bg-slate-100 text-slate-500'}`}
    >
      <Flame
        size={18}
        fill="currentColor"
        aria-hidden="true"
        className={achieved ? 'text-orange-500' : 'text-slate-400'}
        style={achieved ? { animation: 'streak-flame 1.4s ease-in-out infinite' } : { filter: 'grayscale(1)' }}
      />
      <span>{protectedDays.length}</span>
      <span className="sr-only">{label}</span>
    </div>
  );
}
