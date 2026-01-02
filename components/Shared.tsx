import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Printer, CheckCircle, TrendingUp, Store } from 'lucide-react';
import { SyncStatus, Order, Branch } from '../types';
import { db } from '../services/db';

export const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border dark:border-slate-800">
        <div className="p-4 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <h3 className="font-bold text-lg dark:text-white">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 transition-colors"><X size={20}/></button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[80vh]">{children}</div>
      </div>
    </div>
  );
};

export const SyncIndicator = ({ status }: { status: SyncStatus }) => {
    const colors = {
        [SyncStatus.Synced]: 'text-emerald-500',
        [SyncStatus.Syncing]: 'text-blue-500 animate-spin',
        [SyncStatus.Unsynced]: 'text-amber-500',
        [SyncStatus.Failed]: 'text-red-500'
    };
    return <RefreshCw size={14} className={colors[status] || 'text-slate-300'} />;
};

export const OrderStatusBadge = ({ status }: { status: Order['status'] }) => {
    const styles = {
        pending: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
        cooking: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        ready: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        paid: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    };
    return (
        <span className={`px-2 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider ${styles[status]}`}>
            {status}
        </span>
    );
};

export const TicketTimer = ({ startTime }: { startTime: number }) => {
    const [elapsed, setElapsed] = useState(Math.floor((Date.now() - startTime) / 1000));
    
    useEffect(() => {
        const interval = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
        return () => clearInterval(interval);
    }, [startTime]);
    
    const format = (s: number) => {
        const m = Math.floor(s/60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    const isUrgent = elapsed > 900; // 15 mins
    const isWarning = elapsed > 600; // 10 mins

    return (
        <span className={`font-mono font-black text-lg ${isUrgent ? 'text-red-500 animate-pulse' : isWarning ? 'text-amber-500' : 'text-emerald-500'}`}>
            {format(elapsed)}
        </span>
    );
};

export const PrintingOverlay = ({ status }: { status: string | null }) => {
    if (!status) return null;
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="text-white flex flex-col items-center gap-6">
                <div className="relative">
                    <div className="absolute inset-0 bg-white/20 blur-xl rounded-full animate-pulse"></div>
                    <Printer size={64} className="relative z-10 animate-bounce"/>
                </div>
                <p className="font-bold text-2xl tracking-wide">{status}</p>
            </div>
        </div>
    );
};

export const ReceiptOverlay = ({ order, currency, onClose }: { order: Order | null; currency: string; onClose: () => void }) => {
   const [branch, setBranch] = useState<Branch | null>(null);

   useEffect(() => {
       if (order?.branchId) {
           db.getBranches().then(branches => {
               const found = branches.find(b => b.id === order.branchId);
               if (found) setBranch(found);
           });
       }
   }, [order]);

   if (!order) return null;
   return (
       <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
           <div className="bg-white text-slate-900 w-full max-w-sm p-6 shadow-2xl font-mono text-sm relative animate-in slide-in-from-bottom-10 duration-300 transform rotate-1" onClick={e => e.stopPropagation()}>
               <div className="text-center mb-6 border-b-2 border-dashed border-slate-300 pb-4">
                   <h2 className="text-2xl font-black uppercase tracking-tighter mb-1">iEat POS</h2>
                   <p className="text-xs font-bold text-brand-600">{branch?.name || 'Local Store'}</p>
                   <p className="text-[10px] text-slate-500">{branch?.address || '123 Culinary Ave, Food City'}</p>
                   <p className="text-[10px] text-slate-500">{new Date(order.createdAt).toLocaleString()}</p>
                   <p className="text-xs text-slate-500 mt-2 font-black">INVOICE #{order.uuid.slice(0,8).toUpperCase()}</p>
               </div>
               
               <div className="space-y-2 mb-6">
                   {order.items.map((item, i) => (
                       <div key={i} className="flex justify-between items-start">
                           <div>
                               <span className="font-bold">{item.qty}x</span> {item.name}
                               {item.selectedModifiers.length > 0 && (
                                   <div className="text-[10px] text-slate-500 pl-4">
                                       {item.selectedModifiers.map(m => m.name).join(', ')}
                                   </div>
                               )}
                           </div>
                           <span className="font-bold">{currency}{((item.price + item.selectedModifiers.reduce((a,b)=>a+b.price,0)) * item.qty).toFixed(2)}</span>
                       </div>
                   ))}
               </div>

               <div className="border-t-2 border-dashed border-slate-300 pt-4 space-y-1 mb-6">
                   <div className="flex justify-between"><span>Subtotal</span><span>{currency}{order.subtotal.toFixed(2)}</span></div>
                   <div className="flex justify-between"><span>Tax</span><span>{currency}{order.tax.toFixed(2)}</span></div>
                   {order.discount > 0 && <div className="flex justify-between text-red-500"><span>Discount</span><span>-{currency}{order.discount.toFixed(2)}</span></div>}
                   <div className="flex justify-between text-xl font-black mt-2 pt-2 border-t border-slate-200"><span>Total</span><span>{currency}{order.totalAmount.toFixed(2)}</span></div>
               </div>

               <div className="text-center text-xs text-slate-500 space-y-2">
                   <p className="font-bold uppercase tracking-widest text-[10px]">Paid via {order.paymentMethod || 'CASH'}</p>
                   <p className="font-bold text-slate-900 mt-2">Thank you for dining with us!</p>
                   {order.pointsEarned && <p>You earned {order.pointsEarned} loyalty points!</p>}
               </div>
               
               <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-slate-900 rounded-full border-4 border-slate-500"></div>
           </div>
       </div>
   );
};
