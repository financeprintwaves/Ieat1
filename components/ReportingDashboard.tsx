import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, CreditCard, Banknote, Download, Calendar } from 'lucide-react';
import { ReportingService, SalesReport, ItemSalesData, CategorySalesData, UserPerformanceData } from '../services/reportingService';
import { Branch, AppSettings } from '../types';

interface ReportingDashboardProps {
  settings: AppSettings;
  branches: Branch[];
}

export function ReportingDashboard({ settings, branches }: ReportingDashboardProps) {
  const [selectedBranch, setSelectedBranch] = useState(settings.currentBranchId);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'custom'>('week');
  const [customStartDate, setCustomStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<'overview' | 'items' | 'categories' | 'users' | 'payments'>('overview');
  const [loading, setLoading] = useState(false);

  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [itemSales, setItemSales] = useState<ItemSalesData[]>([]);
  const [categorySales, setCategorySales] = useState<CategorySalesData[]>([]);
  const [userPerformance, setUserPerformance] = useState<UserPerformanceData[]>([]);
  const [paymentSplit, setPaymentSplit] = useState<any>(null);

  const getDateRange = () => {
    const today = new Date();
    let start, end;

    switch (dateRange) {
      case 'today':
        start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        break;
      case 'week':
        start = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        end = new Date();
        break;
      case 'month':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        break;
      case 'custom':
        start = new Date(customStartDate);
        end = new Date(customEndDate);
        break;
      default:
        start = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        end = new Date();
    }

    return { start, end };
  };

  const loadReports = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();
      const branchId = selectedBranch === 'all' ? undefined : selectedBranch;

      const sales = await ReportingService.getSalesReport(start, end, branchId);
      setSalesReport(sales);

      const items = await ReportingService.getItemSalesReport(start, end, branchId);
      setItemSales(items);

      const categories = await ReportingService.getCategorySalesReport(start, end, branchId);
      setCategorySales(categories);

      const users = await ReportingService.getUserPerformanceReport(start, end, branchId);
      setUserPerformance(users);

      const payments = await ReportingService.getPaymentSplitReport(start, end, branchId);
      setPaymentSplit(payments);
    } catch (err) {
      console.error('Report loading failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [selectedBranch, dateRange, customStartDate, customEndDate]);

  const StatCard = ({ icon: Icon, label, value, change, currency }: any) => (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">{label}</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{currency}{value.toFixed(2)}</p>
        </div>
        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
          <Icon size={20} className="text-slate-600 dark:text-slate-400" />
        </div>
      </div>
      {change !== undefined && (
        <div className={`text-xs font-bold flex items-center gap-1 ${change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {Math.abs(change).toFixed(1)}% vs previous
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6 space-y-6 overflow-y-auto">
      <div className="flex gap-4 items-center flex-wrap">
        <select
          value={selectedBranch}
          onChange={(e) => setSelectedBranch(e.target.value)}
          className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-bold"
        >
          <option value="all">All Branches</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>

        <div className="flex gap-2">
          {(['today', 'week', 'month', 'custom'] as const).map(range => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-3 py-2 rounded-lg text-xs font-bold uppercase transition-all ${
                dateRange === range
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {range === 'custom' ? '📅' : range}
            </button>
          ))}
        </div>

        {dateRange === 'custom' && (
          <div className="flex gap-2">
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
            />
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
            />
          </div>
        )}

        <button
          onClick={loadReports}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg text-xs font-bold uppercase transition-colors"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        {['overview', 'items', 'categories', 'users', 'payments'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-3 text-xs font-bold uppercase border-b-2 transition-all ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && salesReport && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard icon={DollarSign} label="Total Revenue" value={salesReport.totalRevenue} currency={settings.currencySymbol} />
          <StatCard icon={DollarSign} label="Average Order Value" value={salesReport.averageOrderValue} currency={settings.currencySymbol} />
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Total Orders</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{salesReport.totalOrders}</p>
          </div>
          <StatCard icon={Banknote} label="Cash Sales" value={salesReport.cashTotal} currency={settings.currencySymbol} />
          <StatCard icon={CreditCard} label="Card Sales" value={salesReport.cardTotal} currency={settings.currencySymbol} />
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Total Tax</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{settings.currencySymbol}{salesReport.taxTotal.toFixed(2)}</p>
          </div>
        </div>
      )}

      {activeTab === 'items' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left font-bold text-slate-700 dark:text-slate-300">Item Name</th>
                  <th className="px-4 py-3 text-right font-bold text-slate-700 dark:text-slate-300">Qty Sold</th>
                  <th className="px-4 py-3 text-right font-bold text-slate-700 dark:text-slate-300">Revenue</th>
                  <th className="px-4 py-3 text-right font-bold text-slate-700 dark:text-slate-300">Margin %</th>
                </tr>
              </thead>
              <tbody>
                {itemSales.slice(0, 15).map((item, i) => (
                  <tr key={i} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{item.itemName}</td>
                    <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">{item.quantitySold}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">{settings.currencySymbol}{item.totalRevenue.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold ${item.profitMargin > 30 ? 'text-green-600 dark:text-green-400' : item.profitMargin > 15 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                        {item.profitMargin.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categorySales.map((cat, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white capitalize">{cat.category}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{cat.itemCount} items, {cat.quantitySold} sold</p>
                </div>
                <span className="text-xs font-bold bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-700 dark:text-slate-300">
                  {cat.percentageOfTotal.toFixed(1)}%
                </span>
              </div>
              <p className="text-xl font-black text-slate-900 dark:text-white">{settings.currencySymbol}{cat.totalRevenue.toFixed(2)}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left font-bold text-slate-700 dark:text-slate-300">Staff Name</th>
                  <th className="px-4 py-3 text-right font-bold text-slate-700 dark:text-slate-300">Orders</th>
                  <th className="px-4 py-3 text-right font-bold text-slate-700 dark:text-slate-300">Total Sales</th>
                  <th className="px-4 py-3 text-right font-bold text-slate-700 dark:text-slate-300">Avg Order</th>
                </tr>
              </thead>
              <tbody>
                {userPerformance.slice(0, 15).map((user, i) => (
                  <tr key={i} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{user.userName}</td>
                    <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">{user.totalOrders}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">{settings.currencySymbol}{user.totalSales.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">{settings.currencySymbol}{user.averageOrderValue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'payments' && paymentSplit && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">Total Transactions</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{paymentSplit.totalTransactions}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">Cash Only</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{paymentSplit.cashOnlyTransactions}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{settings.currencySymbol}{paymentSplit.totalCash.toFixed(2)}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">Card Only</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{paymentSplit.cardOnlyTransactions}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{settings.currencySymbol}{paymentSplit.totalCard.toFixed(2)}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">Partial Payments</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{paymentSplit.partialPaymentTransactions}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{settings.currencySymbol}{paymentSplit.totalPartialPayments.toFixed(2)}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">Avg Cash Transaction</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{settings.currencySymbol}{paymentSplit.averageCashTransaction.toFixed(2)}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">Avg Card Transaction</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{settings.currencySymbol}{paymentSplit.averageCardTransaction.toFixed(2)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
