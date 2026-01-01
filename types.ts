
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
  taxRate: number;
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
  isCheckedIn?: boolean;
  branchId?: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'check-in' | 'check-out';
  timestamp: number;
  branchId?: string;
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
  capacity?: number;
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
  cost: number;
  category: Category;
  image?: string;
  stock: number;
  lowStockThreshold: number;
  barcode?: string;
  modifiers?: Modifier[];
  description?: string;
}

export interface OrderItem extends MenuItem {
  qty: number;
  selectedModifiers: Modifier[];
  notes?: string;
  completed?: boolean;
}

export interface Order {
  uuid: string;
  tableNo?: string;
  tableIds: string[];
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
  serverId?: string;
  serverName?: string;
  customerId?: string;
  pointsEarned?: number;
  pointsRedeemed?: number;
  branchId?: string;
}

export interface InventoryLog {
  id: string;
  itemId: string;
  itemName: string;
  change: number;
  reason: 'sale' | 'restock' | 'waste' | 'adjustment';
  timestamp: number;
  reportedBy?: string;
  verified?: boolean;
  branchId?: string;
}
