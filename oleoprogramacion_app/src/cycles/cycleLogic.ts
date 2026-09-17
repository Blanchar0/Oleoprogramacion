import type { CycleExecution, CycleLaborRule, CycleScheduleGranularity, CycleStatus } from '../types';

export const DEFAULT_CYCLE_RULES: CycleLaborRule[] = [
  { id: 'COSECHA', name: 'Cosecha', scheduleGranularity: 'DIA', normalDays: 8, alertDays: 14, restartDays: 12, active: true, sortOrder: 1 },
  { id: 'PODA_SANITARIA', name: 'Poda sanitaria', scheduleGranularity: 'SEMANA', normalDays: 171, alertDays: 179, restartDays: 180, active: true, sortOrder: 2 },
  { id: 'PLATEO', name: 'Plateo', scheduleGranularity: 'SEMANA', normalDays: 24, alertDays: 29, restartDays: 30, active: true, sortOrder: 3 },
  { id: 'CONTROL_MALEZA', name: 'Control de Maleza', scheduleGranularity: 'SEMANA', normalDays: 24, alertDays: 29, restartDays: 30, active: true, sortOrder: 4 },
];

export type CycleCard = {
  key: string;
  loteCode: string;
  zone: string;
  labor: CycleLaborRule;
  lastExecution: CycleExecution | null;
  daysElapsed: number | null;
  state: CycleStatus;
  personnelCount: number | null;
};

export function normalizeLotCode(value: unknown) {
  return String(value ?? '').trim().toUpperCase().replace(/\s+/g, '');
}

export function normalizeCycleLabor(value: unknown): string | null {
  const source = String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
  if (source === 'COSECHA') return 'COSECHA';
  if (source === 'PLATEO') return 'PLATEO';
  if (source === 'PODA' || source === 'PODA SANITARIA') return 'PODA_SANITARIA';
  if (source === 'CONTROL DE MALEZA' || source === 'CONTROL MALEZA') return 'CONTROL_MALEZA';
  return null;
}

export function toIsoDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function fromIsoDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1, 12);
}

export function differenceInDays(from: string, to: Date) {
  const start = fromIsoDate(from).getTime();
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 12).getTime();
  return Math.max(0, Math.floor((end - start) / 86_400_000));
}

export function getCycleState(daysElapsed: number | null, rule: CycleLaborRule): CycleStatus {
  if (daysElapsed === null) return 'SIN_DATOS';
  if (daysElapsed <= rule.normalDays) return 'AL_DIA';
  if (daysElapsed <= rule.alertDays) return 'ALERTA';
  return 'CRITICO';
}

export function buildCycleCards(
  executions: CycleExecution[],
  locations: Array<{ name?: string; zone?: string; active?: boolean }>,
  rules: CycleLaborRule[],
  asOf: Date,
) {
  const activeRules = (rules.length ? rules : DEFAULT_CYCLE_RULES).filter((rule) => rule.active);
  const locationsByCode = new Map(
    locations
      .filter((location) => location.active !== false && location.name)
      .map((location) => [normalizeLotCode(location.name), location]),
  );
  const lotCodes = new Set([...locationsByCode.keys(), ...executions.map((execution) => normalizeLotCode(execution.loteCode))]);
  const latest = new Map<string, CycleExecution>();

  executions.forEach((execution) => {
    const key = `${normalizeLotCode(execution.loteCode)}:${execution.laborCode}`;
    const current = latest.get(key);
    if (!current || execution.executionDate > current.executionDate) latest.set(key, execution);
  });

  return Array.from(lotCodes)
    .flatMap((loteCode) => activeRules.map((labor) => {
      const lastExecution = latest.get(`${loteCode}:${labor.id}`) || null;
      const daysElapsed = lastExecution ? differenceInDays(lastExecution.executionDate, asOf) : null;
      return {
        key: `${loteCode}:${labor.id}`,
        loteCode,
        zone: locationsByCode.get(loteCode)?.zone || 'Sin zona',
        labor,
        lastExecution,
        daysElapsed,
        state: getCycleState(daysElapsed, labor),
        personnelCount: lastExecution?.personnelCount ?? null,
      } satisfies CycleCard;
    }))
    .sort((a, b) => a.zone.localeCompare(b.zone, 'es') || a.loteCode.localeCompare(b.loteCode, 'es') || a.labor.sortOrder - b.labor.sortOrder);
}

export function cycleAgeValue(daysElapsed: number | null, granularity: CycleScheduleGranularity) {
  if (daysElapsed === null) return null;
  return granularity === 'DIA' ? daysElapsed : Math.ceil(daysElapsed / 7);
}

export function cycleStateLabel(state: CycleStatus) {
  return ({ AL_DIA: 'Al día', ALERTA: 'Alerta', CRITICO: 'Crítico', SIN_DATOS: 'Sin datos' } as const)[state];
}
