export interface Novedad {
  id: string;
  tipo: 'INCAPACIDAD' | 'VACACIONES' | 'LICENCIA' | 'SUSPENSION' | 'PERMISO NO REMUNERADO' | 'RENUNCIA' | 'TERMINACION_CONTRATO' | 'DESPIDO' | string;
  personaDocumento: string;
  personaNombreFuente: string;
  fechaInicio: string; // YYYY-MM-DD
  fechaFin: string; // YYYY-MM-DD or N/A
  zona?: string;
  estado?: string;
}

export interface PersonnelImportConflict {
  documentoDuplicado: string;
  registroConservado: PersonnelCatalogItem;
  registroPendiente: any;
}

export type Role = 'ADMIN' | 'DIRECTIVO' | 'SUPERVISOR' | 'REVISOR';

export interface User {
  id: string;
  username: string; // can be phone or username
  name: string;
  role: Role;
  supervisorId: string | null;
  idSupervisor: string | null;
  phone: string | null;
  pin?: never;
  active: boolean;
}

export interface Supervisor {
  id: string;
  name: string;
  phone: string;
  active: boolean;
}

export interface PersonnelCatalogItem {
  id: string;
  documento: string;
  nombreCompleto: string;
  tipoPersonal: string;
  estado: string;
  actividadCuadrilla: string;
  zona: string;
  laborCargo: string;
  contratacion: string;
  ordenFuente: number;
}

export interface Personnel {
  id: string;
  documento: string;
  name: string;
  type: string;
  tipoPersonal?: string;
  jobTitle: string;
  cuadrilla: string;
  observaciones: string;
  active: boolean;
}

export interface Equipment {
  id: string;
  name: string;
  type: string;
  active: boolean;
}

export interface Labor {
  id: string;
  name: string;
  active: boolean;
}

export interface Activity {
  id: string;
  laborId: string;
  name: string;
  unit: string;
  active: boolean;
}

export interface Location {
  id: string;
  zone: string;
  name: string;
  anoSiembra?: number | null;
  ha?: number | null;
  palmasDiferenciadas?: number | null;
  palmasTotales?: number | null;
  palmasSinManejo?: number | null;
  estadoPalma?: string | null;
  haBrutas?: number | null;
  edad?: number | null;
  haEdadSiembra?: number | null;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type CycleStatus = 'AL_DIA' | 'ALERTA' | 'CRITICO' | 'SIN_DATOS';

export type CycleScheduleGranularity = 'DIA' | 'SEMANA';

export interface CycleLaborRule {
  id: string;
  name: string;
  scheduleGranularity: CycleScheduleGranularity;
  normalDays: number;
  alertDays: number;
  restartDays: number;
  active: boolean;
  sortOrder: number;
}

export interface CycleExecution {
  id: string;
  executionDate: string;
  loteCode: string;
  laborCode: string;
  personnelCount: number;
  importId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CycleImport {
  id: string;
  fileName: string;
  fileType: string;
  importedBy: string;
  importedAt: string;
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
  errors: string[];
}

export interface ProductivityRecord {
  id: string;
  period: string;
  loteCode: string;
  zonaSnapshot?: string | null;
  siembraSnapshot?: number | null;
  racimos: number | null;
  kilograms: number | null;
  tons: number | null;
  averageWeight: number | null;
  source: 'MANUAL' | 'IMPORTACION';
  importId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductivityImport {
  id: string;
  fileName: string;
  fileType: string;
  importedBy: string;
  importedAt: string;
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
  errors: string[];
}

export type ProductivityProjectionScope = 'GLOBAL' | 'ZONA' | 'SIEMBRA' | 'LOTE';

export interface ProductivityProjection {
  id: string;
  period: string;
  scope: ProductivityProjectionScope;
  scopeValue: string;
  projectedTons: number;
  createdAt?: string;
  updatedAt?: string;
}

export type ProgrammingStatus = 'PENDIENTE' | 'CONFIRMADA' | 'RECHAZADA';

export interface ProgrammingStreakDay {
  date: string;
  totalPersonnel: number;
  programmedPersonnel: number;
  completedAt: string;
}

export interface ProgrammingReport {
  date: string;
  supervisorId: string;
  reportedAt: string;
}

export interface Programming {
  id: string;
  date: string; // YYYY-MM-DD
  supervisorId: string;
  laborId: string;
  activityId: string;
  locationId: string;
  zoneSnapshot?: string;
  loteSnapshot?: string;
  personnelIds: string[];
  observations: string;
  performance?: ProgrammingPerformance;
  status: ProgrammingStatus;
  createdAt: string;
  needsReview?: boolean;
  creationMethod?: 'MANUAL' | 'VOZ';
  performancePerPerson?: number;
  expectedTotalQuantity?: number;
}

export type AbsenceStatus = 'REGISTRADA' | 'CANCELADA';

export type ActivityPerformanceReference = {
  activityId: string;
  measurementType: string;
  unit: "JORNAL" | "TON" | "PALMA" | "HA" | "OTRA";
  performancePerPersonDay: number;
  active: boolean;
  source: "REFERENCIA_EXCEL_2026" | "EDITADO_ADMIN";
};

export type ProgrammingPerformance = {
  unit: string;
  referencePerformancePerPersonDay: number | null;
  performancePerPersonDay: number | null;
  plannedQuantity: number | null;
  wasManuallyEdited: boolean;
};

export interface Absence {
  id: string;
  date: string;
  personnelId: string;
  reason: string;
  supervisorId: string;
  observations: string;
  status: AbsenceStatus;
  createdAt: string;
}

export interface MachineryOperator {
  personnelId: string;
  documento: string;
  nombreCompleto: string;
  estado: string;
  orden: number;
}

export type MachineryStatus = 'PROGRAMADA' | 'EN_PROGRESO' | 'PAUSADA' | 'FINALIZADA' | 'CANCELADA';

export interface Machinery {
  id: string;
  date: string;
  laborId: string;
  activityId: string;
  locationId: string; // using location as zone for simplicity
  zoneSnapshot?: string;
  loteSnapshot?: string;
  operatorId: string; // personnelId
  equipmentId: string;
  supervisorId: string;
  createdBy?: string;
  observations: string;
  status: MachineryStatus;
  createdAt: string;
  needsReview?: boolean;
}

export type ApiResponse<T> =
  | { ok: true; codigo?: string; mensaje?: string; requestId?: string; data: T; error?: string }
  | { ok: false; codigo?: string; mensaje?: string; requestId?: string; conflictos?: unknown[]; detalle?: unknown; error?: string };
export type VoiceExtraction = {
  transcript: string;
  dateText: string | null;
  zoneText: string | null;
  lotText: string | null;
  laborText: string | null;
  activityText: string | null;
  personnelTexts: string[];
  observations: string | null;
  generalConfidence: number;
};

export type ResolvedField<T> = {
  originalText: string | null;
  status: "RECONOCIDO" | "AMBIGUO" | "PENDIENTE" | "INVALIDO";
  value: T | null;
  canonicalId: string | null;
  candidates: Array<{
    id: string;
    label: string;
  }>;
  message: string | null;
};
