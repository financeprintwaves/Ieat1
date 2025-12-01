
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

export interface Employee {
  id: string;
  name: string;
  pin: string;
  role: Role;
  email?: string;
  phone?: string;
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
  tableNo?: string;     // Optional for Takeout
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
}

export interface InventoryLog {
  id: string;
  itemId: string;
  itemName: string;
  change: number;
  reason: 'sale' | 'restock' | 'waste' | 'adjustment';
  timestamp: number;
}

export interface DatabaseSchema {
  orders: Order[];
  products: MenuItem[];
  inventoryLogs: InventoryLog[];
  employees: Employee[];
}
