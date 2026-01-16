import { supabase } from './supabase';

export interface SalesReport {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  cashTotal: number;
  cardTotal: number;
  discountTotal: number;
  taxTotal: number;
}

export interface ItemSalesData {
  itemId: string;
  itemName: string;
  category: string;
  quantitySold: number;
  totalRevenue: number;
  profitMargin: number;
  avgPrice: number;
}

export interface CategorySalesData {
  category: string;
  itemCount: number;
  quantitySold: number;
  totalRevenue: number;
  percentageOfTotal: number;
}

export interface UserPerformanceData {
  userId: string;
  userName: string;
  totalOrders: number;
  totalSales: number;
  averageOrderValue: number;
  cashSales: number;
  cardSales: number;
  discountsGiven: number;
}

export interface OrderDetailData {
  orderId: string;
  orderNo?: string;
  createdAt: string;
  tableNo?: string;
  diningOption: string;
  itemCount: number;
  subtotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
  cashAmount: number;
  cardAmount: number;
  status: string;
  serverName?: string;
  customerName?: string;
}

export class ReportingService {
  static async getSalesReport(
    startDate: Date,
    endDate: Date,
    branchId?: string
  ): Promise<SalesReport> {
    const startIso = startDate.toISOString();
    const endIso = endDate.toISOString();

    let query = supabase
      .from('orders')
      .select('*')
      .eq('status', 'paid')
      .gte('paid_at', startIso)
      .lte('paid_at', endIso);

    if (branchId && branchId !== 'all') {
      query = query.eq('branch_id', branchId);
    }

    const { data: orders, error } = await query;
    if (error) throw error;

    const orderList = orders || [];
    const totalRevenue = orderList.reduce((sum, o: any) => sum + (o.total_amount || 0), 0);
    const taxTotal = orderList.reduce((sum, o: any) => sum + (o.tax || 0), 0);
    const discountTotal = orderList.reduce((sum, o: any) => sum + (o.discount || 0), 0);

    const { data: payments, error: paymentError } = await supabase
      .from('payment_transactions')
      .select('*')
      .gte('created_at', startIso)
      .lte('created_at', endIso);

    if (paymentError) throw paymentError;

    const paymentList = payments || [];
    const cashTotal = paymentList.reduce((sum: number, p: any) => sum + (p.cash_amount || 0), 0);
    const cardTotal = paymentList.reduce((sum: number, p: any) => sum + (p.card_amount || 0), 0);

    return {
      totalRevenue,
      totalOrders: orderList.length,
      averageOrderValue: orderList.length > 0 ? totalRevenue / orderList.length : 0,
      cashTotal,
      cardTotal,
      discountTotal,
      taxTotal
    };
  }

  static async getItemSalesReport(
    startDate: Date,
    endDate: Date,
    branchId?: string
  ): Promise<ItemSalesData[]> {
    const startIso = startDate.toISOString();
    const endIso = endDate.toISOString();

    let query = supabase
      .from('order_items')
      .select(`
        id,
        quantity,
        unit_price,
        menu_item_id,
        orders(id, paid_at, branch_id)
      `)
      .gte('orders.paid_at', startIso)
      .lte('orders.paid_at', endIso);

    if (branchId && branchId !== 'all') {
      query = query.eq('orders.branch_id', branchId);
    }

    const { data: orderItems, error } = await query;
    if (error) throw error;

    const itemMap = new Map<string, any>();

    (orderItems || []).forEach((oi: any) => {
      if (!oi.menu_item_id || !oi.orders) return;

      const key = oi.menu_item_id;
      const existing = itemMap.get(key) || {
        itemId: oi.menu_item_id,
        quantitySold: 0,
        totalRevenue: 0,
        prices: []
      };

      existing.quantitySold += oi.quantity || 0;
      const lineTotal = (oi.quantity || 0) * (oi.unit_price || 0);
      existing.totalRevenue += lineTotal;
      existing.prices.push(oi.unit_price);

      itemMap.set(key, existing);
    });

    const { data: menuItems, error: menuError } = await supabase
      .from('menu_items')
      .select('id, name, category, cost');

    if (menuError) throw menuError;

    const itemDetails = new Map(menuItems?.map((m: any) => [m.id, m]) || []);

    return Array.from(itemMap.values())
      .map((item: any) => {
        const details = itemDetails.get(item.itemId) || {};
        const avgPrice = item.prices.length > 0
          ? item.prices.reduce((a: number, b: number) => a + b, 0) / item.prices.length
          : 0;
        const cost = (details.cost || 0) * item.quantitySold;
        const margin = item.totalRevenue > 0
          ? ((item.totalRevenue - cost) / item.totalRevenue) * 100
          : 0;

        return {
          itemId: item.itemId,
          itemName: details.name || 'Unknown Item',
          category: details.category || 'uncategorized',
          quantitySold: item.quantitySold,
          totalRevenue: item.totalRevenue,
          profitMargin: margin,
          avgPrice
        };
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }

  static async getCategorySalesReport(
    startDate: Date,
    endDate: Date,
    branchId?: string
  ): Promise<CategorySalesData[]> {
    const itemSales = await this.getItemSalesReport(startDate, endDate, branchId);

    const categoryMap = new Map<string, any>();
    let totalRevenue = 0;

    itemSales.forEach(item => {
      const category = item.category;
      const existing = categoryMap.get(category) || {
        category,
        itemCount: 0,
        quantitySold: 0,
        totalRevenue: 0
      };

      existing.itemCount += 1;
      existing.quantitySold += item.quantitySold;
      existing.totalRevenue += item.totalRevenue;
      totalRevenue += item.totalRevenue;

      categoryMap.set(category, existing);
    });

    return Array.from(categoryMap.values())
      .map((cat: any) => ({
        ...cat,
        percentageOfTotal: totalRevenue > 0 ? (cat.totalRevenue / totalRevenue) * 100 : 0
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }

  static async getUserPerformanceReport(
    startDate: Date,
    endDate: Date,
    branchId?: string
  ): Promise<UserPerformanceData[]> {
    const startIso = startDate.toISOString();
    const endIso = endDate.toISOString();

    let query = supabase
      .from('orders')
      .select('*')
      .eq('status', 'paid')
      .gte('paid_at', startIso)
      .lte('paid_at', endIso);

    if (branchId && branchId !== 'all') {
      query = query.eq('branch_id', branchId);
    }

    const { data: orders, error } = await query;
    if (error) throw error;

    const userMap = new Map<string, any>();

    (orders || []).forEach((o: any) => {
      if (!o.server_id) return;

      const userId = o.server_id;
      const existing = userMap.get(userId) || {
        userId,
        userName: o.server_name || 'Unknown',
        totalOrders: 0,
        totalSales: 0,
        cashSales: 0,
        cardSales: 0,
        discountsGiven: 0
      };

      existing.totalOrders += 1;
      existing.totalSales += o.total_amount || 0;
      existing.discountsGiven += o.discount || 0;

      if (o.payment_method === 'cash') {
        existing.cashSales += o.total_amount || 0;
      } else if (o.payment_method === 'card') {
        existing.cardSales += o.total_amount || 0;
      }

      userMap.set(userId, existing);
    });

    return Array.from(userMap.values())
      .map((user: any) => ({
        ...user,
        averageOrderValue: user.totalOrders > 0 ? user.totalSales / user.totalOrders : 0
      }))
      .sort((a, b) => b.totalSales - a.totalSales);
  }

  static async getOrderDetailsReport(
    startDate: Date,
    endDate: Date,
    branchId?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<OrderDetailData[]> {
    const startIso = startDate.toISOString();
    const endIso = endDate.toISOString();

    let query = supabase
      .from('orders')
      .select(`
        id,
        table_nos,
        dining_option,
        subtotal,
        discount,
        tax,
        total_amount,
        status,
        server_name,
        customer:customers(name),
        created_at,
        payment_breakdown_json
      `)
      .eq('status', 'paid')
      .gte('created_at', startIso)
      .lte('created_at', endIso)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (branchId && branchId !== 'all') {
      query = query.eq('branch_id', branchId);
    }

    const { data: orders, error } = await query;
    if (error) throw error;

    return (orders || []).map((o: any) => {
      const breakdown = o.payment_breakdown_json || {};
      return {
        orderId: o.id,
        createdAt: o.created_at,
        tableNo: o.table_nos?.[0] || 'Take-out',
        diningOption: o.dining_option,
        itemCount: 0,
        subtotal: o.subtotal,
        discount: o.discount,
        tax: o.tax,
        totalAmount: o.total_amount,
        cashAmount: breakdown.cashAmount || 0,
        cardAmount: breakdown.cardAmount || 0,
        status: o.status,
        serverName: o.server_name,
        customerName: o.customer?.name
      };
    });
  }

  static async getPaymentSplitReport(
    startDate: Date,
    endDate: Date,
    branchId?: string
  ): Promise<{
    totalTransactions: number;
    cashOnlyTransactions: number;
    cardOnlyTransactions: number;
    partialPaymentTransactions: number;
    totalCash: number;
    totalCard: number;
    totalPartialPayments: number;
    averageCashTransaction: number;
    averageCardTransaction: number;
  }> {
    const startIso = startDate.toISOString();
    const endIso = endDate.toISOString();

    let query = supabase
      .from('payment_transactions')
      .select('*')
      .gte('created_at', startIso)
      .lte('created_at', endIso)
      .eq('status', 'completed');

    const { data: transactions, error } = await query;
    if (error) throw error;

    const txList = transactions || [];

    const cashOnly = txList.filter((t: any) => t.transaction_type === 'cash');
    const cardOnly = txList.filter((t: any) => t.transaction_type === 'card');
    const partial = txList.filter((t: any) => t.transaction_type === 'partial');

    const totalCash = txList.reduce((sum: number, t: any) => sum + (t.cash_amount || 0), 0);
    const totalCard = txList.reduce((sum: number, t: any) => sum + (t.card_amount || 0), 0);

    return {
      totalTransactions: txList.length,
      cashOnlyTransactions: cashOnly.length,
      cardOnlyTransactions: cardOnly.length,
      partialPaymentTransactions: partial.length,
      totalCash,
      totalCard,
      totalPartialPayments: partial.reduce((sum: number, t: any) => sum + (t.total_amount || 0), 0),
      averageCashTransaction: cashOnly.length > 0 ? cashOnly.reduce((sum: number, t: any) => sum + (t.total_amount || 0), 0) / cashOnly.length : 0,
      averageCardTransaction: cardOnly.length > 0 ? cardOnly.reduce((sum: number, t: any) => sum + (t.total_amount || 0), 0) / cardOnly.length : 0
    };
  }
}
