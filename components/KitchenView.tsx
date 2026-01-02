import React, { useState, useEffect, useMemo } from 'react';
import { ChefHat, CheckCircle, Clock, List, LayoutGrid, AlertTriangle, Store } from 'lucide-react';
import { Order, OrderItem, Branch, Role } from '../types';
import { TicketTimer, Modal } from './Shared';
import { db } from '../services/db';

export const KitchenView = ({ orders, onCompleteItem, onReadyOrder, onExitKitchen, currentUser }: any) => {
    const [showDailyStats, setShowDailyStats] = useState(false);
    const [branches, setBranches] = useState<Branch[]>([]);

    const isAdmin = currentUser?.role === Role.Admin;

    useEffect(() => {
        db.getBranches().then(setBranches);
    }, []);

    const tableGroups = useMemo(() => {
        const active = orders.filter((o: Order) => ['pending', 'cooking'].includes(o.status));
        const groups: Record<string, Order[]> = {};
        
        active.forEach((order: Order) => {
             const key = order.tableNo 
                ? `Table ${order.tableNo}` 
                : (order.diningOption === 'take-out' ? 'Take Away' : 'Delivery');
             
             if (!groups[key]) groups[key] = [];
             groups[key].push(order);
        });
        
        return groups;
    }, [orders]);

    const dailyStats = useMemo(() => {
        const todayStr = new Date().toDateString();
        const completed = orders.filter((o: Order) => 
            ['ready', 'paid'].includes(o.status) && 
            new Date(o.createdAt).toDateString() === todayStr
        );
        
        const counts: Record<string, number> = {};
        completed.forEach((o: Order) => {
            o.items.forEach(i => {
                counts[i.name] = (counts[i.name] || 0) + i.qty;
            });
        });
        
        return Object.entries(counts).sort((a,b) => b[1] - a[1]);
    }, [orders]);

    const getBranchName = (branchId?: string) => {
        return branches.find(b => b.id === branchId)?.name || 'Main Branch';
    };

    return (
        <div className="h-full flex flex-col bg-slate-100 dark:bg-slate-950 p-4">
             {/* Header */}
             <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-sm border dark:border-slate-700">
                        <ChefHat className="text-orange-500" size={28}/>
                    </div>
                    <div>
                        <h2 className="font-black text-2xl text-slate-800 dark:text-white uppercase tracking-tighter leading-none">Kitchen Operations</h2>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">{Object.keys(tableGroups).length} ACTIVE TICKETS</p>
                    </div>
                </div>
                
                <div className="flex gap-2">
                    {isAdmin && (
                      <button 
                          onClick={() => setShowDailyStats(true)}
                          className="bg-white dark:bg-slate-800 text-slate-700 dark:text-white px-4 py-2.5 rounded-xl font-black uppercase tracking-widest shadow-sm hover:shadow-md transition-all flex items-center gap-2 text-[10px]"
                      >
                          <List size={16}/> Production Report
                      </button>
                    )}
                    <button 
                        onClick={onExitKitchen}
                        className="bg-slate-900 text-white px-4 py-2.5 rounded-xl font-black uppercase tracking-widest shadow-sm hover:bg-slate-800 transition-all flex items-center gap-2 text-[10px]"
                    >
                        <LayoutGrid size={16}/> Exit View
                    </button>
                </div>
             </div>

             {/* Ticket Grid Reused */}
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-y-auto pb-20">
                {Object.keys(tableGroups).length === 0 && (
                     <div className="col-span-full flex flex-col items-center justify-center py-20 opacity-50">
                         <ChefHat size={64} className="text-slate-400 mb-4 animate-bounce"/>
                         <h3 className="text-2xl font-black text-slate-500 uppercase tracking-widest">Everything Prepped!</h3>
                         <p className="text-slate-400 font-bold">Waiting for new incoming orders...</p>
                     </div>
                )}

                {Object.entries(tableGroups).map(([tableName, groupOrders]) => (
                    <div key={tableName} className="bg-yellow-50 dark:bg-yellow-900/10 rounded-2xl shadow-xl flex flex-col border-t-[10px] border-yellow-400 animate-in slide-in-from-top-4 duration-300">
                        <div className="p-4 bg-yellow-100/50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800/50 flex justify-between items-center">
                            <h3 className="font-black text-xl text-slate-900 dark:text-yellow-100 uppercase tracking-tighter">{tableName}</h3>
                            <div className="flex items-center gap-1.5 text-xs font-mono font-black text-slate-700 dark:text-yellow-200/70">
                                <Clock size={14}/>
                                <TicketTimer startTime={Math.min(...groupOrders.map(o => o.createdAt))} />
                            </div>
                        </div>
                        
                        <div className="p-3 space-y-4 flex-1">
                            {groupOrders.map(order => (
                                <div key={order.uuid} className="bg-white dark:bg-slate-900 rounded-xl p-3 shadow-md border dark:border-slate-800 border-slate-200 relative overflow-hidden">
                                    <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-dashed border-slate-200 dark:border-slate-700">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-brand-600 dark:text-brand-400 tracking-widest uppercase">#{order.uuid.slice(0,4)}</span>
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <Store size={10} className="text-slate-400"/>
                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">{getBranchName(order.branchId)}</span>
                                            </div>
                                        </div>
                                        <span className="text-[9px] font-bold text-slate-400">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <div className="space-y-2 mt-2">
                                        {order.items.map((item: any, idx: number) => (
                                            <div 
                                                key={idx} 
                                                onClick={() => onCompleteItem(order.uuid, idx)}
                                                className={`flex items-start gap-3 cursor-pointer select-none group transition-all p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 ${item.completed ? 'opacity-25 grayscale' : 'opacity-100'}`}
                                            >
                                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${item.completed ? 'bg-emerald-500 border-emerald-500 text-white shadow-emerald-500/20 shadow-lg' : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 group-hover:border-brand-500'}`}>
                                                    {item.completed && <CheckCircle size={14} strokeWidth={4}/>}
                                                </div>
                                                <div className="flex-1 overflow-hidden">
                                                    <div className="flex items-baseline justify-between">
                                                        <span className={`font-black font-mono text-sm leading-tight ${item.completed ? 'line-through' : ''} text-slate-900 dark:text-slate-100`}>
                                                            {item.qty}x {item.name}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 bg-yellow-100/30 dark:bg-yellow-900/20 border-t border-yellow-200 dark:border-yellow-800/30">
                            <button 
                                onClick={() => {
                                    groupOrders.forEach(o => {
                                        if (o.items.every((i: any) => i.completed)) onReadyOrder(o.uuid);
                                    });
                                }}
                                disabled={!groupOrders.every(o => o.items.every((i: any) => i.completed))}
                                className="w-full py-3 bg-slate-900 dark:bg-yellow-500 text-white dark:text-slate-950 font-black text-[11px] uppercase tracking-[0.2em] rounded-xl disabled:opacity-20 disabled:grayscale hover:bg-slate-800 transition-all shadow-xl shadow-yellow-400/20 active:scale-95"
                            >
                                Dispatch Order
                            </button>
                        </div>
                    </div>
                ))}
             </div>
             {/* Production Modal Reused */}
        </div>
    )
}