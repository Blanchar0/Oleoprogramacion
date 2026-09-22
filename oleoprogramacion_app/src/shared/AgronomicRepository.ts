import { supabase } from './supabase';
import { offlineStore } from './offlineStore';
import { syncManager } from './syncManager';
import type { CycleExecution, CycleImport, CycleLaborRule, ProductivityImport, ProductivityProjection, ProductivityRecord, ProgrammingReport, ProgrammingStreakDay } from '../types';
import { normalizeLotCode, normalizeZoneName } from '../cycles/cycleLogic';

export interface Result {
  ok: boolean;
  error?: string;
  data?: any;
  offline?: boolean;
}

export type Unsubscribe = () => void;

function persistenceErrorMessage(error: any): string {
  return error?.message || error?.details || 'No se pudo guardar el registro en el servidor.';
}

function isNetworkPersistenceError(error: any): boolean {
  const message = persistenceErrorMessage(error).toLowerCase();
  return /failed to fetch|networkerror|network request failed|load failed|fetch failed/.test(message);
}

function isMissingCreatedByColumn(error: any): boolean {
  const message = persistenceErrorMessage(error).toLowerCase();
  return error?.code === 'PGRST204' && message.includes('created_by');
}

function colombiaDateFromTimestamp(value: string | null | undefined) {
  const timestamp = new Date(value || '');
  if (Number.isNaN(timestamp.getTime())) return '';
  return timestamp.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
}

export interface AgronomicRepository {
  subscribeProgramming(filters: any, callback: (data: any[]) => void): Unsubscribe;
  createProgramming(input: any): Promise<Result>;
  updateProgramming(id: string, input: any, expectedVersion?: number): Promise<Result>;
  deleteProgramming(id: string): Promise<Result>;

  subscribeAbsences(filters: any, callback: (data: any[]) => void): Unsubscribe;
  createAbsence(input: any): Promise<Result>;
  updateAbsence(id: string, input: any, expectedVersion: number): Promise<Result>;
  deleteAbsence(id: string): Promise<Result>;

  subscribeMachinery(filters: any, callback: (data: any[]) => void): Unsubscribe;
  createMachineryOperation(input: any): Promise<Result>;
  updateMachineryOperation(id: string, input: any, expectedVersion?: number): Promise<Result>;
  deleteMachineryOperation(id: string): Promise<Result>;

  subscribeCatalogs(callback: (data: any) => void): Unsubscribe;
  subscribeTeamStreak(callback: (data: { protectedDays: ProgrammingStreakDay[]; reports: ProgrammingReport[] }) => void): Unsubscribe;
  protectTeamDay(input: { date: string; totalPersonnel: number; programmedPersonnel: number }): Promise<Result>;
  recordAutomaticTeamReports(input: { date: string; reports: Array<{ supervisorId: string; reportedAt: string }> }): Promise<Result>;
  createPerformanceReference(input: any): Promise<Result>;
  updatePerformanceReference(id: string, input: any): Promise<Result>;
  deletePerformanceReference(id: string): Promise<Result>;
  createLocation(input: any): Promise<Result>;
  updateLocation(id: string, input: any): Promise<Result>;
  deleteLocation(id: string): Promise<Result>;

  subscribeCycles(callback: (data: { rules: CycleLaborRule[]; executions: CycleExecution[]; imports: CycleImport[] }) => void): Unsubscribe;
  importCycleExecutions(input: { fileName: string; fileType: string; importedBy: string; rows: Array<Pick<CycleExecution, 'executionDate' | 'loteCode' | 'laborCode' | 'personnelCount'>>; errors: string[] }): Promise<Result>;
  subscribeProductivity(callback: (data: { records: ProductivityRecord[]; imports: ProductivityImport[]; projections: ProductivityProjection[] }) => void): Unsubscribe;
  importProductivityRecords(input: { fileName: string; fileType: string; importedBy: string; rows: Array<Omit<ProductivityRecord, 'id' | 'source' | 'importId' | 'createdAt' | 'updatedAt'>>; errors: string[] }): Promise<Result>;
  saveProductivityRecord(input: Omit<ProductivityRecord, 'id' | 'source' | 'importId' | 'createdAt' | 'updatedAt'>): Promise<Result>;
  saveProductivityProjection(input: Omit<ProductivityProjection, 'id' | 'createdAt' | 'updatedAt'>): Promise<Result>;
}

class SupabaseRepository implements AgronomicRepository {

  // Helper to fetch and subscribe to tables
  private subscribeTable(
    table: string,
    filterField: string | null,
    filterValue: any,
    callback: (data: any[]) => void
  ): Unsubscribe {
    const fetchData = async () => {
      let query = supabase.from(table).select('*');
      if (filterField && filterValue !== undefined && filterValue !== null) {
        query = query.eq(filterField, filterValue);
      }
      const { data, error } = await query;
      if (error) {
        console.error(`Error fetching ${table}:`, error);
        return;
      }
      callback(data || []);
    };

    fetchData();

    // Supabase Realtime channel
    const channelId = `public:${table}:${crypto.randomUUID()}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  // -- PROGRAMMING --
  subscribeProgramming(filters: any, callback: (data: any[]) => void): Unsubscribe {
    // 1. Cargar caché offline inmediatamente si existe
    if (filters.date) {
      offlineStore.getDailyCache('programming', filters.date).then(cached => {
        if (cached && Array.isArray(cached)) callback(cached);
      });
    }

    const fetchData = async () => {
      let query = supabase.from('programming').select('*');
      if (filters.date) query = query.eq('date', filters.date);
      if (filters.supervisorId !== undefined && filters.supervisorId !== null) {
        query = query.eq('id_supervisor', filters.supervisorId);
      }
      const { data, error } = await query;
      if (error) {
        console.warn("Programming fetch error (usando datos locales si existen):", error.message);
        return;
      }
      // Map back to camelCase properties for frontend compatibility
      const mapped = (data || []).map((item: any) => {
        const rawPersonnel = item.personnel_ids;
        let parsedPersonnelIds: string[] = [];
        if (Array.isArray(rawPersonnel)) {
          parsedPersonnelIds = rawPersonnel.map((x: any) => typeof x === 'object' && x !== null ? (x.id || x.personnelId || x.documento || String(x)) : String(x));
        } else if (typeof rawPersonnel === 'string') {
          try {
            const parsed = JSON.parse(rawPersonnel);
            if (Array.isArray(parsed)) {
              parsedPersonnelIds = parsed.map((x: any) => typeof x === 'object' && x !== null ? (x.id || x.personnelId || x.documento || String(x)) : String(x));
            } else {
              parsedPersonnelIds = rawPersonnel.split(',').map((s: string) => s.trim()).filter(Boolean);
            }
          } catch {
            parsedPersonnelIds = rawPersonnel.split(',').map((s: string) => s.trim()).filter(Boolean);
          }
        }

        return {
          ...item,
          supervisorId: item.supervisor_id || item.id_supervisor,
          idSupervisor: item.id_supervisor || item.supervisor_id,
          laborId: item.labor_id,
          activityId: item.activity_id,
          locationId: item.location_id,
          locationIds: item.location_ids || (item.location_id ? item.location_id.split(',').map((s: string) => s.trim()).filter(Boolean) : []),
          zoneSnapshot: item.zone_snapshot,
          loteSnapshot: item.lote_snapshot,
          personnelIds: parsedPersonnelIds,
          creationMethod: item.creation_method || 'MANUAL',
          needsReview: item.needs_review ?? false,
          performancePerPerson: item.performance_per_person,
          expectedTotalQuantity: item.expected_total_quantity,
        };
      });

      // Guardar en caché local para acceso sin conexión
      if (filters.date) {
        offlineStore.saveDailyCache('programming', filters.date, mapped);
      }

      callback(mapped);
    };

    fetchData();

    const channelId = `public:programming:${crypto.randomUUID()}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'programming' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  async createProgramming(input: any): Promise<Result> {
    const locationIdVal = Array.isArray(input.locationIds) ? input.locationIds.join(',') : (input.locationId || null);
    const payload = {
      id: crypto.randomUUID(),
      date: input.date,
      supervisor_id: input.supervisorId || input.idSupervisor,
      id_supervisor: input.idSupervisor || input.supervisorId,
      labor_id: input.laborId,
      activity_id: input.activityId,
      location_id: locationIdVal,
      zone_snapshot: input.zoneSnapshot || null,
      lote_snapshot: input.loteSnapshot || null,
      personnel_ids: input.personnelIds,
      status: input.status || 'PENDIENTE',
      observations: input.observations || '',
      creation_method: input.creationMethod || input.origin || 'MANUAL',
      needs_review: input.needsReview ?? false,
      performance_per_person: input.performancePerPerson ?? null,
      expected_total_quantity: input.expectedTotalQuantity ?? null,
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Si no hay conexión a internet, encolar en Outbox localmente
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await offlineStore.addOutboxItem({
        id: payload.id,
        type: 'PROGRAMMING_CREATE',
        payload
      });
      syncManager.refreshPendingCount();
      return { ok: true, data: payload, offline: true };
    }

    try {
      const { data, error } = await supabase.from('programming').insert(payload).select().single();
      if (error) throw error;
      return { ok: true, data };
    } catch (e: any) {
      console.warn("Fallo guardado en Supabase, guardando en Outbox local:", e.message);
      await offlineStore.addOutboxItem({
        id: payload.id,
        type: 'PROGRAMMING_CREATE',
        payload
      });
      syncManager.refreshPendingCount();
      return { ok: true, data: payload, offline: true };
    }
  }

  async updateProgramming(id: string, input: any, expectedVersion?: number): Promise<Result> {
    const payload: any = {
      updated_at: new Date().toISOString(),
    };

    if (input.date) payload.date = input.date;
    if (input.laborId) payload.labor_id = input.laborId;
    if (input.activityId) payload.activity_id = input.activityId;
    if (input.locationId !== undefined) {
      payload.location_id = Array.isArray(input.locationIds) ? input.locationIds.join(',') : input.locationId;
    }
    if (input.zoneSnapshot) payload.zone_snapshot = input.zoneSnapshot;
    if (input.loteSnapshot) payload.lote_snapshot = input.loteSnapshot;
    if (input.personnelIds) payload.personnel_ids = input.personnelIds;
    if (input.status) payload.status = input.status;
    if (input.observations !== undefined) payload.observations = input.observations;
    if (input.performancePerPerson !== undefined) payload.performance_per_person = input.performancePerPerson;
    if (input.expectedTotalQuantity !== undefined) payload.expected_total_quantity = input.expectedTotalQuantity;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await offlineStore.addOutboxItem({
        id,
        type: 'PROGRAMMING_UPDATE',
        payload: { id, ...payload }
      });
      syncManager.refreshPendingCount();
      return { ok: true, offline: true };
    }

    try {
      const { error } = await supabase.from('programming').update(payload).eq('id', id);
      if (error) throw error;
      return { ok: true };
    } catch (e: any) {
      console.warn("Fallo update en Supabase, guardando en Outbox:", e.message);
      await offlineStore.addOutboxItem({
        id,
        type: 'PROGRAMMING_UPDATE',
        payload: { id, ...payload }
      });
      syncManager.refreshPendingCount();
      return { ok: true, offline: true };
    }
  }

  async deleteProgramming(id: string): Promise<Result> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await offlineStore.addOutboxItem({
        id,
        type: 'PROGRAMMING_DELETE',
        payload: { id }
      });
      syncManager.refreshPendingCount();
      return { ok: true, offline: true };
    }
    try {
      const { error } = await supabase.from('programming').delete().eq('id', id);
      if (error) throw error;
      return { ok: true };
    } catch (e: any) {
      await offlineStore.addOutboxItem({
        id,
        type: 'PROGRAMMING_DELETE',
        payload: { id }
      });
      syncManager.refreshPendingCount();
      return { ok: true, offline: true };
    }
  }

  // -- ABSENCES --
  subscribeAbsences(filters: any, callback: (data: any[]) => void): Unsubscribe {
    if (filters.date) {
      offlineStore.getDailyCache('absences', filters.date).then(cached => {
        if (cached && Array.isArray(cached)) callback(cached);
      });
    }

    const fetchData = async () => {
      let query = supabase.from('absences').select('*');
      if (filters.date) {
        query = query.eq('date', filters.date);
      } else if (filters.startDate && filters.endDate) {
        query = query.gte('date', filters.startDate).lte('date', filters.endDate);
      } else if (filters.month) {
        query = query.gte('date', `${filters.month}-01`).lte('date', `${filters.month}-31`);
      }
      if (filters.supervisorId !== undefined && filters.supervisorId !== null) {
        query = query.eq('id_supervisor', filters.supervisorId);
      }
      const { data, error } = await query;
      if (error) {
        console.warn("Absences fetch error (usando caché si existe):", error.message);
        return;
      }
      const mapped = (data || []).map((item: any) => ({
        ...item,
        supervisorId: item.supervisor_id || item.id_supervisor,
        idSupervisor: item.id_supervisor || item.supervisor_id,
        personnelId: item.personnel_id,
        personnelDoc: item.personnel_doc,
        personnelName: item.personnel_name,
        customReason: item.custom_reason,
      }));

      if (filters.date) {
        offlineStore.saveDailyCache('absences', filters.date, mapped);
      }

      callback(mapped);
    };

    fetchData();

    const channelId = `public:absences:${crypto.randomUUID()}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'absences' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  async createAbsence(input: any): Promise<Result> {
    const supId = input.supervisorId || input.idSupervisor || 'ADMIN';
    const payload = {
      id: crypto.randomUUID(),
      date: input.date,
      supervisor_id: supId,
      id_supervisor: supId,
      personnel_id: input.personnelId,
      personnel_doc: input.personnelDoc,
      personnel_name: input.personnelName,
      reason: input.reason,
      custom_reason: input.customReason || null,
      observations: input.observations || '',
      status: input.status || 'REGISTRADA',
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await offlineStore.addOutboxItem({
        id: payload.id,
        type: 'ABSENCE_CREATE',
        payload
      });
      syncManager.refreshPendingCount();
      return { ok: true, data: payload, offline: true };
    }

    try {
      const { data, error } = await supabase.from('absences').insert(payload).select().single();
      if (error) throw error;
      return { ok: true, data };
    } catch (e: any) {
      console.warn("Fallo guardado de inasistencia en Supabase, guardando en Outbox:", e.message);
      await offlineStore.addOutboxItem({
        id: payload.id,
        type: 'ABSENCE_CREATE',
        payload
      });
      syncManager.refreshPendingCount();
      return { ok: true, data: payload, offline: true };
    }
  }

  async updateAbsence(id: string, input: any, expectedVersion?: number): Promise<Result> {
    const payload: any = {
      updated_at: new Date().toISOString(),
    };

    if (input.status !== undefined) payload.status = input.status;
    if (input.observations !== undefined) payload.observations = input.observations;
    if (input.reason !== undefined) payload.reason = input.reason;
    if (input.customReason !== undefined) payload.custom_reason = input.customReason;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await offlineStore.addOutboxItem({
        id,
        type: 'ABSENCE_UPDATE',
        payload: { id, ...payload }
      });
      syncManager.refreshPendingCount();
      return { ok: true, offline: true };
    }

    try {
      const { error } = await supabase.from('absences').update(payload).eq('id', id);
      if (error) throw error;
      return { ok: true };
    } catch (e: any) {
      console.warn("Fallo update de inasistencia en Supabase, guardando en Outbox:", e.message);
      await offlineStore.addOutboxItem({
        id,
        type: 'ABSENCE_UPDATE',
        payload: { id, ...payload }
      });
      syncManager.refreshPendingCount();
      return { ok: true, offline: true };
    }
  }

  async deleteAbsence(id: string): Promise<Result> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await offlineStore.addOutboxItem({
        id,
        type: 'ABSENCE_DELETE',
        payload: { id }
      });
      syncManager.refreshPendingCount();
      return { ok: true, offline: true };
    }

    try {
      const { error } = await supabase.from('absences').delete().eq('id', id);
      if (error) throw error;
      return { ok: true };
    } catch (e: any) {
      await offlineStore.addOutboxItem({
        id,
        type: 'ABSENCE_DELETE',
        payload: { id }
      });
      syncManager.refreshPendingCount();
      return { ok: true, offline: true };
    }
  }

  // -- MACHINERY --
  subscribeMachinery(filters: any, callback: (data: any[]) => void): Unsubscribe {
    if (filters.date) {
      offlineStore.getDailyCache('machinery', filters.date).then(cached => {
        if (cached && Array.isArray(cached)) callback(cached);
      });
    }

    const fetchData = async () => {
      let query = supabase.from('machinery_operations').select('*');
      if (filters.date) query = query.eq('date', filters.date);
      if (filters.supervisorId !== undefined && filters.supervisorId !== null) {
        query = query.eq('id_supervisor', filters.supervisorId);
      }
      const { data, error } = await query;
      if (error) {
        console.warn("Machinery fetch error (usando caché si existe):", error.message);
        return;
      }
      const mapped = (data || []).map((item: any) => {
        let zoneSnap = item.zone_snapshot;
        let obs = item.observations || '';

        // Compatibilidad con registros antiguos que guardaban la zona dentro de observaciones.
        if (obs) {
          if (!zoneSnap && obs.includes('[Zonas:')) {
            const matchZ = obs.match(/\[Zonas:\s*([^\]]+)\]/i);
            if (matchZ) zoneSnap = matchZ[1];
          }
          // Los metadatos históricos de horario no se exponen en la nueva vista.
          obs = obs
            .replace(/\[Zonas:\s*[^\]]+\]/gi, '')
            .replace(/\[Inicio:\s*[^\]]+\]/gi, '')
            .replace(/\[Fin:\s*[^\]]+\]/gi, '')
            .trim();
        }

        return {
          ...item,
          supervisorId: item.supervisor_id || item.id_supervisor,
          idSupervisor: item.id_supervisor || item.supervisor_id,
          equipmentId: item.equipment_id,
          operatorId: item.operator_id || item.operator_name,
          operatorName: item.operator_name,
          laborId: item.labor_id || item.laborId,
          activityId: item.activity_id || item.activityId,
          createdBy: item.created_by || null,
          locationId: item.location_id,
          zoneSnapshot: zoneSnap,
          initialHourMeter: item.initial_hour_meter,
          finalHourMeter: item.final_hour_meter,
          effectiveHours: item.effective_hours,
          observations: obs,
        };
      });

      if (filters.date) {
        offlineStore.saveDailyCache('machinery', filters.date, mapped);
      }

      callback(mapped);
    };

    fetchData();

    const channelId = `public:machinery_operations:${crypto.randomUUID()}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'machinery_operations' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel)
    };
  }

  async createMachineryOperation(input: any): Promise<Result> {
    const supId = input.supervisorId || input.idSupervisor || 'SUP001';
    const opName = input.operatorName || input.operatorId || 'Operador';

    const payload: Record<string, any> = {
      id: crypto.randomUUID(),
      date: input.date,
      supervisor_id: supId,
      id_supervisor: supId,
      equipment_id: input.equipmentId,
      operator_id: input.operatorId,
      operator_name: opName,
      labor_id: input.laborId || input.labor_id,
      activity_id: input.activityId || input.activity_id,
      location_id: input.locationId || null,
      zone_snapshot: input.zoneSnapshot,
      created_by: input.createdBy || null,
      observations: input.observations || '',
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await offlineStore.addOutboxItem({
        id: payload.id,
        type: 'MACHINERY_CREATE',
        payload
      });
      syncManager.refreshPendingCount();
      return { ok: true, data: payload, offline: true };
    }

    try {
      let { data, error } = await supabase.from('machinery_operations').insert(payload).select().single();

      // Algunas instalaciones existentes aún no tienen la columna creada_by.
      // El supervisor ya queda asociado en las columnas históricas, por lo que el
      // registro puede guardarse sin bloquear la operación mientras se actualiza el esquema.
      if (error && isMissingCreatedByColumn(error)) {
        const { created_by: _createdBy, ...legacyPayload } = payload;
        ({ data, error } = await supabase.from('machinery_operations').insert(legacyPayload).select().single());
      }

      if (error) throw error;
      return { ok: true, data };
    } catch (e: any) {
      // La cola es exclusiva para una pérdida real de red. Un rechazo de Supabase
      // debe llegar al formulario para no aparentar que el registro fue guardado.
      if (isNetworkPersistenceError(e)) {
        await offlineStore.addOutboxItem({
          id: payload.id,
          type: 'MACHINERY_CREATE',
          payload
        });
        syncManager.refreshPendingCount();
        return { ok: true, data: payload, offline: true };
      }

      console.error('No se pudo guardar la operación de maquinaria:', e);
      return { ok: false, error: persistenceErrorMessage(e) };
    }
  }

  async updateMachineryOperation(id: string, input: any, expectedVersion?: number): Promise<Result> {
    const payload: any = {
      updated_at: new Date().toISOString(),
    };

    if (input.observations !== undefined) payload.observations = input.observations || '';
    if (input.status !== undefined) payload.status = input.status;
    if (input.date !== undefined) payload.date = input.date;
    if (input.equipmentId !== undefined || input.equipment_id !== undefined) {
      payload.equipment_id = input.equipmentId || input.equipment_id;
    }
    if (input.operatorName !== undefined || input.operator_name !== undefined || input.operatorId !== undefined) {
      payload.operator_name = input.operatorName || input.operator_name || input.operatorId;
    }
    if (input.operatorId !== undefined || input.operator_id !== undefined) {
      payload.operator_id = input.operatorId || input.operator_id;
    }
    if (input.laborId !== undefined || input.labor_id !== undefined) {
      payload.labor_id = input.laborId || input.labor_id;
    }
    if (input.activityId !== undefined || input.activity_id !== undefined) {
      payload.activity_id = input.activityId || input.activity_id;
    }
    if (input.locationId !== undefined || input.location_id !== undefined) {
      payload.location_id = input.locationId || input.location_id;
    }
    if (input.zoneSnapshot !== undefined || input.zone_snapshot !== undefined) {
      payload.zone_snapshot = input.zoneSnapshot || input.zone_snapshot;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await offlineStore.addOutboxItem({
        id,
        type: 'MACHINERY_UPDATE',
        payload: { id, ...payload }
      });
      syncManager.refreshPendingCount();
      return { ok: true, offline: true };
    }

    try {
      const { error } = await supabase.from('machinery_operations').update(payload).eq('id', id);
      if (error) throw error;
      return { ok: true };
    } catch (e: any) {
      if (isNetworkPersistenceError(e)) {
        await offlineStore.addOutboxItem({
          id,
          type: 'MACHINERY_UPDATE',
          payload: { id, ...payload }
        });
        syncManager.refreshPendingCount();
        return { ok: true, offline: true };
      }
      console.error('No se pudo actualizar la operación de maquinaria:', e);
      return { ok: false, error: persistenceErrorMessage(e) };
    }
  }

  async deleteMachineryOperation(id: string): Promise<Result> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await offlineStore.addOutboxItem({
        id,
        type: 'MACHINERY_DELETE',
        payload: { id }
      });
      syncManager.refreshPendingCount();
      return { ok: true, offline: true };
    }

    try {
      const { error } = await supabase.from('machinery_operations').delete().eq('id', id);
      if (error) throw error;
      return { ok: true };
    } catch (e: any) {
      if (isNetworkPersistenceError(e)) {
        await offlineStore.addOutboxItem({
          id,
          type: 'MACHINERY_DELETE',
          payload: { id }
        });
        syncManager.refreshPendingCount();
        return { ok: true, offline: true };
      }
      console.error('No se pudo eliminar la operación de maquinaria:', e);
      return { ok: false, error: persistenceErrorMessage(e) };
    }
  }

  // -- SHARED TEAM STREAK --
  // Tablas: public.programming_streak_days y public.programming_reports.
  // Los reportes tienen FK a un día ya protegido; no se actualizan totales ni fechas.
  subscribeTeamStreak(callback: (data: { protectedDays: ProgrammingStreakDay[]; reports: ProgrammingReport[] }) => void): Unsubscribe {
    const fetchData = async () => {
      const [protectedDaysResult, reportsResult] = await Promise.all([
        supabase.from('programming_streak_days').select('date,total_personnel,programmed_personnel,completed_at').order('date', { ascending: false }),
        supabase.from('programming_reports').select('date,supervisor_id,reported_at'),
      ]);

      if (protectedDaysResult.error || reportsResult.error) {
        console.warn(
          'Error al cargar la racha compartida:',
          protectedDaysResult.error?.message || reportsResult.error?.message,
        );
        return;
      }

      callback({
        protectedDays: (protectedDaysResult.data || []).map((row: any) => ({
          date: String(row.date),
          totalPersonnel: Number(row.total_personnel),
          programmedPersonnel: Number(row.programmed_personnel),
          completedAt: row.completed_at,
        })),
        reports: (reportsResult.data || []).map((row: any) => ({
          date: String(row.date),
          supervisorId: String(row.supervisor_id),
          reportedAt: row.reported_at,
        })),
      });
    };

    fetchData();

    const channelId = `public:programming-streak:${crypto.randomUUID()}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'programming_streak_days' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'programming_reports' }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  async protectTeamDay(input: { date: string; totalPersonnel: number; programmedPersonnel: number }): Promise<Result> {
    if (!input.date || input.totalPersonnel <= 0 || input.programmedPersonnel !== input.totalPersonnel) {
      return { ok: false, error: 'Solo se protege un día cuando todo el personal disponible está programado.' };
    }

    try {
      const insertProtectedDay = () => supabase.from('programming_streak_days').insert({
        date: input.date,
        total_personnel: input.totalPersonnel,
        programmed_personnel: input.programmedPersonnel,
        completed_at: new Date().toISOString(),
      });
      // INSERT (no UPDATE): un día protegido no se puede mutar.
      let { error } = await insertProtectedDay();
      if (error) {
        if (error.code === '23505') {
          const { data: existing, error: existingError } = await supabase
            .from('programming_streak_days')
            .select('completed_at')
            .eq('date', input.date)
            .maybeSingle();
          if (existingError) throw existingError;

          // Corrige exclusivamente un residuo de la versión anterior: una fila
          // creada antes de la fecha que pretendía proteger. Nunca se toca una
          // protección registrada en su propio día.
          if (existing && colombiaDateFromTimestamp(existing.completed_at) < input.date) {
            const { error: deleteError } = await supabase
              .from('programming_streak_days')
              .delete()
              .eq('date', input.date);
            if (deleteError) throw deleteError;
            ({ error } = await insertProtectedDay());
            if (error) throw error;
          }
          return { ok: true, data: { date: input.date, totalPersonnel: input.totalPersonnel, programmedPersonnel: input.programmedPersonnel } };
        }
        throw error;
      }
      return { ok: true, data: { date: input.date, totalPersonnel: input.totalPersonnel, programmedPersonnel: input.programmedPersonnel } };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  async recordAutomaticTeamReports(input: { date: string; reports: Array<{ supervisorId: string; reportedAt: string }> }): Promise<Result> {
    const reportsBySupervisor = new Map<string, string>();
    input.reports.forEach(report => {
      const supervisorId = String(report.supervisorId || '').trim();
      if (!supervisorId) return;
      const reportedAt = report.reportedAt || new Date().toISOString();
      const previous = reportsBySupervisor.get(supervisorId);
      if (!previous || new Date(reportedAt).getTime() < new Date(previous).getTime()) {
        reportsBySupervisor.set(supervisorId, reportedAt);
      }
    });
    if (!input.date || reportsBySupervisor.size === 0) return { ok: true, data: [] };

    try {
      const { error } = await supabase.from('programming_reports').upsert(
        [...reportsBySupervisor.entries()].map(([supervisorId, reportedAt]) => ({
          date: input.date,
          supervisor_id: supervisorId,
          reported_at: reportedAt,
        })),
        { onConflict: 'date,supervisor_id', ignoreDuplicates: true },
      );
      if (error) {
        if (error.code === '23503') {
          return { ok: false, error: 'El día aún no está protegido.' };
        }
        throw error;
      }
      return { ok: true, data: [...reportsBySupervisor.keys()] };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  // -- CYCLES AND PRODUCTIVITY --
  subscribeCycles(callback: (data: { rules: CycleLaborRule[]; executions: CycleExecution[]; imports: CycleImport[] }) => void): Unsubscribe {
    const fetchCycles = async () => {
      const fetchAllExecutions = async () => {
        const pageSize = 1000;
        const rows: any[] = [];
        for (let from = 0; ; from += pageSize) {
          const { data, error } = await supabase
            .from('cycle_executions')
            .select('*')
            .order('execution_date', { ascending: false })
            .order('lote_code')
            .order('labor_code')
            .range(from, from + pageSize - 1);
          if (error) return { data: null, error };
          rows.push(...(data || []));
          if ((data || []).length < pageSize) return { data: rows, error: null };
        }
      };

      const [{ data: rules, error: rulesError }, executionsResult, { data: imports, error: importsError }] = await Promise.all([
        supabase.from('cycle_labor_rules').select('*').order('sort_order'),
        fetchAllExecutions(),
        supabase.from('cycle_imports').select('*').order('imported_at', { ascending: false }).limit(12),
      ]);
      const executions = executionsResult.data;
      const executionsError = executionsResult.error;

      const sourceError = rulesError || executionsError || importsError;
      if (sourceError) {
        console.warn('Error al cargar ciclos:', sourceError.message);
        callback({ rules: [], executions: [], imports: [] });
        return;
      }

      callback({
        rules: (rules || []).map((row: any) => ({
          id: row.id,
          name: row.name,
          scheduleGranularity: row.schedule_granularity,
          normalDays: Number(row.normal_days),
          alertDays: Number(row.alert_days),
          restartDays: Number(row.restart_days),
          active: row.active,
          sortOrder: Number(row.sort_order),
        })),
        executions: (executions || []).map((row: any) => ({
          id: row.id,
          executionDate: row.execution_date,
          loteCode: row.lote_code,
          laborCode: row.labor_code,
          personnelCount: Number(row.personnel_count),
          importId: row.import_id,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })),
        imports: (imports || []).map((row: any) => ({
          id: row.id,
          fileName: row.file_name,
          fileType: row.file_type,
          importedBy: row.imported_by,
          importedAt: row.imported_at,
          totalRows: Number(row.total_rows),
          acceptedRows: Number(row.accepted_rows),
          rejectedRows: Number(row.rejected_rows),
          errors: Array.isArray(row.errors) ? row.errors : [],
        })),
      });
    };

    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(fetchCycles, 500);
    };

    fetchCycles();
    const channel = supabase
      .channel(`public:cycles:${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cycle_labor_rules' }, scheduleRefresh)
      // Una importación masiva puede generar miles de eventos de fila. Se
      // espera a que termine el lote antes de volver a consultar.
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cycle_executions' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cycle_imports' }, scheduleRefresh)
      .subscribe();

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      supabase.removeChannel(channel);
    };
  }

  async importCycleExecutions(input: { fileName: string; fileType: string; importedBy: string; rows: Array<Pick<CycleExecution, 'executionDate' | 'loteCode' | 'laborCode' | 'personnelCount'>>; errors: string[] }): Promise<Result> {
    const importId = crypto.randomUUID();
    const now = new Date().toISOString();
    const importPayload = {
      id: importId,
      file_name: input.fileName,
      file_type: input.fileType,
      imported_by: input.importedBy,
      imported_at: now,
      total_rows: input.rows.length + input.errors.length,
      accepted_rows: input.rows.length,
      rejected_rows: input.errors.length,
      errors: input.errors.slice(0, 100),
    };

    try {
      const { error: importError } = await supabase.from('cycle_imports').insert(importPayload);
      if (importError) throw importError;

      if (input.rows.length) {
        const rows = input.rows.map((row) => ({
          id: `cycle:${row.executionDate}:${row.loteCode}:${row.laborCode}`,
          execution_date: row.executionDate,
          lote_code: row.loteCode,
          labor_code: row.laborCode,
          personnel_count: row.personnelCount,
          import_id: importId,
          updated_at: now,
        }));
        const { error: executionError } = await supabase
          .from('cycle_executions')
          .upsert(rows, { onConflict: 'execution_date,lote_code,labor_code' });
        if (executionError) throw executionError;
      }
      return { ok: true, data: { importId } };
    } catch (error: any) {
      return { ok: false, error: error.message || 'No fue posible importar los ciclos.' };
    }
  }

  subscribeProductivity(callback: (data: { records: ProductivityRecord[]; imports: ProductivityImport[]; projections: ProductivityProjection[] }) => void): Unsubscribe {
    const fetchProductivity = async () => {
      const [{ data: records, error: recordsError }, { data: imports, error: importsError }] = await Promise.all([
        supabase.from('productivity_records').select('*').order('period', { ascending: false }),
        supabase.from('productivity_imports').select('*').order('imported_at', { ascending: false }).limit(12),
      ]);
      const sourceError = recordsError || importsError;
      if (sourceError) {
        console.warn('Error al cargar productividad:', sourceError.message);
        callback({ records: [], imports: [], projections: [] });
        return;
      }
      const { data: projections, error: projectionsError } = await supabase
        .from('productivity_projections')
        .select('*')
        .order('period', { ascending: false });
      if (projectionsError) console.warn('No fue posible cargar las proyecciones de productividad:', projectionsError.message);
      callback({
        records: (records || []).map((row: any) => ({
          id: row.id,
          period: String(row.period).slice(0, 7),
          loteCode: normalizeLotCode(row.lote_code),
          zonaSnapshot: row.zona_snapshot ? normalizeZoneName(row.zona_snapshot) : null,
          siembraSnapshot: row.siembra_snapshot === null ? null : Number(row.siembra_snapshot),
          racimos: row.racimos === null ? null : Number(row.racimos),
          kilograms: row.kilograms === null ? null : Number(row.kilograms),
          tons: row.tons === null ? null : Number(row.tons),
          averageWeight: row.average_weight === null ? null : Number(row.average_weight),
          source: row.source,
          importId: row.import_id,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })),
        imports: (imports || []).map((row: any) => ({
          id: row.id,
          fileName: row.file_name,
          fileType: row.file_type,
          importedBy: row.imported_by,
          importedAt: row.imported_at,
          totalRows: Number(row.total_rows),
          acceptedRows: Number(row.accepted_rows),
          rejectedRows: Number(row.rejected_rows),
          errors: Array.isArray(row.errors) ? row.errors : [],
        })),
        projections: (projections || []).map((row: any) => ({
          id: row.id,
          period: String(row.period).slice(0, 7),
          scope: row.scope,
          scopeValue: row.scope_value,
          projectedTons: Number(row.projected_tons),
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })),
      });
    };

    fetchProductivity();
    const channel = supabase
      .channel(`public:productivity:${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productivity_records' }, fetchProductivity)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productivity_imports' }, fetchProductivity)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productivity_projections' }, fetchProductivity)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }

  async importProductivityRecords(input: { fileName: string; fileType: string; importedBy: string; rows: Array<Omit<ProductivityRecord, 'id' | 'source' | 'importId' | 'createdAt' | 'updatedAt'>>; errors: string[] }): Promise<Result> {
    const importId = crypto.randomUUID();
    const now = new Date().toISOString();
    try {
      const { error: importError } = await supabase.from('productivity_imports').insert({
        id: importId,
        file_name: input.fileName,
        file_type: input.fileType,
        imported_by: input.importedBy,
        imported_at: now,
        total_rows: input.rows.length + input.errors.length,
        accepted_rows: input.rows.length,
        rejected_rows: input.errors.length,
        errors: input.errors.slice(0, 100),
      });
      if (importError) throw importError;
      if (input.rows.length) {
        const rows = input.rows.map((row) => ({
          id: `productivity:${row.period}:${row.loteCode}`,
          period: `${row.period}-01`,
          lote_code: row.loteCode,
          zona_snapshot: row.zonaSnapshot || null,
          siembra_snapshot: row.siembraSnapshot ?? null,
          racimos: row.racimos,
          kilograms: row.kilograms,
          tons: row.tons,
          average_weight: row.averageWeight,
          source: 'IMPORTACION',
          import_id: importId,
          updated_at: now,
        }));
        const { error: recordsError } = await supabase.from('productivity_records').upsert(rows, { onConflict: 'period,lote_code' });
        if (recordsError) throw recordsError;
      }
      return { ok: true, data: { importId } };
    } catch (error: any) {
      return { ok: false, error: error.message || 'No fue posible importar la productividad.' };
    }
  }

  async saveProductivityRecord(input: Omit<ProductivityRecord, 'id' | 'source' | 'importId' | 'createdAt' | 'updatedAt'>): Promise<Result> {
    const now = new Date().toISOString();
    const payload = {
      id: `productivity:${input.period}:${input.loteCode}`,
      period: `${input.period}-01`,
      lote_code: input.loteCode,
      zona_snapshot: input.zonaSnapshot || null,
      siembra_snapshot: input.siembraSnapshot ?? null,
      racimos: input.racimos,
      kilograms: input.kilograms,
      tons: input.tons,
      average_weight: input.averageWeight,
      source: 'MANUAL',
      updated_at: now,
    };
    try {
      const { error } = await supabase.from('productivity_records').upsert(payload, { onConflict: 'period,lote_code' });
      if (error) throw error;
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message || 'No fue posible guardar la productividad.' };
    }
  }

  async saveProductivityProjection(input: Omit<ProductivityProjection, 'id' | 'createdAt' | 'updatedAt'>): Promise<Result> {
    const now = new Date().toISOString();
    const scopeValue = input.scope === 'GLOBAL' ? 'GLOBAL' : input.scopeValue;
    const payload = {
      id: `productivity-projection:${input.period}:${input.scope}:${scopeValue}`,
      period: `${input.period}-01`,
      scope: input.scope,
      scope_value: scopeValue,
      projected_tons: input.projectedTons,
      updated_at: now,
    };
    try {
      const { error } = await supabase
        .from('productivity_projections')
        .upsert(payload, { onConflict: 'period,scope,scope_value' });
      if (error) throw error;
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message || 'No fue posible guardar la proyección.' };
    }
  }

  // -- CATALOGS --
  subscribeCatalogs(callback: (data: any) => void): Unsubscribe {
    // 1. Cargar inmediatamente catálogos de IndexedDB si existen
    offlineStore.getCatalogs().then(cached => {
      if (cached) {
        callback(cached);
      }
    });

    const fetchAllCatalogs = async () => {
      try {
        const [
          { data: users },
          { data: supervisors },
          { data: personnel },
          { data: labors },
          { data: activities },
          { data: locations },
          { data: equipment },
          { data: performanceReferences },
          { data: personnelNovelties }
        ] = await Promise.all([
          supabase.from('users').select('*'),
          supabase.from('supervisors').select('*'),
          supabase.from('personnel').select('*'),
          supabase.from('labors').select('*'),
          supabase.from('activities').select('*'),
          supabase.from('locations').select('*'),
          supabase.from('equipment').select('*'),
          supabase.from('performance_references').select('*'),
          supabase.from('personnel_novelties').select('*'),
        ]);

        const mappedUsers = (users || []).map((u: any) => ({
          ...u,
          idSupervisor: u.id_supervisor || u.supervisor_id,
          supervisorId: u.supervisor_id || u.id_supervisor,
        }));

        const mappedActivities = (activities || []).map((a: any) => ({
          ...a,
          laborId: a.labor_id,
        }));

        const mappedPerformance = (performanceReferences || []).map((pr: any) => ({
          ...pr,
          activityId: pr.activity_id,
          measurementType: pr.measurement_type,
          performancePerPersonDay: pr.performance_per_person_day,
        }));

        const mappedNovelties = (personnelNovelties || []).map((n: any) => ({
          ...n,
          personaDocumento: n.persona_documento,
          personaNombreFuente: n.persona_nombre_fuente,
          fechaInicio: n.fecha_inicio,
          fechaFin: n.fecha_fin,
        }));

        const mappedPersonnel = (personnel || []).map((p: any) => ({
          ...p,
          jobTitle: p.job_title || p.jobTitle || p.labor_cargo || p.laborCargo,
          tipoPersonal: p.tipo_personal || p.tipoPersonal || p.type || 'CAMPO',
          nombreCompleto: p.nombre_completo || p.name,
        }));

        const mappedLocations = (locations || []).map((loc: any) => ({
          ...loc,
          anoSiembra: loc.ano_siembra ?? loc.anoSiembra ?? null,
          ha: loc.ha !== null && loc.ha !== undefined ? Number(loc.ha) : null,
          palmasDiferenciadas: loc.palmas_diferenciadas ?? loc.palmasDiferenciadas ?? null,
          palmasTotales: loc.palmas_totales ?? loc.palmasTotales ?? null,
        }));

        const catalogsPayload = {
          users: mappedUsers,
          supervisors: supervisors || [],
          personnel: mappedPersonnel,
          labors: labors || [],
          activities: mappedActivities,
          locations: mappedLocations,
          equipment: equipment || [],
          performanceReferences: mappedPerformance,
          personnelNovelties: mappedNovelties,
        };

        // Guardar copia local en IndexedDB para cuando no haya red
        offlineStore.saveCatalogs(catalogsPayload);

        callback(catalogsPayload);
      } catch (err) {
        console.warn("Error al cargar catálogos desde Supabase (usando datos locales):", err);
      }
    };

    fetchAllCatalogs();

    // Re-fetch when catalogs change
    const channelId = `public:catalogs:${crypto.randomUUID()}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        fetchAllCatalogs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  // --- CATALOG CRUD OPERATIONS ---

  // Users
  async createUser(input: any): Promise<Result> {
    try {
      const payload = {
        id: crypto.randomUUID(),
        username: input.username,
        username_key: String(input.username || '').trim().toLowerCase(),
        name: input.name,
        role: input.role,
        id_supervisor: input.idSupervisor || null,
        supervisor_id: input.idSupervisor || null,
        pin: input.pin || input.password,
        active: input.active ?? true,
      };
      const { data, error } = await supabase.from('users').insert(payload).select().single();
      if (error) throw error;
      return { ok: true, data };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  async updateUser(id: string, input: any): Promise<Result> {
    try {
      const payload = {
        username: input.username,
        username_key: String(input.username || '').trim().toLowerCase(),
        name: input.name,
        role: input.role,
        id_supervisor: input.idSupervisor || null,
        supervisor_id: input.idSupervisor || null,
        active: input.active,
      };
      const { data, error } = await supabase.from('users').update(payload).eq('id', id).select().single();
      if (error) throw error;
      return { ok: true, data };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  async deleteUser(id: string): Promise<Result> {
    try {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  // Personnel
  async createPersonnel(input: any): Promise<Result> {
    try {
      const payload = {
        id: input.id || crypto.randomUUID(),
        name: input.name || input.nombreCompleto,
        documento: input.documento,
        type: input.type || input.tipoPersonal || 'CAMPO',
        tipo_personal: input.tipoPersonal || input.type || 'CAMPO',
        cuadrilla: input.cuadrilla || '',
        job_title: input.jobTitle || input.job_title || input.laborCargo || '',
        active: input.active !== undefined ? input.active : true,
      };
      const { data, error } = await supabase.from('personnel').insert(payload).select().single();
      if (error) throw error;
      return { ok: true, data };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  async updatePersonnel(id: string, input: any): Promise<Result> {
    try {
      const payload: any = {
        name: input.name || input.nombreCompleto,
        documento: input.documento,
        type: input.type || input.tipoPersonal || 'CAMPO',
        tipo_personal: input.tipoPersonal || input.type || 'CAMPO',
        cuadrilla: input.cuadrilla || '',
        job_title: input.jobTitle || input.job_title || input.laborCargo || '',
      };
      if (input.active !== undefined) payload.active = input.active;
      const { data, error } = await supabase.from('personnel').update(payload).eq('id', id).select().single();
      if (error) throw error;
      return { ok: true, data };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  async deletePersonnel(id: string): Promise<Result> {
    try {
      const { error } = await supabase.from('personnel').delete().eq('id', id);
      if (error) throw error;
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  // Activities
  async createActivity(input: any): Promise<Result> {
    try {
      const payload = {
        id: crypto.randomUUID(),
        name: input.name,
        unit: input.unit,
        labor_id: input.laborId,
        active: input.active ?? true,
      };
      const { data, error } = await supabase.from('activities').insert(payload).select().single();
      if (error) throw error;
      return { ok: true, data };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  async updateActivity(id: string, input: any): Promise<Result> {
    try {
      const payload = {
        name: input.name,
        unit: input.unit,
        labor_id: input.laborId,
        active: input.active,
      };
      const { data, error } = await supabase.from('activities').update(payload).eq('id', id).select().single();
      if (error) throw error;
      return { ok: true, data };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  async deleteActivity(id: string): Promise<Result> {
    try {
      const { error } = await supabase.from('activities').delete().eq('id', id);
      if (error) throw error;
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  // Equipment
  async createEquipment(input: any): Promise<Result> {
    try {
      const payload = {
        id: crypto.randomUUID(),
        name: input.name,
        type: input.type,
        active: input.active ?? true,
      };
      const { data, error } = await supabase.from('equipment').insert(payload).select().single();
      if (error) throw error;
      return { ok: true, data };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  async updateEquipment(id: string, input: any): Promise<Result> {
    try {
      const payload = {
        name: input.name,
        type: input.type,
        active: input.active,
      };
      const { data, error } = await supabase.from('equipment').update(payload).eq('id', id).select().single();
      if (error) throw error;
      return { ok: true, data };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  async deleteEquipment(id: string): Promise<Result> {
    try {
      const { error } = await supabase.from('equipment').delete().eq('id', id);
      if (error) throw error;
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  // Performance References (Rendimientos)
  async createPerformanceReference(input: any): Promise<Result> {
    try {
      const payload = {
        id: input.id || crypto.randomUUID(),
        activity_id: input.activityId || input.activity_id,
        unit: input.unit || 'Jornal',
        performance_per_person_day: Number(input.performancePerPersonDay ?? input.performance_per_person_day ?? 1),
        measurement_type: input.measurementType || input.measurement_type || null,
        source: input.source || 'MANUAL',
        active: input.active !== undefined ? input.active : true,
        version: 1,
      };
      const { data, error } = await supabase.from('performance_references').insert(payload).select().single();
      if (error) throw error;
      return { ok: true, data };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  async updatePerformanceReference(id: string, input: any): Promise<Result> {
    try {
      const payload: any = {
        updated_at: new Date().toISOString(),
      };
      if (input.activityId !== undefined || input.activity_id !== undefined) {
        payload.activity_id = input.activityId || input.activity_id;
      }
      if (input.unit !== undefined) payload.unit = input.unit;
      if (input.performancePerPersonDay !== undefined || input.performance_per_person_day !== undefined) {
        payload.performance_per_person_day = Number(input.performancePerPersonDay ?? input.performance_per_person_day);
      }
      if (input.measurementType !== undefined || input.measurement_type !== undefined) {
        payload.measurement_type = input.measurementType || input.measurement_type;
      }
      if (input.active !== undefined) payload.active = input.active;
      if (input.source !== undefined) payload.source = input.source;

      const { data, error } = await supabase.from('performance_references').update(payload).eq('id', id).select().single();
      if (error) throw error;
      return { ok: true, data };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  async deletePerformanceReference(id: string): Promise<Result> {
    try {
      const { error } = await supabase.from('performance_references').delete().eq('id', id);
      if (error) throw error;
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  // Novedades
  async createNovedad(input: any): Promise<Result> {
    try {
      const payload = {
        id: crypto.randomUUID(),
        tipo: input.tipo,
        persona_documento: input.personaDocumento,
        persona_nombre_fuente: input.personaNombreFuente,
        fecha_inicio: input.fechaInicio,
        fecha_fin: input.fechaFin,
        zona: input.zona || 'N/A',
        estado: input.estado || 'ACTIVA_EN_RANGO_DE_FECHAS',
      };
      const { data, error } = await supabase.from('personnel_novelties').insert(payload).select().single();
      if (error) throw error;
      return { ok: true, data };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  async updateNovedad(id: string, input: any): Promise<Result> {
    try {
      const payload = {
        tipo: input.tipo,
        persona_documento: input.personaDocumento,
        persona_nombre_fuente: input.personaNombreFuente,
        fecha_inicio: input.fechaInicio,
        fecha_fin: input.fechaFin,
        zona: input.zona || 'N/A',
        estado: input.estado || 'ACTIVA_EN_RANGO_DE_FECHAS',
      };
      const { data, error } = await supabase.from('personnel_novelties').update(payload).eq('id', id).select().single();
      if (error) throw error;
      return { ok: true, data };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  async deleteNovedad(id: string): Promise<Result> {
    try {
      const { data, error } = await supabase.from('personnel_novelties').delete().eq('id', id).select().single();
      if (error) throw error;
      return { ok: true, data };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  // Locations (Ubicación: Lotes y Zonas)
  async createLocation(input: any): Promise<Result> {
    try {
      const lotName = String(input.name || '').trim().toUpperCase();
      const zoneName = String(input.zone || '').trim().toUpperCase();
      const cleanCode = lotName.replace(/[^A-Z0-9]/g, '');
      const id = input.id || `UBI-${cleanCode || crypto.randomUUID().slice(0, 6).toUpperCase()}`;

      const payload: any = {
        id,
        name: lotName,
        zone: zoneName,
        active: input.active !== undefined ? input.active : true,
      };

      if (input.anoSiembra !== undefined && input.anoSiembra !== '' && input.anoSiembra !== null) {
        payload.ano_siembra = Number(input.anoSiembra);
      }
      if (input.ha !== undefined && input.ha !== '' && input.ha !== null) {
        payload.ha = Number(input.ha);
      }
      if (input.palmasDiferenciadas !== undefined && input.palmasDiferenciadas !== '' && input.palmasDiferenciadas !== null) {
        payload.palmas_diferenciadas = Number(input.palmasDiferenciadas);
      }
      if (input.palmasTotales !== undefined && input.palmasTotales !== '' && input.palmasTotales !== null) {
        payload.palmas_totales = Number(input.palmasTotales);
      }

      const { data, error } = await supabase.from('locations').insert(payload).select().single();
      if (error) {
        // Fallback si las columnas técnicas aún no han sido migradas en la BD
        if (error.message?.includes('does not exist') || error.code === 'PGRST204' || error.code === '42703') {
          console.warn("Columnas adicionales no encontradas en tabla locations de Supabase. Guardando campos base.", error.message);
          const basicPayload = {
            id: payload.id,
            name: payload.name,
            zone: payload.zone,
            active: payload.active
          };
          const fallbackRes = await supabase.from('locations').insert(basicPayload).select().single();
          if (fallbackRes.error) throw fallbackRes.error;
          return { ok: true, data: fallbackRes.data };
        }
        throw error;
      }
      return { ok: true, data };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  async updateLocation(id: string, input: any): Promise<Result> {
    try {
      const payload: any = {
        updated_at: new Date().toISOString()
      };
      if (input.name !== undefined) payload.name = String(input.name).trim().toUpperCase();
      if (input.zone !== undefined) payload.zone = String(input.zone).trim().toUpperCase();
      if (input.active !== undefined) payload.active = input.active;
      if (input.anoSiembra !== undefined) {
        payload.ano_siembra = (input.anoSiembra === '' || input.anoSiembra === null) ? null : Number(input.anoSiembra);
      }
      if (input.ha !== undefined) {
        payload.ha = (input.ha === '' || input.ha === null) ? null : Number(input.ha);
      }
      if (input.palmasDiferenciadas !== undefined) {
        payload.palmas_diferenciadas = (input.palmasDiferenciadas === '' || input.palmasDiferenciadas === null) ? null : Number(input.palmasDiferenciadas);
      }
      if (input.palmasTotales !== undefined) {
        payload.palmas_totales = (input.palmasTotales === '' || input.palmasTotales === null) ? null : Number(input.palmasTotales);
      }

      const { data, error } = await supabase.from('locations').update(payload).eq('id', id).select().single();
      if (error) {
        if (error.message?.includes('does not exist') || error.code === 'PGRST204' || error.code === '42703') {
          console.warn("Columnas adicionales no encontradas en tabla locations al actualizar. Guardando campos base.", error.message);
          const basicPayload: any = {
            updated_at: new Date().toISOString()
          };
          if (input.name !== undefined) basicPayload.name = String(input.name).trim().toUpperCase();
          if (input.zone !== undefined) basicPayload.zone = String(input.zone).trim().toUpperCase();
          if (input.active !== undefined) basicPayload.active = input.active;
          const fallbackRes = await supabase.from('locations').update(basicPayload).eq('id', id).select().single();
          if (fallbackRes.error) throw fallbackRes.error;
          return { ok: true, data: fallbackRes.data };
        }
        throw error;
      }
      return { ok: true, data };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  async deleteLocation(id: string): Promise<Result> {
    try {
      const { error } = await supabase.from('locations').delete().eq('id', id);
      if (error) throw error;
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }
}

export const repository = new SupabaseRepository();

export const matchPerson = (person: any, target: any): boolean => {
  if (!person || !target) return false;
  const targetStr = String(target).trim().toLowerCase();
  if (!targetStr) return false;

  if (person.id && String(person.id).trim().toLowerCase() === targetStr) return true;
  if (person.documento && String(person.documento).trim().toLowerCase() === targetStr) return true;
  if (person.cedula && String(person.cedula).trim().toLowerCase() === targetStr) return true;
  if (person.name && String(person.name).trim().toLowerCase() === targetStr) return true;
  if (person.nombreCompleto && String(person.nombreCompleto).trim().toLowerCase() === targetStr) return true;

  // Clean "PER-" prefix comparison
  const cleanTarget = targetStr.startsWith('per-') ? targetStr.replace('per-', '') : targetStr;
  const cleanDoc = person.documento ? String(person.documento).trim().toLowerCase().replace('per-', '') : '';
  const cleanId = person.id ? String(person.id).trim().toLowerCase().replace('per-', '') : '';
  if (cleanDoc && cleanDoc === cleanTarget) return true;
  if (cleanId && cleanId === cleanTarget) return true;

  return false;
};
