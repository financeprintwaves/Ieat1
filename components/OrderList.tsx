import React from 'react';
import { CreditCard, Printer } from 'lucide-react';
import { SyncIndicator, OrderStatusBadge } from './Shared';

export const OrderList = ({ orders, settings, setOrderToSettle, triggerReprint }: any) => {
    return (
        <main className="flex-1 overflow-y-auto p-4 bg-slate-100 dark:bg-slate-950">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{orders.map((o: any) => (
                <div key={o.uuid} className="bg-white dark:bg-slate-900 p-4 rounded-xl border dark:border-slate-800 shadow-sm flex flex-col h-full">
                    <div className="flex justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <SyncIndicator status={o.syncStatus} />
                            <span className="font-bold dark:text-white text-lg">{o.tableNo ? `Table ${o.tableNo}` : 'Take Away'}</span>
                        </div>
                        <OrderStatusBadge status={o.status}/>
                    </div>
                    <div className="flex-1 text-sm text-slate-500 dark:text-slate-400 mb-4 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border dark:border-slate-800">
                        <div className="flex justify-between mb-2">
                            <span>Items ({o.items.length})</span>
                            <span className="font-bold text-slate-900 dark:text-white">{settings.currencySymbol}{o.totalAmount.toFixed(2)}</span>
                        </div>
                        <div className="space-y-1">
                            {o.items.slice(0, 3).map((item: any, i: number) => (
                                <div key={i} className="flex justify-between text-xs">
                                    <span>{item.qty}x {item.name}</span>
                                </div>
                            ))}
                            {o.items.length > 3 && <div className="text-xs italic opacity-60">...and {o.items.length - 3} more</div>}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {o.status !== 'paid' ? (
                            <button onClick={() => setOrderToSettle(o)} className="flex-1 bg-slate-900 dark:bg-brand-600 text-white py-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-800 dark:hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20">
                                <CreditCard size={14}/> Settle & Print
                            </button>
                        ) : (
                            <button onClick={() => triggerReprint(o)} className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                <Printer size={14}/> Reprint Invoice
                            </button>
                        )}
                    </div>
                </div>
            ))}</div>
        </main>
    );
};