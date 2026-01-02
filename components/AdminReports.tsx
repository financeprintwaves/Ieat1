import React, { useState, useMemo } from 'react';
import { TrendingUp, DollarSign, ShoppingBag, Users, Calendar, Filter, Star, Sparkles, Store, Award, FileText, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { Order, MenuItem, Category, Branch, Employee } from '../types';
import { generateDailyInsight } from '../services/geminiService';
import { db } from '../services/db';

interface AdminReportsProps {
    currency: string;
    orders: Order[];
    products: MenuItem[];
}

export const AdminReports = ({ currency, orders, products }: AdminReportsProps) => {
    const [viewMode, setViewMode] = useState<'analytics' | 'journal'>('analytics');
    const [selectedBranch, setSelectedBranch] = useState<string>('all');
    const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');
    const [timeRange, setTimeRange] = useState<'daily' | 'monthly'>('daily');
    
    const [insight, setInsight] = useState<string>('');
    const [loadingInsight, setLoadingInsight] = useState(false);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);

    React.useEffect(() => {
        db.getBranches().then(setBranches);
        const employeeData = db.getEmployees();
        setEmployees(employeeData);
    }, []);

    const filteredOrders = useMemo(() => {
        const start = new Date(startDate).setHours(0, 0, 0, 0);
        const end = new Date(endDate).setHours(23, 59, 59, 999);
        
        return orders.filter(o => {
            const dateMatch = o.createdAt >= start && o.createdAt <= end;
            const branchMatch = selectedBranch === 'all' || o.branchId === selectedBranch;
            const isPaid = o.status === 'paid' || o.status === 'ready' || o.status === 'cooking' || o.status === 'pending';
            return dateMatch && branchMatch && isPaid;
        });
    }, [orders, selectedBranch, startDate, endDate]);

    const stats = useMemo(() => {
        const paidOnly = filteredOrders.filter(o => o.status === 'paid');
        const totalSales = paidOnly.reduce((sum, o) => sum + o.totalAmount, 0);
        const count = paidOnly.length;
        const customers = new Set(paidOnly.map(o => o.customerId || 'guest').filter(id => id !== 'guest')).size;
        const avgOrder = count > 0 ? totalSales / count : 0;
        return { totalSales, count, customers, avgOrder };
    }, [filteredOrders]);

    const chartData = useMemo(() => {
        const data: Record<string, number> = {};
        filteredOrders.filter(o => o.status === 'paid').forEach(o => {
            const date = new Date(o.createdAt);
            const key = timeRange === 'daily' 
                ? date.toLocaleDateString('en-US', { weekday: 'short' }) 
                : date.toLocaleDateString('en-US', { month: 'short' });
            data[key] = (data[key] || 0) + o.totalAmount;
        });
        return Object.entries(data).map(([name, sales]) => ({ name, sales }));
    }, [filteredOrders, timeRange]);

    const handleGenerateInsight = async () => {
        setLoadingInsight(true);
        const result = await generateDailyInsight(filteredOrders);
        setInsight(result);
        setLoadingInsight(false);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            {/* Report Header & Global Filters */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border dark:border-slate-800 shadow-sm space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl">
                            {viewMode === 'analytics' ? <TrendingUp size={24}/> : <FileText size={24}/>}
                        </div>
                        <div>
                            <h2 className="font-black text-2xl dark:text-white tracking-tighter">Reports Center</h2>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                                {viewMode === 'analytics' ? 'Performance Analytics' : 'Sales Journal'}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        <button 
                            onClick={() => setViewMode('analytics')} 
                            className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${viewMode === 'analytics' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'}`}
                        >
                            Analytics
                        </button>
                        <button 
                            onClick={() => setViewMode('journal')} 
                            className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${viewMode === 'journal' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'}`}
                        >
                            Journal
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t dark:border-slate-800 border-slate-50">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Location</label>
                        <div className="relative">
                            <Store size={14} className="absolute left-3 top-3 text-slate-400" />
                            <select 
                                value={selectedBranch} 
                                onChange={e => setSelectedBranch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-700 rounded-xl text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-brand-500 appearance-none"
                            >
                                <option value="all">Global (All Branches)</option>
                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                    </div>
                    
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">From Date</label>
                        <div className="relative">
                            <Calendar size={14} className="absolute left-3 top-3 text-slate-400" />
                            <input 
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-700 rounded-xl text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">To Date</label>
                        <div className="relative">
                            <Calendar size={14} className="absolute left-3 top-3 text-slate-400" />
                            <input 
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-700 rounded-xl text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                            />
                        </div>
                    </div>

                    <div className="flex items-end">
                        <button 
                            className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg hover:shadow-xl transition-all"
                            onClick={() => {}}
                        >
                            Refresh Data
                        </button>
                    </div>
                </div>
            </div>

            {viewMode === 'analytics' ? (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border dark:border-slate-800 shadow-sm group hover:border-emerald-500 transition-colors">
                            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl text-emerald-600 dark:text-emerald-400 w-fit mb-4 group-hover:scale-110 transition-transform"><DollarSign size={20}/></div>
                            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Period Revenue</p>
                            <p className="text-3xl font-black dark:text-white tracking-tighter">{currency}{stats.totalSales.toFixed(2)}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border dark:border-slate-800 shadow-sm group hover:border-blue-500 transition-colors">
                            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-2xl text-blue-600 dark:text-blue-400 w-fit mb-4 group-hover:scale-110 transition-transform"><ShoppingBag size={20}/></div>
                            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Tickets Sold</p>
                            <p className="text-3xl font-black dark:text-white tracking-tighter">{stats.count}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border dark:border-slate-800 shadow-sm group hover:border-purple-500 transition-colors">
                            <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-2xl text-purple-600 dark:text-purple-400 w-fit mb-4 group-hover:scale-110 transition-transform"><Users size={20}/></div>
                            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Active Customers</p>
                            <p className="text-3xl font-black dark:text-white tracking-tighter">{stats.customers}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border dark:border-slate-800 shadow-sm group hover:border-orange-500 transition-colors">
                            <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-2xl text-orange-600 dark:text-orange-400 w-fit mb-4 group-hover:scale-110 transition-transform"><TrendingUp size={20}/></div>
                            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Ticket Average</p>
                            <p className="text-3xl font-black dark:text-white tracking-tighter">{currency}{stats.avgOrder.toFixed(2)}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-3xl border dark:border-slate-800 shadow-sm">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="font-black text-lg dark:text-white flex items-center gap-2 uppercase tracking-tight"><Calendar size={20} className="text-brand-500"/> Volume Trends</h3>
                                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                                    <button onClick={()=>setTimeRange('daily')} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${timeRange==='daily' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-400'}`}>Daily</button>
                                    <button onClick={()=>setTimeRange('monthly')} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${timeRange==='monthly' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-400'}`}>Monthly</button>
                                </div>
                            </div>
                            <div className="h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.3} />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} />
                                        <Tooltip 
                                            cursor={{fill: '#f1f5f9', opacity: 0.5}}
                                            contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold'}}
                                        />
                                        <Bar dataKey="sales" radius={[6, 6, 0, 0]}>
                                            {chartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#0ea5e9' : '#0284c7'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Strategic Intelligence / AI Section */}
                        <div className="bg-slate-900 text-white p-8 rounded-3xl relative overflow-hidden flex flex-col justify-between border-2 border-slate-800 shadow-2xl">
                             <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/20 blur-[60px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
                             <div className="relative z-10">
                                <div className="bg-white/10 w-fit p-3 rounded-2xl mb-6"><Sparkles className="text-yellow-400" size={24}/></div>
                                <h3 className="text-2xl font-black italic mb-4 leading-tight tracking-tighter">Strategic Intelligence</h3>
                                <p className="text-slate-400 text-sm leading-relaxed mb-8 italic">
                                    {insight || "Analyze your performance patterns to discover when and what your customers are buying most."}
                                </p>
                             </div>
                             <button 
                                onClick={handleGenerateInsight}
                                disabled={loadingInsight || filteredOrders.length === 0}
                                className="relative z-10 w-full py-4 bg-white text-slate-900 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-slate-50 transition-all disabled:opacity-20 flex items-center justify-center gap-3 shadow-xl active:scale-95"
                             >
                                {loadingInsight ? <RefreshCw className="animate-spin" size={16}/> : <TrendingUp size={16}/>}
                                {loadingInsight ? 'Consulting Chef...' : 'Generate New Insight'}
                             </button>
                        </div>
                    </div>
                </>
            ) : (
                /* Sales Journal View */
                <div className="bg-white dark:bg-slate-900 rounded-3xl border dark:border-slate-800 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                    <div className="p-6 border-b dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl"><FileText size={18}/></div>
                            <h3 className="font-black text-lg dark:text-white uppercase tracking-tighter">Invoice Ledger</h3>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                <span>Paid: {filteredOrders.filter(o => o.status === 'paid').length}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                                <span>Pending: {filteredOrders.filter(o => o.status !== 'paid').length}</span>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b dark:border-slate-800">
                                <tr>
                                    <th className="px-6 py-4">Invoice #</th>
                                    <th className="px-6 py-4">Timestamp</th>
                                    <th className="px-6 py-4">Location</th>
                                    <th className="px-6 py-4">Table</th>
                                    <th className="px-6 py-4">Method</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Total Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-slate-800">
                                {filteredOrders.length > 0 ? filteredOrders.map((order) => {
                                    const branch = branches.find(b => b.id === order.branchId);
                                    return (
                                        <tr key={order.uuid} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer" onClick={() => {}}>
                                            <td className="px-6 py-5">
                                                <span className="font-mono text-xs font-black text-brand-600 dark:text-brand-400 group-hover:underline">#{order.uuid.slice(0, 8).toUpperCase()}</span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-xs dark:text-white">{new Date(order.createdAt).toLocaleDateString()}</span>
                                                    <span className="text-[10px] text-slate-400">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">{branch?.name || 'N/A'}</span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="text-xs font-bold dark:text-slate-300">{order.tableNo ? `T-${order.tableNo}` : (order.diningOption.toUpperCase())}</span>
                                            </td>
                                            <td className="px-6 py-5 uppercase font-black text-[10px] text-slate-400">
                                                {order.paymentMethod || '—'}
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                                    order.status === 'paid' 
                                                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' 
                                                    : 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                                                }`}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <span className="text-sm font-black dark:text-white">{currency}{order.totalAmount.toFixed(2)}</span>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-20 text-center opacity-30">
                                            <div className="flex flex-col items-center gap-4">
                                                <Search size={48} />
                                                <p className="font-black text-lg uppercase tracking-widest">No matching invoices found</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            {filteredOrders.length > 0 && (
                                <tfoot className="bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-800 font-black">
                                    <tr>
                                        <td colSpan={6} className="px-6 py-5 text-right text-[10px] uppercase tracking-widest text-slate-500">Period Summation</td>
                                        <td className="px-6 py-5 text-right text-lg text-brand-600 dark:text-brand-400">
                                            {currency}{filteredOrders.reduce((acc, o) => acc + o.totalAmount, 0).toFixed(2)}
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

const RefreshCw = ({ className, size }: { className?: string, size?: number }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width={size || 24} 
        height={size || 24} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={className}
    >
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
        <path d="M3 21v-5h5" />
    </svg>
);