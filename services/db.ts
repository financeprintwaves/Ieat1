
import { Order, MenuItem, SyncStatus, InventoryLog, Employee, Role, AttendanceRecord, OrderItem, TableConfig, Customer } from '../types';
import { INITIAL_INVENTORY, MOCK_TABLES } from '../constants';

const DB_KEY_ORDERS = 'ieat_pos_orders_v2';
const DB_KEY_PRODUCTS = 'ieat_pos_products_v2';
const DB_KEY_LOGS = 'ieat_pos_logs_v2';
const DB_KEY_USERS = 'ieat_pos_users_v2';
const DB_KEY_ATTENDANCE = 'ieat_pos_attendance_v2';
const DB_KEY_TABLES = 'ieat_pos_tables_v2';
const DB_KEY_CUSTOMERS = 'ieat_pos_customers_v1';

// Default Admin for initial login
const DEFAULT_ADMIN: Employee = {
    id: 'admin-1',
    name: 'Admin User',
    pin: '1234',
    role: Role.Admin,
    email: 'admin@ieat.com',
    isCheckedIn: false
};

// UUID Polyfill for compatibility
export const generateUUID = (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

class LocalDB {
  // Helper to safely parse JSON
  private safeJSONParse<T>(key: string, fallback: T): T {
      try {
          const data = localStorage.getItem(key);
          return data ? JSON.parse(data) : fallback;
      } catch (e) {
          console.error(`Error parsing data for key ${key}, resetting to fallback`, e);
          return fallback;
      }
  }

  // --- Orders ---
  private getOrderStore(): Order[] {
    return this.safeJSONParse<Order[]>(DB_KEY_ORDERS, []);
  }

  private saveOrderStore(orders: Order[]) {
    localStorage.setItem(DB_KEY_ORDERS, JSON.stringify(orders));
  }

  getOrders(): Order[] {
    const orders = this.getOrderStore();
    // Migration: Ensure tableIds exists for legacy orders
    return orders.map(o => ({
        ...o,
        tableIds: o.tableIds || (o.tableNo ? [o.tableNo] : [])
    })).sort((a, b) => b.createdAt - a.createdAt);
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
    
    // If points were redeemed, deduct them immediately from customer
    if (order.customerId && order.pointsRedeemed && order.pointsRedeemed > 0) {
        await this.adjustCustomerPoints(order.customerId, -order.pointsRedeemed);
    }

    // Decrease Inventory
    await this.processOrderInventory(sanitizedOrder.items, order.serverName);
  }

  // New Method: Append items to an existing open order (Multi-round ordering)
  async addItemsToOrder(orderUuid: string, newItems: OrderItem[], addedSubtotal: number, addedTax: number, addedTotal: number, updatedTableIds?: string[], serverName?: string): Promise<void> {
      const orders = this.getOrderStore();
      const index = orders.findIndex(o => o.uuid === orderUuid);
      
      if (index !== -1) {
          const order = orders[index];
          
          // Sanitize new items
          const sanitizedItems = newItems.map(item => ({ ...item, completed: false }));

          // Update Order
          orders[index] = {
              ...order,
              items: [...order.items, ...sanitizedItems],
              subtotal: order.subtotal + addedSubtotal,
              tax: order.tax + addedTax,
              totalAmount: order.totalAmount + addedTotal, // Assuming discount logic handled at UI or ignored for append
              updatedAt: Date.now(),
              syncStatus: SyncStatus.Unsynced, // Needs resync
              status: order.status === 'ready' ? 'cooking' : order.status, // Reset to cooking if it was ready
              tableIds: updatedTableIds || order.tableIds,
              tableNo: updatedTableIds ? updatedTableIds.join(', ') : order.tableNo
          };

          this.saveOrderStore(orders);
          
          // Decrease Inventory for new items only
          await this.processOrderInventory(sanitizedItems, serverName);
      }
  }

  async updateOrder(uuid: string, updates: Partial<Order>): Promise<void> {
    const orders = this.getOrderStore();
    const index = orders.findIndex(o => o.uuid === uuid);
    if (index !== -1) {
      orders[index] = { ...orders[index], ...updates, updatedAt: Date.now() };
      this.saveOrderStore(orders);
    }
  }

  async markOrderAsPaid(uuid: string, paymentMethod: 'card' | 'cash', paidAt: number): Promise<void> {
    const orders = this.getOrderStore();
    const index = orders.findIndex(o => o.uuid === uuid);
    if (index !== -1) {
      const order = orders[index];
      
      // Calculate points earned (1 point per $1 spent, floor value)
      const pointsEarned = Math.floor(order.totalAmount);

      orders[index] = { 
        ...order, 
        status: 'paid', 
        paymentMethod, 
        paidAt, 
        syncStatus: SyncStatus.Unsynced,
        updatedAt: Date.now(),
        pointsEarned
      };
      this.saveOrderStore(orders);

      // Add points to customer
      if (order.customerId) {
          await this.updateCustomerStats(order.customerId, order.totalAmount, pointsEarned);
      }
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

  // --- Customers ---
  
  private getCustomerStore(): Customer[] {
      return this.safeJSONParse<Customer[]>(DB_KEY_CUSTOMERS, []);
  }

  private saveCustomerStore(customers: Customer[]) {
      localStorage.setItem(DB_KEY_CUSTOMERS, JSON.stringify(customers));
  }

  getCustomers(): Customer[] {
      return this.getCustomerStore();
  }

  async findCustomerByPhone(phone: string): Promise<Customer | undefined> {
      const customers = this.getCustomerStore();
      return customers.find(c => c.phone === phone);
  }

  async createCustomer(name: string, phone: string): Promise<Customer> {
      const customers = this.getCustomerStore();
      const newCustomer: Customer = {
          id: generateUUID(),
          name,
          phone,
          points: 0,
          totalSpent: 0,
          visits: 0,
          joinedAt: Date.now()
      };
      customers.push(newCustomer);
      this.saveCustomerStore(customers);
      return newCustomer;
  }

  async adjustCustomerPoints(customerId: string, delta: number): Promise<void> {
      const customers = this.getCustomerStore();
      const index = customers.findIndex(c => c.id === customerId);
      if (index !== -1) {
          customers[index].points = Math.max(0, customers[index].points + delta);
          this.saveCustomerStore(customers);
      }
  }

  async updateCustomerStats(customerId: string, amountSpent: number, pointsEarned: number): Promise<void> {
      const customers = this.getCustomerStore();
      const index = customers.findIndex(c => c.id === customerId);
      if (index !== -1) {
          customers[index].points += pointsEarned;
          customers[index].totalSpent += amountSpent;
          customers[index].visits += 1;
          this.saveCustomerStore(customers);
      }
  }

  // --- Inventory (Products) ---
  
  getProducts(): MenuItem[] {
    // We pass INITIAL_INVENTORY as the fallback, but if the key exists but is empty/corrupt, we want to re-init
    let products = this.safeJSONParse<MenuItem[] | null>(DB_KEY_PRODUCTS, null);
    if (!products || products.length === 0) {
        this.saveProductStore(INITIAL_INVENTORY);
        return INITIAL_INVENTORY;
    }
    return products;
  }

  private saveProductStore(products: MenuItem[]) {
    localStorage.setItem(DB_KEY_PRODUCTS, JSON.stringify(products));
  }

  async addProduct(product: MenuItem): Promise<void> {
      const products = this.getProducts();
      products.push(product);
      this.saveProductStore(products);
  }

  async updateProduct(id: string, updates: Partial<MenuItem>): Promise<void> {
      const products = this.getProducts();
      const index = products.findIndex(p => p.id === id);
      if (index !== -1) {
          products[index] = { ...products[index], ...updates };
          this.saveProductStore(products);
      }
  }

  // Handle inventory reduction when order is placed
  private async processOrderInventory(items: OrderItem[], serverName: string = 'System') {
    const products = this.getProducts();
    const logs = this.getInventoryLogs();

    items.forEach(item => {
        const productIndex = products.findIndex(p => p.id === item.id);
        if (productIndex !== -1) {
            products[productIndex].stock -= item.qty;
            
            // Log the sale
            logs.push({
                id: generateUUID(),
                itemId: item.id,
                itemName: item.name,
                change: -item.qty,
                reason: 'sale',
                timestamp: Date.now(),
                reportedBy: serverName,
                verified: true // Sales are auto-verified
            });
        }
    });

    this.saveProductStore(products);
    this.saveLogStore(logs);
  }

  // Inventory Adjustment (Backoffice or Waiter Waste Report)
  async adjustStock(itemId: string, newStock: number, reason: 'restock' | 'waste' | 'adjustment', reportedBy: string = 'Admin', verified: boolean = true): Promise<void> {
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
            id: generateUUID(),
            itemId: products[index].id,
            itemName: products[index].name,
            change: diff,
            reason: reason,
            timestamp: Date.now(),
            reportedBy: reportedBy,
            verified: verified
        });
        this.saveLogStore(logs);
    }
  }

  async verifyInventoryLog(logId: string): Promise<void> {
    const logs = this.getInventoryLogs();
    const index = logs.findIndex(l => l.id === logId);
    if (index !== -1) {
        logs[index].verified = true;
        this.saveLogStore(logs);
    }
  }

  // --- Logs ---
  getInventoryLogs(): InventoryLog[] {
    return this.safeJSONParse<InventoryLog[]>(DB_KEY_LOGS, []);
  }

  private saveLogStore(logs: InventoryLog[]) {
    localStorage.setItem(DB_KEY_LOGS, JSON.stringify(logs));
  }

  // --- Users / Employees ---
  getEmployees(): Employee[] {
      let users = this.safeJSONParse<Employee[] | null>(DB_KEY_USERS, null);
      if (!users || users.length === 0) {
          this.saveUserStore([DEFAULT_ADMIN]);
          return [DEFAULT_ADMIN];
      }
      return users;
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

  // --- Attendance ---
  getAttendanceLogs(): AttendanceRecord[] {
      return this.safeJSONParse<AttendanceRecord[]>(DB_KEY_ATTENDANCE, []);
  }

  private saveAttendanceLogs(logs: AttendanceRecord[]) {
      localStorage.setItem(DB_KEY_ATTENDANCE, JSON.stringify(logs));
  }

  async logAttendance(employeeId: string, type: 'check-in' | 'check-out'): Promise<void> {
      const users = this.getEmployees();
      const userIndex = users.findIndex(u => u.id === employeeId);
      
      if (userIndex !== -1) {
          // Update User Status
          users[userIndex] = {
              ...users[userIndex],
              isCheckedIn: (type === 'check-in')
          };
          this.saveUserStore(users);

          // Add Log
          const logs = this.getAttendanceLogs();
          logs.push({
              id: generateUUID(),
              employeeId,
              employeeName: users[userIndex].name,
              type,
              timestamp: Date.now()
          });
          this.saveAttendanceLogs(logs);
      }
  }

  // --- Tables ---
  getTables(): TableConfig[] {
      let tables = this.safeJSONParse<TableConfig[] | null>(DB_KEY_TABLES, null);
      if (!tables || tables.length === 0) {
          const initialTables = MOCK_TABLES.map(name => ({ id: name, name }));
          this.saveTableStore(initialTables);
          return initialTables;
      }
      return tables;
  }

  private saveTableStore(tables: TableConfig[]) {
      localStorage.setItem(DB_KEY_TABLES, JSON.stringify(tables));
  }

  async addTable(table: TableConfig): Promise<void> {
      const tables = this.getTables();
      tables.push(table);
      this.saveTableStore(tables);
  }

  async updateTable(id: string, updates: Partial<TableConfig>): Promise<void> {
      const tables = this.getTables();
      const index = tables.findIndex(t => t.id === id);
      if (index !== -1) {
          tables[index] = { ...tables[index], ...updates };
          this.saveTableStore(tables);
      }
  }

  async deleteTable(id: string): Promise<void> {
      let tables = this.getTables();
      tables = tables.filter(t => t.id !== id);
      this.saveTableStore(tables);
  }

  clear(): void {
    localStorage.removeItem(DB_KEY_ORDERS);
    localStorage.removeItem(DB_KEY_PRODUCTS);
    localStorage.removeItem(DB_KEY_LOGS);
    localStorage.removeItem(DB_KEY_USERS);
    localStorage.removeItem(DB_KEY_ATTENDANCE);
    localStorage.removeItem(DB_KEY_TABLES);
    localStorage.removeItem(DB_KEY_CUSTOMERS);
  }
}

export const db = new LocalDB();
