
import { Order, MenuItem, SyncStatus, InventoryLog, Employee, Role } from '../types';
import { INITIAL_INVENTORY } from '../constants';

const DB_KEY_ORDERS = 'ieat_pos_orders_v2';
const DB_KEY_PRODUCTS = 'ieat_pos_products_v2';
const DB_KEY_LOGS = 'ieat_pos_logs_v2';
const DB_KEY_USERS = 'ieat_pos_users_v2';

// Default Admin for initial login
const DEFAULT_ADMIN: Employee = {
    id: 'admin-1',
    name: 'Admin User',
    pin: '1234',
    role: Role.Admin,
    email: 'admin@ieat.com'
};

class LocalDB {
  // --- Orders ---
  private getOrderStore(): Order[] {
    const data = localStorage.getItem(DB_KEY_ORDERS);
    return data ? JSON.parse(data) : [];
  }

  private saveOrderStore(orders: Order[]) {
    localStorage.setItem(DB_KEY_ORDERS, JSON.stringify(orders));
  }

  getOrders(): Order[] {
    return this.getOrderStore().sort((a, b) => b.createdAt - a.createdAt);
  }

  async createOrder(order: Order): Promise<void> {
    const orders = this.getOrderStore();
    
    // Ensure items have completed: false by default
    const sanitizedOrder = {
        ...order,
        items: order.items.map(item => ({ ...item, completed: false }))
    };

    orders.push(sanitizedOrder);
    this.saveOrderStore(orders);
    
    // Decrease Inventory
    await this.processOrderInventory(sanitizedOrder);
  }

  async updateOrder(uuid: string, updates: Partial<Order>): Promise<void> {
    const orders = this.getOrderStore();
    const index = orders.findIndex(o => o.uuid === uuid);
    if (index !== -1) {
      orders[index] = { ...orders[index], ...updates, updatedAt: Date.now() };
      this.saveOrderStore(orders);
    }
  }

  async toggleOrderItemStatus(orderId: string, itemIndex: number): Promise<void> {
      const orders = this.getOrderStore();
      const orderIdx = orders.findIndex(o => o.uuid === orderId);
      
      if (orderIdx !== -1) {
          const order = orders[orderIdx];
          if (order.items[itemIndex]) {
              // Toggle boolean
              order.items[itemIndex].completed = !order.items[itemIndex].completed;
              
              // Auto-update order status if all items are done
              const allDone = order.items.every(i => i.completed);
              if (allDone && order.status !== 'ready') {
                  order.status = 'ready';
              } else if (!allDone && order.status === 'ready') {
                  order.status = 'cooking';
              }
              
              order.updatedAt = Date.now();
              this.saveOrderStore(orders);
          }
      }
  }

  async getUnsyncedOrders(): Promise<Order[]> {
    return this.getOrderStore().filter(o => o.syncStatus === SyncStatus.Unsynced || o.syncStatus === SyncStatus.Failed);
  }

  // --- Inventory (Products) ---
  
  getProducts(): MenuItem[] {
    const data = localStorage.getItem(DB_KEY_PRODUCTS);
    if (!data) {
        // Initialize with default if empty
        this.saveProductStore(INITIAL_INVENTORY);
        return INITIAL_INVENTORY;
    }
    return JSON.parse(data);
  }

  private saveProductStore(products: MenuItem[]) {
    localStorage.setItem(DB_KEY_PRODUCTS, JSON.stringify(products));
  }

  // Handle inventory reduction when order is placed
  private async processOrderInventory(order: Order) {
    const products = this.getProducts();
    const logs = this.getInventoryLogs();

    order.items.forEach(item => {
        const productIndex = products.findIndex(p => p.id === item.id);
        if (productIndex !== -1) {
            products[productIndex].stock -= item.qty;
            
            // Log the sale
            logs.push({
                id: crypto.randomUUID(),
                itemId: item.id,
                itemName: item.name,
                change: -item.qty,
                reason: 'sale',
                timestamp: Date.now()
            });
        }
    });

    this.saveProductStore(products);
    this.saveLogStore(logs);
  }

  // Manual Inventory Adjustment (Backoffice)
  async adjustStock(itemId: string, newStock: number, reason: 'restock' | 'waste' | 'adjustment'): Promise<void> {
    const products = this.getProducts();
    const index = products.findIndex(p => p.id === itemId);
    
    if (index !== -1) {
        const oldStock = products[index].stock;
        const diff = newStock - oldStock;
        products[index].stock = newStock;
        
        this.saveProductStore(products);

        // Log
        const logs = this.getInventoryLogs();
        logs.push({
            id: crypto.randomUUID(),
            itemId: products[index].id,
            itemName: products[index].name,
            change: diff,
            reason: reason,
            timestamp: Date.now()
        });
        this.saveLogStore(logs);
    }
  }

  // --- Logs ---
  getInventoryLogs(): InventoryLog[] {
    const data = localStorage.getItem(DB_KEY_LOGS);
    return data ? JSON.parse(data) : [];
  }

  private saveLogStore(logs: InventoryLog[]) {
    localStorage.setItem(DB_KEY_LOGS, JSON.stringify(logs));
  }

  // --- Users / Employees ---
  getEmployees(): Employee[] {
      const data = localStorage.getItem(DB_KEY_USERS);
      if (!data) {
          this.saveUserStore([DEFAULT_ADMIN]);
          return [DEFAULT_ADMIN];
      }
      return JSON.parse(data);
  }

  private saveUserStore(users: Employee[]) {
      localStorage.setItem(DB_KEY_USERS, JSON.stringify(users));
  }

  async addEmployee(employee: Employee): Promise<void> {
      const users = this.getEmployees();
      users.push(employee);
      this.saveUserStore(users);
  }

  async deleteEmployee(id: string): Promise<void> {
      let users = this.getEmployees();
      users = users.filter(u => u.id !== id);
      // Ensure at least one admin exists, else restore default
      if (users.length === 0) {
          users = [DEFAULT_ADMIN];
      }
      this.saveUserStore(users);
  }

  async authenticate(pin: string): Promise<Employee | null> {
      const users = this.getEmployees();
      const user = users.find(u => u.pin === pin);
      return user || null;
  }

  clear(): void {
    localStorage.removeItem(DB_KEY_ORDERS);
    localStorage.removeItem(DB_KEY_PRODUCTS);
    localStorage.removeItem(DB_KEY_LOGS);
    localStorage.removeItem(DB_KEY_USERS);
  }
}

export const db = new LocalDB();
