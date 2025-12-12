
import Dexie, { type Table } from 'dexie';
import { Order, MenuItem, SyncStatus, InventoryLog, Employee, Role, AttendanceRecord, OrderItem, TableConfig, Customer, Branch, AppSettings, LoyaltyReward } from '../types';
import { INITIAL_INVENTORY, MOCK_TABLES } from '../constants';

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

const DEFAULT_BRANCH: Branch = {
    id: 'branch-1',
    name: 'Main Street HQ',
    address: '123 Main St'
};

const DEFAULT_SETTINGS: AppSettings = {
    id: 'global',
    currencySymbol: '$',
    currentBranchId: 'branch-1'
};

const DEFAULT_REWARDS: LoyaltyReward[] = [
  { id: '5off', name: '5.00 Off', cost: 50, value: 5 },
  { id: '10off', name: '10.00 Off', cost: 100, value: 10 },
  { id: '25off', name: '25.00 Off', cost: 200, value: 25 },
  { id: '50off', name: '50.00 Off', cost: 400, value: 50 },
];

// UUID Polyfill
export const generateUUID = (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

class IEatDatabase extends Dexie {
  orders!: Table<Order>;
  products!: Table<MenuItem>;
  inventoryLogs!: Table<InventoryLog>;
  employees!: Table<Employee>;
  attendance!: Table<AttendanceRecord>;
  diningTables!: Table<TableConfig>;
  customers!: Table<Customer>;
  branches!: Table<Branch>;
  settings!: Table<AppSettings>;
  rewards!: Table<LoyaltyReward>;

  constructor() {
    super('IEatPOS_DB_v5'); // Increment version
    
    // Define Schema
    (this as any).version(1).stores({
      orders: 'uuid, status, syncStatus, createdAt, [paymentMethod+status], customerId, branchId', 
      products: 'id, category, name',
      inventoryLogs: 'id, itemId, timestamp, branchId',
      employees: 'id, pin, branchId',
      attendance: 'id, employeeId, timestamp, branchId',
      diningTables: 'id, name',
      customers: 'id, phone, name',
      branches: 'id, name',
      settings: 'id',
      rewards: 'id'
    });

    // Populate Initial Data
    (this as any).on('populate', () => {
       console.log("Populating initial database...");
       this.products.bulkAdd(INITIAL_INVENTORY);
       this.diningTables.bulkAdd(MOCK_TABLES.map(name => ({ id: name, name })));
       this.employees.add(DEFAULT_ADMIN);
       this.branches.add(DEFAULT_BRANCH);
       this.settings.add(DEFAULT_SETTINGS);
       this.rewards.bulkAdd(DEFAULT_REWARDS);
    });
  }

  // --- Settings ---
  async getSettings(): Promise<AppSettings> {
      const s = await this.settings.get('global');
      if (!s) {
          await this.settings.put(DEFAULT_SETTINGS);
          return DEFAULT_SETTINGS;
      }
      return s;
  }

  async updateSettings(updates: Partial<AppSettings>): Promise<void> {
      await this.settings.update('global', updates);
  }

  // --- Rewards ---
  async getRewards(): Promise<LoyaltyReward[]> {
      const r = await this.rewards.toArray();
      if (r.length === 0) {
          await this.rewards.bulkAdd(DEFAULT_REWARDS);
          return DEFAULT_REWARDS;
      }
      return r;
  }

  async addReward(reward: LoyaltyReward): Promise<void> {
      await this.rewards.add(reward);
  }

  async deleteReward(id: string): Promise<void> {
      await this.rewards.delete(id);
  }

  // --- Branches ---
  async getBranches(): Promise<Branch[]> {
      const b = await this.branches.toArray();
      if (b.length === 0) {
          await this.branches.add(DEFAULT_BRANCH);
          return [DEFAULT_BRANCH];
      }
      return b;
  }

  async addBranch(branch: Branch): Promise<void> {
      await this.branches.add(branch);
  }

  async deleteBranch(id: string): Promise<void> {
      await this.branches.delete(id);
  }

  // --- Orders ---

  async getOrders(): Promise<Order[]> {
    return await this.orders.orderBy('createdAt').reverse().toArray();
  }

  async createOrder(order: Order): Promise<void> {
    const settings = await this.getSettings();
    const sanitizedOrder = {
        ...order,
        branchId: order.branchId || settings.currentBranchId,
        items: order.items.map(item => ({ ...item, completed: false }))
    };

    await (this as any).transaction('rw', this.orders, this.products, this.inventoryLogs, this.customers, async () => {
        await this.orders.add(sanitizedOrder);

        // Deduct Inventory
        for (const item of sanitizedOrder.items) {
            const product = await this.products.get(item.id);
            if (product) {
                const newStock = product.stock - item.qty;
                await this.products.update(item.id, { stock: newStock });
                
                await this.inventoryLogs.add({
                    id: generateUUID(),
                    itemId: item.id,
                    itemName: item.name,
                    change: -item.qty,
                    reason: 'sale',
                    timestamp: Date.now(),
                    reportedBy: order.serverName || 'System',
                    verified: true,
                    branchId: sanitizedOrder.branchId
                });
            }
        }

        // Deduct Points if Redeemed
        if (order.customerId && order.pointsRedeemed && order.pointsRedeemed > 0) {
            const customer = await this.customers.get(order.customerId);
            if (customer) {
                await this.customers.update(order.customerId, { 
                    points: Math.max(0, customer.points - order.pointsRedeemed) 
                });
            }
        }
    });
  }

  async addItemsToOrder(orderUuid: string, newItems: OrderItem[], addedSubtotal: number, addedTax: number, addedTotal: number, updatedTableIds?: string[], serverName?: string): Promise<void> {
      await (this as any).transaction('rw', this.orders, this.products, this.inventoryLogs, async () => {
          const order = await this.orders.get(orderUuid);
          if (order) {
              const sanitizedItems = newItems.map(item => ({ ...item, completed: false }));
              
              await this.orders.update(orderUuid, {
                  items: [...order.items, ...sanitizedItems],
                  subtotal: order.subtotal + addedSubtotal,
                  tax: order.tax + addedTax,
                  totalAmount: order.totalAmount + addedTotal,
                  updatedAt: Date.now(),
                  syncStatus: SyncStatus.Unsynced,
                  status: order.status === 'ready' ? 'cooking' : order.status,
                  tableIds: updatedTableIds || order.tableIds,
                  tableNo: updatedTableIds ? updatedTableIds.join(', ') : order.tableNo
              });

              // Inventory deduction for new items
              for (const item of sanitizedItems) {
                  const product = await this.products.get(item.id);
                  if (product) {
                      await this.products.update(item.id, { stock: product.stock - item.qty });
                      await this.inventoryLogs.add({
                          id: generateUUID(),
                          itemId: item.id,
                          itemName: item.name,
                          change: -item.qty,
                          reason: 'sale',
                          timestamp: Date.now(),
                          reportedBy: serverName || 'System',
                          verified: true,
                          branchId: order.branchId
                      });
                  }
              }
          }
      });
  }

  async updateOrder(uuid: string, updates: Partial<Order>): Promise<void> {
    await this.orders.update(uuid, { ...updates, updatedAt: Date.now() });
  }

  async markOrderAsPaid(uuid: string, paymentMethod: 'card' | 'cash', paidAt: number): Promise<void> {
    await (this as any).transaction('rw', this.orders, this.customers, async () => {
        const order = await this.orders.get(uuid);
        if (order) {
            const pointsEarned = Math.floor(order.totalAmount);
            
            await this.orders.update(uuid, {
                status: 'paid',
                paymentMethod,
                paidAt,
                syncStatus: SyncStatus.Unsynced,
                updatedAt: Date.now(),
                pointsEarned
            });

            if (order.customerId) {
                const customer = await this.customers.get(order.customerId);
                if (customer) {
                    await this.customers.update(order.customerId, {
                        points: customer.points + pointsEarned,
                        totalSpent: customer.totalSpent + order.totalAmount,
                        visits: customer.visits + 1
                    });
                }
            }
        }
    });
  }

  async toggleOrderItemStatus(orderId: string, itemIndex: number): Promise<void> {
      const order = await this.orders.get(orderId);
      if (order && order.items[itemIndex]) {
          const newItems = [...order.items];
          newItems[itemIndex].completed = !newItems[itemIndex].completed;
          
          let newStatus = order.status;
          const allDone = newItems.every(i => i.completed);
          if (allDone && order.status !== 'ready') {
              newStatus = 'ready';
          } else if (!allDone && order.status === 'ready') {
              newStatus = 'cooking';
          }

          await this.orders.update(orderId, {
              items: newItems,
              status: newStatus,
              updatedAt: Date.now()
          });
      }
  }

  async getUnsyncedOrders(): Promise<Order[]> {
    return await this.orders.where('syncStatus').equals(SyncStatus.Unsynced).or('syncStatus').equals(SyncStatus.Failed).toArray();
  }

  // --- Customers ---

  async getCustomers(): Promise<Customer[]> {
      return await this.customers.toArray();
  }

  async getCustomerById(id: string): Promise<Customer | undefined> {
      return await this.customers.get(id);
  }

  async findCustomerByPhone(phone: string): Promise<Customer | undefined> {
      return await this.customers.where('phone').equals(phone).first();
  }

  async createCustomer(name: string, phone: string): Promise<Customer> {
      const newCustomer: Customer = {
          id: generateUUID(),
          name,
          phone,
          points: 0,
          totalSpent: 0,
          visits: 0,
          joinedAt: Date.now()
      };
      await this.customers.add(newCustomer);
      return newCustomer;
  }

  // --- Products / Inventory ---

  async getProducts(): Promise<MenuItem[]> {
      const count = await this.products.count();
      if (count === 0) {
          // If empty (e.g. wiped), re-seed might be needed or return empty
          return [];
      }
      return await this.products.toArray();
  }

  async addProduct(product: MenuItem): Promise<void> {
      await this.products.add(product);
  }

  async updateProduct(id: string, updates: Partial<MenuItem>): Promise<void> {
      await this.products.update(id, updates);
  }

  async adjustStock(itemId: string, newStock: number, reason: 'restock' | 'waste' | 'adjustment', reportedBy: string = 'Admin', verified: boolean = true): Promise<void> {
      const settings = await this.getSettings();
      await (this as any).transaction('rw', this.products, this.inventoryLogs, async () => {
          const product = await this.products.get(itemId);
          if (product) {
              const diff = newStock - product.stock;
              await this.products.update(itemId, { stock: newStock });
              
              await this.inventoryLogs.add({
                  id: generateUUID(),
                  itemId: product.id,
                  itemName: product.name,
                  change: diff,
                  reason,
                  timestamp: Date.now(),
                  reportedBy,
                  verified,
                  branchId: settings.currentBranchId
              });
          }
      });
  }

  // --- Logs ---
  async getInventoryLogs(): Promise<InventoryLog[]> {
      return await this.inventoryLogs.orderBy('timestamp').reverse().toArray();
  }

  // --- Employees ---
  async getEmployees(): Promise<Employee[]> {
      const employees = await this.employees.toArray();
      if (employees.length === 0) {
          await this.employees.add(DEFAULT_ADMIN);
          return [DEFAULT_ADMIN];
      }
      return employees;
  }

  async addEmployee(employee: Employee): Promise<void> {
      await this.employees.add(employee);
  }

  async authenticate(pin: string): Promise<Employee | undefined> {
      return await this.employees.where('pin').equals(pin).first();
  }

  async logAttendance(employeeId: string, type: 'check-in' | 'check-out'): Promise<void> {
      const settings = await this.getSettings();
      await (this as any).transaction('rw', this.employees, this.attendance, async () => {
          const employee = await this.employees.get(employeeId);
          if (employee) {
              await this.employees.update(employeeId, { isCheckedIn: (type === 'check-in') });
              await this.attendance.add({
                  id: generateUUID(),
                  employeeId,
                  employeeName: employee.name,
                  type,
                  timestamp: Date.now(),
                  branchId: settings.currentBranchId
              });
          }
      });
  }

  async getLastCheckIn(employeeId: string): Promise<AttendanceRecord | undefined> {
      return await this.attendance
          .where('employeeId').equals(employeeId)
          .filter(r => r.type === 'check-in')
          .reverse()
          .first();
  }

  async getAttendanceLogs(): Promise<AttendanceRecord[]> {
      return await this.attendance.orderBy('timestamp').reverse().toArray();
  }

  // --- Tables ---
  async getTables(): Promise<TableConfig[]> {
      const tables = await this.diningTables.toArray();
      if (tables.length === 0) {
          const initials = MOCK_TABLES.map(name => ({ id: name, name }));
          await this.diningTables.bulkAdd(initials);
          return initials;
      }
      return tables;
  }

  async addTable(table: TableConfig): Promise<void> {
      await this.diningTables.add(table);
  }

  async updateTable(id: string, updates: Partial<TableConfig>): Promise<void> {
      await this.diningTables.update(id, updates);
  }

  async deleteTable(id: string): Promise<void> {
      await this.diningTables.delete(id);
  }

  // Utility
  async clear(): Promise<void> {
      await this.orders.clear();
      await this.products.clear();
      await this.inventoryLogs.clear();
      await this.employees.clear();
      await this.attendance.clear();
      await this.diningTables.clear();
      await this.customers.clear();
      await this.rewards.clear();
      // Keep branches and settings to avoid lock out
  }
}

export const db = new IEatDatabase();
