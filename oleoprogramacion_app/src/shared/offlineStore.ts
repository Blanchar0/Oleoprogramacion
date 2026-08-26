// IndexedDB Storage Layer para Oleoprogramación PWA (Offline-First)

export interface OutboxItem {
  id: string;
  type: 
    | 'PROGRAMMING_CREATE' 
    | 'PROGRAMMING_UPDATE' 
    | 'PROGRAMMING_DELETE'
    | 'ABSENCE_CREATE'
    | 'ABSENCE_UPDATE'
    | 'ABSENCE_DELETE'
    | 'MACHINERY_CREATE'
    | 'MACHINERY_UPDATE'
    | 'MACHINERY_DELETE';
  payload: any;
  createdAt: string;
  status: 'PENDIENTE' | 'PROCESANDO' | 'ERROR';
  retries: number;
  errorMessage?: string;
}

const DB_NAME = 'OleoprogramacionOfflineDB';
const DB_VERSION = 1;

class OfflineStore {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return reject(new Error('IndexedDB no está disponible'));
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Almacén de Catálogos (personal, labores, actividades, etc.)
        if (!db.objectStoreNames.contains('catalogs')) {
          db.createObjectStore('catalogs', { keyPath: 'key' });
        }

        // Almacén de Cola de Salida (Outbox Queue para sincronización offline)
        if (!db.objectStoreNames.contains('outbox')) {
          const outboxStore = db.createObjectStore('outbox', { keyPath: 'id' });
          outboxStore.createIndex('status', 'status', { unique: false });
          outboxStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Almacén de Datos Diarios Cacheados (para ver programaciones/maquinaria offline)
        if (!db.objectStoreNames.contains('daily_records')) {
          const dailyStore = db.createObjectStore('daily_records', { keyPath: 'cacheKey' });
          dailyStore.createIndex('date', 'date', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  // --- CATÁLOGOS LOCALES ---
  async saveCatalogs(catalogsData: any): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('catalogs', 'readwrite');
      const store = tx.objectStore('catalogs');
      store.put({ key: 'main_catalogs', data: catalogsData, updatedAt: new Date().toISOString() });
      await new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = reject;
      });
    } catch (e) {
      console.warn('Error guardando catálogos en IndexedDB:', e);
      try {
        localStorage.setItem('offline_catalogs_backup', JSON.stringify(catalogsData));
      } catch (err) {}
    }
  }

  async getCatalogs(): Promise<any | null> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('catalogs', 'readonly');
      const store = tx.objectStore('catalogs');
      const req = store.get('main_catalogs');
      const result: any = await new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = reject;
      });
      if (result && result.data) return result.data;
    } catch (e) {
      console.warn('Error leyendo catálogos de IndexedDB:', e);
    }
    
    // Fallback localStorage
    try {
      const backup = localStorage.getItem('offline_catalogs_backup');
      if (backup) return JSON.parse(backup);
    } catch (err) {}
    return null;
  }

  // --- COLA DE SALIDA (OUTBOX) ---
  async addOutboxItem(item: Omit<OutboxItem, 'createdAt' | 'status' | 'retries'>): Promise<OutboxItem> {
    const fullItem: OutboxItem = {
      ...item,
      createdAt: new Date().toISOString(),
      status: 'PENDIENTE',
      retries: 0
    };

    try {
      const db = await this.getDB();
      const tx = db.transaction('outbox', 'readwrite');
      const store = tx.objectStore('outbox');
      store.put(fullItem);
      await new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = reject;
      });
    } catch (e) {
      console.warn('Error guardando en Outbox IndexedDB:', e);
    }
    return fullItem;
  }

  async getPendingOutboxItems(): Promise<OutboxItem[]> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('outbox', 'readonly');
      const store = tx.objectStore('outbox');
      const req = store.getAll();
      const items: OutboxItem[] = await new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = reject;
      });
      return items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } catch (e) {
      console.warn('Error obteniendo Outbox:', e);
      return [];
    }
  }

  async removeOutboxItem(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('outbox', 'readwrite');
      const store = tx.objectStore('outbox');
      store.delete(id);
      await new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = reject;
      });
    } catch (e) {
      console.warn('Error eliminando de Outbox:', e);
    }
  }

  async markOutboxItemError(id: string, errorMessage: string): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('outbox', 'readwrite');
      const store = tx.objectStore('outbox');
      const req = store.get(id);
      req.onsuccess = () => {
        const item: OutboxItem = req.result;
        if (item) {
          item.status = 'ERROR';
          item.retries = (item.retries || 0) + 1;
          item.errorMessage = errorMessage;
          store.put(item);
        }
      };
    } catch (e) {
      console.warn('Error marcando error en Outbox:', e);
    }
  }

  // --- CACHÉ DE REGISTROS DIARIOS ---
  async saveDailyCache(collection: 'programming' | 'absences' | 'machinery', date: string, items: any[]): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('daily_records', 'readwrite');
      const store = tx.objectStore('daily_records');
      const cacheKey = `${collection}_${date}`;
      store.put({ cacheKey, collection, date, items, updatedAt: new Date().toISOString() });
    } catch (e) {}
  }

  async getDailyCache(collection: 'programming' | 'absences' | 'machinery', date: string): Promise<any[] | null> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('daily_records', 'readonly');
      const store = tx.objectStore('daily_records');
      const cacheKey = `${collection}_${date}`;
      const req = store.get(cacheKey);
      const res: any = await new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = reject;
      });
      return res ? res.items : null;
    } catch (e) {
      return null;
    }
  }
}

export const offlineStore = new OfflineStore();
