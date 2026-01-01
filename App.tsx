import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Wifi, WifiOff, Server, Tablet, ChefHat, Activity, RefreshCw, Trash2, Plus, Minus, 
  CreditCard, Banknote, Printer, CheckCircle, X, ShieldAlert, Bluetooth, 
  ShoppingBag, Truck, Utensils, Tag, Package, Barcode, TrendingUp, AlertTriangle, 
  FileText, Settings, Clock, CheckSquare, Square, Edit3, Users, LogOut, List, UserCheck, UserX, Filter,
  ArrowRight, Timer, DollarSign, ChevronRight, LayoutGrid, History, CheckCheck, PlayCircle, Grid, BrainCircuit, Flag, Info, User, Star, Search, UserPlus, Gift, Moon, Sun, Lock, Key, Globe, Sparkles, Award, Image as ImageIcon, Menu, Calendar, PieChart, Store
} from 'lucide-react';
import { db, generateUUID } from './services/db';
import { analyzeOrderWithGemini, generateDailyInsight } from './services/geminiService';
import { Order, SyncStatus, Role, OrderItem, MenuItem, DiningOption, Category, Modifier, InventoryLog, Employee, TableConfig, Customer, Branch, LoyaltyReward, AppSettings } from './types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Cell, PieChart as RePieChart, Pie, Legend } from 'recharts';

// --- Constants & Helper Components ---

const OrderStatusBadge = ({ status }: { status: Order['status'] }) => {
  const styles = {
    pending: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    cooking: 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
    ready: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
    paid: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
  };
  const icons = { pending: Clock, cooking: ChefHat, ready: CheckCircle, paid: Banknote };
  const Icon = icons[status] || Activity;
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border flex items-center gap-1.5 ${styles[status]}`}>
      <Icon size={12} strokeWidth={2.5} />
      {status}
    </span>
  );
};

const SyncIndicator = ({ status }: { status: SyncStatus }) => {
    const colors = {
      [SyncStatus.Synced]: 'bg-green-500',
      [SyncStatus.Syncing]: 'bg-yellow-500 animate-pulse',
      [SyncStatus.Unsynced]: 'bg-slate-400',
      [SyncStatus.Failed]: 'bg-red-500',
    };
    return <div className={`w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${colors[status]}`} title={`Sync: ${status}`} />;
};

const Modal = ({ isOpen, onClose, children, title, size = 'md' }: { isOpen: boolean; onClose: () => void; children?: React.ReactNode; title: string, size?: 'md' | 'lg' | 'xl' }) => {
  if (!isOpen) return null;
  const maxWidth = size === 'xl' ? 'max-w-4xl' : size === 'lg' ? 'max-w-2xl' : 'max-w-md';
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm transition-all">
      <div className={`bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full ${maxWidth} overflow-hidden animate-in slide-in-from-bottom duration-300 sm:fade-in sm:zoom-in flex flex-col max-h-[90vh] sm:max-h-[85vh]`}>
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800 shrink-0">
          <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">{title}</h3>
          <button onClick={onClose} className="p-2 bg-slate-200 dark:bg-slate-700 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"><X size={20} className="text-slate-600 dark:text-slate-300" /></button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

const PrintingOverlay = ({ status }: { status: 'idle' | 'connecting' | 'printing' | 'success' }) => {
    if (status === 'idle') return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl flex flex-col items-center gap-6 animate-in zoom-in shadow-2xl border dark:border-slate-800">
                <div className="relative">
                    <div className="absolute inset-0 bg-brand-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
                    <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center relative z-10 border-4 border-slate-50 dark:border-slate-700">
                        {status === 'connecting' && <Bluetooth size={40} className="text-blue-500 animate-pulse"/>}
                        {status === 'printing' && <Printer size={40} className="text-brand-500 animate-bounce"/>}
                        {status === 'success' && <CheckCircle size={40} className="text-emerald-500"/>}
                    </div>
                </div>
                <div className="text-center">
                    <h3 className="text-xl font-black italic text-slate-900 dark:text-white mb-2">
                        {status === 'connecting' && 'Connecting to Printer...'}
                        {status === 'printing' && 'Printing Invoice...'}
                        {status === 'success' && 'Sent Successfully'}
                    </h3>
                    <p className="text-slate-500 font-medium text-sm flex items-center justify-center gap-2">
                        <Wifi size={14}/> POS-80-WIFI connected
                    </p>
                </div>
            </div>
        </div>
    )
}

const StatCard = ({ title, value, icon: Icon, color }: any) => (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border-2 dark:border-slate-800 shadow-sm">
        <div className="flex justify-between items-start">
            <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">{title}</p>
                <h4 className="text-3xl font-black italic tracking-tighter text-slate-900 dark:text-white">{value}</h4>
            </div>
            <div className={`p-3 rounded-2xl ${color} bg-opacity-10 dark:bg-opacity-20`}>
                <Icon size={24} className={color.replace('bg-', 'text-')} />
            </div>
        </div>
    </div>
);

const TicketTimer = ({ startTime }: { startTime: number }) => {
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
        return () => clearInterval(interval);
    }, [startTime]);
    const format = (s: number) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2, '0')}`;
    const color = elapsed > 600 ? 'text-red-500' : elapsed > 300 ? 'text-orange-500' : 'text-emerald-500';
    return <span className={`font-mono font-bold ${color}`}>{format(elapsed)}</span>;
};

// --- Sub-Views ---

const CartPanel = ({
  cart,
  activeTableOrder,
  diningOption,
  setDiningOption,
  openCartItemModal,
  cartSubtotal,
  cartTax,
  cartTotal,
  placeOrder,
  handlePayNow,
  activeCustomer,
  onCustomerClick,
  redeemPoints,
  setRedeemPoints,
  selectedTables,
  manualDiscount,
  setManualDiscount,
  onClose,
  taxRate,
  currency
}: any) => {
  const isSendToKitchenDisabled = useMemo(() => {
      if (cart.length === 0) return true;
      if (diningOption === 'dine-in' && selectedTables.length === 0) return true;
      return false;
  }, [cart, diningOption, selectedTables]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-l dark:border-slate-800">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-center md:block">
            <h2 className="font-bold text-lg md:hidden dark:text-white">Order Details</h2>
            <div className="hidden md:block">
                 <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-lg mb-4">
                    {(['dine-in', 'take-out'] as DiningOption[]).map((opt) => (
                        <button
                            key={opt}
                            onClick={() => { setDiningOption(opt); }}
                            className={`flex-1 py-1.5 text-xs font-bold uppercase rounded-md transition-all ${diningOption === opt ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
                <button 
                    onClick={onCustomerClick}
                    className={`w-full p-2.5 rounded-lg border-2 border-dashed flex items-center justify-between mb-2 transition-colors ${activeCustomer ? 'border-brand-300 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                    <div className="flex items-center gap-2">
                        <User size={16} className={activeCustomer ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'} />
                        {activeCustomer ? (
                            <div className="text-left"><p className="text-xs font-bold text-slate-800 dark:text-white">{activeCustomer.name}</p><p className="text-[10px] text-brand-600 dark:text-brand-400 font-bold flex items-center gap-1"><Star size={10} fill="currentColor" /> {activeCustomer.points} Points</p></div>
                        ) : (
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Add Customer (Optional)</span>
                        )}
                    </div>
                    {activeCustomer ? <Edit3 size={14} className="text-brand-400"/> : <Plus size={14} className="text-slate-400" />}
                </button>
                {activeTableOrder && (
                    <div className="mb-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900 p-2 rounded-lg text-xs text-blue-800 dark:text-blue-300 flex justify-between items-center">
                        <span className="font-bold">Existing Order Total</span>
                        <span className="font-bold text-lg">{currency}{activeTableOrder.totalAmount.toFixed(2)}</span>
                    </div>
                )}
            </div>
            {onClose && <button onClick={onClose} className="md:hidden p-2 bg-slate-100 dark:bg-slate-800 rounded-full"><X size={20} className="dark:text-white"/></button>}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 space-y-4"><ShoppingBag size={48} strokeWidth={1.5} /><p className="font-medium text-sm">Cart is empty</p></div>
            ) : (
                cart.map((item: any, index: number) => (
                    <div key={index} onClick={() => openCartItemModal(index)} className="flex justify-between items-start pb-3 border-b border-slate-50 dark:border-slate-800 last:border-0 last:pb-0 cursor-pointer group">
                        <div className="flex gap-3">
                             <div className="w-6 h-6 bg-slate-100 dark:bg-slate-800 rounded flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 group-hover:bg-brand-100 dark:group-hover:bg-brand-900 group-hover:text-brand-600 transition-colors">{item.qty}</div>
                             <div>
                                 <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">{item.name}</p>
                                 {item.selectedModifiers.length > 0 && <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{item.selectedModifiers.map((m: any) => m.name).join(', ')}</p>}
                             </div>
                        </div>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{currency}{((item.price + item.selectedModifiers.reduce((a:number, b:any) => a + b.price, 0)) * item.qty).toFixed(2)}</span>
                    </div>
                ))
            )}
        </div>
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
             <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400"><span>Subtotal</span><span className="font-medium text-slate-900 dark:text-white">{currency}{cartSubtotal.toFixed(2)}</span></div>
                  {activeCustomer && activeCustomer.points >= 100 && (
                      <button onClick={() => setRedeemPoints(!redeemPoints)} className={`w-full py-2 px-3 rounded-lg border text-xs font-bold flex justify-between items-center mb-2 transition-all ${redeemPoints ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-800 text-green-700 dark:text-green-400' : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-brand-300'}`}>
                          <div className="flex items-center gap-2"><div className={`w-4 h-4 rounded border flex items-center justify-center ${redeemPoints ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 bg-white dark:bg-slate-800 dark:border-slate-700'}`}>{redeemPoints && <CheckCircle size={12} />}</div><span>Redeem 100 pts</span></div><span>-{currency}10.00</span>
                      </button>
                  )}
                  
                  {/* Manual Discount Input */}
                  <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Manual Discount</span>
                      <div className="flex items-center gap-2 w-24">
                        <span className="text-slate-400">- {currency}</span>
                        <input 
                            type="number" 
                            min="0"
                            value={manualDiscount > 0 ? manualDiscount : ''} 
                            onChange={(e) => setManualDiscount(parseFloat(e.target.value) || 0)}
                            className="w-full bg-slate-100 dark:bg-slate-800 dark:text-white border-none rounded p-1 text-right font-bold focus:ring-1 focus:ring-brand-500"
                            placeholder="0"
                        />
                      </div>
                  </div>

                  <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400"><span>Tax ({(taxRate * 100).toFixed(1)}%)</span><span className="font-medium text-slate-900 dark:text-white">{currency}{cartTax.toFixed(2)}</span></div>
                  <div className="flex justify-between items-end pt-2 border-t border-slate-200 dark:border-slate-800"><span className="font-bold text-slate-800 dark:text-white">Total</span><span className="font-bold text-2xl text-brand-600 dark:text-brand-400">{currency}{cartTotal.toFixed(2)}</span></div>
             </div>
             <div className="grid grid-cols-2 gap-3">
                 <button onClick={placeOrder} disabled={isSendToKitchenDisabled} className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold py-3 rounded-xl text-sm hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-[0.98] transition-transform">{diningOption === 'dine-in' ? 'Send to Kitchen' : 'Print Order'}</button>
                 <button onClick={handlePayNow} disabled={cart.length === 0} className="bg-brand-600 text-white font-bold py-3 rounded-xl text-sm hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg active:scale-[0.98] transition-transform flex items-center justify-center gap-2">Pay Now <ArrowRight size={16} /></button>
             </div>
        </div>
    </div>
  );
};

const KitchenView = ({ orders, onCompleteItem, onReadyOrder, onLogout, isAdmin, onExitKitchen }: any) => {
    const [view, setView] = useState<'board' | 'history'>('board');
    // Filter active orders: Pending (New) or Cooking (In Progress)
    const activeOrders = orders.filter((o: any) => ['pending', 'cooking'].includes(o.status)).sort((a:any, b:any) => a.createdAt - b.createdAt);
    const historyOrders = orders.filter((o: any) => !['pending', 'cooking'].includes(o.status));
    
    return (
        <div className="h-screen w-screen bg-slate-50 dark:bg-slate-950 flex flex-col overflow-hidden">
            <header className="h-16 bg-white dark:bg-slate-900 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800 shadow-sm z-10">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="bg-orange-100 dark:bg-orange-900/20 p-2 rounded-xl"><ChefHat className="text-orange-600 dark:text-orange-400" size={24} /></div>
                        <h1 className="text-slate-900 dark:text-white text-xl font-black uppercase tracking-tighter">Kitchen Display</h1>
                    </div>
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                         <button onClick={()=>setView('board')} className={`px-6 py-2 text-sm font-bold uppercase rounded-md transition-all ${view === 'board' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>Active Tickets</button>
                         <button onClick={()=>setView('history')} className={`px-6 py-2 text-sm font-bold uppercase rounded-md transition-all ${view === 'history' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>History</button>
                    </div>
                </div>
                <div className="flex gap-2">
                    {isAdmin && <button onClick={onExitKitchen} className="bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest">POS Mode</button>}
                    <button onClick={onLogout} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-full"><LogOut size={20}/></button>
                </div>
            </header>
            
            {view === 'board' ? (
                <main className="flex-1 overflow-x-auto p-6 bg-slate-100 dark:bg-slate-950">
                    <div className="flex gap-6 h-full min-w-max pb-4">
                        {activeOrders.map((order: any) => (
                            <div key={order.uuid} className="w-80 bg-white dark:bg-slate-900 rounded-xl shadow-lg flex flex-col border-t-4 border-t-brand-500 dark:border-t-brand-400 border-x border-b border-slate-200 dark:border-slate-800 animate-in slide-in-from-right-4 duration-300">
                                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-black text-2xl text-slate-900 dark:text-white">{order.tableNo ? `TBL ${order.tableNo}` : 'TAKE AWAY'}</span>
                                        <TicketTimer startTime={order.createdAt} />
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{order.diningOption}</span>
                                        <span className="text-[10px] bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300 font-mono">#{order.uuid.slice(0,4)}</span>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                    {order.items.map((item: any, idx: number) => (
                                        <div key={idx} onClick={() => onCompleteItem(order.uuid, idx)} className={`p-3 rounded-lg cursor-pointer transition-all border border-transparent ${item.completed ? 'opacity-40 bg-slate-50 dark:bg-slate-800/50' : 'bg-white dark:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700'}`}>
                                            <div className="flex items-start gap-3">
                                                <div className={`mt-1 w-5 h-5 rounded flex items-center justify-center transition-colors ${item.completed ? 'bg-green-500 text-white' : 'border-2 border-slate-300 dark:border-slate-600'}`}>{item.completed && <CheckCircle size={14}/>}</div>
                                                <div className="flex-1">
                                                    <p className={`font-bold text-lg leading-none ${item.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>{item.qty}x {item.name}</p>
                                                    {item.selectedModifiers.length > 0 && <p className="text-xs text-brand-600 dark:text-brand-400 mt-1 font-medium">+ {item.selectedModifiers.map((m:any)=>m.name).join(', ')}</p>}
                                                    {item.notes && <p className="text-xs text-red-500 mt-1 italic font-bold">Note: {item.notes}</p>}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                                    <button 
                                        onClick={() => onReadyOrder(order.uuid)} 
                                        disabled={!order.items.every((i:any) => i.completed)}
                                        className="w-full bg-green-600 hover:bg-green-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg transition-all active:scale-[0.98]"
                                    >
                                        Mark Ready
                                    </button>
                                </div>
                            </div>
                        ))}
                         {activeOrders.length === 0 && (
                            <div className="w-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 gap-6 mt-32">
                                <div className="p-8 bg-slate-200 dark:bg-slate-800 rounded-full"><CheckCircle size={64} /></div>
                                <h2 className="font-black text-3xl uppercase tracking-widest opacity-50">All Clear</h2>
                            </div>
                        )}
                    </div>
                </main>
            ) : (
                <main className="flex-1 overflow-y-auto p-8 bg-slate-50 dark:bg-slate-950">
                    <div className="max-w-5xl mx-auto">
                        <h2 className="text-2xl font-black mb-6 dark:text-white">Daily Order History</h2>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-xs">
                                    <tr>
                                        <th className="p-4">Time</th>
                                        <th className="p-4">ID</th>
                                        <th className="p-4">Type</th>
                                        <th className="p-4">Items</th>
                                        <th className="p-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {historyOrders.map((o: any) => (
                                        <tr key={o.uuid} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <td className="p-4 font-mono text-slate-600 dark:text-slate-400">{new Date(o.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                                            <td className="p-4 font-mono text-slate-400">#{o.uuid.slice(0,6)}</td>
                                            <td className="p-4 font-bold text-slate-700 dark:text-slate-300">{o.tableNo ? `Table ${o.tableNo}` : 'Take Away'}</td>
                                            <td className="p-4 text-slate-600 dark:text-slate-300">{o.items.map((i:any)=> `${i.qty}x ${i.name}`).join(', ')}</td>
                                            <td className="p-4"><OrderStatusBadge status={o.status} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {historyOrders.length === 0 && <div className="p-8 text-center text-slate-400 italic">No history for today</div>}
                        </div>
                    </div>
                </main>
            )}
        </div>
    );
};

const SettingsPanel = ({ settings, onUpdate, refresh }: { settings: AppSettings, onUpdate: (s: AppSettings) => void, refresh: () => void }) => {
    const [localSettings, setLocalSettings] = useState(settings);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [newBranchName, setNewBranchName] = useState('');

    useEffect(() => {
        db.getBranches().then(setBranches);
        setLocalSettings(settings);
    }, [settings]);

    const handleSave = async () => {
        await db.saveSettings(localSettings);
        onUpdate(localSettings);
        refresh();
    };

    const handleAddBranch = async () => {
        if (newBranchName) {
            await db.addBranch({ id: generateUUID(), name: newBranchName, address: '' });
            setNewBranchName('');
            db.getBranches().then(setBranches);
        }
    };

    const handleDeleteBranch = async (id: string) => {
        await db.deleteBranch(id);
        db.getBranches().then(setBranches);
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-black italic uppercase dark:text-white">Settings</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border dark:border-slate-800 space-y-4">
                    <h3 className="font-bold text-lg dark:text-white flex items-center gap-2"><DollarSign size={20}/> General</h3>
                    <div>
                        <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Currency Symbol</label>
                        <input 
                            className="w-full p-3 border rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                            value={localSettings.currencySymbol}
                            onChange={e => setLocalSettings({...localSettings, currencySymbol: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Tax Rate (decimal, e.g. 0.05 for 5%)</label>
                        <input 
                            type="number"
                            step="0.01"
                            className="w-full p-3 border rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                            value={localSettings.taxRate}
                            onChange={e => setLocalSettings({...localSettings, taxRate: parseFloat(e.target.value)})}
                        />
                    </div>
                    <button onClick={handleSave} className="w-full bg-slate-900 dark:bg-brand-600 text-white py-3 rounded-xl font-bold">Save Changes</button>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border dark:border-slate-800 space-y-4">
                    <h3 className="font-bold text-lg dark:text-white flex items-center gap-2"><Store size={20}/> Branches</h3>
                    <div className="flex gap-2">
                        <input 
                            className="flex-1 p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white" 
                            placeholder="New Branch Name"
                            value={newBranchName}
                            onChange={e => setNewBranchName(e.target.value)}
                        />
                        <button onClick={handleAddBranch} className="bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-4 rounded-lg font-bold">Add</button>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {branches.map(b => (
                            <div key={b.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                <span className="font-bold text-sm dark:text-white">{b.name}</span>
                                <button onClick={() => handleDeleteBranch(b.id)} className="text-red-500 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"><Trash2 size={16}/></button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

const AdminReports = ({ currency }: { currency: string }) => {
    const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [reportData, setReportData] = useState<Order[]>([]);
    const [aiInsight, setAiInsight] = useState<string>('');
    const [loadingInsight, setLoadingInsight] = useState(false);
    const [tab, setTab] = useState<'overview' | 'items' | 'trends'>('overview');

    useEffect(() => {
        const load = async () => {
            const data = await db.getFilteredOrders(new Date(startDate).getTime(), new Date(endDate).getTime() + 86400000, 'all');
            setReportData(data);
        };
        load();
    }, [startDate, endDate]);

    const getAiInsight = async () => {
        setLoadingInsight(true);
        const insight = await generateDailyInsight(reportData);
        setAiInsight(insight);
        setLoadingInsight(false);
    };

    const metrics = useMemo(() => {
        const totalSales = reportData.reduce((a, c) => a + c.totalAmount, 0);
        const avgOrder = reportData.length ? totalSales / reportData.length : 0;
        
        // Month-wise logic
        const monthly = reportData.reduce((acc: any, o) => {
             const month = new Date(o.createdAt).toLocaleString('default', { month: 'short' });
             acc[month] = (acc[month] || 0) + o.totalAmount;
             return acc;
        }, {});
        const monthData = Object.keys(monthly).map(m => ({ name: m, sales: monthly[m] }));

        // Day-wise logic
        const daily = reportData.reduce((acc: any, o) => {
            const day = new Date(o.createdAt).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
            acc[day] = (acc[day] || 0) + o.totalAmount;
            return acc;
        }, {});
        const lineData = Object.keys(daily).map(d => ({ name: d, sales: daily[d] }));

        // Item-wise logic
        const itemsStats: Record<string, number> = {};
        reportData.forEach(o => {
            o.items.forEach(i => {
                itemsStats[i.name] = (itemsStats[i.name] || 0) + i.qty;
            });
        });
        const itemRank = Object.entries(itemsStats)
            .map(([name, qty]) => ({ name, qty }))
            .sort((a,b) => b.qty - a.qty)
            .slice(0, 10);

        // Staff Rank
        const staffSales: any = {};
        reportData.forEach(o => {
            if (o.serverName) {
                staffSales[o.serverName] = (staffSales[o.serverName] || 0) + o.totalAmount;
            }
        });
        const staffRank = Object.keys(staffSales).map(s => ({ name: s, total: staffSales[s] })).sort((a,b) => b.total - a.total);

        return { totalSales, avgOrder, count: reportData.length, lineData, monthData, itemRank, staffRank };
    }, [reportData]);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex flex-wrap gap-4 items-end bg-white dark:bg-slate-900 p-6 rounded-3xl border-2 dark:border-slate-800">
                <div className="space-y-1 flex-1 min-w-[200px]">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Date Range</label>
                    <div className="flex gap-2">
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="flex-1 bg-slate-50 dark:bg-slate-800 dark:text-white p-3 rounded-xl font-bold border-2 dark:border-slate-700 outline-none" />
                        <span className="self-center font-black dark:text-slate-400">TO</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="flex-1 bg-slate-50 dark:bg-slate-800 dark:text-white p-3 rounded-xl font-bold border-2 dark:border-slate-700 outline-none" />
                    </div>
                </div>
                <div className="flex gap-2">
                    {['overview', 'items', 'trends'].map((t) => (
                        <button key={t} onClick={() => setTab(t as any)} className={`px-4 py-3 rounded-xl font-bold uppercase text-xs transition-colors ${tab === t ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {tab === 'overview' && (
                <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard title="Revenue" value={`${currency}${metrics.totalSales.toFixed(0)}`} icon={DollarSign} color="bg-emerald-500" />
                    <StatCard title="Orders" value={metrics.count} icon={ShoppingBag} color="bg-brand-500" />
                    <StatCard title="Avg Ticket" value={`${currency}${metrics.avgOrder.toFixed(2)}`} icon={Activity} color="bg-amber-500" />
                    <StatCard title="Staff Active" value={metrics.staffRank.length} icon={Users} color="bg-purple-500" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border-2 dark:border-slate-800">
                        <h5 className="font-black uppercase italic tracking-tighter mb-6 flex justify-between dark:text-white"><span>Sales Trend</span><TrendingUp size={18} className="text-emerald-500"/></h5>
                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={metrics.lineData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.1}/>
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} />
                                    <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', backgroundColor: '#1e293b', color: '#fff'}} />
                                    <Line type="monotone" dataKey="sales" stroke="#0ea5e9" strokeWidth={4} dot={{ r: 6, fill: '#0ea5e9', strokeWidth: 0 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl ring-4 ring-brand-500/20">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/20 blur-[60px] rounded-full" />
                        <div className="relative z-10 space-y-4">
                            <h5 className="font-black uppercase italic flex items-center gap-2 text-brand-400"><Sparkles size={20}/> Gemini Strategist</h5>
                            <p className="text-xs font-bold opacity-60 leading-relaxed">Analyze filtered data to uncover hidden revenue trends and efficiency gaps.</p>
                            {aiInsight ? <div className="bg-white/5 p-4 rounded-2xl text-xs leading-relaxed border border-white/10 italic h-48 overflow-y-auto scrollbar-hide">"{aiInsight}"</div> : <button onClick={getAiInsight} disabled={loadingInsight || reportData.length === 0} className="w-full bg-brand-600 hover:bg-brand-500 py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-all active:scale-95 disabled:opacity-50">{loadingInsight ? 'Consulting Chef...' : 'Generate Insight'}</button>}
                        </div>
                    </div>
                </div>
                </>
            )}

            {tab === 'items' && (
                 <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border-2 dark:border-slate-800">
                    <h5 className="font-black uppercase italic tracking-tighter mb-6 dark:text-white">Top Selling Items</h5>
                    <div className="h-96 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={metrics.itemRank} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.1}/>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} />
                                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', backgroundColor: '#1e293b', color: '#fff'}} />
                                <Bar dataKey="qty" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                 </div>
            )}

            {tab === 'trends' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border-2 dark:border-slate-800">
                        <h5 className="font-black uppercase italic tracking-tighter mb-6 dark:text-white">Daily Trends</h5>
                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={metrics.lineData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.1}/>
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} />
                                    <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', backgroundColor: '#1e293b', color: '#fff'}} />
                                    <Line type="monotone" dataKey="sales" stroke="#8b5cf6" strokeWidth={4} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border-2 dark:border-slate-800">
                        <h5 className="font-black uppercase italic tracking-tighter mb-6 dark:text-white">Monthly Performance</h5>
                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={metrics.monthData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.1}/>
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} />
                                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', backgroundColor: '#1e293b', color: '#fff'}} />
                                    <Bar dataKey="sales" fill="#ec4899" radius={[4, 4, 0, 0]} barSize={30} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const InventoryPanel = ({ products, refresh }: { products: MenuItem[], refresh: () => void }) => {
    const [editingProduct, setEditingProduct] = useState<Partial<MenuItem> | null>(null);
    const [historyProduct, setHistoryProduct] = useState<MenuItem | null>(null);
    const [historyLogs, setHistoryLogs] = useState<InventoryLog[]>([]);

    const handleSave = async () => {
        if (editingProduct?.name && editingProduct.price) {
            if (editingProduct.id) {
                await db.updateProduct(editingProduct.id, editingProduct);
            } else {
                await db.addProduct({
                    ...editingProduct,
                    id: generateUUID(),
                    stock: editingProduct.stock || 0,
                    category: editingProduct.category || 'food',
                    cost: editingProduct.cost || 0,
                    lowStockThreshold: 5
                } as MenuItem);
            }
            setEditingProduct(null);
            refresh();
        }
    };

    const loadHistory = async (product: MenuItem) => {
        setHistoryProduct(product);
        setHistoryLogs(await db.getItemHistory(product.id));
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black italic uppercase dark:text-white">Inventory Master</h2>
                <button onClick={() => setEditingProduct({})} className="bg-brand-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg"><Plus size={18}/> New Item</button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-xs">
                            <tr>
                                <th className="p-4">Item</th>
                                <th className="p-4">Category</th>
                                <th className="p-4">Price</th>
                                <th className="p-4">Stock</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {products.map(p => (
                                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 group">
                                    <td className="p-4 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                                            {p.image ? <img src={p.image} className="w-full h-full object-cover"/> : <ImageIcon size={16} className="text-slate-400"/>}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white">{p.name}</p>
                                            <p className="text-xs text-slate-400">ID: {p.barcode || p.id.slice(0,4)}</p>
                                        </div>
                                    </td>
                                    <td className="p-4"><span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-bold uppercase text-slate-600 dark:text-slate-300">{p.category}</span></td>
                                    <td className="p-4 font-mono font-bold text-slate-700 dark:text-slate-300">${p.price.toFixed(2)}</td>
                                    <td className="p-4">
                                        <div className={`font-bold ${p.stock <= p.lowStockThreshold ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>
                                            {p.stock} units
                                        </div>
                                    </td>
                                    <td className="p-4 text-right flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => loadHistory(p)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"><History size={16}/></button>
                                        <button onClick={() => setEditingProduct(p)} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><Edit3 size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal */}
            <Modal isOpen={!!editingProduct} onClose={() => setEditingProduct(null)} title={editingProduct?.id ? "Edit Product" : "New Product"}>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-slate-400">Name</label><input className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white" value={editingProduct?.name || ''} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} /></div>
                        <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-slate-400">Category</label>
                            <select className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white" value={editingProduct?.category || 'food'} onChange={e => setEditingProduct({...editingProduct, category: e.target.value as any})}>
                                <option value="food">Food</option>
                                <option value="drink">Drink</option>
                                <option value="dessert">Dessert</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-slate-400">Price ($)</label><input type="number" className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white" value={editingProduct?.price || ''} onChange={e => setEditingProduct({...editingProduct, price: parseFloat(e.target.value)})} /></div>
                        <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-slate-400">Stock</label><input type="number" className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white" value={editingProduct?.stock || ''} onChange={e => setEditingProduct({...editingProduct, stock: parseFloat(e.target.value)})} /></div>
                    </div>
                    <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-slate-400">Image URL</label><input className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white" placeholder="https://..." value={editingProduct?.image || ''} onChange={e => setEditingProduct({...editingProduct, image: e.target.value})} /></div>
                    <button onClick={handleSave} className="w-full bg-brand-600 text-white py-3 rounded-xl font-bold">Save Product</button>
                </div>
            </Modal>

            {/* History Modal */}
            <Modal isOpen={!!historyProduct} onClose={() => setHistoryProduct(null)} title={`Stock History: ${historyProduct?.name}`} size="lg">
                <table className="w-full text-left text-sm">
                    <thead className="text-[10px] uppercase text-slate-400 font-bold bg-slate-50 dark:bg-slate-800">
                        <tr><th className="p-2">Time</th><th className="p-2">Change</th><th className="p-2">Reason</th><th className="p-2">User</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {historyLogs.map(log => (
                            <tr key={log.id}>
                                <td className="p-2 text-slate-600 dark:text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                                <td className={`p-2 font-bold ${log.change > 0 ? 'text-green-500' : 'text-red-500'}`}>{log.change > 0 ? '+' : ''}{log.change}</td>
                                <td className="p-2 uppercase text-[10px] font-bold">{log.reason}</td>
                                <td className="p-2 text-slate-500">{log.reportedBy}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Modal>
        </div>
    );
}

const ReceiptOverlay = ({ order, currency, onClose }: { order: Order | null, currency: string, onClose: () => void }) => {
  if (!order) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
        <div className="bg-white text-slate-900 p-8 rounded-sm w-full max-w-[320px] shadow-2xl font-mono text-xs relative overflow-hidden ring-1 ring-slate-200">
             <div className="text-center mb-6"><h2 className="font-black text-xl uppercase tracking-tighter mb-1">iEat Michelin POS</h2><p className="opacity-70">123 Culinary Boulevard</p><p className="mt-2 py-1 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest">{order.diningOption.replace('-', ' ')}</p><p className="mt-2 text-[10px] font-bold">RECEIPT #{order.uuid.slice(0,8).toUpperCase()}</p></div>
             <div className="border-b border-dashed border-slate-300 my-4"></div>
             <div className="flex justify-between mb-4 font-bold text-[10px]"><span>DATE: {new Date(order.paidAt || order.createdAt).toLocaleDateString()}</span><span>TIME: {new Date(order.paidAt || order.createdAt).toLocaleTimeString()}</span></div>
             <div className="space-y-3 mb-6">
                 {order.items.map((item, i) => (
                     <div key={i} className="flex justify-between items-start">
                         <div className="flex-1"><p>{item.qty}x {item.name.toUpperCase()}</p>{item.selectedModifiers.map(m => <p key={m.id} className="text-[9px] opacity-60 ml-2">+ {m.name.toUpperCase()}</p>)}</div>
                         <span className="font-bold">{currency}{((item.price + item.selectedModifiers.reduce((a,b)=>a+b.price,0)) * item.qty).toFixed(2)}</span>
                     </div>
                 ))}
             </div>
             <div className="border-t border-dashed border-slate-300 pt-4 space-y-2">
                 <div className="flex justify-between"><span>SUBTOTAL</span><span>{currency}{order.subtotal.toFixed(2)}</span></div>
                 {order.discount > 0 && <div className="flex justify-between text-red-500 font-bold italic"><span>DISCOUNT</span><span>-{currency}{order.discount.toFixed(2)}</span></div>}
                 <div className="flex justify-between"><span>TAX ({(order.tax / order.subtotal * 100).toFixed(0)}%)</span><span>{currency}{order.tax.toFixed(2)}</span></div>
                 <div className="flex justify-between font-black text-lg pt-2 border-t border-slate-900 mt-2"><span>TOTAL</span><span>{currency}{order.totalAmount.toFixed(2)}</span></div>
             </div>
             <div className="mt-8 text-center space-y-2"><p className="font-bold">PAID VIA {order.paymentMethod?.toUpperCase() || 'CASH'}</p><div className="flex justify-center py-4 opacity-50"><Barcode size={120} height={40}/></div><p className="text-[9px] font-bold uppercase tracking-widest pt-4">*** THANK YOU FOR DINING ***</p></div>
             <button onClick={onClose} className="w-full mt-8 bg-slate-900 text-white py-3 rounded-md font-bold print:hidden">DONE</button>
        </div>
    </div>
  );
};

const LoginScreen = ({ onLogin }: { onLogin: (user: Employee) => void }) => {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const press = (n: string) => { if (pin.length < 4) { setPin(prev => prev + n); setError(''); } };
    const handleLogin = async () => { const user = await db.authenticate(pin); if (user) onLogin(user); else { setError('Invalid PIN'); setPin(''); } };
    
    // Quick role toggle for demonstration
    const handleDemoLogin = async (role: Role) => {
        let user;
        if (role === Role.Admin) user = { id: 'admin', name: 'Admin Demo', role: Role.Admin, pin: '1234' };
        if (role === Role.Waiter) user = { id: 'waiter', name: 'Waiter Demo', role: Role.Waiter, pin: '1111' };
        if (role === Role.Kitchen) user = { id: 'kitchen', name: 'Kitchen Demo', role: Role.Kitchen, pin: '2222' };
        if (user) onLogin(user as Employee);
    };

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in border dark:border-slate-800">
                <div className="bg-brand-600 p-8 text-center text-white"><Server size={48} className="mx-auto mb-4 opacity-90" /><h1 className="text-2xl font-bold">iEat POS</h1><p className="text-brand-100 mt-2">Enter your PIN to continue</p></div>
                <div className="p-6">
                    <div className="mb-6 flex justify-center gap-4">{[0, 1, 2, 3].map(i => <div key={i} className={`w-4 h-4 rounded-full border-2 ${i < pin.length ? 'bg-brand-500 border-brand-500' : 'border-slate-300 dark:border-slate-700'}`} />)}</div>
                    {error && <div className="text-red-500 text-center text-sm font-bold mb-4">{error}</div>}
                    <div className="grid grid-cols-3 gap-4 mb-4">{[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'GO'].map(num => (
                        <button key={num} onClick={() => num === 'C' ? setPin('') : num === 'GO' ? handleLogin() : press(num.toString())} className={`h-16 rounded-xl font-bold text-2xl active:scale-95 transition-all ${num === 'GO' ? 'bg-brand-600 text-white' : num === 'C' ? 'bg-red-50 text-red-600' : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200'}`}>{num}</button>
                    ))}</div>
                    
                    <div className="pt-4 border-t dark:border-slate-800">
                        <p className="text-center text-xs text-slate-400 mb-2 uppercase font-bold tracking-widest">Demo Roles</p>
                        <div className="flex justify-between gap-2">
                            <button onClick={()=>handleDemoLogin(Role.Admin)} className="flex-1 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700">Admin</button>
                            <button onClick={()=>handleDemoLogin(Role.Waiter)} className="flex-1 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700">Waiter</button>
                            <button onClick={()=>handleDemoLogin(Role.Kitchen)} className="flex-1 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700">Kitchen</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Main App ---

export default function App() {
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<MenuItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tables, setTables] = useState<TableConfig[]>([]);
  const [waiterViewMode, setWaiterViewMode] = useState<'menu' | 'orders' | 'kitchen'>('menu');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminTab, setAdminTab] = useState<'dashboard' | 'team' | 'tables' | 'inventory' | 'settings'>('dashboard');
  const [settings, setSettings] = useState<AppSettings>({ id: 'global', currencySymbol: '$', currentBranchId: 'branch-1', taxRate: 0.05 });
  
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [diningOption, setDiningOption] = useState<DiningOption>('dine-in');
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
  const [redeemPoints, setRedeemPoints] = useState(false);
  const [manualDiscount, setManualDiscount] = useState(0);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [activeCartItemIndex, setActiveCartItemIndex] = useState<number | null>(null);
  
  // Menu Filtering
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // New states for payment & printing
  const [orderToSettle, setOrderToSettle] = useState<Order | null>(null);
  const [printStatus, setPrintStatus] = useState<'idle' | 'connecting' | 'printing' | 'success'>('idle');
  
  // Theme State
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('ieat_theme') === 'dark');
  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('ieat_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Helper to reset print status
  useEffect(() => {
    if(printStatus === 'success') {
        const t = setTimeout(() => setPrintStatus('idle'), 2000);
        return () => clearTimeout(t);
    }
  }, [printStatus]);

  // Modals
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [phoneSearch, setPhoneSearch] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [showTableModal, setShowTableModal] = useState(false);
  const [editingTable, setEditingTable] = useState<Partial<TableConfig> | null>(null);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Partial<Employee> | null>(null);

  const refreshData = useCallback(async () => {
    setOrders(db.getOrders());
    setProducts(db.getProducts());
    setEmployees(db.getEmployees());
    setTables(db.getTables());
    setSettings(await db.getSettings());
  }, []);

  useEffect(() => {
    if (currentUser) {
        refreshData();
        const interval = setInterval(refreshData, 2000);
        return () => clearInterval(interval);
    }
  }, [currentUser, refreshData]);

  const handleLogin = async (user: Employee) => {
      await db.logAttendance(user.id, 'check-in');
      setCurrentUser(user);
      if (user.role === Role.Admin) setIsAdminMode(true);
      if (user.role === Role.Kitchen) setWaiterViewMode('kitchen');
  };

  const handleLogout = async () => {
      if (currentUser) await db.logAttendance(currentUser.id, 'check-out');
      setCurrentUser(null);
  };

  const occupiedTables = useMemo(() => orders.filter(o => o.status !== 'paid' && o.diningOption === 'dine-in').flatMap(o => o.tableIds), [orders]);
  const activeTableOrder = orders.find(o => o.status !== 'paid' && o.diningOption === 'dine-in' && o.tableIds.some(id => selectedTables.includes(id)));

  // Derived state for products
  const topSellingProductIds = useMemo(() => {
      const counts: Record<string, number> = {};
      orders.forEach(o => o.items.forEach(i => counts[i.id] = (counts[i.id] || 0) + i.qty));
      return Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 5).map(x => x[0]); // Top 5
  }, [orders]);
  
  const trendingProducts = useMemo(() => {
      return products.filter(p => topSellingProductIds.includes(p.id));
  }, [products, topSellingProductIds]);

  const filteredProducts = useMemo(() => {
      let p = products;
      if (selectedCategory !== 'all') {
          p = p.filter(prod => prod.category === selectedCategory);
      }
      return p;
  }, [products, selectedCategory]);

  const handleTableToggle = (tableId: string) => {
      const order = orders.find(o => o.status !== 'paid' && o.tableIds.includes(tableId));
      if (order) { setSelectedTables(order.tableIds); setDiningOption('dine-in'); }
      else { setSelectedTables([tableId]); setDiningOption('dine-in'); }
  };

  const placeOrder = async () => {
      const sub = cart.reduce((a, c) => a + (c.price * c.qty), 0);
      const discount = (redeemPoints ? 10 : 0) + (manualDiscount || 0);
      const total = (Math.max(0, sub - discount)) * (1 + settings.taxRate);
      
      if (activeTableOrder) {
          await db.addItemsToOrder(activeTableOrder.uuid, cart, sub, 0, total, selectedTables, currentUser!.name);
      } else {
          await db.createOrder({
              uuid: generateUUID(),
              tableIds: diningOption === 'dine-in' ? selectedTables : [],
              tableNo: diningOption === 'dine-in' ? selectedTables.join(', ') : undefined,
              items: cart,
              subtotal: sub,
              tax: (Math.max(0, sub - discount)) * settings.taxRate,
              discount,
              totalAmount: total,
              status: 'pending',
              diningOption,
              syncStatus: SyncStatus.Unsynced,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              opLogId: generateUUID(),
              serverId: currentUser!.id,
              serverName: currentUser!.name,
              customerId: activeCustomer?.id,
              pointsRedeemed: redeemPoints ? 100 : 0,
              branchId: currentUser!.branchId
          });
      }
      setCart([]);
      setActiveCustomer(null);
      setRedeemPoints(false);
      setManualDiscount(0);
      setMobileCartOpen(false); // Close mobile drawer
      refreshData();
  };

  const processPayment = async (method: 'cash' | 'card') => {
    if(!orderToSettle) return;
    
    // Simulation
    setPrintStatus('connecting');
    await new Promise(resolve => setTimeout(resolve, 800));
    setPrintStatus('printing');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await db.markOrderAsPaid(orderToSettle.uuid, method, Date.now());
    
    setPrintStatus('success');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setReceiptOrder(orderToSettle); // Opens the receipt view
    setOrderToSettle(null);
    setPrintStatus('idle');
    refreshData();
  };

  const triggerReprint = async (order: Order) => {
    setPrintStatus('connecting');
    await new Promise(resolve => setTimeout(resolve, 500));
    setPrintStatus('printing');
    await new Promise(resolve => setTimeout(resolve, 800));
    setPrintStatus('success');
    setTimeout(() => {
        setPrintStatus('idle');
        setReceiptOrder(order);
    }, 500);
  };

  // Helper Calculations
  const cartSubtotal = cart.reduce((a,c) => a + c.price * c.qty, 0);
  const cartTax = (Math.max(0, cartSubtotal - (redeemPoints ? 10 : 0) - manualDiscount)) * settings.taxRate;
  const cartTotal = (Math.max(0, cartSubtotal - (redeemPoints ? 10 : 0) - manualDiscount)) + cartTax;

  if (!currentUser) return <LoginScreen onLogin={handleLogin} />;

  if (waiterViewMode === 'kitchen') {
      return <KitchenView orders={orders} onCompleteItem={(id: string, idx: number) => { db.toggleOrderItemStatus(id, idx); refreshData(); }} onReadyOrder={(id: string) => { db.updateOrder(id, { status: 'ready' }); refreshData(); }} isAdmin={currentUser.role !== Role.Kitchen} onExitKitchen={() => setWaiterViewMode('menu')} onLogout={handleLogout} />;
  }

  return (
    <div className="h-screen w-screen bg-slate-50 dark:bg-slate-950 flex flex-col overflow-hidden text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
        <nav className="h-16 bg-white dark:bg-slate-900 border-b dark:border-slate-800 px-4 md:px-6 flex items-center justify-between shadow-sm shrink-0 z-40">
            <h1 className="font-black text-xl md:text-2xl italic text-brand-600 dark:text-brand-400 flex items-center gap-2"><Utensils className="hidden md:block"/>iEat POS</h1>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                 {isAdminMode ? (
                     ['dashboard', 'team', 'tables', 'inventory', 'settings'].map(t => <button key={t} onClick={()=>setAdminTab(t as any)} className={`px-3 md:px-4 py-1.5 rounded-lg font-bold uppercase text-[10px] md:text-xs whitespace-nowrap transition-all ${adminTab===t ? 'bg-slate-800 dark:bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>{t}</button>)
                 ) : (
                     ['menu', 'orders', 'kitchen'].map(t => <button key={t} onClick={()=>setWaiterViewMode(t as any)} className={`px-3 md:px-4 py-1.5 rounded-lg font-bold uppercase text-[10px] md:text-xs whitespace-nowrap transition-all ${waiterViewMode===t ? 'bg-slate-800 dark:bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>{t}</button>)
                 )}
            </div>
            <div className="flex gap-2 items-center">
                 <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300">{darkMode ? <Moon size={20}/> : <Sun size={20}/>}</button>
                 {currentUser.role === Role.Admin && <button onClick={()=>setIsAdminMode(!isAdminMode)} className="hidden md:block bg-slate-900 dark:bg-brand-600 text-white px-3 py-1.5 rounded-lg font-bold text-xs">{isAdminMode ? 'Waiter' : 'Admin'}</button>}
                 <button onClick={handleLogout} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-full"><LogOut size={20}/></button>
            </div>
        </nav>

        <div className="flex-1 flex overflow-hidden relative">
            {isAdminMode ? (
                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    {adminTab === 'dashboard' && <AdminReports currency={settings.currencySymbol} />}
                    {adminTab === 'inventory' && <InventoryPanel products={products} refresh={refreshData} />}
                    {adminTab === 'settings' && <SettingsPanel settings={settings} onUpdate={setSettings} refresh={refreshData} />}
                    {adminTab === 'team' && (
                        <div>
                             <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-black italic dark:text-white">Team</h2>
                                <button onClick={() => { setEditingStaff({}); setShowStaffModal(true); }} className="bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-4 py-2 rounded-lg font-bold">Add Staff</button>
                             </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{employees.map(e => (
                                <div key={e.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border dark:border-slate-800 flex justify-between items-center shadow-sm">
                                    <div>
                                        <p className="font-bold text-lg dark:text-white">{e.name}</p>
                                        <p className="text-xs uppercase text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md inline-block mt-1">{e.role}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => { setEditingStaff({...e, pin: ''}); setShowStaffModal(true); }} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"><Edit3 size={18}/></button>
                                        <button onClick={() => db.deleteEmployee(e.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 size={18}/></button>
                                    </div>
                                </div>
                             ))}</div>
                        </div>
                    )}
                    {adminTab === 'tables' && (
                        <div>
                             <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-black italic dark:text-white">Tables</h2><button onClick={()=>setShowTableModal(true)} className="bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-4 py-2 rounded-lg font-bold">Add Table</button></div>
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-6">{tables.map(t => <div key={t.id} className="bg-white dark:bg-slate-900 aspect-square rounded-2xl border dark:border-slate-800 flex flex-col items-center justify-center font-black text-2xl dark:text-white relative group shadow-sm">{t.name}<button onClick={()=>db.deleteTable(t.id)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100"><Trash2 className="text-red-400"/></button></div>)}</div>
                        </div>
                    )}
                </main>
            ) : (
                <>
                {waiterViewMode === 'menu' && (
                     <main className="flex-1 overflow-y-auto p-4 flex flex-col pb-20 md:pb-4">
                         
                         {/* Trending Slider */}
                         {trendingProducts.length > 0 && (
                            <div className="mb-6">
                                <h3 className="font-bold text-sm uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2 px-1 flex items-center gap-2"><TrendingUp size={16}/> Trending Now</h3>
                                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                                    {trendingProducts.map(p => (
                                        <button key={p.id} onClick={()=>setCart([...cart, {...p, qty:1, selectedModifiers:[]}])} className="min-w-[160px] w-[160px] snap-start bg-white dark:bg-slate-900 p-3 rounded-xl border-2 border-transparent hover:border-brand-400 dark:hover:border-brand-600 transition-all text-left shadow-sm group relative overflow-hidden">
                                            {p.image && <img src={p.image} className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity" />}
                                            <div className="relative z-10">
                                                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{p.category}</div>
                                                <div className="font-black text-sm dark:text-white leading-tight mb-1">{p.name}</div>
                                                <div className="font-bold text-brand-600 dark:text-brand-400">{settings.currencySymbol}{p.price}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                         )}

                         {/* Tables Selection */}
                         <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border dark:border-slate-800 mb-4 shadow-sm">
                             <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">{tables.map(t => <button key={t.id} onClick={()=>handleTableToggle(t.name)} className={`min-w-[80px] h-20 rounded-xl border-2 font-bold text-lg transition-all ${selectedTables.includes(t.name) ? 'bg-slate-800 dark:bg-slate-700 text-white border-slate-800 dark:border-slate-700' : occupiedTables.includes(t.name) ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 dark:text-slate-300'}`}>{t.name}</button>)}</div>
                         </div>
                         
                         {/* Category Filters */}
                         <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
                            <button onClick={() => setSelectedCategory('all')} className={`px-5 py-2.5 rounded-full font-bold text-xs uppercase tracking-wide transition-all ${selectedCategory === 'all' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md' : 'bg-white dark:bg-slate-900 text-slate-500 border dark:border-slate-800 hover:border-slate-300'}`}>All</button>
                            {['food', 'drink', 'dessert'].map(c => (
                                <button key={c} onClick={() => setSelectedCategory(c)} className={`px-5 py-2.5 rounded-full font-bold text-xs uppercase tracking-wide transition-all ${selectedCategory === c ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md' : 'bg-white dark:bg-slate-900 text-slate-500 border dark:border-slate-800 hover:border-slate-300'}`}>{c}</button>
                            ))}
                         </div>

                         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                             {filteredProducts.map(p => (
                                 <button key={p.id} onClick={()=>setCart([...cart, {...p, qty:1, selectedModifiers:[]}])} className="bg-white dark:bg-slate-900 p-4 rounded-xl border dark:border-slate-800 text-left hover:shadow-lg transition-all group overflow-hidden relative">
                                     {p.image && <img src={p.image} className="absolute inset-0 w-full h-full object-cover opacity-10 group-hover:opacity-20 transition-opacity"/>}
                                     
                                     {topSellingProductIds.includes(p.id) && (
                                         <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-[10px] font-black px-2 py-1 rounded-full shadow-sm z-20 flex items-center gap-1">
                                             <Award size={10} /> TOP
                                         </div>
                                     )}

                                     <div className="relative z-10">
                                        <div className="font-bold text-lg mb-1 leading-tight dark:text-white">{p.name}</div>
                                        <div className="text-brand-600 dark:text-brand-400 font-bold">{settings.currencySymbol}{p.price.toFixed(2)}</div>
                                        <div className={`text-[10px] mt-2 font-bold ${p.stock < 10 ? 'text-red-500' : 'text-slate-400'}`}>{p.stock} left</div>
                                     </div>
                                 </button>
                             ))}
                         </div>
                     </main>
                )}
                {waiterViewMode === 'orders' && (
                    <main className="flex-1 overflow-y-auto p-4 bg-slate-100 dark:bg-slate-950">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{orders.map(o => (
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
                                        {o.items.slice(0, 3).map((item, i) => (
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
                )}
                
                {/* Desktop Cart Sidebar */}
                <aside className="hidden md:flex w-96 bg-white dark:bg-slate-900 border-l dark:border-slate-800 z-10 flex-col shadow-xl">
                    <CartPanel 
                        cart={cart} 
                        activeTableOrder={activeTableOrder}
                        diningOption={diningOption} 
                        setDiningOption={setDiningOption}
                        openCartItemModal={(i: number)=>setActiveCartItemIndex(i)} 
                        cartSubtotal={cartSubtotal}
                        cartTax={cartTax}
                        cartTotal={cartTotal}
                        placeOrder={placeOrder}
                        handlePayNow={()=>{placeOrder().then(()=>setWaiterViewMode('orders'))}}
                        activeCustomer={activeCustomer}
                        onCustomerClick={()=>setShowCustomerModal(true)}
                        redeemPoints={redeemPoints}
                        setRedeemPoints={setRedeemPoints}
                        selectedTables={selectedTables}
                        manualDiscount={manualDiscount}
                        setManualDiscount={setManualDiscount}
                        taxRate={settings.taxRate}
                        currency={settings.currencySymbol}
                    />
                </aside>

                {/* Mobile Cart Toggle & Drawer */}
                <div className="md:hidden fixed bottom-4 right-4 left-4 z-30">
                    <button onClick={() => setMobileCartOpen(true)} className="w-full bg-slate-900 dark:bg-brand-600 text-white p-4 rounded-xl shadow-2xl flex justify-between items-center">
                        <span className="font-bold flex items-center gap-2"><ShoppingBag size={20}/> {cart.length} Items</span>
                        <span className="font-black text-lg">{settings.currencySymbol}{cartTotal.toFixed(2)}</span>
                    </button>
                </div>
                {mobileCartOpen && (
                    <div className="fixed inset-0 z-50 md:hidden flex flex-col bg-white dark:bg-slate-900 animate-in slide-in-from-bottom duration-300">
                         <CartPanel 
                            cart={cart} 
                            activeTableOrder={activeTableOrder}
                            diningOption={diningOption} 
                            setDiningOption={setDiningOption}
                            openCartItemModal={(i: number)=>setActiveCartItemIndex(i)} 
                            cartSubtotal={cartSubtotal}
                            cartTax={cartTax}
                            cartTotal={cartTotal}
                            placeOrder={placeOrder}
                            handlePayNow={()=>{placeOrder().then(()=>setWaiterViewMode('orders'))}}
                            activeCustomer={activeCustomer}
                            onCustomerClick={()=>setShowCustomerModal(true)}
                            redeemPoints={redeemPoints}
                            setRedeemPoints={setRedeemPoints}
                            selectedTables={selectedTables}
                            manualDiscount={manualDiscount}
                            setManualDiscount={setManualDiscount}
                            taxRate={settings.taxRate}
                            currency={settings.currencySymbol}
                            onClose={() => setMobileCartOpen(false)}
                        />
                    </div>
                )}
                </>
            )}
        </div>
        
        {/* Modals */}
        <Modal isOpen={showCustomerModal} onClose={()=>setShowCustomerModal(false)} title="Customer">
             <div className="space-y-4">
                 <div className="flex gap-2"><input className="flex-1 border dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2 rounded" placeholder="Phone" value={phoneSearch} onChange={e=>setPhoneSearch(e.target.value)} /><button className="bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-4 rounded" onClick={async()=>{ const c=await db.findCustomerByPhone(phoneSearch); if(c) { setActiveCustomer(c); setShowCustomerModal(false); }}}>Search</button></div>
                 <div className="border-t dark:border-slate-800 pt-4"><input className="w-full border dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2 rounded mb-2" placeholder="New Name" value={newCustomerName} onChange={e=>setNewCustomerName(e.target.value)} /><button className="w-full bg-brand-600 text-white py-2 rounded" onClick={async()=>{ if(newCustomerName && phoneSearch) { const c=await db.createCustomer(newCustomerName, phoneSearch); setActiveCustomer(c); setShowCustomerModal(false); }}}>Create New</button></div>
             </div>
        </Modal>

        <Modal isOpen={showTableModal} onClose={()=>setShowTableModal(false)} title="New Table">
            <input className="w-full border dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2 rounded mb-4" placeholder="Table Name (e.g. T-5)" onChange={e=>setEditingTable({name: e.target.value})} />
            <button className="w-full bg-slate-900 dark:bg-white dark:text-slate-900 text-white py-2 rounded" onClick={async()=>{ if(editingTable?.name) { await db.addTable({id: editingTable.name, name: editingTable.name}); setShowTableModal(false); }}}>Add</button>
        </Modal>

        <Modal isOpen={showStaffModal} onClose={()=>setShowStaffModal(false)} title={editingStaff?.id ? "Edit Staff" : "New Staff"}>
            <div className="space-y-4">
                <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400">Name</label>
                    <input 
                        className="w-full border dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2 rounded" 
                        placeholder="Name" 
                        value={editingStaff?.name || ''} 
                        onChange={e => setEditingStaff({...editingStaff, name: e.target.value})} 
                    />
                </div>
                
                <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400">Role</label>
                    <select 
                        className="w-full border dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2 rounded"
                        value={editingStaff?.role || Role.Waiter}
                        onChange={e => setEditingStaff({...editingStaff, role: e.target.value as Role})}
                    >
                        <option value={Role.Admin}>Admin</option>
                        <option value={Role.Waiter}>Waiter</option>
                        <option value={Role.Kitchen}>Kitchen</option>
                    </select>
                </div>

                <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400">{editingStaff?.id ? "Reset PIN (Optional)" : "PIN (4 digits)"}</label>
                    <input 
                        className="w-full border dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2 rounded" 
                        placeholder={editingStaff?.id ? "Leave empty to keep current" : "1234"} 
                        maxLength={4} 
                        value={editingStaff?.pin || ''} 
                        onChange={e => setEditingStaff({...editingStaff, pin: e.target.value})} 
                    />
                </div>

                <button 
                    className="w-full bg-slate-900 dark:bg-white dark:text-slate-900 text-white py-2 rounded font-bold" 
                    onClick={async () => { 
                        if (!editingStaff?.name) return;
                        
                        if (editingStaff.id) {
                            // Editing
                            const updates: Partial<Employee> = { name: editingStaff.name, role: editingStaff.role };
                            if (editingStaff.pin && editingStaff.pin.length === 4) {
                                updates.pin = editingStaff.pin;
                            }
                            await db.updateEmployee(editingStaff.id, updates);
                        } else {
                            // Creating
                            if (!editingStaff.pin || editingStaff.pin.length !== 4) return;
                            await db.addEmployee({
                                id: generateUUID(), 
                                name: editingStaff.name, 
                                pin: editingStaff.pin, 
                                role: editingStaff.role || Role.Waiter
                            });
                        }
                        setShowStaffModal(false); 
                        refreshData(); // Ensure UI updates
                    }}
                >
                    {editingStaff?.id ? "Save Changes" : "Add Staff"}
                </button>
            </div>
        </Modal>

        <Modal isOpen={!!orderToSettle} onClose={() => setOrderToSettle(null)} title="Select Payment Method">
            <div className="grid grid-cols-2 gap-4 p-4">
                <button onClick={() => processPayment('card')} className="flex flex-col items-center gap-3 p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent hover:border-brand-500 transition-all group">
                    <div className="w-16 h-16 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                        <CreditCard size={32} className="text-brand-600 dark:text-brand-400"/>
                    </div>
                    <span className="font-bold dark:text-white">Credit Card</span>
                </button>
                <button onClick={() => processPayment('cash')} className="flex flex-col items-center gap-3 p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent hover:border-emerald-500 transition-all group">
                     <div className="w-16 h-16 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                        <Banknote size={32} className="text-emerald-600 dark:text-emerald-400"/>
                    </div>
                    <span className="font-bold dark:text-white">Cash</span>
                </button>
            </div>
            <div className="mt-4 p-4 bg-slate-100 dark:bg-slate-800 rounded-xl flex justify-between items-center">
                <span className="text-slate-500 font-bold uppercase text-xs tracking-widest">Total Amount</span>
                <span className="text-3xl font-black dark:text-white">{settings.currencySymbol}{orderToSettle?.totalAmount.toFixed(2)}</span>
            </div>
        </Modal>

        <ReceiptOverlay order={receiptOrder} currency={settings.currencySymbol} onClose={()=>setReceiptOrder(null)} />
        <PrintingOverlay status={printStatus} />

        {/* Edit Cart Item Modal */}
        <Modal isOpen={activeCartItemIndex !== null} onClose={()=>setActiveCartItemIndex(null)} title="Edit Item">
             {activeCartItemIndex !== null && cart[activeCartItemIndex] && (
                 <div className="space-y-6">
                     <div className="flex items-start gap-4">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                            {cart[activeCartItemIndex].image ? <img src={cart[activeCartItemIndex].image} className="w-full h-full object-cover"/> : <ShoppingBag className="text-slate-400"/>}
                        </div>
                        <div>
                            <h3 className="font-bold text-xl dark:text-white leading-none mb-1">{cart[activeCartItemIndex].name}</h3>
                            <p className="text-brand-600 dark:text-brand-400 font-bold text-lg">
                                {settings.currencySymbol}{(cart[activeCartItemIndex].price + cart[activeCartItemIndex].selectedModifiers.reduce((a,b)=>a+b.price,0)).toFixed(2)}
                            </p>
                        </div>
                     </div>
                     
                     {/* Modifiers Section */}
                     {cart[activeCartItemIndex].modifiers && cart[activeCartItemIndex].modifiers.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="font-bold text-sm text-slate-500 dark:text-slate-400 uppercase tracking-widest">Extras</h4>
                            <div className="grid grid-cols-1 gap-2">
                                {cart[activeCartItemIndex].modifiers.map((mod) => {
                                    const isSelected = cart[activeCartItemIndex].selectedModifiers.some(m => m.id === mod.id);
                                    return (
                                        <button 
                                            key={mod.id}
                                            onClick={() => {
                                                const newCart = [...cart];
                                                const item = newCart[activeCartItemIndex];
                                                if (isSelected) {
                                                    item.selectedModifiers = item.selectedModifiers.filter(m => m.id !== mod.id);
                                                } else {
                                                    item.selectedModifiers.push(mod);
                                                }
                                                setCart(newCart);
                                            }}
                                            className={`flex justify-between items-center p-3 rounded-xl border-2 transition-all ${isSelected ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${isSelected ? 'bg-brand-500 border-brand-500 text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                                                    {isSelected && <CheckCircle size={14} strokeWidth={3} />}
                                                </div>
                                                <span className={`font-bold ${isSelected ? 'text-brand-900 dark:text-brand-100' : 'text-slate-700 dark:text-slate-300'}`}>{mod.name}</span>
                                            </div>
                                            <span className="font-bold text-slate-500 dark:text-slate-400">+{settings.currencySymbol}{mod.price.toFixed(2)}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                     )}

                     <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border dark:border-slate-800">
                        <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Quantity</span>
                        <div className="flex items-center gap-4">
                            <button onClick={()=>{
                                const newCart = [...cart];
                                if(newCart[activeCartItemIndex].qty > 1) { 
                                    newCart[activeCartItemIndex].qty--; 
                                    setCart(newCart); 
                                } else { 
                                    setCart(cart.filter((_, i) => i !== activeCartItemIndex)); 
                                    setActiveCartItemIndex(null); 
                                }
                            }} className="w-10 h-10 bg-white dark:bg-slate-800 rounded-full shadow-sm flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><Minus size={18} className="text-slate-700 dark:text-slate-200"/></button>
                            <span className="font-black text-2xl w-8 text-center dark:text-white">{cart[activeCartItemIndex].qty}</span>
                            <button onClick={()=>{
                                const newCart = [...cart];
                                newCart[activeCartItemIndex].qty++;
                                setCart(newCart);
                            }} className="w-10 h-10 bg-white dark:bg-slate-800 rounded-full shadow-sm flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><Plus size={18} className="text-slate-700 dark:text-slate-200"/></button>
                        </div>
                     </div>

                     <button onClick={()=>{ setCart(cart.filter((_, i) => i !== activeCartItemIndex)); setActiveCartItemIndex(null); }} className="w-full py-4 text-red-500 font-bold bg-red-50 dark:bg-red-900/10 rounded-xl flex justify-center items-center gap-2 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"><Trash2 size={20}/> Remove from Order</button>
                </div>
            )}
        </Modal>
    </div>
  );
}