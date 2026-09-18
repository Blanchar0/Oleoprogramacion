export function calculateDuration(startTime?: string, endTime?: string): string | null {
  if (!startTime || !endTime) return null;

  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);
  if ([startHours, startMinutes, endHours, endMinutes].some(Number.isNaN)) return null;

  const minutes = Math.max(0, (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes));
  if (minutes === 0) return '0 min';
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}
