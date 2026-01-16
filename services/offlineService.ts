import { Order, MenuItem } from '../types';

const DB_NAME = 'ieatpos_offline';
const DB_VERSION = 1;
const STORES = {
  ORDERS: 'orders',
  PRODUCTS: 'products',
  SYNC_QUEUE: 'sync_queue',
  CACHE: 'cache'
};

interface SyncOperation {
  id: string;
  type: 'create_order' | 'update_order' | 'payment' | 'inventory';
  data: any;
  timestamp: number;
  status: 'pending' | 'failed';
  attempts: number;
}

class OfflineStorageService {
  private db: IDBDatabase | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        resolve();
      };

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains(STORES.ORDERS)) {
          db.createObjectStore(STORES.ORDERS, { keyPath: 'uuid' });
        }

        if (!db.objectStoreNames.contains(STORES.PRODUCTS)) {
          db.createObjectStore(STORES.PRODUCTS, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
          syncStore.createIndex('status', 'status', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.CACHE)) {
          db.createObjectStore(STORES.CACHE, { keyPath: 'key' });
        }
      };
    });
  }

  private getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): IDBObjectStore {
    if (!this.db) throw new Error('Database not initialized');
    const transaction = this.db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  async saveOrder(order: Order): Promise<void> {
    await this.initialize();
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.ORDERS, 'readwrite');
      const request = store.put(order);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getOrder(orderId: string): Promise<Order | null> {
    await this.initialize();
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.ORDERS);
      const request = store.get(orderId);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async getAllOrders(): Promise<Order[]> {
    await this.initialize();
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.ORDERS);
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async deleteOrder(orderId: string): Promise<void> {
    await this.initialize();
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.ORDERS, 'readwrite');
      const request = store.delete(orderId);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async saveProducts(products: MenuItem[]): Promise<void> {
    await this.initialize();
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.PRODUCTS, 'readwrite');
      const transaction = this.db!.transaction(STORES.PRODUCTS, 'readwrite');

      transaction.onerror = () => reject(transaction.error);
      transaction.oncomplete = () => resolve();

      products.forEach(product => {
        store.put(product);
      });
    });
  }

  async getProducts(): Promise<MenuItem[]> {
    await this.initialize();
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.PRODUCTS);
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async queueSyncOperation(
    type: 'create_order' | 'update_order' | 'payment' | 'inventory',
    data: any
  ): Promise<string> {
    await this.initialize();

    const operation: SyncOperation = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
      status: 'pending',
      attempts: 0
    };

    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.SYNC_QUEUE, 'readwrite');
      const request = store.add(operation);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(operation.id);
    });
  }

  async getPendingSyncOperations(): Promise<SyncOperation[]> {
    await this.initialize();
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.SYNC_QUEUE);
      const index = store.index('status');
      const request = index.getAll('pending');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const results = request.result || [];
        resolve(results.sort((a, b) => a.timestamp - b.timestamp));
      };
    });
  }

  async markSyncOperationComplete(operationId: string): Promise<void> {
    await this.initialize();
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.SYNC_QUEUE, 'readwrite');
      const request = store.delete(operationId);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async markSyncOperationFailed(operationId: string): Promise<void> {
    await this.initialize();
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.SYNC_QUEUE, 'readwrite');
      const getRequest = store.get(operationId);

      getRequest.onerror = () => reject(getRequest.error);
      getRequest.onsuccess = () => {
        const operation = getRequest.result;
        if (operation) {
          operation.status = 'failed';
          operation.attempts += 1;
          const putRequest = store.put(operation);
          putRequest.onerror = () => reject(putRequest.error);
          putRequest.onsuccess = () => resolve();
        }
      };
    });
  }

  async getCacheEntry(key: string): Promise<any | null> {
    await this.initialize();
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.CACHE);
      const request = store.get(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const entry = request.result;
        if (entry && entry.expiresAt > Date.now()) {
          resolve(entry.value);
        } else {
          resolve(null);
        }
      };
    });
  }

  async setCacheEntry(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    await this.initialize();
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.CACHE, 'readwrite');
      const request = store.put({
        key,
        value,
        expiresAt: Date.now() + ttlSeconds * 1000
      });
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clearExpiredCache(): Promise<void> {
    await this.initialize();
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.CACHE, 'readwrite');
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const entries = request.result || [];
        const transaction = this.db!.transaction(STORES.CACHE, 'readwrite');

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);

        entries.forEach(entry => {
          if (entry.expiresAt < Date.now()) {
            store.delete(entry.key);
          }
        });
      };
    });
  }

  async clearAll(): Promise<void> {
    await this.initialize();
    const storeNames = [STORES.ORDERS, STORES.PRODUCTS, STORES.SYNC_QUEUE, STORES.CACHE];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeNames, 'readwrite');
      transaction.onerror = () => reject(transaction.error);
      transaction.oncomplete = () => resolve();

      storeNames.forEach(storeName => {
        transaction.objectStore(storeName).clear();
      });
    });
  }

  async isOnline(): Promise<boolean> {
    return navigator.onLine;
  }

  async waitForOnline(maxWaitMs: number = 30000): Promise<boolean> {
    if (navigator.onLine) return true;

    return new Promise(resolve => {
      const handleOnline = () => {
        window.removeEventListener('online', handleOnline);
        resolve(true);
      };

      window.addEventListener('online', handleOnline);

      setTimeout(() => {
        window.removeEventListener('online', handleOnline);
        resolve(false);
      }, maxWaitMs);
    });
  }
}

export const offlineStorage = new OfflineStorageService();
