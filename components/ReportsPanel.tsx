import React, { useState, useMemo } from 'react';
import { BarChart3, TrendingUp, Users, CreditCard, FileText, Calendar, Filter, Eye, DollarSign, Package } from 'lucide-react';
import { Order, MenuItem, Employee, AppSettings } from '../types';

interface ReportsPanelProps {
    orders: Order[];
    products: MenuItem[];
    employees: Employee[];
    settings: AppSettings;
}

type ReportType = 'sales-by-item' | 'sales-by-category' | 'sales-by-user' | 'payment-summary' | 'order-reports';

export const ReportsPanel = ({ orders, products, employees, settings }: ReportsPanelProps) => {
    const [activeReport, setActiveReport] = useState<ReportType>('order-reports');
    const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('all');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    const filteredOrders = useMemo(() => {
        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;

        return orders.filter(order => {
            if (dateFilter === 'today') {
                return now - order.createdAt < dayMs;
            } else if (dateFilter === 'week') {
                return now - order.createdAt < 7 * dayMs;
            } else if (dateFilter === 'month') {
                return now - order.createdAt < 30 * dayMs;
            }
            return true;
        });
    }, [orders, dateFilter]);

    const salesByItem = useMemo(() => {
        const itemSales: Record<string, { name: string; quantity: number; revenue: number; category: string }> = {};

        filteredOrders.forEach(order => {
            order.items.forEach(item => {
                if (!itemSales[item.id]) {
                    itemSales[item.id] = { name: item.name, quantity: 0, revenue: 0, category: item.category };
                }
                itemSales[item.id].quantity += item.qty;
                itemSales[item.id].revenue += item.price * item.qty;
            });
        });

        return Object.entries(itemSales)
            .map(([id, data]) => ({ id, ...data }))
            .sort((a, b) => b.revenue - a.revenue);
    }, [filteredOrders]);

    const salesByCategory = useMemo(() => {
        const categorySales: Record<string, { quantity: number; revenue: number }> = {};

        filteredOrders.forEach(order => {
            order.items.forEach(item => {
                if (!categorySales[item.category]) {
                    categorySales[item.category] = { quantity: 0, revenue: 0 };
                }
                categorySales[item.category].quantity += item.qty;
                categorySales[item.category].revenue += item.price * item.qty;
            });
        });

        return Object.entries(categorySales)
            .map(([category, data]) => ({ category, ...data }))
            .sort((a, b) => b.revenue - a.revenue);
    }, [filteredOrders]);

    const salesByUser = useMemo(() => {
        const userSales: Record<string, { name: string; orderCount: number; revenue: number }> = {};

        filteredOrders.forEach(order => {
            const userId = order.serverId || 'unknown';
            const userName = order.serverName || 'Unknown';

            if (!userSales[userId]) {
                userSales[userId] = { name: userName, orderCount: 0, revenue: 0 };
            }
            userSales[userId].orderCount += 1;
            userSales[userId].revenue += order.totalAmount;
        });

        return Object.entries(userSales)
            .map(([id, data]) => ({ id, ...data }))
            .sort((a, b) => b.revenue - a.revenue);
    }, [filteredOrders]);

    const paymentSummary = useMemo(() => {
        let cashTotal = 0;
        let cardTotal = 0;
        let cashCount = 0;
        let cardCount = 0;

        filteredOrders.filter(o => o.status === 'paid').forEach(order => {
            if (order.paymentMethod === 'cash') {
                cashTotal += order.totalAmount;
                cashCount++;
            } else if (order.paymentMethod === 'card') {
                cardTotal += order.totalAmount;
                cardCount++;
            }
        });

        return {
            cash: { total: cashTotal, count: cashCount },
            card: { total: cardTotal, count: cardCount },
            overall: { total: cashTotal + cardTotal, count: cashCount + cardCount }
        };
    }, [filteredOrders]);

    const reportMenuItems = [
        { id: 'order-reports' as ReportType, label: 'Order Reports', icon: FileText, color: 'blue' },
        { id: 'sales-by-item' as ReportType, label: 'Sales by Item', icon: Package, color: 'green' },
        { id: 'sales-by-category' as ReportType, label: 'Sales by Category', icon: BarChart3, color: 'purple' },
        { id: 'sales-by-user' as ReportType, label: 'Sales by User', icon: Users, color: 'orange' },
        { id: 'payment-summary' as ReportType, label: 'Payment Summary', icon: CreditCard, color: 'pink' }
    ];

    const renderSalesByItem = () => (
        <div className="space-y-4">
            <h3 className="text-xl font-black dark:text-white flex items-center gap-2">
                <Package size={24} className="text-green-500" />
                Sales by Item
            </h3>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b-2 border-slate-200 dark:border-slate-700">
                            <th className="text-left py-3 px-4 text-xs font-black uppercase text-slate-600 dark:text-slate-400">Item</th>
                            <th className="text-left py-3 px-4 text-xs font-black uppercase text-slate-600 dark:text-slate-400">Category</th>
                            <th className="text-right py-3 px-4 text-xs font-black uppercase text-slate-600 dark:text-slate-400">Qty Sold</th>
                            <th className="text-right py-3 px-4 text-xs font-black uppercase text-slate-600 dark:text-slate-400">Revenue</th>
                        </tr>
                    </thead>
                    <tbody>
                        {salesByItem.map((item, idx) => (
                            <tr key={item.id} className={`border-b border-slate-100 dark:border-slate-800 ${idx % 2 === 0 ? 'bg-slate-50 dark:bg-slate-900/50' : ''}`}>
                                <td className="py-3 px-4 font-bold dark:text-white">{item.name}</td>
                                <td className="py-3 px-4">
                                    <span className="text-xs font-bold uppercase px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                        {item.category}
                                    </span>
                                </td>
                                <td className="py-3 px-4 text-right font-bold dark:text-white">{item.quantity}</td>
                                <td className="py-3 px-4 text-right font-bold text-green-600 dark:text-green-400">
                                    {settings.currencySymbol}{item.revenue.toFixed(2)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderSalesByCategory = () => (
        <div className="space-y-4">
            <h3 className="text-xl font-black dark:text-white flex items-center gap-2">
                <BarChart3 size={24} className="text-purple-500" />
                Sales by Category
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {salesByCategory.map((cat) => (
                    <div key={cat.category} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
                        <h4 className="text-sm font-bold uppercase text-slate-600 dark:text-slate-400 mb-4">{cat.category}</h4>
                        <div className="space-y-3">
                            <div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Items Sold</div>
                                <div className="text-3xl font-black dark:text-white">{cat.quantity}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Revenue</div>
                                <div className="text-2xl font-black text-green-600 dark:text-green-400">
                                    {settings.currencySymbol}{cat.revenue.toFixed(2)}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderSalesByUser = () => (
        <div className="space-y-4">
            <h3 className="text-xl font-black dark:text-white flex items-center gap-2">
                <Users size={24} className="text-orange-500" />
                Sales by User
            </h3>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b-2 border-slate-200 dark:border-slate-700">
                            <th className="text-left py-3 px-4 text-xs font-black uppercase text-slate-600 dark:text-slate-400">Staff Member</th>
                            <th className="text-right py-3 px-4 text-xs font-black uppercase text-slate-600 dark:text-slate-400">Orders</th>
                            <th className="text-right py-3 px-4 text-xs font-black uppercase text-slate-600 dark:text-slate-400">Revenue</th>
                        </tr>
                    </thead>
                    <tbody>
                        {salesByUser.map((user, idx) => (
                            <tr key={user.id} className={`border-b border-slate-100 dark:border-slate-800 ${idx % 2 === 0 ? 'bg-slate-50 dark:bg-slate-900/50' : ''}`}>
                                <td className="py-3 px-4 font-bold dark:text-white">{user.name}</td>
                                <td className="py-3 px-4 text-right font-bold dark:text-white">{user.orderCount}</td>
                                <td className="py-3 px-4 text-right font-bold text-green-600 dark:text-green-400">
                                    {settings.currencySymbol}{user.revenue.toFixed(2)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderPaymentSummary = () => (
        <div className="space-y-4">
            <h3 className="text-xl font-black dark:text-white flex items-center gap-2">
                <CreditCard size={24} className="text-pink-500" />
                Payment Summary
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
                    <div className="text-sm font-bold uppercase opacity-90 mb-2">Cash Payments</div>
                    <div className="text-4xl font-black mb-4">{settings.currencySymbol}{paymentSummary.cash.total.toFixed(2)}</div>
                    <div className="text-sm opacity-75">{paymentSummary.cash.count} transactions</div>
                </div>

                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                    <div className="text-sm font-bold uppercase opacity-90 mb-2">Card Payments</div>
                    <div className="text-4xl font-black mb-4">{settings.currencySymbol}{paymentSummary.card.total.toFixed(2)}</div>
                    <div className="text-sm opacity-75">{paymentSummary.card.count} transactions</div>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                    <div className="text-sm font-bold uppercase opacity-90 mb-2">Total Revenue</div>
                    <div className="text-4xl font-black mb-4">{settings.currencySymbol}{paymentSummary.overall.total.toFixed(2)}</div>
                    <div className="text-sm opacity-75">{paymentSummary.overall.count} total orders</div>
                </div>
            </div>
        </div>
    );

    const renderOrderReports = () => (
        <div className="space-y-4">
            <h3 className="text-xl font-black dark:text-white flex items-center gap-2">
                <FileText size={24} className="text-blue-500" />
                Order Reports
            </h3>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b-2 border-slate-200 dark:border-slate-700">
                            <th className="text-left py-3 px-4 text-xs font-black uppercase text-slate-600 dark:text-slate-400">Order No</th>
                            <th className="text-left py-3 px-4 text-xs font-black uppercase text-slate-600 dark:text-slate-400">Date</th>
                            <th className="text-left py-3 px-4 text-xs font-black uppercase text-slate-600 dark:text-slate-400">Time</th>
                            <th className="text-left py-3 px-4 text-xs font-black uppercase text-slate-600 dark:text-slate-400">Table</th>
                            <th className="text-right py-3 px-4 text-xs font-black uppercase text-slate-600 dark:text-slate-400">Discount</th>
                            <th className="text-right py-3 px-4 text-xs font-black uppercase text-slate-600 dark:text-slate-400">Total</th>
                            <th className="text-right py-3 px-4 text-xs font-black uppercase text-slate-600 dark:text-slate-400">Cash</th>
                            <th className="text-right py-3 px-4 text-xs font-black uppercase text-slate-600 dark:text-slate-400">Card</th>
                            <th className="text-center py-3 px-4 text-xs font-black uppercase text-slate-600 dark:text-slate-400">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOrders.slice(0, 50).map((order, idx) => {
                            const date = new Date(order.createdAt);
                            const cashAmount = order.paymentMethod === 'cash' ? order.totalAmount : 0;
                            const cardAmount = order.paymentMethod === 'card' ? order.totalAmount : 0;

                            return (
                                <tr key={order.uuid} className={`border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer ${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-900/30'}`}>
                                    <td className="py-3 px-4 font-mono text-xs text-slate-600 dark:text-slate-400">
                                        #{order.uuid.slice(0, 8)}
                                    </td>
                                    <td className="py-3 px-4 text-sm dark:text-white">
                                        {date.toLocaleDateString()}
                                    </td>
                                    <td className="py-3 px-4 text-sm dark:text-white">
                                        {date.toLocaleTimeString()}
                                    </td>
                                    <td className="py-3 px-4 text-sm font-bold dark:text-white">
                                        {order.tableNo || '-'}
                                    </td>
                                    <td className="py-3 px-4 text-right text-sm text-rose-600 dark:text-rose-400">
                                        {order.discount > 0 ? `${settings.currencySymbol}${order.discount.toFixed(2)}` : '-'}
                                    </td>
                                    <td className="py-3 px-4 text-right font-bold text-lg dark:text-white">
                                        {settings.currencySymbol}{order.totalAmount.toFixed(2)}
                                    </td>
                                    <td className="py-3 px-4 text-right text-sm text-green-600 dark:text-green-400">
                                        {cashAmount > 0 ? `${settings.currencySymbol}${cashAmount.toFixed(2)}` : '-'}
                                    </td>
                                    <td className="py-3 px-4 text-right text-sm text-blue-600 dark:text-blue-400">
                                        {cardAmount > 0 ? `${settings.currencySymbol}${cardAmount.toFixed(2)}` : '-'}
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        <button
                                            onClick={() => setSelectedOrder(order)}
                                            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-bold uppercase transition-all"
                                        >
                                            <Eye size={14} className="inline mr-1" />
                                            View
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderOrderDetail = () => {
        if (!selectedOrder) return null;

        const date = new Date(selectedOrder.createdAt);

        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                    <div className="p-6 border-b dark:border-slate-800">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-2xl font-black dark:text-white">Order Details</h2>
                                <p className="text-sm text-slate-600 dark:text-slate-400 font-mono mt-1">
                                    #{selectedOrder.uuid.slice(0, 8)}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                <Eye size={20} className="text-slate-400" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-slate-600 dark:text-slate-400">Date:</span>
                                <span className="ml-2 font-bold dark:text-white">{date.toLocaleDateString()}</span>
                            </div>
                            <div>
                                <span className="text-slate-600 dark:text-slate-400">Time:</span>
                                <span className="ml-2 font-bold dark:text-white">{date.toLocaleTimeString()}</span>
                            </div>
                            <div>
                                <span className="text-slate-600 dark:text-slate-400">Table:</span>
                                <span className="ml-2 font-bold dark:text-white">{selectedOrder.tableNo || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="text-slate-600 dark:text-slate-400">Server:</span>
                                <span className="ml-2 font-bold dark:text-white">{selectedOrder.serverName || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-6">
                        <h3 className="font-black text-lg dark:text-white mb-4">Items</h3>
                        <div className="space-y-2">
                            {selectedOrder.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <span className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 w-8 h-8 rounded flex items-center justify-center text-sm font-bold">
                                            {item.qty}
                                        </span>
                                        <span className="font-bold dark:text-white">{item.name}</span>
                                    </div>
                                    <span className="font-bold dark:text-white">
                                        {settings.currencySymbol}{(item.price * item.qty).toFixed(2)}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 space-y-2 border-t dark:border-slate-800 pt-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600 dark:text-slate-400">Subtotal:</span>
                                <span className="font-bold dark:text-white">{settings.currencySymbol}{selectedOrder.subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600 dark:text-slate-400">Tax:</span>
                                <span className="font-bold dark:text-white">{settings.currencySymbol}{selectedOrder.tax.toFixed(2)}</span>
                            </div>
                            {selectedOrder.discount > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-rose-600 dark:text-rose-400">Discount:</span>
                                    <span className="font-bold text-rose-600 dark:text-rose-400">
                                        -{settings.currencySymbol}{selectedOrder.discount.toFixed(2)}
                                    </span>
                                </div>
                            )}
                            <div className="flex justify-between text-2xl font-black pt-2 border-t dark:border-slate-700">
                                <span className="dark:text-white">Total:</span>
                                <span className="text-green-600 dark:text-green-400">
                                    {settings.currencySymbol}{selectedOrder.totalAmount.toFixed(2)}
                                </span>
                            </div>
                        </div>

                        {selectedOrder.paymentMethod && (
                            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                <div className="text-sm font-bold text-blue-900 dark:text-blue-200">
                                    Payment Method: <span className="uppercase">{selectedOrder.paymentMethod}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex">
            <div className="w-64 border-r dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-4 space-y-2">
                <h3 className="text-xs font-black uppercase text-slate-400 mb-4 flex items-center gap-2">
                    <BarChart3 size={14} />
                    Report Type
                </h3>
                {reportMenuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveReport(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-sm transition-all ${
                                activeReport === item.id
                                    ? 'bg-white dark:bg-slate-800 shadow-md text-slate-900 dark:text-white'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50'
                            }`}
                        >
                            <Icon size={18} className={activeReport === item.id ? `text-${item.color}-500` : ''} />
                            {item.label}
                        </button>
                    );
                })}
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
                <div className="mb-6 flex justify-between items-center">
                    <h2 className="text-3xl font-black dark:text-white flex items-center gap-2">
                        <TrendingUp size={32} className="text-brand-500" />
                        Reports Dashboard
                    </h2>

                    <div className="flex gap-2 items-center">
                        <Calendar size={16} className="text-slate-400" />
                        <select
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value as any)}
                            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm"
                        >
                            <option value="today">Today</option>
                            <option value="week">This Week</option>
                            <option value="month">This Month</option>
                            <option value="all">All Time</option>
                        </select>
                    </div>
                </div>

                {activeReport === 'sales-by-item' && renderSalesByItem()}
                {activeReport === 'sales-by-category' && renderSalesByCategory()}
                {activeReport === 'sales-by-user' && renderSalesByUser()}
                {activeReport === 'payment-summary' && renderPaymentSummary()}
                {activeReport === 'order-reports' && renderOrderReports()}

                {selectedOrder && renderOrderDetail()}
            </div>
        </div>
    );
};
