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
  updateProgramming(id: string, input: any, expectedVersion: number): Promise<Result>;

  subscribeAbsences(filters: any, callback: (data: any[]) => void): Unsubscribe;
  createAbsence(input: any): Promise<Result>;
  updateAbsence(id: string, input: any, expectedVersion: number): Promise<Result>;

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
        zoneSnapshot: item.zone_snapshot,
        loteSnapshot: item.lote_snapshot,
        personnelIds: item.personnel_ids || [],
        creationMethod: item.creation_method || 'MANUAL',
        needsReview: item.needs_review ?? false,
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
      const payload = {
        id: crypto.randomUUID(),
        date: input.date,
        supervisor_id: input.supervisorId || input.idSupervisor,
        id_supervisor: input.idSupervisor || input.supervisorId,
        labor_id: input.laborId,
        activity_id: input.activityId,
        location_id: input.locationId,
        zone_snapshot: input.zoneSnapshot || null,
        lote_snapshot: input.loteSnapshot || null,
        personnel_ids: input.personnelIds || [],
        observations: input.observations || '',
        performance: input.performance || null,
        status: input.status || 'PENDIENTE',
        creation_method: input.creationMethod || 'MANUAL',
        needs_review: input.needsReview || false,
        version: 1,
      };

      const { data, error } = await supabase.from('programming').insert(payload).select().single();
      if (error) throw error;
      return { ok: true, data };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  async updateProgramming(id: string, input: any, expectedVersion: number): Promise<Result> {
    try {
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

      const payload: any = {
        version: expectedVersion + 1,
        updated_at: new Date().toISOString(),
      };

      if (input.status !== undefined) payload.status = input.status;
      if (input.observations !== undefined) payload.observations = input.observations;
      if (input.personnelIds !== undefined) payload.personnel_ids = input.personnelIds;
      if (input.performance !== undefined) payload.performance = input.performance;
      if (input.needsReview !== undefined) payload.needs_review = input.needsReview;

      const { error } = await supabase.from('programming').update(payload).eq('id', id);
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
      const mapped = (data || []).map((item: any) => ({
        ...item,
        supervisorId: item.supervisor_id || item.id_supervisor,
        idSupervisor: item.id_supervisor || item.supervisor_id,
        equipmentId: item.equipment_id,
        operatorName: item.operator_name,
        activityId: item.activity_id,
        locationId: item.location_id,
        initialHourMeter: item.initial_hour_meter,
        finalHourMeter: item.final_hour_meter,
        effectiveHours: item.effective_hours,
      }));
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
      const payload = {
        id: crypto.randomUUID(),
        date: input.date,
        supervisor_id: input.supervisorId || input.idSupervisor,
        id_supervisor: input.idSupervisor || input.supervisorId,
        equipment_id: input.equipmentId,
        operator_name: input.operatorName,
        activity_id: input.activityId,
        location_id: input.locationId,
        initial_hour_meter: input.initial_hour_meter,
        final_hour_meter: input.final_hour_meter,
        effective_hours: input.effectiveHours,
        observations: input.observations || '',
        status: input.status || 'CONFIRMADA',
        version: 1,
      };

      const { data, error } = await supabase.from('machinery_operations').insert(payload).select().single();
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
      if (current.version !== expectedVersion) {
        throw new Error("CONFLICT");
      }

      const payload: any = {
        version: expectedVersion + 1,
        updated_at: new Date().toISOString(),
      };
      if (input.status !== undefined) payload.status = input.status;
      if (input.observations !== undefined) payload.observations = input.observations;

      const { error } = await supabase.from('machinery_operations').update(payload).eq('id', id);
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

        callback({
          users: mappedUsers,
          supervisors: supervisors || [],
          personnel: personnel || [],
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
}

export const repository = new SupabaseRepository();
