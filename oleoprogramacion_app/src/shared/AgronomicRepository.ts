import { supabase } from './supabase';

export interface Result {
  ok: boolean;
  error?: string;
  data?: any;
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
  updateMachineryOperation(id: string, input: any, expectedVersion: number): Promise<Result>;

  subscribeCatalogs(callback: (data: any) => void): Unsubscribe;
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
    const fetchData = async () => {
      let query = supabase.from('programming').select('*');
      if (filters.date) query = query.eq('date', filters.date);
      if (filters.supervisorId !== undefined && filters.supervisorId !== null) {
        query = query.eq('id_supervisor', filters.supervisorId);
      }
      const { data, error } = await query;
      if (error) {
        console.error("Programming fetch error:", error);
        return;
      }
      // Map back to camelCase properties for frontend compatibility
      const mapped = (data || []).map((item: any) => ({
        ...item,
        supervisorId: item.supervisor_id || item.id_supervisor,
        idSupervisor: item.id_supervisor || item.supervisor_id,
        laborId: item.labor_id,
        activityId: item.activity_id,
        locationId: item.location_id,
        locationIds: item.location_ids || (item.location_id ? item.location_id.split(',').map((s: string) => s.trim()).filter(Boolean) : []),
        zoneSnapshot: item.zone_snapshot,
        loteSnapshot: item.lote_snapshot,
        personnelIds: item.personnel_ids || [],
        creationMethod: item.creation_method || 'MANUAL',
        needsReview: item.needs_review ?? false,
        performancePerPerson: item.performance_per_person,
        expectedTotalQuantity: item.expected_total_quantity,
      }));
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
    try {
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
        personnel_ids: input.personnelIds || [],
        observations: input.observations || '',
        performance: input.performance || null,
        status: input.status || 'PENDIENTE',
        creation_method: input.creationMethod || 'MANUAL',
        needs_review: input.needsReview || false,
        performance_per_person: input.performancePerPerson,
        expected_total_quantity: input.expectedTotalQuantity,
        version: 1,
      };

      const { data, error } = await supabase.from('programming').insert(payload).select().single();
      if (error) throw error;
      return { ok: true, data };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  async updateProgramming(id: string, input: any, expectedVersion?: number): Promise<Result> {
    try {
      let nextVersion = expectedVersion !== undefined && expectedVersion !== null ? expectedVersion + 1 : undefined;

      if (expectedVersion !== undefined && expectedVersion !== null) {
        // Optimistic concurrency check
        const { data: current, error: fetchErr } = await supabase
          .from('programming')
          .select('version')
          .eq('id', id)
          .single();

        if (fetchErr) throw fetchErr;
        if (current.version !== expectedVersion) {
          throw new Error("CONFLICT");
        }
      }

      const payload: any = {
        updated_at: new Date().toISOString(),
      };

      if (nextVersion !== undefined) payload.version = nextVersion;
      if (input.date !== undefined) payload.date = input.date;
      if (input.idSupervisor !== undefined || input.supervisorId !== undefined) {
        payload.id_supervisor = input.idSupervisor || input.supervisorId;
        payload.supervisor_id = input.supervisorId || input.idSupervisor;
      }
      if (input.laborId !== undefined) payload.labor_id = input.laborId;
      if (input.locationIds !== undefined) {
        payload.location_id = Array.isArray(input.locationIds) ? input.locationIds.join(',') : input.locationIds;
      } else if (input.locationId !== undefined) {
        payload.location_id = input.locationId;
      }
      if (input.zoneSnapshot !== undefined) payload.zone_snapshot = input.zoneSnapshot;
      if (input.loteSnapshot !== undefined) payload.lote_snapshot = input.loteSnapshot;
      if (input.personnelIds !== undefined) payload.personnel_ids = input.personnelIds;
      if (input.observations !== undefined) payload.observations = input.observations;
      if (input.performance !== undefined) payload.performance = input.performance;
      if (input.performancePerPerson !== undefined) payload.performance_per_person = input.performancePerPerson;
      if (input.expectedTotalQuantity !== undefined) payload.expected_total_quantity = input.expectedTotalQuantity;
      if (input.status !== undefined) payload.status = input.status;
      if (input.needsReview !== undefined) payload.needs_review = input.needsReview;

      const { error } = await supabase.from('programming').update(payload).eq('id', id);
      if (error) throw error;

      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  async deleteProgramming(id: string): Promise<Result> {
    try {
      const { error } = await supabase.from('programming').delete().eq('id', id);
      if (error) throw error;
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  // -- ABSENCES --
  subscribeAbsences(filters: any, callback: (data: any[]) => void): Unsubscribe {
    const fetchData = async () => {
      let query = supabase.from('absences').select('*');
      if (filters.date) query = query.eq('date', filters.date);
      if (filters.supervisorId !== undefined && filters.supervisorId !== null) {
        query = query.eq('id_supervisor', filters.supervisorId);
      }
      const { data, error } = await query;
      if (error) {
        console.error("Absences fetch error:", error);
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
    try {
      const payload = {
        id: crypto.randomUUID(),
        date: input.date,
        supervisor_id: input.supervisorId || input.idSupervisor,
        id_supervisor: input.idSupervisor || input.supervisorId,
        personnel_id: input.personnelId,
        personnel_doc: input.personnelDoc,
        personnel_name: input.personnelName,
        reason: input.reason,
        custom_reason: input.customReason || null,
        observations: input.observations || '',
        status: input.status || 'REGISTRADA',
        version: 1,
      };

      const { data, error } = await supabase.from('absences').insert(payload).select().single();
      if (error) throw error;
      return { ok: true, data };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  async updateAbsence(id: string, input: any, expectedVersion: number): Promise<Result> {
    try {
      const { data: current, error: fetchErr } = await supabase
        .from('absences')
        .select('version')
        .eq('id', id)
        .single();

      if (fetchErr) throw fetchErr;
      if (current.version !== expectedVersion) {
        throw new Error("CONFLICT");
      }

      const payload: any = {
        version: expectedVersion + 1,
        updated_at: new Date().toISOString(),
      };
      if (input.status !== undefined) payload.status = input.status;
      if (input.observations !== undefined) payload.observations = input.observations;

      const { error } = await supabase.from('absences').update(payload).eq('id', id);
      if (error) throw error;
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  async deleteAbsence(id: string): Promise<Result> {
    try {
      const { error } = await supabase.from('absences').delete().eq('id', id);
      if (error) throw error;
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  // -- MACHINERY --
  subscribeMachinery(filters: any, callback: (data: any[]) => void): Unsubscribe {
    const fetchData = async () => {
      let query = supabase.from('machinery_operations').select('*');
      if (filters.date) query = query.eq('date', filters.date);
      if (filters.supervisorId !== undefined && filters.supervisorId !== null) {
        query = query.eq('id_supervisor', filters.supervisorId);
      }
      const { data, error } = await query;
      if (error) {
        console.error("Machinery fetch error:", error);
        return;
      }
      const mapped = (data || []).map((item: any) => {
        let zoneSnap = item.zone_snapshot;
        let sTime = item.start_time || item.startTime;
        let eTime = item.end_time || item.endTime;
        let obs = item.observations || '';

        // Extract metadata if it was stored in observations during schema fallback
        if (!zoneSnap && obs.startsWith('[Zonas:')) {
          const match = obs.match(/^\[Zonas:\s*([^\]]+)\]\s*(.*)$/);
          if (match) {
            zoneSnap = match[1];
            obs = match[2];
          }
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
      supabase.removeChannel(channel);
    };
  }

  async createMachineryOperation(input: any): Promise<Result> {
    try {
      const supId = input.supervisorId || input.idSupervisor || 'SUP001';
      const payload: Record<string, any> = {
        id: crypto.randomUUID(),
        date: input.date,
        supervisor_id: supId,
        id_supervisor: supId,
        equipment_id: input.equipmentId,
        operator_id: input.operatorId || null,
        operator_name: input.operatorName || null,
        labor_id: input.laborId || input.labor_id || null,
        activity_id: input.activityId || input.activity_id || null,
        location_id: input.locationId || null,
        zone_snapshot: input.zoneSnapshot || null,
        initial_hour_meter: input.initialHourMeter || null,
        final_hour_meter: input.finalHourMeter || null,
        effective_hours: input.effectiveHours || null,
        observations: input.observations || '',
        start_time: input.startTime || null,
        status: input.status || 'EN_PROGRESO',
        version: 1,
      };

      // Only include end_time if explicitly provided with a value
      if (input.endTime || input.end_time) {
        payload.end_time = input.endTime || input.end_time;
      }

      let { data, error } = await supabase.from('machinery_operations').insert(payload).select().single();

      // Dynamic fallback if columns are missing from the schema cache (pre-migration)
      if (error && error.message && (error.message.includes('schema cache') || error.message.includes('column'))) {
        console.warn("Machinery insert schema mismatch, attempting fallback with standard columns:", error.message);
        const fallbackObservations = payload.zone_snapshot
          ? `[Zonas: ${payload.zone_snapshot}] ${payload.observations || ''}`.trim()
          : (payload.observations || '');

        const fallbackPayload: Record<string, any> = {
          id: payload.id,
          date: payload.date,
          supervisor_id: payload.supervisor_id,
          id_supervisor: payload.id_supervisor,
          equipment_id: payload.equipment_id,
          operator_name: payload.operator_name || payload.operator_id,
          activity_id: payload.activity_id,
          location_id: payload.location_id,
          observations: fallbackObservations,
          status: payload.status,
          version: 1,
        };

        const resFallback = await supabase.from('machinery_operations').insert(fallbackPayload).select().single();
        if (resFallback.error) throw resFallback.error;
        data = resFallback.data;
        error = null;
      }

      if (error) throw error;
      return { ok: true, data };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  async updateMachineryOperation(id: string, input: any, expectedVersion: number): Promise<Result> {
    try {
      const { data: current, error: fetchErr } = await supabase
        .from('machinery_operations')
        .select('version')
        .eq('id', id)
        .single();

      if (fetchErr) throw fetchErr;
      if (current && current.version !== expectedVersion) {
        throw new Error("CONFLICT");
      }

      const payload: any = {
        version: expectedVersion + 1,
        updated_at: new Date().toISOString(),
      };
      if (input.status !== undefined) payload.status = input.status;
      if (input.endTime !== undefined) payload.end_time = input.endTime;
      if (input.end_time !== undefined) payload.end_time = input.end_time;
      if (input.observations !== undefined) payload.observations = input.observations;

      let { error } = await supabase.from('machinery_operations').update(payload).eq('id', id);

      // Fallback if end_time or other updated columns are missing from schema cache
      if (error && error.message && (error.message.includes('schema cache') || error.message.includes('column'))) {
        console.warn("Machinery update schema mismatch, updating status only:", error.message);
        const fallbackPayload: any = {
          version: expectedVersion + 1,
          updated_at: new Date().toISOString(),
        };
        if (input.status !== undefined) fallbackPayload.status = input.status;
        const resFallback = await supabase.from('machinery_operations').update(fallbackPayload).eq('id', id);
        if (resFallback.error) throw resFallback.error;
        error = null;
      }

      if (error) throw error;
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  // -- CATALOGS --
  subscribeCatalogs(callback: (data: any) => void): Unsubscribe {
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

        callback({
          users: mappedUsers,
          supervisors: supervisors || [],
          personnel: mappedPersonnel,
          labors: labors || [],
          activities: mappedActivities,
          locations: locations || [],
          equipment: equipment || [],
          performanceReferences: mappedPerformance,
          personnelNovelties: mappedNovelties,
        });
      } catch (err) {
        console.error("Error loading catalogs:", err);
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

  // Personnel
  async createPersonnel(input: any): Promise<Result> {
    try {
      const payload = {
        id: input.id || `PER-${input.documento || crypto.randomUUID().slice(0,8)}`,
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
