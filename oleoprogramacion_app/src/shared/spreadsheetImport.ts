import * as XLSX from 'xlsx';
import type { ProductivityRecord } from '../types';
import { normalizeCycleLabor, normalizeLotCode } from '../cycles/cycleLogic';

type Row = Record<string, unknown>;

function normalizeHeader(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

function valueFrom(row: Row, aliases: string[]) {
  const entries = Object.entries(row);
  for (const alias of aliases) {
    const found = entries.find(([key]) => normalizeHeader(key) === alias);
    if (found) return found[1];
  }
  return undefined;
}

function numeric(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const raw = String(value).trim();
  const parsed = Number(raw.includes(',') && raw.includes('.')
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function isoDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
  }
  const raw = String(value ?? '').trim();
  const yyyyMmDd = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (yyyyMmDd) return `${yyyyMmDd[1]}-${yyyyMmDd[2].padStart(2, '0')}-${yyyyMmDd[3].padStart(2, '0')}`;
  const ddMmYyyy = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (ddMmYyyy) return `${ddMmYyyy[3]}-${ddMmYyyy[2].padStart(2, '0')}-${ddMmYyyy[1].padStart(2, '0')}`;
  return null;
}

async function readRows(file: File, preferredSheet?: string) {
  if (file.name.toLowerCase().endsWith('.csv')) {
    const content = await file.text();
    const workbook = XLSX.read(content, { type: 'string', raw: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json<Row>(sheet, { defval: null, raw: true });
  }
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, raw: true });
  const match = workbook.SheetNames.find((name) => normalizeHeader(name) === normalizeHeader(preferredSheet || ''));
  const sheet = workbook.Sheets[match || workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Row>(sheet, { defval: null, raw: true });
}

export async function parseCycleFile(file: File) {
  const sourceRows = await readRows(file, 'Ciclos');
  const rows: Array<{ executionDate: string; loteCode: string; laborCode: string; personnelCount: number }> = [];
  const errors: string[] = [];
  const keys = new Set<string>();

  sourceRows.forEach((source, index) => {
    const rowNumber = index + 2;
    const executionDate = isoDate(valueFrom(source, ['FECHA']));
    const loteCode = normalizeLotCode(valueFrom(source, ['UBICACION TECNICA', 'LOTE']));
    const laborCode = normalizeCycleLabor(valueFrom(source, ['LABOR']));
    const personnelCount = numeric(valueFrom(source, ['RECUENTO DE PERSONAS', 'NUMERO DE PERSONAS', 'NÚMERO DE PERSONAS', 'PERSONAS']));
    if (!executionDate || !loteCode || !laborCode || personnelCount === null || personnelCount < 0) {
      errors.push(`Fila ${rowNumber}: faltan Fecha, Lote, Labor válida o Recuento de personas.`);
      return;
    }
    const key = `${executionDate}:${loteCode}:${laborCode}`;
    if (keys.has(key)) {
      errors.push(`Fila ${rowNumber}: duplicado para ${loteCode}, ${laborCode} y ${executionDate}.`);
      return;
    }
    keys.add(key);
    rows.push({ executionDate, loteCode, laborCode, personnelCount });
  });

  return { rows, errors, sourceRows: sourceRows.length };
}

export async function parseProductivityFile(file: File) {
  const sourceRows = await readRows(file);
  const rows: Array<Omit<ProductivityRecord, 'id' | 'source' | 'importId' | 'createdAt' | 'updatedAt'>> = [];
  const errors: string[] = [];
  const keys = new Set<string>();

  sourceRows.forEach((source, index) => {
    const rowNumber = index + 2;
    const rawPeriod = valueFrom(source, ['PERIODO', 'MES', 'FECHA']);
    const date = isoDate(rawPeriod);
    const period = date ? date.slice(0, 7) : String(rawPeriod ?? '').match(/^\d{4}-\d{2}$/)?.[0] || null;
    const loteCode = normalizeLotCode(valueFrom(source, ['LOTE', 'UBICACION TECNICA']));
    const tons = numeric(valueFrom(source, ['TONELADAS', 'TON', 'TON/LOTE']));
    const kilograms = numeric(valueFrom(source, ['KILOGRAMOS', 'KILOS', 'KILOS/LOTE']));
    const racimos = numeric(valueFrom(source, ['RACIMOS', 'RACIMO/LOTE']));
    const averageWeight = numeric(valueFrom(source, ['PESO PROMEDIO', 'PESO PROMEDIO/LOTE']));
    const siembraSnapshot = numeric(valueFrom(source, ['SIEMBRA', 'AÑO SIEMBRA', 'ANO SIEMBRA']));
    const zonaSnapshot = String(valueFrom(source, ['ZONA']) ?? '').trim() || null;
    if (!period || !loteCode) {
      errors.push(`Fila ${rowNumber}: se requiere Periodo (AAAA-MM o fecha) y Lote.`);
      return;
    }
    if ([tons, kilograms, racimos, averageWeight].every((value) => value === null)) {
      errors.push(`Fila ${rowNumber}: registra al menos una medida productiva.`);
      return;
    }
    const key = `${period}:${loteCode}`;
    if (keys.has(key)) {
      errors.push(`Fila ${rowNumber}: hay más de un registro para ${loteCode} en ${period}.`);
      return;
    }
    keys.add(key);
    rows.push({ period, loteCode, zonaSnapshot, siembraSnapshot, racimos, kilograms, tons, averageWeight });
  });
  return { rows, errors, sourceRows: sourceRows.length };
}
