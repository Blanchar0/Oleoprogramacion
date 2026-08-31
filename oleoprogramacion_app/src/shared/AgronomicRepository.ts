import { supabase } from './supabase';
import { offlineStore } from './offlineStore';
import { syncManager } from './syncManager';

export interface Result {
  ok: boolean;
  error?: string;
  data?: any;
  offline?: boolean;
}

export type Unsubscribe = () => void;

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
  createPerformanceReference(input: any): Promise<Result>;
  updatePerformanceReference(id: string, input: any): Promise<Result>;
  deletePerformanceReference(id: string): Promise<Result>;
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
        let sTime = item.start_time || item.startTime;
        let eTime = item.end_time || item.endTime;
        let obs = item.observations || '';

        // Extract metadata if it was stored in observations during schema fallback
        if (obs) {
          if (!zoneSnap && obs.includes('[Zonas:')) {
            const matchZ = obs.match(/\[Zonas:\s*([^\]]+)\]/i);
            if (matchZ) zoneSnap = matchZ[1];
          }
          if (!sTime && obs.includes('[Inicio:')) {
            const matchI = obs.match(/\[Inicio:\s*([^\]]+)\]/i);
            if (matchI) sTime = matchI[1];
          }
          if (!eTime && obs.includes('[Fin:')) {
            const matchF = obs.match(/\[Fin:\s*([^\]]+)\]/i);
            if (matchF) eTime = matchF[1];
          }
          // Clean fallback tags from user-facing observations
          obs = obs
            .replace(/\[Zonas:\s*[^\]]+\]/gi, '')
            .replace(/\[Inicio:\s*[^\]]+\]/gi, '')
            .replace(/\[Fin:\s*[^\]]+\]/gi, '')
            .trim();
        }

        if (!sTime && item.created_at) {
          try {
            sTime = new Date(item.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' });
          } catch (e) { }
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
          locationId: item.location_id,
          zoneSnapshot: zoneSnap,
          initialHourMeter: item.initial_hour_meter,
          finalHourMeter: item.final_hour_meter,
          effectiveHours: item.effective_hours,
          observations: obs,
          startTime: sTime,
          endTime: eTime,
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
    const sTime = input.startTime || new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' });
    const eTime = input.endTime || input.end_time || '';

    const combinedObservations = [
      input.zoneSnapshot ? `[Zonas: ${input.zoneSnapshot}]` : '',
      sTime ? `[Inicio: ${sTime}]` : '',
      eTime ? `[Fin: ${eTime}]` : '',
      input.observations || ''
    ].filter(Boolean).join(' ').trim();

    const payload: Record<string, any> = {
      id: crypto.randomUUID(),
      date: input.date,
      supervisor_id: supId,
      id_supervisor: supId,
      equipment_id: input.equipmentId,
      operator_name: opName,
      activity_id: input.activityId || input.activity_id || null,
      location_id: input.locationId || null,
      observations: combinedObservations,
      status: input.status || 'EN_PROGRESO',
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
      const { data, error } = await supabase.from('machinery_operations').insert(payload).select().single();
      if (error) throw error;
      return { ok: true, data };
    } catch (e: any) {
      console.warn("Fallo guardado de maquinaria en Supabase, guardando en Outbox:", e.message);
      await offlineStore.addOutboxItem({
        id: payload.id,
        type: 'MACHINERY_CREATE',
        payload
      });
      syncManager.refreshPendingCount();
      return { ok: true, data: payload, offline: true };
    }
  }

  async updateMachineryOperation(id: string, input: any, expectedVersion?: number): Promise<Result> {
    let existingZone = '';
    let existingStart = '';
    let existingEnd = '';
    let existingObs = '';

    if (input.observations) existingObs = input.observations;

    const zonePart = input.zoneSnapshot !== undefined ? input.zoneSnapshot : existingZone;
    const startPart = input.startTime !== undefined ? input.startTime : (input.start_time !== undefined ? input.start_time : existingStart);
    const endPart = input.endTime !== undefined ? input.endTime : (input.end_time !== undefined ? input.end_time : existingEnd);
    const userObsPart = input.observations !== undefined ? input.observations : existingObs;

    const combinedObservations = [
      zonePart ? `[Zonas: ${zonePart}]` : '',
      startPart ? `[Inicio: ${startPart}]` : '',
      endPart ? `[Fin: ${endPart}]` : '',
      userObsPart || ''
    ].filter(Boolean).join(' ').trim();

    const payload: any = {
      updated_at: new Date().toISOString(),
      observations: combinedObservations
    };

    if (input.status !== undefined) payload.status = input.status;
    if (input.date !== undefined) payload.date = input.date;
    if (input.equipmentId !== undefined || input.equipment_id !== undefined) {
      payload.equipment_id = input.equipmentId || input.equipment_id;
    }
    if (input.operatorName !== undefined || input.operator_name !== undefined || input.operatorId !== undefined) {
      payload.operator_name = input.operatorName || input.operator_name || input.operatorId;
    }
    if (input.activityId !== undefined || input.activity_id !== undefined) {
      payload.activity_id = input.activityId || input.activity_id;
    }
    if (input.locationId !== undefined || input.location_id !== undefined) {
      payload.location_id = input.locationId || input.location_id;
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
      console.warn("Fallo update de maquinaria en Supabase, guardando en Outbox:", e.message);
      await offlineStore.addOutboxItem({
        id,
        type: 'MACHINERY_UPDATE',
        payload: { id, ...payload }
      });
      syncManager.refreshPendingCount();
      return { ok: true, offline: true };
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
      await offlineStore.addOutboxItem({
        id,
        type: 'MACHINERY_DELETE',
        payload: { id }
      });
      syncManager.refreshPendingCount();
      return { ok: true, offline: true };
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
          idSupervisor: u.id_supervisor,
          supervisorId: u.supervisor_id,
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

        const catalogsPayload = {
          users: mappedUsers,
          supervisors: supervisors || [],
          personnel: mappedPersonnel,
          labors: labors || [],
          activities: mappedActivities,
          locations: locations || [],
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
        password: input.password,
        name: input.name,
        role: input.role,
        id_supervisor: input.idSupervisor || null,
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
        name: input.name,
        role: input.role,
        id_supervisor: input.idSupervisor || null,
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
