
export enum SyncStatus {
  Unsynced = 'unsynced',
  Syncing = 'syncing',
  Synced = 'synced',
  Failed = 'failed'
}

export enum Role {
  Admin = 'admin',
  Waiter = 'waiter',
  Kitchen = 'kitchen'
}

export type Category = 'food' | 'drink' | 'dessert';
export type DiningOption = 'dine-in' | 'take-out' | 'delivery';

export interface Branch {
  id: string;
  name: string;
  address?: string;
}

export interface AppSettings {
  id: string; // usually 'global'
  currencySymbol: string;
  currentBranchId: string;
}

export interface LoyaltyReward {
  id: string;
  name: string;
  cost: number;  // Points required
  value: number; // Discount amount
}

export interface Employee {
  id: string;
  name: string;
  pin: string;
  role: Role;
  email?: string;
  phone?: string;
  isCheckedIn?: boolean; // New: Track attendance status
  branchId?: string;     // New: Associate employee with a branch
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'check-in' | 'check-out';
  timestamp: number;
  branchId?: string; // New: Track which branch
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  points: number;
  totalSpent: number;
  visits: number;
  joinedAt: number;
}

export interface TableConfig {
  id: string;
  name: string;
}

export interface Modifier {
  id: string;
  name: string;
  price: number;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  cost: number;        // For profit reporting
  category: Category;
  image?: string;
  stock: number;       // Inventory tracking
  lowStockThreshold: number;
  barcode?: string;
  modifiers?: Modifier[]; // Available modifiers
  description?: string;
}

export interface OrderItem extends MenuItem {
  qty: number;
  selectedModifiers: Modifier[];
  notes?: string;
  completed?: boolean; // New: For KDS item-level tracking
}

export interface Order {
  uuid: string;
  tableNo?: string;     // Display string (e.g. "1, 2")
  tableIds: string[];   // Array of table IDs for logic
  items: OrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  totalAmount: number;
  status: 'pending' | 'cooking' | 'ready' | 'paid';
  diningOption: DiningOption;
  syncStatus: SyncStatus;
  createdAt: number;
  updatedAt: number;
  opLogId: string;
  aiInsight?: string;
  paymentMethod?: 'card' | 'cash';
  paidAt?: number;
  customerNotes?: string;
  serverId?: string;   // New: Track who placed the order
  serverName?: string; // New: Track who placed the order
  customerId?: string; // New: Linked customer
  pointsEarned?: number; // New: Points gained from this order
  pointsRedeemed?: number; // New: Points used on this order
  branchId?: string; // New: Which branch owns this order
}

export interface InventoryLog {
  id: string;
  itemId: string;
  itemName: string;
  change: number;
  reason: 'sale' | 'restock' | 'waste' | 'adjustment';
  timestamp: number;
  reportedBy?: string; // New: Who made the change
  verified?: boolean;  // New: Has admin approved/seen this?
  branchId?: string;
}

export interface DatabaseSchema {
  orders: Order[];
  products: MenuItem[];
  inventoryLogs: InventoryLog[];
  employees: Employee[];
  attendance: AttendanceRecord[];
  tables: TableConfig[];
  customers: Customer[];
  branches: Branch[];
  settings: AppSettings[];
  rewards: LoyaltyReward[];
}
