import React, { useState, useEffect, useMemo } from 'react';
import { MenuItem, InventoryLog, Branch } from '../types';
import { db } from '../services/db';
import { ArrowUpRight, ArrowDownRight, History, Package, Store, EyeOff, Eye, Filter, Trash2 } from 'lucide-react';

export const InventoryPanel = ({ products, refresh, onEdit, onAdd, settings }: any) => {
    const [view, setView] = useState<'stock' | 'history'>('stock');
    const [logs, setLogs] = useState<InventoryLog[]>([]);
    const [selectedItem, setSelectedItem] = useState<string>('all');
    const [selectedReason, setSelectedReason] = useState<string>('all');
    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<string>('all');

    useEffect(() => {
        db.getBranches().then(setBranches);
        if (view === 'history') {
            const l = db.getInventoryLogs();
            setLogs(l.sort((a,b) => b.timestamp - a.timestamp));
        }
    }, [view, products]);

    const filteredLogs = useMemo(() => {
        return logs.filter(l => {
            const matchesItem = selectedItem === 'all' || l.itemId === selectedItem;
            const matchesBranch = selectedBranch === 'all' || l.branchId === selectedBranch;
            const matchesReason = selectedReason === 'all' || l.reason === selectedReason;
            return matchesItem && matchesBranch && matchesReason;
        });
    }, [logs, selectedItem, selectedBranch, selectedReason]);

    const getReasonBadge = (reason: string) => {
        switch(reason) {
            case 'sale': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
            case 'restock': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            case 'waste': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            case 'adjustment': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
            default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
        }
    }

    const filteredProducts = useMemo(() => {
        if (selectedBranch === 'all') return products;
        return products;
    }, [products, selectedBranch]);

    const resetFilters = () => {
        setSelectedItem('all');
        setSelectedReason('all');
        setSelectedBranch('all');
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                     <h2 className="text-2xl font-black italic dark:text-white flex items-center gap-2">
                        {view === 'stock' ? <Package className="text-brand-500"/> : <History className="text-brand-500"/>}
                        Inventory
                     </h2>
                     <div className="flex bg-white dark:bg-slate-800 rounded-lg p-1 border dark:border-slate-700">
                        <button onClick={()=>setView('stock')} className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-colors ${view==='stock' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>Stock</button>
                        <button onClick={()=>setView('history')} className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-colors ${view==='history' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>History</button>
                     </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    {view === 'stock' && (
                        <>
                            <div className="relative flex-1 md:w-48">
                                <select 
                                    value={selectedBranch} 
                                    onChange={e => setSelectedBranch(e.target.value)}
                                    className="w-full p-2 pl-8 text-xs font-black uppercase border rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-brand-500 appearance-none"
                                >
                                    <option value="all">Global View</option>
                                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                                <Store size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                            </div>
                            <button onClick={onAdd} className="bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-4 py-2 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg hover:shadow-xl transition-shadow whitespace-nowrap">
                                Add Item
                            </button>
                        </>
                    )}
                </div>
            </div>

            {view === 'stock' ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase text-slate-500 dark:text-slate-400 font-black tracking-widest border-b dark:border-slate-800">
                            <tr>
                                <th className="p-4">Product Name</th>
                                <th className="p-4">Category</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Inventory</th>
                                <th className="p-4">Pricing</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-slate-800">
                            {filteredProducts.map((p: MenuItem) => {
                                const branchConfig = p.branchConfig?.find(bc => bc.branchId === selectedBranch);
                                const isVisible = selectedBranch === 'all' || (branchConfig ? branchConfig.isVisible : true);
                                const displayPrice = selectedBranch === 'all' ? p.price : (branchConfig?.price ?? p.price);

                                return (
                                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                                        <td className="p-4 font-bold dark:text-white">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border dark:border-slate-700">
                                                    {p.image ? <img src={p.image} className="w-full h-full object-cover" /> : <Package size={16} className="text-slate-400" />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black dark:text-slate-100">{p.name}</p>
                                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">{p.id.slice(0, 8)}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">{p.category}</span>
                                        </td>
                                        <td className="p-4">
                                            {isVisible ? (
                                                <div className="flex items-center gap-1.5 text-emerald-500 text-[10px] font-black uppercase">
                                                    <Eye size={12}/> Live
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-rose-500 text-[10px] font-black uppercase">
                                                    <EyeOff size={12}/> Hidden
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className={`font-black text-sm ${p.stock < p.lowStockThreshold ? 'text-rose-500' : 'text-slate-700 dark:text-slate-200'}`}>{p.stock} units</span>
                                                {p.stock < p.lowStockThreshold && <span className="text-[9px] font-black text-rose-400 uppercase">Low Stock Alert</span>}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="font-black text-sm dark:text-brand-400 text-brand-600">{settings.currencySymbol}{displayPrice.toFixed(2)}</span>
                                                {selectedBranch !== 'all' && branchConfig?.price !== undefined && branchConfig.price !== p.price && (
                                                    <span className="text-[9px] font-black text-slate-400 uppercase italic">Branch Override</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button 
                                                onClick={() => onEdit(p)} 
                                                className="text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors p-2"
                                            >
                                                <Package size={18}/>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="space-y-4">
                     {/* History Filters */}
                     <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Filter Item</label>
                            <div className="relative">
                                <Package size={14} className="absolute left-3 top-3 text-slate-400" />
                                <select value={selectedItem} onChange={e=>setSelectedItem(e.target.value)} className="w-full pl-9 pr-4 py-2 text-xs font-bold rounded-xl border dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-500 appearance-none">
                                    <option value="all">All Products</option>
                                    {products.map((p: MenuItem) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="flex-1 w-full space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Filter Reason</label>
                            <div className="relative">
                                <Filter size={14} className="absolute left-3 top-3 text-slate-400" />
                                <select value={selectedReason} onChange={e=>setSelectedReason(e.target.value)} className="w-full pl-9 pr-4 py-2 text-xs font-bold rounded-xl border dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-500 appearance-none">
                                    <option value="all">All Reasons</option>
                                    <option value="sale">Sales Only</option>
                                    <option value="restock">Restocks</option>
                                    <option value="waste">Wastage</option>
                                    <option value="adjustment">Adjustments</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex-1 w-full space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Filter Branch</label>
                            <div className="relative">
                                <Store size={14} className="absolute left-3 top-3 text-slate-400" />
                                <select value={selectedBranch} onChange={e=>setSelectedBranch(e.target.value)} className="w-full pl-9 pr-4 py-2 text-xs font-bold rounded-xl border dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-500 appearance-none">
                                    <option value="all">Global History</option>
                                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <button 
                            onClick={resetFilters}
                            className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors h-[34px] flex items-center gap-2"
                        >
                            <Trash2 size={14}/> Reset
                        </button>
                     </div>
                     
                     <div className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 overflow-hidden shadow-sm">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase text-slate-500 dark:text-slate-400 font-black tracking-widest border-b dark:border-slate-800">
                                <tr>
                                    <th className="p-4">Time</th>
                                    <th className="p-4">Item</th>
                                    <th className="p-4">Branch</th>
                                    <th className="p-4">Delta</th>
                                    <th className="p-4">Event</th>
                                    <th className="p-4">Logged By</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-slate-800">
                                {filteredLogs.map((log: InventoryLog) => {
                                    const branch = branches.find(b => b.id === log.branchId);
                                    return (
                                        <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="p-4 text-xs text-slate-500 dark:text-slate-400 font-mono">{new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                                            <td className="p-4 font-black text-sm dark:text-white">{log.itemName}</td>
                                            <td className="p-4">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{branch?.name || 'Global'}</span>
                                            </td>
                                            <td className={`p-4 font-black text-sm ${log.change > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                <div className="flex items-center gap-1">
                                                    {log.change > 0 ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>}
                                                    {log.change > 0 ? '+' : ''}{log.change}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-md text-[9px] uppercase font-black tracking-widest ${getReasonBadge(log.reason)}`}>
                                                    {log.reason}
                                                </span>
                                            </td>
                                            <td className="p-4 text-xs dark:text-slate-300 font-bold uppercase tracking-tight">{log.reportedBy || 'Automated'}</td>
                                        </tr>
                                    );
                                })}
                                {filteredLogs.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-12 text-center text-slate-400">
                                            <div className="flex flex-col items-center gap-4 opacity-30">
                                                <History size={48} />
                                                <span className="text-sm font-bold uppercase tracking-widest">No matching activity found</span>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                     </div>
                </div>
            )}
        </div>
    )
}