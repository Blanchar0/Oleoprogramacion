// Gestor Reactivo de Sincronización Automática Offline-First
import { useState, useEffect } from 'react';
import { offlineStore, OutboxItem } from './offlineStore';
import { supabase } from './supabase';

export interface SyncState {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  lastError: string | null;
}

type SyncListener = (state: SyncState) => void;

function syncErrorMessage(error: any): string {
  return error?.message || error?.details || 'No se pudo sincronizar con el servidor.';
}

function isMissingCreatedByColumn(error: any): boolean {
  const message = syncErrorMessage(error).toLowerCase();
  return error?.code === 'PGRST204' && message.includes('created_by');
}

function isDuplicateMachineryOperation(error: any): boolean {
  return error?.code === '23505' && String(error?.message || '').includes('machinery_operations_unique_operation_idx');
}

class SyncManager {
  private state: SyncState = {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    pendingCount: 0,
    isSyncing: false,
    lastSyncTime: null,
    lastError: null,
  };

  private listeners: Set<SyncListener> = new Set();
  private syncInterval: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnlineChange(true));
      window.addEventListener('offline', () => this.handleOnlineChange(false));

      // Actualizar contador inicial
      this.refreshPendingCount();

      // Chequeo periódico cada 30 segundos
      this.syncInterval = setInterval(() => {
        if (this.state.isOnline && !this.state.isSyncing) {
          this.syncNow();
        } else {
          this.refreshPendingCount();
        }
      }, 30000);
    }
  }

  private handleOnlineChange(online: boolean) {
    this.state.isOnline = online;
    this.notify();
    if (online) {
      console.log('Conexión reestablecida. Iniciando sincronización de cola de salida...');
      this.syncNow();
    }
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(l => l({ ...this.state }));
  }

  async refreshPendingCount(): Promise<number> {
    const items = await offlineStore.getPendingOutboxItems();
    this.state.pendingCount = items.length;
    this.notify();
    return items.length;
  }

  /** Descarta solamente operaciones de maquinaria guardadas localmente en este equipo. */
  async discardMachineryPendingItems(): Promise<number> {
    const removed = await offlineStore.removeOutboxItemsByType([
      'MACHINERY_CREATE',
      'MACHINERY_UPDATE',
      'MACHINERY_DELETE',
    ]);
    this.state.lastError = null;
    await this.refreshPendingCount();
    return removed;
  }

  async syncNow(): Promise<{ synced: number; failed: number }> {
    if (this.state.isSyncing) return { synced: 0, failed: 0 };

    const items = await offlineStore.getPendingOutboxItems();
    if (items.length === 0) {
      this.state.pendingCount = 0;
      this.notify();
      return { synced: 0, failed: 0 };
    }

    this.state.isSyncing = true;
    this.state.lastError = null;
    this.notify();

    let synced = 0;
    let failed = 0;

    for (const item of items) {
      try {
        const success = await this.processItem(item);
        if (success) {
          await offlineStore.removeOutboxItem(item.id);
          synced++;
        } else {
          failed++;
        }
      } catch (err: any) {
        console.error(`Error sincronizando elemento ${item.id} (${item.type}):`, err);
        const message = syncErrorMessage(err);
        this.state.lastError = message;
        await offlineStore.markOutboxItemError(item.id, message);
        failed++;
      }
    }

    this.state.isSyncing = false;
    this.state.lastSyncTime = new Date();
    await this.refreshPendingCount();
    return { synced, failed };
  }

  private async processItem(item: OutboxItem): Promise<boolean> {
    const { type, payload } = item;

    switch (type) {
      case 'PROGRAMMING_CREATE': {
        const { error } = await supabase.from('programming').insert(payload);
        if (error) throw error;
        return true;
      }
      case 'PROGRAMMING_UPDATE': {
        const { id, ...data } = payload;
        const { error } = await supabase.from('programming').update(data).eq('id', id);
        if (error) throw error;
        return true;
      }
      case 'PROGRAMMING_DELETE': {
        const { error } = await supabase.from('programming').delete().eq('id', payload.id);
        if (error) throw error;
        return true;
      }
      case 'ABSENCE_CREATE': {
        const sanitized = {
          ...payload,
          supervisor_id: payload.supervisor_id || payload.id_supervisor || 'ADMIN',
          id_supervisor: payload.id_supervisor || payload.supervisor_id || 'ADMIN',
        };
        const { error } = await supabase.from('absences').insert(sanitized);
        if (error) throw error;
        return true;
      }
      case 'ABSENCE_UPDATE': {
        const { id, ...data } = payload;
        const { error } = await supabase.from('absences').update(data).eq('id', id);
        if (error) throw error;
        return true;
      }
      case 'ABSENCE_DELETE': {
        const { error } = await supabase.from('absences').delete().eq('id', payload.id);
        if (error) throw error;
        return true;
      }
      case 'MACHINERY_CREATE': {
        const machineryPayload = {
          ...payload,
          operation_key: payload.operation_key || `${payload.date}|${payload.equipment_id}|${payload.operator_id}`,
        };
        const { data: existing, error: existingError } = await supabase
          .from('machinery_operations')
          .select('id')
          .eq('date', machineryPayload.date)
          .eq('equipment_id', machineryPayload.equipment_id)
          .eq('operator_id', machineryPayload.operator_id)
          .limit(1);
        if (existingError) throw existingError;
        if (existing && existing.length > 0) return true;

        let { error } = await supabase.from('machinery_operations').insert(machineryPayload);
        // Compatibilidad con registros puestos en cola antes de que la columna
        // created_by existiera en la base de datos remota.
        if (error && isMissingCreatedByColumn(error)) {
          const { created_by: _createdBy, ...legacyPayload } = machineryPayload;
          ({ error } = await supabase.from('machinery_operations').insert(legacyPayload));
        }
        // Si el usuario tocó varias veces guardar mientras no había conexión,
        // basta conservar la primera operación y retirar la repetida de la cola.
        if (error && isDuplicateMachineryOperation(error)) return true;
        if (error) throw error;
        return true;
      }
      case 'MACHINERY_UPDATE': {
        const { id, ...data } = payload;
        const { error } = await supabase.from('machinery_operations').update(data).eq('id', id);
        if (error) throw error;
        return true;
      }
      case 'MACHINERY_DELETE': {
        const { error } = await supabase.from('machinery_operations').delete().eq('id', payload.id);
        if (error) throw error;
        return true;
      }
      default:
        console.warn('Tipo de elemento en Outbox no reconocido:', type);
        return true;
    }
  }
}

export const syncManager = new SyncManager();

export function useSyncStatus(): SyncState & {
  syncNow: () => Promise<any>;
  discardMachineryPendingItems: () => Promise<number>;
} {
  const [state, setState] = useState<SyncState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    pendingCount: 0,
    isSyncing: false,
    lastSyncTime: null,
    lastError: null,
  });

  useEffect(() => {
    const unsub = syncManager.subscribe(setState);
    return unsub;
  }, []);

  return {
    ...state,
    syncNow: () => syncManager.syncNow(),
    discardMachineryPendingItems: () => syncManager.discardMachineryPendingItems(),
  };
}
