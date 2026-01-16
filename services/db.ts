import { Order, MenuItem, SyncStatus, InventoryLog, Employee, Role, AttendanceRecord, OrderItem, TableConfig, Customer, Branch, AppSettings, LoyaltyReward } from '../types';
import { INITIAL_INVENTORY, MOCK_TABLES } from '../constants';
import { supabase } from './supabase';

export const generateUUID = (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

class SupabaseDB {
  // --- Orders ---
  async getOrders(): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((order: any) => ({
      uuid: order.id,
      tableNo: order.table_nos?.join(', '),
      tableIds: order.table_nos || [],
      items: order.items || [],
      subtotal: order.subtotal,
      tax: order.tax,
      discount: order.discount || 0,
      totalAmount: order.total_amount,
      status: order.status,
      diningOption: order.dining_option,
      syncStatus: order.sync_status,
      createdAt: new Date(order.created_at).getTime(),
      updatedAt: new Date(order.updated_at).getTime(),
      opLogId: order.id,
      aiInsight: order.ai_insight,
      paymentMethod: order.payment_method,
      paidAt: order.paid_at ? new Date(order.paid_at).getTime() : undefined,
      customerNotes: order.customer_notes,
      serverId: order.server_id,
      serverName: order.server_name,
      customerId: order.customer_id,
      pointsEarned: order.points_earned,
      pointsRedeemed: order.points_redeemed,
      branchId: order.branch_id
    }));
  }

  async getFilteredOrders(startDate: number, endDate: number, branchId?: string): Promise<Order[]> {
    const startTimestamp = new Date(startDate).toISOString();
    const endTimestamp = new Date(endDate).toISOString();

    let query = supabase
      .from('orders')
      .select('*')
      .gte('created_at', startTimestamp)
      .lte('created_at', endTimestamp);

    if (branchId && branchId !== 'all') {
      query = query.eq('branch_id', branchId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((order: any) => ({
      uuid: order.id,
      tableNo: order.table_nos?.join(', '),
      tableIds: order.table_nos || [],
      items: order.items || [],
      subtotal: order.subtotal,
      tax: order.tax,
      discount: order.discount || 0,
      totalAmount: order.total_amount,
      status: order.status,
      diningOption: order.dining_option,
      syncStatus: order.sync_status,
      createdAt: new Date(order.created_at).getTime(),
      updatedAt: new Date(order.updated_at).getTime(),
      opLogId: order.id,
      aiInsight: order.ai_insight,
      paymentMethod: order.payment_method,
      paidAt: order.paid_at ? new Date(order.paid_at).getTime() : undefined,
      customerNotes: order.customer_notes,
      serverId: order.server_id,
      serverName: order.server_name,
      customerId: order.customer_id,
      pointsEarned: order.points_earned,
      pointsRedeemed: order.points_redeemed,
      branchId: order.branch_id
    }));
  }

  async createOrder(order: Order): Promise<void> {
    const dbOrder = {
      id: order.uuid,
      customer_id: order.customerId,
      server_id: order.serverId,
      branch_id: order.branchId,
      table_nos: order.tableIds,
      dining_option: order.diningOption,
      status: order.status,
      subtotal: order.subtotal,
      tax: order.tax,
      discount: order.discount,
      total_amount: order.totalAmount,
      sync_status: order.syncStatus,
      payment_method: order.paymentMethod,
      points_earned: order.pointsEarned || 0,
      points_redeemed: order.pointsRedeemed || 0,
      ai_insight: order.aiInsight,
      customer_notes: order.customerNotes,
      items: order.items,
      created_at: new Date(order.createdAt).toISOString(),
      updated_at: new Date(order.updatedAt).toISOString(),
      paid_at: order.paidAt ? new Date(order.paidAt).toISOString() : null
    };

    const { error } = await supabase
      .from('orders')
      .insert([dbOrder]);

    if (error) {
      console.error('Error creating order:', error);
      throw error;
    }

    if (order.customerId && order.pointsRedeemed && order.pointsRedeemed > 0) {
      await this.adjustCustomerPoints(order.customerId, -order.pointsRedeemed);
    }
  }

  async updateOrder(uuid: string, updates: Partial<Order>): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', uuid);

    if (error) throw error;
  }

  async markOrderAsPaid(uuid: string, paymentMethod: 'card' | 'cash', paidAt: number): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        payment_method: paymentMethod,
        paid_at: new Date(paidAt).toISOString(),
        sync_status: 'unsynced',
        updated_at: new Date().toISOString()
      })
      .eq('id', uuid);

    if (error) throw error;
  }

  async toggleOrderItemStatus(orderId: string, itemIndex: number): Promise<void> {
    const { data, error: fetchError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);

    if (fetchError) throw fetchError;

    const items = data || [];
    if (itemIndex < items.length) {
      const item = items[itemIndex];
      const { error } = await supabase
        .from('order_items')
        .update({ completed: !item.completed })
        .eq('id', item.id);

      if (error) throw error;
    }
  }

  async updateOrderItemKitchenStatus(orderId: string, itemIndex: number, status: 'waiting' | 'preparing' | 'done'): Promise<void> {
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('items')
      .eq('id', orderId)
      .single();

    if (fetchError) throw fetchError;

    const items = order.items || [];
    if (itemIndex < items.length) {
      items[itemIndex].kitchenStatus = status;

      const { error } = await supabase
        .from('orders')
        .update({
          items: items,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;
    }
  }

  async getUnsyncedOrders(): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .in('sync_status', ['unsynced', 'failed']);

    if (error) throw error;

    return (data || []).map((order: any) => ({
      uuid: order.id,
      tableNo: order.table_nos?.join(', '),
      tableIds: order.table_nos || [],
      items: order.items || [],
      subtotal: order.subtotal,
      tax: order.tax,
      discount: order.discount || 0,
      totalAmount: order.total_amount,
      status: order.status,
      diningOption: order.dining_option,
      syncStatus: order.sync_status,
      createdAt: new Date(order.created_at).getTime(),
      updatedAt: new Date(order.updated_at).getTime(),
      opLogId: order.id,
      aiInsight: order.ai_insight,
      paymentMethod: order.payment_method,
      paidAt: order.paid_at ? new Date(order.paid_at).getTime() : undefined,
      customerNotes: order.customer_notes,
      serverId: order.server_id,
      serverName: order.server_name,
      customerId: order.customer_id,
      pointsEarned: order.points_earned,
      pointsRedeemed: order.points_redeemed,
      branchId: order.branch_id
    }));
  }

  async addItemsToOrder(orderUuid: string, newItems: OrderItem[], addedSubtotal: number, addedTax: number, addedTotal: number, updatedTableIds?: string[], serverName?: string): Promise<void> {
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        sync_status: 'unsynced',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderUuid);

    if (updateError) throw updateError;

    const itemsToInsert = newItems.map(item => ({
      order_id: orderUuid,
      menu_item_id: item.id,
      quantity: item.qty,
      unit_price: item.price,
      completed: false
    }));

    const { error: insertError } = await supabase
      .from('order_items')
      .insert(itemsToInsert);

    if (insertError) throw insertError;
  }

  // --- Customers ---
  async getCustomers(): Promise<Customer[]> {
    const { data, error } = await supabase
      .from('customers')
      .select('*');

    if (error) throw error;
    return (data || []) as Customer[];
  }

  async findCustomerByPhone(phone: string): Promise<Customer | undefined> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('phone', phone)
      .maybeSingle();

    if (error) throw error;
    return data as Customer | undefined;
  }

  async createCustomer(name: string, phone: string): Promise<Customer> {
    const newCustomer = {
      name,
      phone,
      points: 0,
      total_spent: 0,
      visits: 0
    };

    const { data, error } = await supabase
      .from('customers')
      .insert([newCustomer])
      .select()
      .single();

    if (error) throw error;
    return data as Customer;
  }

  async adjustCustomerPoints(customerId: string, delta: number): Promise<void> {
    const { error } = await supabase
      .from('customers')
      .update({ points: supabase.raw(`GREATEST(0, points + ${delta})`) })
      .eq('id', customerId);

    if (error) throw error;
  }

  async updateCustomerStats(customerId: string, amountSpent: number, pointsEarned: number): Promise<void> {
    const { error } = await supabase
      .from('customers')
      .update({
        points: supabase.raw(`points + ${pointsEarned}`),
        total_spent: supabase.raw(`total_spent + ${amountSpent}`),
        visits: supabase.raw('visits + 1')
      })
      .eq('id', customerId);

    if (error) throw error;
  }

  async getCustomerById(id: string): Promise<Customer | undefined> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as Customer | undefined;
  }

  // --- Inventory ---
  async getProducts(): Promise<MenuItem[]> {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*');

    if (error) throw error;

    return (data || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      category: item.category,
      price: item.price,
      cost: item.cost,
      stock: item.stock,
      lowStockThreshold: item.low_stock_threshold,
      barcode: item.barcode,
      image: item.image,
      isTrending: item.is_trending,
      isKitchenItem: item.is_kitchen_item,
      menuCategory: item.menu_category
    }));
  }

  async addProduct(product: MenuItem): Promise<void> {
    const dbProduct = {
      id: product.id,
      name: product.name,
      description: product.description,
      category: product.category,
      price: product.price,
      cost: product.cost,
      stock: product.stock,
      low_stock_threshold: product.lowStockThreshold,
      barcode: product.barcode,
      image: product.image,
      is_trending: product.isTrending || false,
      is_kitchen_item: product.isKitchenItem || false,
      menu_category: product.menuCategory || 'general'
    };

    const { error } = await supabase
      .from('menu_items')
      .insert([dbProduct]);

    if (error) throw error;

    if (product.stock > 0) {
      await supabase
        .from('inventory_logs')
        .insert([{
          menu_item_id: product.id,
          change: product.stock,
          reason: 'restock',
          reported_by: 'Admin',
          verified: true
        }]);
    }
  }

  async updateProduct(id: string, updates: Partial<MenuItem>): Promise<void> {
    const { data: product, error: fetchError } = await supabase
      .from('menu_items')
      .select('stock')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    if (updates.cost !== undefined) dbUpdates.cost = updates.cost;
    if (updates.stock !== undefined) dbUpdates.stock = updates.stock;
    if (updates.lowStockThreshold !== undefined) dbUpdates.low_stock_threshold = updates.lowStockThreshold;
    if (updates.barcode !== undefined) dbUpdates.barcode = updates.barcode;
    if (updates.image !== undefined) dbUpdates.image = updates.image;
    if (updates.isTrending !== undefined) dbUpdates.is_trending = updates.isTrending;
    if (updates.isKitchenItem !== undefined) dbUpdates.is_kitchen_item = updates.isKitchenItem;
    if (updates.menuCategory !== undefined) dbUpdates.menu_category = updates.menuCategory;

    const { error: updateError } = await supabase
      .from('menu_items')
      .update(dbUpdates)
      .eq('id', id);

    if (updateError) throw updateError;

    if (updates.stock !== undefined && product.stock !== updates.stock) {
      const diff = updates.stock - product.stock;
      await supabase
        .from('inventory_logs')
        .insert([{
          menu_item_id: id,
          change: diff,
          reason: 'adjustment',
          reported_by: 'Admin',
          verified: true
        }]);
    }
  }

  async deleteProduct(id: string): Promise<void> {
    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async adjustStock(itemId: string, newStock: number, reason: 'restock' | 'waste' | 'adjustment', reportedBy: string = 'Admin', verified: boolean = true): Promise<void> {
    const { data: product, error: fetchError } = await supabase
      .from('menu_items')
      .select('stock')
      .eq('id', itemId)
      .single();

    if (fetchError) throw fetchError;

    const diff = newStock - product.stock;

    const { error: updateError } = await supabase
      .from('menu_items')
      .update({ stock: newStock })
      .eq('id', itemId);

    if (updateError) throw updateError;

    await supabase
      .from('inventory_logs')
      .insert([{
        menu_item_id: itemId,
        change: diff,
        reason: reason,
        reported_by: reportedBy,
        verified: verified
      }]);
  }

  async getInventoryLogs(): Promise<InventoryLog[]> {
    const { data, error } = await supabase
      .from('inventory_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as InventoryLog[];
  }

  async getItemHistory(itemId: string): Promise<InventoryLog[]> {
    const { data, error } = await supabase
      .from('inventory_logs')
      .select('*')
      .eq('menu_item_id', itemId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as InventoryLog[];
  }

  // --- Employees ---
  async getEmployees(): Promise<Employee[]> {
    const { data, error } = await supabase
      .from('employees')
      .select('*');

    if (error) throw error;
    return (data || []) as Employee[];
  }

  async addEmployee(employee: Employee): Promise<void> {
    const { error } = await supabase
      .from('employees')
      .insert([employee]);

    if (error) throw error;
  }

  async deleteEmployee(id: string): Promise<void> {
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async updateEmployee(id: string, updates: Partial<Employee>): Promise<void> {
    const { error } = await supabase
      .from('employees')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  }

  async resetPin(id: string, newPin: string): Promise<void> {
    await this.updateEmployee(id, { pin: newPin });
  }

  async authenticate(pin: string): Promise<Employee | null> {
    const { data, error } = await supabase
      .rpc('authenticate_employee', { input_pin: pin });

    if (error) throw error;

    if (!data || data.length === 0) return null;
    return data[0] as Employee;
  }

  // --- Attendance ---
  async getAttendanceLogs(): Promise<AttendanceRecord[]> {
    const { data, error } = await supabase
      .from('attendance_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as AttendanceRecord[];
  }

  async logAttendance(employeeId: string, type: 'check-in' | 'check-out'): Promise<void> {
    const { error: updateError } = await supabase
      .from('employees')
      .update({ is_checked_in: type === 'check-in' })
      .eq('id', employeeId);

    if (updateError) throw updateError;

    const { data: employee, error: fetchError } = await supabase
      .from('employees')
      .select('name')
      .eq('id', employeeId)
      .single();

    if (fetchError) throw fetchError;

    const { error: logError } = await supabase
      .from('attendance_logs')
      .insert([{
        employee_id: employeeId,
        employee_name: employee.name,
        type: type,
        timestamp: new Date().toISOString()
      }]);

    if (logError) throw logError;
  }

  // --- Tables ---
  async getTables(): Promise<TableConfig[]> {
    const { data, error } = await supabase
      .from('tables')
      .select('*');

    if (error) throw error;
    return (data || []) as TableConfig[];
  }

  async addTable(table: TableConfig): Promise<void> {
    const { error } = await supabase
      .from('tables')
      .insert([table]);

    if (error) throw error;
  }

  async updateTable(id: string, updates: Partial<TableConfig>): Promise<void> {
    const { error } = await supabase
      .from('tables')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  }

  async deleteTable(id: string): Promise<void> {
    const { error } = await supabase
      .from('tables')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // --- Settings / Rewards / Branches ---
  async getSettings(): Promise<AppSettings> {
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .eq('id', 'global')
      .maybeSingle();

    if (error) throw error;
    return (data || { id: 'global', currencySymbol: 'OMR', currentBranchId: '', taxRate: 0.05 }) as AppSettings;
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    const { error } = await supabase
      .from('app_settings')
      .upsert([settings], { onConflict: 'id' });

    if (error) throw error;
  }

  async getRewards(): Promise<LoyaltyReward[]> {
    const { data, error } = await supabase
      .from('loyalty_rewards')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;
    return (data || []) as LoyaltyReward[];
  }

  async addLoyaltyReward(reward: LoyaltyReward): Promise<void> {
    const { error } = await supabase
      .from('loyalty_rewards')
      .insert([reward]);

    if (error) throw error;
  }

  async deleteLoyaltyReward(id: string): Promise<void> {
    const { error } = await supabase
      .from('loyalty_rewards')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
  }

  async getBranches(): Promise<Branch[]> {
    const { data, error } = await supabase
      .from('branches')
      .select('*');

    if (error) throw error;
    return (data || []) as Branch[];
  }

  async addBranch(branch: Branch): Promise<void> {
    const { error } = await supabase
      .from('branches')
      .insert([branch]);

    if (error) throw error;
  }

  async deleteBranch(id: string): Promise<void> {
    const { error } = await supabase
      .from('branches')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async updateBranch(id: string, updates: Partial<Branch>): Promise<void> {
    const { error } = await supabase
      .from('branches')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  }

  // --- Payment Transactions ---
  async createPaymentTransaction(orderId: string, cashAmount: number, cardAmount: number, totalAmount: number, cardRef?: string, processedById?: string): Promise<any> {
    const transactionType = cashAmount > 0 && cardAmount > 0 ? 'partial' : cashAmount > 0 ? 'cash' : 'card';

    const { data, error } = await supabase
      .from('payment_transactions')
      .insert([{
        order_id: orderId,
        transaction_type: transactionType,
        cash_amount: cashAmount,
        card_amount: cardAmount,
        total_amount: totalAmount,
        validation_status: 'valid',
        status: 'completed',
        payment_reference: cardRef,
        processed_by_id: processedById,
        created_at: new Date().toISOString(),
        processed_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getPaymentTransactions(orderId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async updateOrderPaymentStatus(orderId: string, paymentStatus: 'pending' | 'partial' | 'complete', breakdown?: any): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .update({
        payment_status: paymentStatus,
        payment_breakdown_json: breakdown || {},
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (error) throw error;
  }

  async logAuditAction(employeeId: string | undefined, actionType: string, resourceType: string, resourceId: string, oldValues?: any, newValues?: any): Promise<void> {
    const { error } = await supabase
      .from('audit_logs')
      .insert([{
        employee_id: employeeId,
        action_type: actionType,
        resource_type: resourceType,
        resource_id: resourceId,
        old_values: oldValues,
        new_values: newValues,
        created_at: new Date().toISOString()
      }]);

    if (error) throw error;
  }
}

export const db = new SupabaseDB();
