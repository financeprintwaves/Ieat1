
import React from 'react';
import { Award, MapPin, User, Users, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { MenuItem, TableConfig, Order } from '../types';

export const MenuGrid = ({ 
    addToCart, 
    settings, 
    tables, 
    selectedTables, 
    handleTableToggle, 
    occupiedTables, 
    tableBalances,
    selectedCategory, 
    setSelectedCategory, 
    filteredProducts, 
    topSellingProductIds, 
    getProductPriceForBranch,
    orders 
}: any) => {
    return (
        <main className="flex-1 overflow-y-auto p-4 flex flex-col pb-20 md:pb-4 bg-slate-50 dark:bg-slate-950">
             {/* Visual Table Floor Plan (Horizontal Scroll) */}
             <div className="mb-6">
                <div className="flex justify-between items-center mb-3 px-1">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                        <MapPin size={14} className="text-brand-500" /> Floor Status
                    </h3>
                    <div className="flex gap-4">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Free</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Active</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Ready</span>
                        </div>
                    </div>
                </div>
                
                <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-1 px-1">
                    {tables.map((t: TableConfig) => {
                        const tableOrders = orders.filter((o: Order) => o.status !== 'paid' && o.tableIds.includes(t.name));
                        const isOccupied = tableOrders.length > 0;
                        const hasReadyItems = tableOrders.some((o: Order) => o.status === 'ready');
                        const balance = tableBalances[t.name] || 0;
                        const isSelected = selectedTables.includes(t.name);
                        
                        // Status styling
                        let statusColor = 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900';
                        let iconBg = 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400';
                        let textColor = 'text-emerald-600 dark:text-emerald-400';
                        let statusLabel = 'Available';

                        if (hasReadyItems) {
                            statusColor = isSelected ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/30 shadow-md' : 'border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-900';
                            iconBg = 'bg-rose-100 text-rose-600 dark:bg-rose-900 dark:text-rose-300';
                            textColor = 'text-rose-600 dark:text-rose-300';
                            statusLabel = 'Serve Now';
                        } else if (isOccupied) {
                            statusColor = isSelected ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30 shadow-md' : 'border-amber-200 dark:border-amber-900/50 bg-white dark:bg-slate-900';
                            iconBg = 'bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-300';
                            textColor = 'text-amber-600 dark:text-amber-300';
                            statusLabel = 'Occupied';
                        } else if (isSelected) {
                            statusColor = 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 shadow-md';
                            textColor = 'text-brand-600 dark:text-brand-400';
                        }

                        return (
                            <button 
                                key={t.id} 
                                onClick={() => handleTableToggle(t.name)}
                                className={`flex-shrink-0 w-32 p-3 rounded-2xl border-2 transition-all flex flex-col gap-2 relative group shadow-sm ${statusColor}`}
                            >
                                <div className="flex justify-between items-start">
                                    <div className={`p-2 rounded-xl ${iconBg}`}>
                                        {hasReadyItems ? <AlertCircle size={16}/> : isOccupied ? <Users size={16}/> : <User size={16}/>}
                                    </div>
                                    {isSelected && <div className="text-brand-500"><CheckCircle2 size={18} strokeWidth={3}/></div>}
                                </div>
                                
                                <div className="text-left mt-1">
                                    <div className={`font-black text-sm leading-none mb-1 ${isSelected ? 'text-brand-900 dark:text-brand-100' : 'text-slate-900 dark:text-white'}`}>T-{t.name}</div>
                                    <div className={`text-[10px] font-black uppercase tracking-tighter ${textColor}`}>
                                        {isOccupied ? `${settings.currencySymbol}${balance.toFixed(2)}` : statusLabel}
                                    </div>
                                </div>

                                {hasReadyItems && (
                                    <div className="absolute top-2 right-2">
                                        <div className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping"></div>
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
             </div>
             
             {/* Category Filters */}
             <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide">
                <button onClick={() => setSelectedCategory('all')} className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${selectedCategory === 'all' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg' : 'bg-white dark:bg-slate-900 text-slate-500 border dark:border-slate-800'}`}>All Items</button>
                {['food', 'drink', 'dessert'].map(c => (
                    <button key={c} onClick={() => setSelectedCategory(c)} className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${selectedCategory === c ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg' : 'bg-white dark:bg-slate-900 text-slate-500 border dark:border-slate-800'}`}>{c}</button>
                ))}
             </div>

             {/* 4-5 Items Per Row Density Grid */}
             <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                 {filteredProducts.map((p: MenuItem) => {
                     const displayPrice = getProductPriceForBranch(p);
                     return (
                     <button 
                        key={p.id} 
                        onClick={()=>addToCart(p)} 
                        className="bg-white dark:bg-slate-900 p-3 rounded-2xl border dark:border-slate-800 text-left hover:shadow-xl hover:-translate-y-1 transition-all group overflow-hidden relative flex flex-col h-full shadow-sm"
                     >
                         {p.image && <img src={p.image} className="absolute inset-0 w-full h-full object-cover opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none"/>}
                         
                         {topSellingProductIds.includes(p.id) && (
                             <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-sm z-20 flex items-center gap-0.5">
                                 <Award size={10} /> BEST
                             </div>
                         )}

                         <div className="relative z-10 flex flex-col flex-1">
                            <div className="font-bold text-[11px] mb-1 leading-tight dark:text-white truncate" title={p.name}>{p.name}</div>
                            <div className="text-brand-600 dark:text-brand-400 font-black text-xs">{settings.currencySymbol}{displayPrice.toFixed(2)}</div>
                            <div className="mt-auto pt-2 flex justify-between items-center border-t border-slate-50 dark:border-slate-800/50">
                                <span className={`text-[8px] font-black uppercase tracking-tighter ${p.stock < 10 ? 'text-rose-500' : 'text-slate-400'}`}>Stock: {p.stock}</span>
                            </div>
                         </div>
                     </button>
                 )})}
             </div>
        </main>
    );
};
