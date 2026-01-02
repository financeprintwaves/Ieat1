import { Order, MenuItem, SyncStatus, InventoryLog, Employee, Role, AttendanceRecord, OrderItem, TableConfig, Customer, Branch, AppSettings, LoyaltyReward } from '../types';
import { INITIAL_INVENTORY, MOCK_TABLES } from '../constants';

const DB_KEY_ORDERS = 'ieat_pos_orders_v2';
const DB_KEY_PRODUCTS = 'ieat_pos_products_v2';
const DB_KEY_LOGS = 'ieat_pos_logs_v2';
const DB_KEY_USERS = 'ieat_pos_users_v2';
const DB_KEY_ATTENDANCE = 'ieat_pos_attendance_v2';
const DB_KEY_TABLES = 'ieat_pos_tables_v2';
const DB_KEY_CUSTOMERS = 'ieat_pos_customers_v1';
const DB_KEY_REWARDS = 'ieat_pos_rewards_v1';
const DB_KEY_SETTINGS = 'ieat_pos_settings_v1';
const DB_KEY_BRANCHES = 'ieat_pos_branches_v1';

// Default Admin for initial login
const DEFAULT_ADMIN: Employee = {
    id: 'admin-1',
    name: 'Admin User',
    pin: '1234',
    role: Role.Admin,
    email: 'admin@ieat.com',
    isCheckedIn: false,
    branchId: 'branch-1'
};

const DEFAULT_REWARDS: LoyaltyReward[] = [
  { id: 'reward-5', name: '$5.00 Off', cost: 50, value: 5 },
  { id: 'reward-10', name: '$10.00 Off', cost: 100, value: 10 },
  { id: 'reward-25', name: '$25.00 Off', cost: 200, value: 25 },
];

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
    return orders.map(o => ({
        ...o,
        tableIds: o.tableIds || (o.tableNo ? [o.tableNo] : [])
    })).sort((a, b) => b.createdAt - a.createdAt);
  }

  // New method required by AdminReports
  async getFilteredOrders(startDate: number, endDate: number, branchId?: string): Promise<Order[]> {
      const orders = this.getOrders();
      return orders.filter(o => 
          o.createdAt >= startDate && 
          o.createdAt <= endDate && 
          (branchId === 'all' || !branchId || o.branchId === branchId)
      );
  }

  async createOrder(order: Order): Promise<void> {
    const orders = this.getOrderStore();
    const sanitizedOrder = {
        ...order,
        items: order.items.map(item => ({ ...item, completed: false }))
    };
    orders.push(sanitizedOrder);
    this.saveOrderStore(orders);
    
    if (order.customerId && order.pointsRedeemed && order.pointsRedeemed > 0) {
        await this.adjustCustomerPoints(order.customerId, -order.pointsRedeemed);
    }
    await this.processOrderInventory(sanitizedOrder.items, order.serverName);
  }

  async addItemsToOrder(orderUuid: string, newItems: OrderItem[], addedSubtotal: number, addedTax: number, addedTotal: number, updatedTableIds?: string[], serverName?: string): Promise<void> {
      const orders = this.getOrderStore();
      const index = orders.findIndex(o => o.uuid === orderUuid);
      
      if (index !== -1) {
          const order = orders[index];
          const sanitizedItems = newItems.map(item => ({ ...item, completed: false }));

          orders[index] = {
              ...order,
              items: [...order.items, ...sanitizedItems],
              subtotal: order.subtotal + addedSubtotal,
              tax: order.tax + addedTax,
              totalAmount: order.totalAmount + addedTotal,
              updatedAt: Date.now(),
              syncStatus: SyncStatus.Unsynced,
              status: order.status === 'ready' ? 'cooking' : order.status,
              tableIds: updatedTableIds || order.tableIds,
              tableNo: updatedTableIds ? updatedTableIds.join(', ') : order.tableNo
          };

          this.saveOrderStore(orders);
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
              order.items[itemIndex].completed = !order.items[itemIndex].completed;
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
  private getCustomerStore(): Customer[] { return this.safeJSONParse<Customer[]>(DB_KEY_CUSTOMERS, []); }
  private saveCustomerStore(customers: Customer[]) { localStorage.setItem(DB_KEY_CUSTOMERS, JSON.stringify(customers)); }
  getCustomers(): Customer[] { return this.getCustomerStore(); }
  
  async findCustomerByPhone(phone: string): Promise<Customer | undefined> {
      return this.getCustomerStore().find(c => c.phone === phone);
  }

  async createCustomer(name: string, phone: string): Promise<Customer> {
      const customers = this.getCustomerStore();
      const newCustomer: Customer = { id: generateUUID(), name, phone, points: 0, totalSpent: 0, visits: 0, joinedAt: Date.now() };
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

  async getCustomerById(id: string): Promise<Customer | undefined> {
      return this.getCustomerStore().find(c => c.id === id);
  }

  // --- Inventory ---
  getProducts(): MenuItem[] {
    let products = this.safeJSONParse<MenuItem[] | null>(DB_KEY_PRODUCTS, null);
    if (!products || products.length === 0) {
        // Initialize default products with default branch config
        const defaults = INITIAL_INVENTORY.map(p => ({
            ...p,
            branchConfig: [
                { branchId: 'branch-1', isVisible: true, price: p.price },
                { branchId: 'branch-2', isVisible: true, price: p.price }
            ]
        }));
        this.saveProductStore(defaults);
        return defaults;
    }
    return products;
  }
  private saveProductStore(products: MenuItem[]) { localStorage.setItem(DB_KEY_PRODUCTS, JSON.stringify(products)); }
  
  async addProduct(product: MenuItem): Promise<void> {
      const products = this.getProducts();
      products.push(product);
      this.saveProductStore(products);
      
      // Initial Stock Log
      if (product.stock > 0) {
          const logs = this.getInventoryLogs();
          logs.push({
              id: generateUUID(),
              itemId: product.id,
              itemName: product.name,
              change: product.stock,
              reason: 'restock',
              timestamp: Date.now(),
              reportedBy: 'Admin',
              verified: true
          });
          this.saveLogStore(logs);
      }
  }
  
  async updateProduct(id: string, updates: Partial<MenuItem>): Promise<void> {
      const products = this.getProducts();
      const index = products.findIndex(p => p.id === id);
      if (index !== -1) {
          const oldStock = products[index].stock;
          products[index] = { ...products[index], ...updates };
          this.saveProductStore(products);
          
          // Log stock change if it was manually updated
          if (updates.stock !== undefined && updates.stock !== oldStock) {
              const diff = updates.stock - oldStock;
              const logs = this.getInventoryLogs();
              logs.push({
                  id: generateUUID(),
                  itemId: id,
                  itemName: products[index].name,
                  change: diff,
                  reason: 'adjustment',
                  timestamp: Date.now(),
                  reportedBy: 'Admin',
                  verified: true
              });
              this.saveLogStore(logs);
          }
      }
  }

  async deleteProduct(id: string): Promise<void> {
      let products = this.getProducts();
      products = products.filter(p => p.id !== id);
      this.saveProductStore(products);
  }

  private async processOrderInventory(items: OrderItem[], serverName: string = 'System') {
    const products = this.getProducts();
    const logs = this.getInventoryLogs();
    items.forEach(item => {
        const productIndex = products.findIndex(p => p.id === item.id);
        if (productIndex !== -1) {
            products[productIndex].stock -= item.qty;
            logs.push({
                id: generateUUID(),
                itemId: item.id,
                itemName: item.name,
                change: -item.qty,
                reason: 'sale',
                timestamp: Date.now(),
                reportedBy: serverName,
                verified: true
            });
        }
    });
    this.saveProductStore(products);
    this.saveLogStore(logs);
  }

  async adjustStock(itemId: string, newStock: number, reason: 'restock' | 'waste' | 'adjustment', reportedBy: string = 'Admin', verified: boolean = true): Promise<void> {
    const products = this.getProducts();
    const index = products.findIndex(p => p.id === itemId);
    if (index !== -1) {
        const diff = newStock - products[index].stock;
        products[index].stock = newStock;
        this.saveProductStore(products);
        const logs = this.getInventoryLogs();
        logs.push({ id: generateUUID(), itemId: products[index].id, itemName: products[index].name, change: diff, reason: reason, timestamp: Date.now(), reportedBy: reportedBy, verified: verified });
        this.saveLogStore(logs);
    }
  }

  getInventoryLogs(): InventoryLog[] { return this.safeJSONParse<InventoryLog[]>(DB_KEY_LOGS, []); }
  private saveLogStore(logs: InventoryLog[]) { localStorage.setItem(DB_KEY_LOGS, JSON.stringify(logs)); }
  
  async getItemHistory(itemId: string): Promise<InventoryLog[]> {
      const logs = this.getInventoryLogs();
      return logs.filter(l => l.itemId === itemId).sort((a,b) => b.timestamp - a.timestamp);
  }

  // --- Users ---
  getEmployees(): Employee[] {
      let users = this.safeJSONParse<Employee[] | null>(DB_KEY_USERS, null);
      if (!users || users.length === 0) {
          this.saveUserStore([DEFAULT_ADMIN]);
          return [DEFAULT_ADMIN];
      }
      return users;
  }
  private saveUserStore(users: Employee[]) { localStorage.setItem(DB_KEY_USERS, JSON.stringify(users)); }
  async addEmployee(employee: Employee): Promise<void> {
      const users = this.getEmployees();
      users.push(employee);
      this.saveUserStore(users);
  }
  async deleteEmployee(id: string): Promise<void> {
      let users = this.getEmployees();
      users = users.filter(u => u.id !== id);
      if (users.length === 0) users = [DEFAULT_ADMIN];
      this.saveUserStore(users);
  }
  async updateEmployee(id: string, updates: Partial<Employee>): Promise<void> {
      const users = this.getEmployees();
      const index = users.findIndex(u => u.id === id);
      if (index !== -1) {
          users[index] = { ...users[index], ...updates };
          this.saveUserStore(users);
      }
  }
  async resetPin(id: string, newPin: string): Promise<void> {
      await this.updateEmployee(id, { pin: newPin });
  }
  async authenticate(pin: string): Promise<Employee | null> {
      const users = this.getEmployees();
      return users.find(u => u.pin === pin) || null;
  }

  // --- Attendance ---
  getAttendanceLogs(): AttendanceRecord[] { return this.safeJSONParse<AttendanceRecord[]>(DB_KEY_ATTENDANCE, []); }
  private saveAttendanceLogs(logs: AttendanceRecord[]) { localStorage.setItem(DB_KEY_ATTENDANCE, JSON.stringify(logs)); }
  async logAttendance(employeeId: string, type: 'check-in' | 'check-out'): Promise<void> {
      const users = this.getEmployees();
      const userIndex = users.findIndex(u => u.id === employeeId);
      if (userIndex !== -1) {
          users[userIndex] = { ...users[userIndex], isCheckedIn: (type === 'check-in') };
          this.saveUserStore(users);
          const logs = this.getAttendanceLogs();
          logs.push({ id: generateUUID(), employeeId, employeeName: users[userIndex].name, type, timestamp: Date.now() });
          this.saveAttendanceLogs(logs);
      }
  }

  // --- Tables ---
  getTables(): TableConfig[] {
      let tables = this.safeJSONParse<TableConfig[] | null>(DB_KEY_TABLES, null);
      if (!tables || tables.length === 0) {
          const initial = MOCK_TABLES.map(name => ({ id: name, name, capacity: 4 }));
          this.saveTableStore(initial);
          return initial;
      }
      return tables;
  }
  private saveTableStore(tables: TableConfig[]) { localStorage.setItem(DB_KEY_TABLES, JSON.stringify(tables)); }
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

  // --- Settings / Rewards / Branches ---
  async getSettings(): Promise<AppSettings> {
      return this.safeJSONParse<AppSettings>(DB_KEY_SETTINGS, { id: 'global', currencySymbol: 'OMR', currentBranchId: 'branch-1', taxRate: 0.05 });
  }
  async saveSettings(settings: AppSettings): Promise<void> {
      localStorage.setItem(DB_KEY_SETTINGS, JSON.stringify(settings));
  }
  
  async getRewards(): Promise<LoyaltyReward[]> {
      let rewards = this.safeJSONParse<LoyaltyReward[] | null>(DB_KEY_REWARDS, null);
      if (!rewards) {
          rewards = DEFAULT_REWARDS;
          localStorage.setItem(DB_KEY_REWARDS, JSON.stringify(rewards));
      }
      return rewards;
  }
  
  private saveRewards(rewards: LoyaltyReward[]): void {
      localStorage.setItem(DB_KEY_REWARDS, JSON.stringify(rewards));
  }

  async addLoyaltyReward(reward: LoyaltyReward): Promise<void> {
      const rewards = await this.getRewards();
      rewards.push(reward);
      this.saveRewards(rewards);
  }

  async deleteLoyaltyReward(id: string): Promise<void> {
      let rewards = await this.getRewards();
      rewards = rewards.filter(r => r.id !== id);
      this.saveRewards(rewards);
  }
  
  async getBranches(): Promise<Branch[]> {
      let branches = this.safeJSONParse<Branch[] | null>(DB_KEY_BRANCHES, null);
      if (!branches || branches.length === 0) {
          branches = [
              { id: 'branch-1', name: 'Main Branch', address: '123 Main St' },
              { id: 'branch-2', name: 'Arabic Bar', address: '456 Downtown' }
          ];
          this.saveBranches(branches);
      }
      return branches;
  }
  
  async saveBranches(branches: Branch[]): Promise<void> {
      localStorage.setItem(DB_KEY_BRANCHES, JSON.stringify(branches));
  }
  
  async addBranch(branch: Branch): Promise<void> {
      const branches = await this.getBranches();
      branches.push(branch);
      this.saveBranches(branches);
  }
  
  async deleteBranch(id: string): Promise<void> {
      let branches = await this.getBranches();
      branches = branches.filter(b => b.id !== id);
      this.saveBranches(branches);
  }

  async updateBranch(id: string, updates: Partial<Branch>): Promise<void> {
      let branches = await this.getBranches();
      const index = branches.findIndex(b => b.id === id);
      if (index !== -1) {
          branches[index] = { ...branches[index], ...updates };
          this.saveBranches(branches);
      }
  }
}

export const db = new LocalDB();