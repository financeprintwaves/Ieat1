
// ... imports
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Wifi, WifiOff, Server, Tablet, ChefHat, Activity, RefreshCw, Trash2, Plus, Minus, 
  CreditCard, Banknote, Printer, CheckCircle, X, ShieldAlert, Bluetooth, 
  ShoppingBag, Utensils, Tag, Package, Barcode, TrendingUp, AlertTriangle, 
  FileText, Settings, Clock, CheckSquare, Square, Edit3, Users, LogOut, List, UserCheck, UserX, Filter,
  ArrowRight, Timer, DollarSign, ChevronRight, LayoutGrid, History, CheckCheck, PlayCircle, Grid, BrainCircuit, Flag, Info, User, Star, Search, UserPlus, Gift, HelpCircle,
  Moon, Sun, Coffee, Lock, Unlock, Smartphone, Monitor, Globe, Award
} from 'lucide-react';
import { db, generateUUID } from './services/db';
import { analyzeOrderWithGemini, generateDailyInsight } from './services/geminiService';
import { Order, SyncStatus, Role, OrderItem, MenuItem, DiningOption, Category, Modifier, InventoryLog, Employee, TableConfig, Customer, AttendanceRecord, Branch, AppSettings, LoyaltyReward } from './types';
import { MOCK_TABLES } from './constants';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

// --- Constants ---
const TAX_RATE = 0.08; // 8%

// ... (ReceiptOverlay, StatusBadge, OrderStatusBadge, Modal, CartPanel components remain unchanged)
const ReceiptOverlay = ({ order, currency }: { order: Order | null, currency: string }) => {
  if (!order) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white text-slate-900 p-6 rounded-sm w-80 shadow-2xl animate-in slide-in-from-top-10 duration-500 font-mono text-sm relative transform rotate-1">
             <div className="absolute -top-16 left-0 right-0 text-center text-white font-bold animate-pulse flex flex-col items-center gap-2">
                 <div className="bg-white/20 p-3 rounded-full">
                    <Printer size={24} className="text-white" />
                 </div>
                 <span>Printing to Epson TM-m30...</span>
             </div>
             
             {/* Receipt Cut Pattern Top */}
             <div className="absolute -top-2 left-0 right-0 h-4 bg-white" style={{clipPath: 'polygon(0% 100%, 5%  0%, 10% 100%, 15%  0%, 20% 100%, 25%  0%, 30% 100%, 35%  0%, 40% 100%, 45%  0%, 50% 100%, 55%  0%, 60% 100%, 65%  0%, 70% 100%, 75%  0%, 80% 100%, 85%  0%, 90% 100%, 95%  0%, 100% 100%)'}}></div>

             {/* Receipt Content */}
             <div className="text-center mb-6 mt-2">
                 <h2 className="font-extrabold text-2xl uppercase tracking-widest mb-1">iEat POS</h2>
                 <p className="text-[10px] uppercase tracking-wider text-slate-500">Fine Dining & Burgers</p>
                 <p className="text-xs mt-2">123 Culinary Ave, Food City</p>
                 <p className="text-xs">Tel: 555-0199</p>
             </div>
             
             <div className="border-b-2 border-dashed border-slate-300 my-4"></div>
             
             <div className="flex justify-between text-xs mb-2 font-bold text-slate-600">
                 <span>Order #{order.uuid.slice(0,6).toUpperCase()}</span>
                 <span>{new Date(order.createdAt).toLocaleDateString()}</span>
             </div>
             <div className="text-xs mb-4 text-slate-500">
                 Server: {order.serverName || 'Staff'}
             </div>
             
             <div className="space-y-2 mb-4">
                 {order.items.map((item, i) => (
                     <div key={i} className="flex justify-between items-start">
                         <div className="flex gap-2">
                             <span className="font-bold">{item.qty}</span>
                             <div className="flex flex-col">
                                 <span>{item.name}</span>
                                 {item.selectedModifiers.map(m => (
                                     <span key={m.id} className="text-[10px] text-slate-500 italic">+ {m.name}</span>
                                 ))}
                             </div>
                         </div>
                         <span className="font-medium">{currency}{((item.price + item.selectedModifiers.reduce((a,b)=>a+b.price,0)) * item.qty).toFixed(2)}</span>
                     </div>
                 ))}
             </div>
             
             <div className="border-b-2 border-dashed border-slate-300 my-4"></div>
             
             <div className="space-y-1">
                 <div className="flex justify-between text-slate-600">
                     <span>Subtotal</span>
                     <span>{currency}{order.subtotal.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between text-slate-600">
                     <span>Tax ({(TAX_RATE * 100)}%)</span>
                     <span>{currency}{order.tax.toFixed(2)}</span>
                 </div>
                 {order.discount > 0 && (
                     <div className="flex justify-between text-slate-600">
                         <span>Discount</span>
                         <span>-{currency}{order.discount.toFixed(2)}</span>
                     </div>
                 )}
                 <div className="flex justify-between text-xl font-extrabold mt-2 pt-2 border-t border-slate-900">
                     <span>TOTAL</span>
                     <span>{currency}{order.totalAmount.toFixed(2)}</span>
                 </div>
             </div>
             
             <div className="border-b-2 border-dashed border-slate-300 my-4"></div>
             
             <div className="text-center text-xs space-y-2">
                 <p className="font-bold text-sm">PAID VIA {order.paymentMethod?.toUpperCase() || 'CASH'}</p>
                 {order.pointsEarned ? <p>You earned {order.pointsEarned} loyalty points!</p> : null}
                 <p className="mt-4 text-slate-400">Thank you for dining with us!</p>
                 <div className="flex justify-center mt-2 opacity-80">
                    <Barcode className="h-12 w-full max-w-[200px]" />
                 </div>
                 <p className="text-[10px] text-slate-400 font-mono mt-1">{order.uuid}</p>
             </div>

             {/* Receipt Cut Pattern Bottom */}
             <div className="absolute -bottom-2 left-0 right-0 h-4 bg-white" style={{clipPath: 'polygon(0% 0%, 5%  100%, 10% 0%, 15%  100%, 20% 0%, 25%  100%, 30% 0%, 35%  100%, 40% 0%, 45%  100%, 50% 0%, 55%  100%, 60% 0%, 65%  100%, 70% 0%, 75%  100%, 80% 0%, 85%  100%, 90% 0%, 95%  100%, 100% 0%)'}}></div>
        </div>
    </div>
  );
};

const StatusBadge = ({ status }: { status: SyncStatus }) => {
  const colors = {
    [SyncStatus.Synced]: 'bg-green-900/30 text-green-400 border-green-800',
    [SyncStatus.Syncing]: 'bg-yellow-900/30 text-yellow-400 border-yellow-800',
    [SyncStatus.Unsynced]: 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700',
    [SyncStatus.Failed]: 'bg-red-900/30 text-red-400 border-red-800',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${colors[status]} flex items-center gap-1`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === SyncStatus.Syncing ? 'animate-pulse bg-current' : 'bg-current'}`} />
      {status === SyncStatus.Syncing ? 'Syncing...' : status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const OrderStatusBadge = ({ status }: { status: Order['status'] }) => {
  const styles = {
    pending: 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700',
    cooking: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800',
    ready: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800',
    paid: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  };
  
  const icons = {
    pending: Clock,
    cooking: ChefHat,
    ready: CheckCircle,
    paid: Banknote
  };

  const Icon = icons[status] || Activity;

  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border flex items-center gap-1.5 ${styles[status]}`}>
      <Icon size={12} strokeWidth={2.5} />
      {status}
    </span>
  );
};

const Modal = ({ isOpen, onClose, children, title, size = 'md' }: { isOpen: boolean; onClose: () => void; children?: React.ReactNode; title: string, size?: 'md' | 'lg' }) => {
  if (!isOpen) return null;
  const maxWidth = size === 'lg' ? 'max-w-2xl' : 'max-w-md';
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 bg-black/80 backdrop-blur-sm transition-all">
      <div className={`bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full ${maxWidth} overflow-hidden animate-in slide-in-from-bottom duration-300 sm:fade-in sm:zoom-in flex flex-col max-h-[90vh] sm:max-h-[85vh] border border-slate-200 dark:border-slate-700`}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900 shrink-0">
          <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">{title}</h3>
          <button onClick={onClose} className="p-2 bg-slate-200 dark:bg-slate-700 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
            <X size={20} className="text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto text-slate-800 dark:text-slate-200 scrollbar-hide">
          {children}
        </div>
      </div>
    </div>
  );
};

const CartPanel = ({
  cart,
  activeTableOrder,
  diningOption,
  setDiningOption,
  openCartItemModal,
  updateCartItemQty,
  cartSubtotal,
  cartDiscount,
  setCartDiscount,
  cartTax,
  cartTotal,
  cartNote,
  setCartNote,
  placeOrder,
  handlePayNow,
  activeCustomer,
  onCustomerClick,
  selectedReward,
  setSelectedReward,
  currency,
  rewards
}: {
  cart: OrderItem[];
  activeTableOrder: Order | undefined;
  diningOption: DiningOption;
  setDiningOption: (opt: DiningOption) => void;
  openCartItemModal: (index: number) => void;
  updateCartItemQty: (index: number, newQty: number) => void;
  cartSubtotal: number;
  cartDiscount: number;
  setCartDiscount: (discount: number) => void;
  cartTax: number;
  cartTotal: number;
  cartNote: string;
  setCartNote: (note: string) => void;
  placeOrder: () => void;
  handlePayNow: () => void;
  activeCustomer: Customer | null;
  onCustomerClick: () => void;
  selectedReward: LoyaltyReward | null;
  setSelectedReward: (reward: LoyaltyReward | null) => void;
  currency: string;
  rewards: LoyaltyReward[];
}) => {
  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 w-full">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 shrink-0">
            {/* Dining Options Segmented Control */}
            <div className="flex bg-slate-200 dark:bg-slate-700 p-1 rounded-lg mb-4">
                {(['dine-in', 'take-out', 'delivery'] as DiningOption[]).map((opt) => (
                    <button
                        key={opt}
                        onClick={() => setDiningOption(opt)}
                        className={`flex-1 py-2 text-xs font-bold uppercase rounded-md transition-all ${diningOption === opt ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                    >
                        {opt}
                    </button>
                ))}
            </div>

            {/* Customer Attachment */}
            <button 
                onClick={onCustomerClick}
                className={`w-full p-3 rounded-lg border-2 border-dashed flex items-center justify-between mb-2 transition-colors ${activeCustomer ? 'border-brand-500 dark:border-brand-700 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
            >
                <div className="flex items-center gap-2">
                    <User size={18} className={activeCustomer ? 'text-brand-500 dark:text-brand-400' : 'text-slate-500'} />
                    {activeCustomer ? (
                        <div className="text-left">
                            <p className="text-sm font-bold text-slate-900 dark:text-slate-200">{activeCustomer.name}</p>
                            <p className="text-xs text-brand-600 dark:text-brand-400 font-bold flex items-center gap-1">
                                <Star size={10} fill="currentColor" /> {activeCustomer.points} Points
                            </p>
                        </div>
                    ) : (
                        <span className="text-sm font-bold text-slate-500 dark:text-slate-400">Add Customer (Optional)</span>
                    )}
                </div>
                {activeCustomer ? <Edit3 size={16} className="text-brand-600 dark:text-brand-400"/> : <Plus size={16} className="text-slate-500" />}
            </button>

            {/* Current Active Order Summary if appending */}
            {activeTableOrder && (
                <div className="mb-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 p-2 rounded-lg text-xs text-blue-700 dark:text-blue-200 flex justify-between items-center">
                    <span className="font-bold">Existing Order Total</span>
                    <span className="font-bold text-lg">{currency}{activeTableOrder.totalAmount.toFixed(2)}</span>
                </div>
            )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
            {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 space-y-4">
                    <ShoppingBag size={48} strokeWidth={1.5} />
                    <p className="font-medium text-sm">Cart is empty</p>
                </div>
            ) : (
                cart.map((item, index) => (
                    <div 
                        key={index} 
                        onClick={() => openCartItemModal(index)}
                        className="flex justify-between items-start pb-3 border-b border-slate-200 dark:border-slate-700 last:border-0 last:pb-0 cursor-pointer group hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors -mx-4 px-4"
                    >
                        <div className="flex gap-3 items-start">
                             {/* Quantity Controls */}
                             <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-md shrink-0 h-6 mt-0.5">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); updateCartItemQty(index, item.qty - 1); }}
                                    className="w-6 h-full flex items-center justify-center text-slate-500 hover:text-red-500 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-l-md transition-colors"
                                >
                                    <Minus size={12} strokeWidth={3} />
                                </button>
                                <div className="w-6 h-full flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-700 border-x border-slate-200 dark:border-slate-600">
                                    {item.qty}
                                </div>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); updateCartItemQty(index, item.qty + 1); }}
                                    className="w-6 h-full flex items-center justify-center text-slate-500 hover:text-green-500 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-r-md transition-colors"
                                >
                                    <Plus size={12} strokeWidth={3} />
                                </button>
                             </div>

                             <div>
                                 <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">{item.name}</p>
                                 {item.selectedModifiers.length > 0 && (
                                     <div className="flex flex-wrap gap-1 mt-1">
                                         {item.selectedModifiers.map((m, i) => (
                                             <span key={i} className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-600">
                                                 {m.name}
                                             </span>
                                         ))}
                                     </div>
                                 )}
                                 {item.notes && (
                                     <p className="text-[10px] text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-1.5 py-0.5 rounded border border-orange-200 dark:border-orange-900/30 italic mt-1 inline-flex items-center gap-1">
                                        <Edit3 size={8} /> {item.notes}
                                     </p>
                                 )}
                             </div>
                        </div>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-0.5 shrink-0">
                            {currency}{((item.price + item.selectedModifiers.reduce((a, b) => a + b.price, 0)) * item.qty).toFixed(2)}
                        </span>
                    </div>
                ))
            )}
        </div>

        {/* Footer / Totals */}
        <div className="p-4 bg-white dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 shrink-0">
             <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
                      <span>Subtotal</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{currency}{cartSubtotal.toFixed(2)}</span>
                  </div>
                  
                  {/* Loyalty Redemption Option */}
                  {activeCustomer && (
                      <div className="space-y-2 mb-3">
                          <p className="text-[10px] font-bold uppercase text-brand-600 dark:text-brand-400 flex items-center gap-1">
                              <Gift size={10} /> Rewards Available ({activeCustomer.points} pts)
                          </p>
                          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                              {rewards.map(reward => {
                                  const canAfford = activeCustomer.points >= reward.cost;
                                  const isSelected = selectedReward?.id === reward.id;
                                  return (
                                      <button 
                                        key={reward.id}
                                        onClick={() => {
                                            if (canAfford) {
                                                setSelectedReward(isSelected ? null : reward);
                                            }
                                        }}
                                        disabled={!canAfford}
                                        className={`shrink-0 px-3 py-2 rounded-lg border text-xs font-bold transition-all ${
                                            isSelected 
                                            ? 'bg-green-100 dark:bg-green-900/30 border-green-500 dark:border-green-600 text-green-700 dark:text-green-400 ring-1 ring-green-500' 
                                            : canAfford 
                                                ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-brand-500' 
                                                : 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                                        }`}
                                      >
                                          <div className="flex flex-col items-start">
                                              <span>{reward.name}</span>
                                              <span className="text-[9px] opacity-70">{reward.cost} pts</span>
                                          </div>
                                      </button>
                                  )
                              })}
                          </div>
                      </div>
                  )}

                  {/* Discount Toggle */}
                  <div className="flex justify-between items-center text-sm text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-2">Discount <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-1 rounded">{cartDiscount}%</span></span>
                      <div className="flex gap-1">
                          {[0, 10, 20].map(d => (
                              <button 
                                key={d} 
                                onClick={() => setCartDiscount(d)}
                                className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold border ${cartDiscount === d ? 'bg-slate-200 text-slate-900 border-slate-300' : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700 hover:border-slate-400'}`}
                              >
                                  {d}
                              </button>
                          ))}
                      </div>
                  </div>

                  {selectedReward && (
                      <div className="flex justify-between text-sm text-green-600 dark:text-green-400 animate-in fade-in">
                          <span className="flex items-center gap-1"><CheckCircle size={12}/> Reward Applied</span>
                          <span>-{currency}{selectedReward.value.toFixed(2)}</span>
                      </div>
                  )}

                  <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
                      <span>Tax ({(TAX_RATE * 100)}%)</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{currency}{cartTax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-end pt-2 border-t border-slate-200 dark:border-slate-700">
                      <span className="font-bold text-slate-800 dark:text-slate-200">Total</span>
                      <span className="font-bold text-2xl text-brand-600 dark:text-brand-400">{currency}{cartTotal.toFixed(2)}</span>
                  </div>
             </div>

             {/* Actions */}
             <div className="space-y-2">
                 {/* Note Input */}
                 <div className="relative">
                     <input 
                        type="text" 
                        value={cartNote}
                        onChange={(e) => setCartNote(e.target.value)}
                        placeholder="Add order note..."
                        className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 text-xs focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                     />
                     <Edit3 size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                 </div>

                 <div className="grid grid-cols-2 gap-3">
                     <button 
                        onClick={placeOrder}
                        disabled={cart.length === 0}
                        className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold py-3 rounded-xl text-sm hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-[0.98] transition-transform"
                     >
                         Send to Kitchen
                     </button>
                     <button 
                        onClick={handlePayNow}
                        disabled={cart.length === 0}
                        className="bg-brand-600 text-white font-bold py-3 rounded-xl text-sm hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                     >
                         Pay Now <ArrowRight size={16} />
                     </button>
                 </div>
             </div>
        </div>
    </div>
  );
};

const LoginScreen = ({ onLogin, openSettings }: { onLogin: (user: Employee) => void, openSettings: () => void }) => {
    // ... existing LoginScreen code (omitted for brevity, no changes needed inside internal logic but kept as is)
    // Redefining here for full replacement context
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');

    const handleNumClick = (num: string) => {
        if (pin.length < 4) {
            setPin(prev => prev + num);
            setError('');
        }
    };

    const handleClear = () => setPin('');
    const handleBackspace = () => setPin(prev => prev.slice(0, -1));

    const handleLogin = async () => {
        const user = await db.authenticate(pin);
        if (user) {
            onLogin(user);
        } else {
            setError('Invalid PIN');
            setPin('');
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-4 relative bg-[url('https://images.unsplash.com/photo-1550989460-0adf9ea622e2?q=80&w=1920&auto=format&fit=crop')] bg-cover bg-center">
             <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
             
             <button onClick={openSettings} className="absolute top-4 right-4 p-3 bg-white/90 dark:bg-slate-800/90 rounded-full shadow-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 z-10">
                <Settings size={20} />
            </button>

            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-700 z-10">
                <div className="bg-gradient-to-br from-brand-600 to-brand-800 p-8 text-center text-white">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                        <Server size={32} className="text-white" />
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight">iEat POS</h1>
                    <p className="text-brand-100 mt-2 text-sm font-medium">Enter your PIN to continue</p>
                </div>
                <div className="p-8">
                    <div className="mb-8 flex justify-center gap-4">
                        {[0, 1, 2, 3].map(i => (
                            <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${i < pin.length ? 'bg-brand-500 border-brand-500 scale-110' : 'border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700'}`} />
                        ))}
                    </div>
                    {error && <div className="text-red-500 dark:text-red-400 text-center text-sm font-bold mb-6 animate-pulse">{error}</div>}
                    
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                            <button key={num} onClick={() => handleNumClick(num.toString())} className="h-16 rounded-2xl bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-2xl font-bold text-slate-800 dark:text-slate-100 active:scale-95 transition-all shadow-sm border border-slate-200 dark:border-slate-600">
                                {num}
                            </button>
                        ))}
                        <button onClick={handleClear} className="h-16 rounded-2xl bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-500 dark:text-red-400 font-bold active:scale-95 transition-all flex items-center justify-center shadow-sm border border-red-100 dark:border-red-900/30">C</button>
                        <button onClick={() => handleNumClick('0')} className="h-16 rounded-2xl bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-2xl font-bold text-slate-800 dark:text-slate-100 active:scale-95 transition-all shadow-sm border border-slate-200 dark:border-slate-600">0</button>
                        <button onClick={handleLogin} className="h-16 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold active:scale-95 transition-all flex items-center justify-center shadow-md shadow-brand-500/30">
                            GO
                        </button>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-slate-400 dark:text-slate-500">Default Admin PIN: 1234</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function App() {
  // Theme Management
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
      const saved = localStorage.getItem('ieat_theme');
      return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  const toggleTheme = () => {
      const newTheme = theme === 'light' ? 'dark' : 'light';
      setTheme(newTheme);
      localStorage.setItem('ieat_theme', newTheme);
  };

  useEffect(() => {
      if (theme === 'dark') {
          document.documentElement.classList.add('dark');
      } else {
          document.documentElement.classList.remove('dark');
      }
  }, [theme]);

  // Seed DB on mount
  useEffect(() => {
      const seedDatabase = async () => {
          await db.getEmployees();
          await db.getSettings(); // Ensure settings exist
      };
      seedDatabase();
  }, []);

  // Settings State
  const [currency, setCurrency] = useState('$');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentBranch, setCurrentBranch] = useState<string>('');
  const [loyaltyRewards, setLoyaltyRewards] = useState<LoyaltyReward[]>([]);

  const [showSettings, setShowSettings] = useState(false);
  const [isKioskMode, setIsKioskMode] = useState(false);
  const [showKioskExitModal, setShowKioskExitModal] = useState(false);
  const [kioskPin, setKioskPin] = useState('');
  const [kioskError, setKioskError] = useState('');

  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  
  const [role, setRole] = useState<Role>(Role.Waiter);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<MenuItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tables, setTables] = useState<TableConfig[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceRecord[]>([]);
  
  // View Modes
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [waiterViewMode, setWaiterViewMode] = useState<'menu' | 'cart' | 'orders'>('menu');
  
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [isReportMode, setIsReportMode] = useState(false);
  const [reportItem, setReportItem] = useState<MenuItem | null>(null);
  const [reportQty, setReportQty] = useState(1);
  const [reportReason, setReportReason] = useState<'waste'|'adjustment'>('waste');

  // Customer Loyalty State
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearchPhone, setCustomerSearchPhone] = useState('');
  const [customerNameInput, setCustomerNameInput] = useState('');
  const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [selectedReward, setSelectedReward] = useState<LoyaltyReward | null>(null);
  
  // Receipt State
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);

  // New: Multiple Table Selection
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');
  const [diningOption, setDiningOption] = useState<DiningOption>('dine-in');
  const [cartDiscount, setCartDiscount] = useState<number>(0); // Percentage 0-100
  const [cartNote, setCartNote] = useState<string>('');
  const [orderFilter, setOrderFilter] = useState<'all' | 'card' | 'cash'>('all');

  // Expanded Detail View State
  const [detailProduct, setDetailProduct] = useState<MenuItem | null>(null);
  const [detailModifiers, setDetailModifiers] = useState<Modifier[]>([]);
  const [detailNote, setDetailNote] = useState('');
  const [detailQty, setDetailQty] = useState(1);

  // Cart Item Options Modal State
  const [cartItemModalOpen, setCartItemModalOpen] = useState(false);
  const [activeCartItemIndex, setActiveCartItemIndex] = useState<number | null>(null);
  const [activeCartItemNote, setActiveCartItemNote] = useState('');
  const [activeCartItemQty, setActiveCartItemQty] = useState(1);
  
  // Payment State
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<Order | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('card');
  const [isPrinterConnecting, setIsPrinterConnecting] = useState(false);
  const [isPrinterConnected, setIsPrinterConnected] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // Confirmation Modal State
  const [confirmConfig, setConfirmConfig] = useState<{title: string, message: React.ReactNode, action: () => void} | null>(null);

  // Admin State
  const [dailyInsight, setDailyInsight] = useState<string | null>(null);
  const [showInsightModal, setShowInsightModal] = useState(false);
  const [adminTab, setAdminTab] = useState<'dashboard' | 'inventory' | 'reports' | 'team' | 'tables' | 'settings'>('dashboard');
  
  // Admin - Report Filters
  const [reportBranchFilter, setReportBranchFilter] = useState<string>('all');
  const [reportStaffFilter, setReportStaffFilter] = useState<string>('all');

  // Admin - Employee Form
  const [newEmployee, setNewEmployee] = useState<Partial<Employee>>({ role: Role.Waiter });
  const [showAddEmployee, setShowAddEmployee] = useState(false);

  // Admin - Inventory Product Form
  const [editingProduct, setEditingProduct] = useState<Partial<MenuItem> | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [newModifierName, setNewModifierName] = useState('');
  const [newModifierPrice, setNewModifierPrice] = useState('');

  // Admin - Table Form
  const [editingTable, setEditingTable] = useState<Partial<TableConfig> | null>(null);
  const [showTableModal, setShowTableModal] = useState(false);

  // Admin - Settings Form
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchAddress, setNewBranchAddress] = useState('');
  // Admin - Loyalty Form
  const [newRewardName, setNewRewardName] = useState('');
  const [newRewardCost, setNewRewardCost] = useState('');
  const [newRewardValue, setNewRewardValue] = useState('');

  // Logout Summary Modal
  const [showLogoutSummary, setShowLogoutSummary] = useState(false);
  const [sessionStats, setSessionStats] = useState<{sales: number, count: number, duration: string} | null>(null);

  const refreshData = useCallback(async () => {
    // Dexie returns Promises, so we must await them
    setOrders(await db.getOrders());
    setProducts(await db.getProducts());
    setEmployees(await db.getEmployees());
    setTables(await db.getTables());
    setInventoryLogs(await db.getInventoryLogs());
    setLoyaltyRewards(await db.getRewards());
    
    // Load Settings & Branches
    const settings = await db.getSettings();
    setCurrency(settings.currencySymbol);
    setCurrentBranch(settings.currentBranchId);
    setBranches(await db.getBranches());

    // Only fetch full logs if admin to save resources
    if (currentUser?.role === Role.Admin) {
        setAttendanceLogs(await db.getAttendanceLogs());
    }
    
    // Refresh active customer to show real-time points
    if (activeCustomer) {
        const freshCustomer = await db.getCustomerById(activeCustomer.id);
        if (freshCustomer && (freshCustomer.points !== activeCustomer.points || freshCustomer.visits !== activeCustomer.visits)) {
            setActiveCustomer(freshCustomer);
        }
    }
  }, [activeCustomer, currentUser]);

  useEffect(() => {
    if (currentUser) {
        refreshData();
        const interval = setInterval(refreshData, 2000);
        return () => clearInterval(interval);
    }
  }, [refreshData, currentUser]);

  useEffect(() => {
      if (tables.length > 0 && selectedTables.length === 0) {
          setSelectedTables([tables[0].name]);
      }
  }, [tables]);

  // Kitchen View Default Logic
  useEffect(() => {
      if (role === Role.Kitchen) {
          setWaiterViewMode('orders');
      }
  }, [role]);

  const toggleNetwork = () => setIsOnline(prev => !prev);
  
  useEffect(() => {
    if (!isOnline || !currentUser) return;
    const processQueue = async () => {
      const unsynced = await db.getUnsyncedOrders();
      if (unsynced.length > 0) {
        setIsSyncing(true);
        for (const order of unsynced) {
           await db.updateOrder(order.uuid, { syncStatus: SyncStatus.Syncing });
           await new Promise(resolve => setTimeout(resolve, 500)); // Latency sim
           await db.updateOrder(order.uuid, { syncStatus: SyncStatus.Synced });
           
           if (!order.aiInsight) {
              const insight = await analyzeOrderWithGemini(order);
              await db.updateOrder(order.uuid, { aiInsight: insight });
           }
        }
        refreshData();
        setIsSyncing(false);
      }
    };
    const syncInterval = setInterval(processQueue, 3000);
    return () => clearInterval(syncInterval);
  }, [isOnline, refreshData, currentUser]);

  const handleLogin = async (user: Employee) => {
      let startTime = Date.now();
      
      if (!user.isCheckedIn) {
        await db.logAttendance(user.id, 'check-in');
      } else {
        const lastCheckIn = await db.getLastCheckIn(user.id);
        if (lastCheckIn) {
            startTime = lastCheckIn.timestamp;
        }
      }
      
      setSessionStartTime(startTime);
      setCurrentUser(user);
      setRole(user.role);
      // If admin, default to admin mode
      if (user.role === Role.Admin) {
          setIsAdminMode(true);
      }
      
      setTimeout(refreshData, 100);
  };

  const handleLogoutClick = () => {
      if (!currentUser) return;
      const now = Date.now();
      const sessionDurationMs = now - sessionStartTime;
      const hours = Math.floor(sessionDurationMs / 3600000);
      const minutes = Math.floor((sessionDurationMs % 3600000) / 60000);
      const seconds = Math.floor(((sessionDurationMs % 3600000) % 60000) / 1000);
      const durationStr = `${hours}h ${minutes}m ${seconds}s`;

      const sessionOrders = orders.filter(o => 
          o.status === 'paid' && 
          o.paidAt && 
          o.paidAt >= sessionStartTime &&
          o.serverId === currentUser.id
      );
      
      const totalSales = sessionOrders.reduce((acc, curr) => acc + curr.totalAmount, 0);

      setSessionStats({
          sales: totalSales,
          count: sessionOrders.length,
          duration: durationStr
      });
      setShowLogoutSummary(true);
      setShowSettings(false);
  };

  const confirmLogout = async () => {
      if (!currentUser) return;
      await db.logAttendance(currentUser.id, 'check-out');
      setShowLogoutSummary(false);
      setSessionStats(null);
      setCurrentUser(null);
      setRole(Role.Waiter);
      setIsAdminMode(false);
      refreshData();
  };

  // --- Shift Calculation Logic ---
  const getComputedShifts = () => {
      const shifts: any[] = [];
      const openShifts: Record<string, AttendanceRecord> = {};

      // Process logs oldest to newest to pair correct check-in/out
      const sortedLogs = [...attendanceLogs].sort((a, b) => a.timestamp - b.timestamp);

      sortedLogs.forEach(log => {
          if (log.type === 'check-in') {
              openShifts[log.employeeId] = log;
          } else if (log.type === 'check-out') {
              const startLog = openShifts[log.employeeId];
              if (startLog) {
                  shifts.push({
                      id: startLog.id, // Group ID
                      employeeId: log.employeeId,
                      employeeName: log.employeeName,
                      checkIn: startLog.timestamp,
                      checkOut: log.timestamp,
                      duration: log.timestamp - startLog.timestamp,
                      status: 'Completed'
                  });
                  delete openShifts[log.employeeId];
              }
          }
      });
      
      // Add currently active shifts
      Object.values(openShifts).forEach(log => {
          shifts.push({
               id: log.id,
               employeeId: log.employeeId,
               employeeName: log.employeeName,
               checkIn: log.timestamp,
               checkOut: null,
               duration: Date.now() - log.timestamp,
               status: 'Active'
          });
      });

      // Return sorted newest first
      return shifts.sort((a, b) => b.checkIn - a.checkIn);
  };

  // --- Table & Order Logic ---
  const occupiedTablesMap = new Map<string, Order>();
  orders.filter(o => o.status !== 'paid' && o.diningOption === 'dine-in').forEach(o => {
      if (o.tableIds && o.tableIds.length > 0) {
          o.tableIds.forEach(tid => occupiedTablesMap.set(tid, o));
      } else if (o.tableNo) {
          occupiedTablesMap.set(o.tableNo, o);
      }
  });

  const activeTableOrder = orders.find(
      o => o.status !== 'paid' && 
           o.diningOption === 'dine-in' && 
           o.tableIds.some(id => selectedTables.includes(id))
  );

  const handleTableToggle = (tableId: string) => {
      const orderOnTable = occupiedTablesMap.get(tableId);

      if (orderOnTable) {
          setSelectedTables(orderOnTable.tableIds);
      } else {
          setSelectedTables([tableId]);
      }
  };

  // --- Receipt Printing Logic ---
  const handlePrintReceipt = (order: Order) => {
      setReceiptOrder(order);
      setTimeout(() => {
          setReceiptOrder(null);
      }, 3000);
  };

  // --- Cart Actions ---
  const quickAddToCart = (e: React.MouseEvent | null, item: MenuItem) => {
      if(e) e.stopPropagation();
      const newItem: OrderItem = {
          ...item,
          qty: 1,
          selectedModifiers: [],
          notes: ''
      };
      
      setCart(prev => {
          const existingIdx = prev.findIndex(i => 
              i.id === item.id && 
              i.selectedModifiers.length === 0 && 
              !i.notes
          );

          if (existingIdx >= 0) {
              const newCart = [...prev];
              newCart[existingIdx].qty += 1;
              return newCart;
          }
          return [...prev, newItem];
      });
  };

  const initiateAddToCart = (item: MenuItem) => {
      if (isReportMode) {
          setReportItem(item);
          setReportQty(1);
          setReportReason('waste');
          return;
      }
      
      // Auto-add if no modifiers available (Quick Add Logic)
      if (!item.modifiers || item.modifiers.length === 0) {
          quickAddToCart(null, item);
          return;
      }
      
      // Open Expanded Detail View instead of adding directly
      setDetailProduct(item);
      setDetailModifiers([]);
      setDetailNote('');
      setDetailQty(1);
  };

  const confirmDetailAddToCart = () => {
      if (detailProduct) {
          // Add loop for quantity
          const newItem: OrderItem = {
            ...detailProduct,
            qty: detailQty,
            selectedModifiers: detailModifiers,
            notes: detailNote
          };
          
          setCart(prev => {
              const existingIdx = prev.findIndex(i => 
                  i.id === detailProduct.id && 
                  JSON.stringify(i.selectedModifiers.map(m=>m.id).sort()) === JSON.stringify(detailModifiers.map(m=>m.id).sort()) &&
                  i.notes === detailNote
              );

              if (existingIdx >= 0) {
                  const newCart = [...prev];
                  newCart[existingIdx].qty += detailQty;
                  return newCart;
              }
              return [...prev, newItem];
          });
          
          setDetailProduct(null);
      }
  };

  const toggleDetailModifier = (mod: Modifier) => {
      setDetailModifiers(prev => {
          const exists = prev.find(m => m.id === mod.id);
          if (exists) return prev.filter(m => m.id !== mod.id);
          return [...prev, mod];
      });
  };

  const openCartItemModal = (index: number) => {
      setActiveCartItemIndex(index);
      setActiveCartItemNote(cart[index].notes || '');
      setActiveCartItemQty(cart[index].qty); // Load current qty into local state
      setCartItemModalOpen(true);
  };

  const saveCartItemChanges = () => {
      if (activeCartItemIndex !== null) {
          setCart(prev => {
              const newCart = [...prev];
              // If qty is 0, remove item
              if (activeCartItemQty <= 0) {
                  return newCart.filter((_, i) => i !== activeCartItemIndex);
              }
              // Update item
              newCart[activeCartItemIndex] = {
                  ...newCart[activeCartItemIndex],
                  qty: activeCartItemQty,
                  notes: activeCartItemNote
              };
              return newCart;
          });
          setCartItemModalOpen(false);
          setActiveCartItemIndex(null);
      }
  };

  const updateCartItemQty = (index: number, newQty: number) => {
      setCart(prev => {
          if (newQty <= 0) {
              return prev.filter((_, i) => i !== index);
          }
          const newCart = [...prev];
          newCart[index] = { ...newCart[index], qty: newQty };
          return newCart;
      });
  };

  const removeActiveCartItem = () => {
      if (activeCartItemIndex !== null) {
          setCart(prev => prev.filter((_, i) => i !== activeCartItemIndex));
          setCartItemModalOpen(false);
          setActiveCartItemIndex(null);
      }
  };

  const handleSubmitReport = async () => {
      if (reportItem && currentUser) {
          const newStock = reportItem.stock - reportQty;
          await db.adjustStock(
              reportItem.id, 
              newStock, 
              reportReason, 
              currentUser.name, 
              false
          );
          setReportItem(null);
          refreshData();
      }
  };

  // ... (Loyalty handlers)
  const handleCustomerSearch = async () => {
      if (customerSearchPhone.length < 3) return;
      setIsSearchingCustomer(true);
      const customer = await db.findCustomerByPhone(customerSearchPhone);
      setFoundCustomer(customer || null);
      setIsSearchingCustomer(false);
  };

  const handleCreateCustomer = async () => {
      if (customerNameInput && customerSearchPhone) {
          const newCustomer = await db.createCustomer(customerNameInput, customerSearchPhone);
          setActiveCustomer(newCustomer);
          setShowCustomerModal(false);
          setFoundCustomer(null);
          setCustomerNameInput('');
          setCustomerSearchPhone('');
      }
  };

  const handleSelectCustomer = () => {
      if (foundCustomer) {
          setActiveCustomer(foundCustomer);
          setShowCustomerModal(false);
          setFoundCustomer(null);
          setCustomerNameInput('');
          setCustomerSearchPhone('');
          // Reset rewards if new customer doesn't qualify
          setSelectedReward(null);
      }
  };

  // ... (placeOrder, payments, etc)
  const placeOrder = async (): Promise<Order | null> => {
    if (cart.length === 0) return null;
    if (!currentUser) return null;

    const subtotal = cart.reduce((acc, item) => {
        const modPrice = item.selectedModifiers.reduce((sum, m) => sum + m.price, 0);
        return acc + ((item.price + modPrice) * item.qty);
    }, 0);
    
    const loyaltyDiscount = selectedReward ? selectedReward.value : 0;
    const percentageDiscountAmount = subtotal * (cartDiscount / 100);
    const totalDiscount = percentageDiscountAmount + loyaltyDiscount;

    const taxableAmount = Math.max(0, subtotal - totalDiscount);
    const taxAmount = taxableAmount * TAX_RATE;
    const totalAmount = taxableAmount + taxAmount;

    let resultOrder: Order | null = null;

    if (activeTableOrder) {
        await db.addItemsToOrder(
            activeTableOrder.uuid, 
            cart, 
            subtotal, 
            taxAmount, 
            totalAmount, 
            selectedTables,
            currentUser.name
        );
        resultOrder = activeTableOrder;
    } else {
        const newOrder: Order = {
          uuid: generateUUID(),
          tableNo: diningOption === 'dine-in' ? selectedTables.join(', ') : undefined,
          tableIds: diningOption === 'dine-in' ? selectedTables : [],
          items: [...cart],
          subtotal,
          discount: totalDiscount,
          tax: taxAmount,
          totalAmount,
          status: 'pending',
          diningOption,
          syncStatus: SyncStatus.Unsynced,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          opLogId: generateUUID(),
          customerNotes: cartNote,
          serverId: currentUser.id,
          serverName: currentUser.name,
          customerId: activeCustomer?.id,
          pointsRedeemed: selectedReward ? selectedReward.cost : 0,
          branchId: currentBranch
        };
        await db.createOrder(newOrder);
        resultOrder = newOrder;
    }

    setCart([]);
    setCartDiscount(0);
    setCartNote('');
    setActiveCustomer(null);
    setSelectedReward(null);
    refreshData();
    
    if (window.innerWidth < 1024) {
        setWaiterViewMode('orders');
    }
    
    return resultOrder;
  };

  const handlePayNow = async () => {
      if (cart.length > 0) {
        await placeOrder();
      }
      refreshData();
      
      const orderToPay = orders.find(o => 
          (o.status !== 'paid' && diningOption === 'dine-in' && o.tableIds.some(id => selectedTables.includes(id))) ||
          (o.diningOption !== 'dine-in' && o.status !== 'paid' && o === orders[0])
      );

      if (orderToPay) {
          setSelectedOrderForPayment(orderToPay);
      }
  };

  const connectPrinter = () => {
    setIsPrinterConnecting(true);
    setTimeout(() => {
      setIsPrinterConnecting(false);
      setIsPrinterConnected(true);
    }, 1500);
  };

  const handlePaymentAndPrint = async () => {
    if (!selectedOrderForPayment) return;
    setIsPrinting(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Updates status to 'paid', sets paymentMethod, paidAt, and syncStatus to 'unsynced'
    await db.markOrderAsPaid(selectedOrderForPayment.uuid, paymentMethod, Date.now());

    const paidOrder: Order = {
        ...selectedOrderForPayment,
        status: 'paid',
        paymentMethod,
        pointsEarned: Math.floor(selectedOrderForPayment.totalAmount),
        paidAt: Date.now()
    };
    
    setIsPrinting(false);
    setSelectedOrderForPayment(null);
    setIsPrinterConnected(false);
    refreshData();

    // Trigger Print
    handlePrintReceipt(paidOrder);
  };

  // --- Confirmation Handlers ---
  const handleConfirmAction = () => {
      if (confirmConfig) {
          confirmConfig.action();
          setConfirmConfig(null);
      }
  };

  const requestSendToKitchen = () => {
      setConfirmConfig({
          title: 'Send to Kitchen',
          message: (
              <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-3">
                      <ChefHat size={32} />
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 mb-2">Sending <strong>{cart.reduce((a,c)=>a+c.qty,0)} items</strong> to the kitchen.</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Are you sure?</p>
              </div>
          ),
          action: placeOrder
      });
  };

  const requestPayNow = () => {
      if (cart.length > 0) {
          setConfirmConfig({
              title: 'Place & Pay',
              message: `Send ${cart.reduce((a,c)=>a+c.qty,0)} items to kitchen and proceed to payment?`,
              action: handlePayNow
          });
      } else {
          handlePayNow();
      }
  };

  // --- Admin Logic ---
  const handleGenerateInsight = async () => {
      const insight = await generateDailyInsight(orders);
      setDailyInsight(insight);
  }

  const handleAddEmployee = async () => {
      if (newEmployee.name && newEmployee.pin) {
          await db.addEmployee({
              id: generateUUID(),
              name: newEmployee.name,
              pin: newEmployee.pin,
              email: newEmployee.email || '',
              phone: newEmployee.phone || '',
              role: newEmployee.role as Role,
              isCheckedIn: false,
              branchId: currentBranch
          });
          setNewEmployee({ role: Role.Waiter });
          setShowAddEmployee(false);
          refreshData();
      }
  };

  const handleAddBranch = async () => {
      if (newBranchName) {
          await db.addBranch({
              id: generateUUID(),
              name: newBranchName,
              address: newBranchAddress
          });
          setNewBranchName('');
          setNewBranchAddress('');
          refreshData();
      }
  };

  const handleAddReward = async () => {
      if (newRewardName && newRewardCost && newRewardValue) {
          await db.addReward({
              id: generateUUID(),
              name: newRewardName,
              cost: parseInt(newRewardCost),
              value: parseFloat(newRewardValue)
          });
          setNewRewardName('');
          setNewRewardCost('');
          setNewRewardValue('');
          refreshData();
      }
  };

  const handleSaveSettings = async () => {
      await db.updateSettings({ currencySymbol: currency, currentBranchId: currentBranch });
      alert("Settings saved!");
      refreshData();
  };

  const handleSaveProduct = async () => {
      if (editingProduct?.name && editingProduct.price) {
          if (editingProduct.id) {
              await db.updateProduct(editingProduct.id, editingProduct);
          } else {
              await db.addProduct({
                  ...editingProduct,
                  id: generateUUID(),
                  stock: editingProduct.stock || 0,
                  lowStockThreshold: editingProduct.lowStockThreshold || 5,
                  cost: editingProduct.cost || 0,
                  category: editingProduct.category || 'food',
                  modifiers: editingProduct.modifiers || []
              } as MenuItem);
          }
          setShowProductModal(false);
          setEditingProduct(null);
          refreshData();
      }
  };

  const handleAddModifier = () => {
      if (newModifierName && newModifierPrice) {
          const mod: Modifier = {
              id: generateUUID(),
              name: newModifierName,
              price: parseFloat(newModifierPrice) || 0
          };
          setEditingProduct(prev => ({
              ...prev,
              modifiers: [...(prev?.modifiers || []), mod]
          }));
          setNewModifierName('');
          setNewModifierPrice('');
      }
  };

  const removeModifier = (modId: string) => {
      setEditingProduct(prev => ({
          ...prev,
          modifiers: (prev?.modifiers || []).filter(m => m.id !== modId)
      }));
  };

  const handleSaveTable = async () => {
      if (editingTable?.name) {
          if (editingTable.id) {
              await db.updateTable(editingTable.id, editingTable);
          } else {
              await db.addTable({
                  id: editingTable.name, 
                  name: editingTable.name
              });
          }
          setShowTableModal(false);
          setEditingTable(null);
          refreshData();
      }
  };

  const handleEnableKiosk = () => {
      setIsKioskMode(true);
      setShowSettings(false);
      setWaiterViewMode('menu'); // Force menu view logic if needed, although Kiosk wraps all
  };

  const handleExitKiosk = async () => {
      const user = await db.authenticate(kioskPin);
      if (user && user.role === Role.Admin) {
          setIsKioskMode(false);
          setShowKioskExitModal(false);
          setKioskPin('');
          setKioskError('');
      } else {
          setKioskError('Invalid PIN or Admin required');
          setKioskPin('');
      }
  };

  if (!currentUser) {
      return <LoginScreen onLogin={handleLogin} openSettings={() => setShowSettings(true)} />;
  }
  
  const activeUser = employees.find(e => e.id === currentUser.id) || currentUser;

  // --- Admin Dashboard View ---
  if (isAdminMode && activeUser.role === Role.Admin) {
      return (
          <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col">
              {/* Top Navigation Bar */}
              <nav className="bg-slate-900 text-white shadow-lg sticky top-0 z-50">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                      <div className="flex items-center justify-between h-16">
                          <div className="flex items-center gap-4">
                              <div className="flex-shrink-0 bg-brand-600 p-2 rounded-lg">
                                  <Server size={20} className="text-white" />
                              </div>
                              <span className="font-bold text-xl tracking-tight hidden md:block">iEat Admin</span>
                          </div>
                          
                          {/* Desktop Menu */}
                          <div className="hidden md:block">
                              <div className="flex items-baseline space-x-4">
                                  {[
                                      { id: 'dashboard', icon: Activity, label: 'Overview' },
                                      { id: 'orders', icon: List, label: 'Kitchen View', action: () => { setWaiterViewMode('orders'); setIsAdminMode(false); } }, // Direct access to Kitchen
                                      { id: 'inventory', icon: Package, label: 'Menu' },
                                      { id: 'team', icon: Users, label: 'Staff' },
                                      { id: 'tables', icon: LayoutGrid, label: 'Tables' },
                                      { id: 'settings', icon: Settings, label: 'Settings' },
                                  ].map((item) => (
                                      item.action ? (
                                          <button
                                              key={item.id}
                                              onClick={item.action}
                                              className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors flex items-center gap-2"
                                          >
                                              <item.icon size={16} /> {item.label}
                                          </button>
                                      ) : (
                                          <button
                                              key={item.id}
                                              onClick={() => setAdminTab(item.id as any)}
                                              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${adminTab === item.id ? 'bg-brand-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                                          >
                                              <item.icon size={16} /> {item.label}
                                          </button>
                                      )
                                  ))}
                              </div>
                          </div>

                          <div className="flex items-center gap-3">
                              <button onClick={() => setIsAdminMode(false)} className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold transition-colors border border-slate-700">
                                  POS Mode
                              </button>
                              <button onClick={handleLogoutClick} className="text-red-400 hover:text-red-300 p-2 rounded-full hover:bg-slate-800 transition-colors">
                                  <LogOut size={20} />
                              </button>
                          </div>
                      </div>
                  </div>
                  
                  {/* Mobile Menu (Scrollable) */}
                  <div className="md:hidden overflow-x-auto scrollbar-hide border-t border-slate-800">
                      <div className="flex px-4 py-2 space-x-2">
                           {[
                              { id: 'dashboard', icon: Activity, label: 'Overview' },
                              { id: 'orders', icon: List, label: 'Kitchen', action: () => { setWaiterViewMode('orders'); setIsAdminMode(false); } },
                              { id: 'inventory', icon: Package, label: 'Menu' },
                              { id: 'team', icon: Users, label: 'Staff' },
                              { id: 'tables', icon: LayoutGrid, label: 'Tables' },
                              { id: 'settings', icon: Settings, label: 'Settings' },
                          ].map((item) => (
                              item.action ? (
                                <button
                                    key={item.id}
                                    onClick={item.action}
                                    className="flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap flex items-center gap-2 bg-slate-800 border-slate-700 text-slate-300"
                                >
                                    <item.icon size={14} /> {item.label}
                                </button>
                              ) : (
                                <button
                                    key={item.id}
                                    onClick={() => setAdminTab(item.id as any)}
                                    className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap flex items-center gap-2 border ${adminTab === item.id ? 'bg-brand-600 border-brand-600 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                                >
                                    <item.icon size={14} /> {item.label}
                                </button>
                              )
                          ))}
                      </div>
                  </div>
              </nav>

              <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 overflow-y-auto">
                  {/* ... (Admin Content) */}
                  {adminTab === 'dashboard' && (
                      <div className="space-y-6">
                          <div className="flex justify-between items-center">
                              <h2 className="text-2xl font-bold">Business Overview</h2>
                              <div className="flex gap-2">
                                  <select 
                                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
                                    value={reportBranchFilter}
                                    onChange={(e) => setReportBranchFilter(e.target.value)}
                                  >
                                      <option value="all">All Branches</option>
                                      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                  </select>
                                  <select
                                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
                                    value={reportStaffFilter}
                                    onChange={(e) => setReportStaffFilter(e.target.value)}
                                  >
                                      <option value="all">All Staff</option>
                                      {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                  </select>
                              </div>
                          </div>
                          
                          {/* Filtered Data Logic */}
                          {(() => {
                              const filteredOrders = orders.filter(o => {
                                  if (reportBranchFilter !== 'all' && o.branchId !== reportBranchFilter) return false;
                                  if (reportStaffFilter !== 'all' && o.serverId !== reportStaffFilter) return false;
                                  return true;
                              });
                              const totalSales = filteredOrders.filter(o => o.status === 'paid').reduce((acc, o) => acc + o.totalAmount, 0);
                              
                              return (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                                        <h3 className="text-slate-500 font-bold uppercase text-xs mb-2">Total Sales</h3>
                                        <p className="text-3xl font-black">{currency}{totalSales.toFixed(2)}</p>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                                        <h3 className="text-slate-500 font-bold uppercase text-xs mb-2">Orders Placed</h3>
                                        <p className="text-3xl font-black">{filteredOrders.length}</p>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                                        <h3 className="text-slate-500 font-bold uppercase text-xs mb-2">Avg. Ticket</h3>
                                        <p className="text-3xl font-black">{currency}{filteredOrders.length > 0 ? (totalSales / filteredOrders.length).toFixed(2) : '0.00'}</p>
                                    </div>
                                </div>
                              );
                          })()}
                      </div>
                  )}

                  {adminTab === 'settings' && (
                      <div className="space-y-8 max-w-4xl">
                          <h2 className="text-2xl font-bold">System Settings</h2>
                          
                          {/* General Settings */}
                          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                              <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Globe size={20}/> General</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div>
                                      <label className="block text-sm font-bold text-slate-500 mb-1">Currency Symbol</label>
                                      <input 
                                        type="text" 
                                        value={currency} 
                                        onChange={(e) => setCurrency(e.target.value)}
                                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-900" 
                                        placeholder="$"
                                      />
                                  </div>
                                  <div>
                                      <label className="block text-sm font-bold text-slate-500 mb-1">Current Device Branch</label>
                                      <select 
                                        value={currentBranch} 
                                        onChange={(e) => setCurrentBranch(e.target.value)}
                                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-900"
                                      >
                                          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                      </select>
                                  </div>
                              </div>
                              <button onClick={handleSaveSettings} className="mt-4 bg-brand-600 text-white px-4 py-2 rounded-lg font-bold">Save Changes</button>
                          </div>

                          {/* Branch Management */}
                          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                              <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><LayoutGrid size={20}/> Branches</h3>
                              
                              <div className="mb-6 space-y-2">
                                  {branches.map(branch => (
                                      <div key={branch.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                                          <div>
                                              <p className="font-bold">{branch.name}</p>
                                              <p className="text-xs text-slate-500">{branch.address || 'No address set'}</p>
                                          </div>
                                          <div className="flex items-center gap-2">
                                              <span className="text-xs bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded font-mono hidden sm:inline">{branch.id}</span>
                                              <button onClick={() => { if(confirm('Delete Branch?')) { db.deleteBranch(branch.id); refreshData(); }}} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={16}/></button>
                                          </div>
                                      </div>
                                  ))}
                              </div>

                              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                                  <h4 className="font-bold text-sm text-slate-500 mb-2">Add New Branch</h4>
                                  <div className="flex flex-col sm:flex-row gap-2">
                                      <input 
                                        type="text" 
                                        placeholder="Branch Name" 
                                        value={newBranchName}
                                        onChange={(e) => setNewBranchName(e.target.value)}
                                        className="flex-1 p-2 border border-slate-300 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-900"
                                      />
                                      <input 
                                        type="text" 
                                        placeholder="Address" 
                                        value={newBranchAddress}
                                        onChange={(e) => setNewBranchAddress(e.target.value)}
                                        className="flex-1 p-2 border border-slate-300 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-900"
                                      />
                                      <button onClick={handleAddBranch} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2">
                                          <Plus size={16} /> Add
                                      </button>
                                  </div>
                              </div>
                          </div>

                          {/* Loyalty Rewards Configuration */}
                          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                              <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Award size={20}/> Loyalty Program</h3>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                                  {loyaltyRewards.map(reward => (
                                      <div key={reward.id} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 relative group">
                                          <button onClick={() => { if(confirm('Delete Reward?')) { db.deleteReward(reward.id); refreshData(); }}} className="absolute top-2 right-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <X size={16} />
                                          </button>
                                          <p className="font-bold text-lg">{reward.name}</p>
                                          <div className="flex justify-between items-end mt-2">
                                              <span className="text-xs bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 px-2 py-1 rounded font-bold">
                                                  {reward.cost} pts
                                              </span>
                                              <span className="font-bold text-green-600 dark:text-green-400">
                                                  {currency}{reward.value} Off
                                              </span>
                                          </div>
                                      </div>
                                  ))}
                              </div>

                              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                                  <h4 className="font-bold text-sm text-slate-500 mb-2">Add New Reward</h4>
                                  <div className="flex flex-col sm:flex-row gap-2">
                                      <input 
                                        type="text" 
                                        placeholder="Name (e.g. $5 Off)" 
                                        value={newRewardName}
                                        onChange={(e) => setNewRewardName(e.target.value)}
                                        className="flex-[2] p-2 border border-slate-300 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-900"
                                      />
                                      <input 
                                        type="number" 
                                        placeholder="Points Cost" 
                                        value={newRewardCost}
                                        onChange={(e) => setNewRewardCost(e.target.value)}
                                        className="flex-1 p-2 border border-slate-300 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-900"
                                      />
                                      <input 
                                        type="number" 
                                        placeholder="Value" 
                                        value={newRewardValue}
                                        onChange={(e) => setNewRewardValue(e.target.value)}
                                        className="flex-1 p-2 border border-slate-300 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-900"
                                      />
                                      <button onClick={handleAddReward} className="bg-brand-600 text-white px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2">
                                          <Plus size={16} /> Add
                                      </button>
                                  </div>
                              </div>
                          </div>
                      </div>
                  )}

                  {/* ... (Other Admin Tabs remain the same) ... */}
                  {/* Re-rendering truncated Admin tabs for completeness */}
                  {adminTab === 'team' && (
                      <div className="space-y-8">
                          <div className="flex justify-between items-center">
                              <h2 className="text-2xl font-bold">Team Management</h2>
                              <button onClick={() => setShowAddEmployee(true)} className="bg-brand-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-brand-700">
                                  <Plus size={18} /> Add Employee
                              </button>
                          </div>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                                  <div className="p-4 border-b border-slate-200 dark:border-slate-700 font-bold text-lg">Staff List</div>
                                  <div className="divide-y divide-slate-200 dark:divide-slate-700">
                                      {employees.map(emp => (
                                          <div key={emp.id} className="p-4 flex items-center justify-between">
                                              <div className="flex items-center gap-3">
                                                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
                                                      {emp.name.charAt(0)}
                                                  </div>
                                                  <div>
                                                      <p className="font-bold text-slate-900 dark:text-white">{emp.name}</p>
                                                      <p className="text-xs text-slate-500 capitalize">{emp.role}</p>
                                                  </div>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                  <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${emp.isCheckedIn ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                                      {emp.isCheckedIn ? 'On Shift' : 'Away'}
                                                  </span>
                                                  <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded hidden sm:inline">PIN: {emp.pin}</span>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                                  <div className="p-4 border-b border-slate-200 dark:border-slate-700 font-bold text-lg flex items-center gap-2">
                                      <History size={20} /> Shift History
                                  </div>
                                  <div className="overflow-x-auto">
                                      <table className="w-full text-sm text-left">
                                          <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase text-xs font-bold">
                                              <tr>
                                                  <th className="px-4 py-3">Employee</th>
                                                  <th className="px-4 py-3">Check In</th>
                                                  <th className="px-4 py-3">Check Out</th>
                                                  <th className="px-4 py-3">Duration</th>
                                                  <th className="px-4 py-3">Status</th>
                                              </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                              {getComputedShifts().length === 0 ? (
                                                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">No shift history found.</td></tr>
                                              ) : (
                                                  getComputedShifts().map((shift, idx) => (
                                                      <tr key={`${shift.id}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                          <td className="px-4 py-3 font-medium">{shift.employeeName}</td>
                                                          <td className="px-4 py-3 font-mono text-xs text-slate-500">
                                                              {new Date(shift.checkIn).toLocaleString()}
                                                          </td>
                                                          <td className="px-4 py-3 font-mono text-xs text-slate-500">
                                                              {shift.checkOut ? new Date(shift.checkOut).toLocaleString() : '-'}
                                                          </td>
                                                          <td className="px-4 py-3 font-bold">
                                                              {shift.duration ? (
                                                                  <span>
                                                                      {Math.floor(shift.duration / 3600000)}h {Math.floor((shift.duration % 3600000) / 60000)}m
                                                                  </span>
                                                              ) : '-'}
                                                          </td>
                                                          <td className="px-4 py-3">
                                                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${shift.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                                                  {shift.status}
                                                              </span>
                                                          </td>
                                                      </tr>
                                                  ))
                                              )}
                                          </tbody>
                                      </table>
                                  </div>
                              </div>
                          </div>
                      </div>
                  )}
                  {adminTab === 'tables' && (
                      <div className="space-y-6">
                           <div className="flex justify-between items-center">
                              <h2 className="text-2xl font-bold">Table Management</h2>
                              <button onClick={() => setShowTableModal(true)} className="bg-brand-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-brand-700">
                                  <Plus size={18} /> Add Table
                              </button>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                              {tables.map(table => (
                                  <div key={table.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center group relative">
                                      <span className="font-bold text-lg">{table.name}</span>
                                      <button onClick={async () => { if(window.confirm(`Delete table ${table.name}?`)) { await db.deleteTable(table.id); refreshData(); } }} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <Trash2 size={16} />
                                      </button>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}
                  {adminTab === 'inventory' && (
                       <div className="space-y-6">
                           <div className="flex justify-between items-center">
                              <h2 className="text-2xl font-bold">Menu & Inventory</h2>
                              <button onClick={() => { setEditingProduct({}); setShowProductModal(true); }} className="bg-brand-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-brand-700">
                                  <Plus size={18} /> Add Item
                              </button>
                          </div>
                          
                          {/* New Responsive Card Layout for Inventory */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                              {products.map(p => (
                                  <div key={p.id} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col justify-between group hover:border-brand-500 transition-colors">
                                     <div>
                                        <div className="flex justify-between items-start mb-2">
                                           <h4 className="font-bold text-lg leading-tight text-slate-900 dark:text-white">{p.name}</h4>
                                           <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${p.stock <= p.lowStockThreshold ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                                Stock: {p.stock}
                                           </span>
                                        </div>
                                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-3 capitalize bg-slate-50 dark:bg-slate-900/50 inline-block px-2 py-0.5 rounded">{p.category}</p>
                                     </div>
                                     
                                     <div className="flex justify-between items-end pt-3 border-t border-slate-100 dark:border-slate-700">
                                          <div>
                                              <span className="text-xs text-slate-400 font-bold uppercase">Price</span>
                                              <p className="font-black text-xl text-slate-900 dark:text-white">{currency}{p.price.toFixed(2)}</p>
                                          </div>
                                          <button 
                                            onClick={() => { setEditingProduct(p); setShowProductModal(true); }} 
                                            className="bg-slate-100 dark:bg-slate-700 hover:bg-brand-600 hover:text-white text-slate-600 dark:text-slate-300 p-2 rounded-lg transition-all"
                                          >
                                              <Edit3 size={18} />
                                          </button>
                                     </div>
                                  </div>
                              ))}
                          </div>
                       </div>
                  )}
              </div>
          </div>
      );
  }

  return (
    <div className="flex h-screen w-screen bg-slate-50 dark:bg-slate-950 overflow-hidden text-slate-900 dark:text-slate-100 font-sans selection:bg-brand-500/30">
      
      {/* Waiter View Header Buttons - Mobile Only (Absolute positioning) */}
      {waiterViewMode === 'menu' && (
          <div className="absolute top-4 right-4 z-50 lg:hidden flex gap-2">
              {!isKioskMode && (
                <button 
                    onClick={() => setIsReportMode(!isReportMode)}
                    className={`p-2 rounded-full shadow-lg border-2 transition-all ${isReportMode ? 'bg-red-500 text-white border-red-600 animate-pulse' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}
                    title="Report Issue"
                >
                    <AlertTriangle size={20} />
                </button>
              )}
              {isKioskMode ? (
                  <button onClick={() => setShowKioskExitModal(true)} className="p-2 rounded-full shadow-lg border-2 border-red-200 bg-red-50 text-red-600">
                      <Lock size={20} />
                  </button>
              ) : (
                  <button onClick={() => setShowSettings(true)} className="p-2 rounded-full shadow-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                      <Settings size={20} />
                  </button>
              )}
          </div>
      )}

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col h-full min-w-0 transition-all duration-300 ${waiterViewMode === 'cart' ? 'hidden lg:flex' : 'flex'}`}>
          
          <div className="shrink-0 p-4 space-y-4">
              {/* Desktop Header - Now Persistent */}
              <div className="hidden lg:flex w-full items-center justify-between">
                  <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                      <button onClick={() => setWaiterViewMode('menu')} className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${waiterViewMode === 'menu' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}><Utensils size={18} /> Menu</button>
                      {!isKioskMode && (
                          <button onClick={() => setWaiterViewMode('orders')} className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${waiterViewMode === 'orders' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}><List size={18} /> Orders</button>
                      )}
                  </div>
                  
                  <div className="flex gap-2">
                      {/* Admin Shortcut for POS users who are admins - HIDDEN IN KIOSK MODE */}
                      {!isKioskMode && activeUser.role === Role.Admin && (
                          <button onClick={() => setIsAdminMode(true)} className="bg-slate-800 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-md hover:bg-slate-700 flex items-center gap-2">
                              <Server size={18} /> Admin Dashboard
                          </button>
                      )}
                      {!isKioskMode && (
                          <button onClick={() => setIsReportMode(!isReportMode)} className={`px-4 py-2.5 rounded-xl shadow-sm border transition-all flex items-center gap-2 font-bold text-sm ${isReportMode ? 'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 border-red-200 dark:border-red-800 animate-pulse ring-2 ring-red-500 ring-offset-2' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                              <AlertTriangle size={18} /> {isReportMode ? "Reporting..." : "Report Issue"}
                          </button>
                      )}
                      {isKioskMode ? (
                          <button onClick={() => setShowKioskExitModal(true)} className="p-2.5 rounded-xl shadow-sm border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"><Lock size={20} /></button>
                      ) : (
                          <button onClick={() => setShowSettings(true)} className="p-2.5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"><Settings size={20}/></button>
                      )}
                  </div>
              </div>

              {isReportMode && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl flex justify-between items-center text-sm font-bold animate-in slide-in-from-top shadow-sm">
                      <span className="flex items-center gap-2"><AlertTriangle size={18} /> Select an item to report waste or stock issue.</span>
                      <button onClick={() => setIsReportMode(false)} className="bg-white/50 dark:bg-black/20 px-3 py-1 rounded-lg hover:bg-white dark:hover:bg-black/40 transition-colors">Cancel</button>
                  </div>
              )}
          </div>

          {waiterViewMode === 'menu' ? (
            <>
                <div className="shrink-0 px-4 pb-4 space-y-4">
                    {/* Table Selector - Visual Enhancement */}
                    <div className="bg-white dark:bg-slate-900 shadow-sm p-4 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="flex justify-between items-center mb-4 px-1">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1 tracking-wider"><LayoutGrid size={14}/> Table Overview</span>
                            </div>
                            <div className="flex gap-2 text-[10px] font-bold uppercase tracking-wide">
                                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Free</div>
                                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Occupied</div>
                            </div>
                        </div>

                        <div className="overflow-x-auto scrollbar-hide pb-2 px-1 -mx-1">
                            <div className="flex gap-3 w-max px-1">
                                {tables.map(t => {
                                    const order = occupiedTablesMap.get(t.name);
                                    const isOccupied = !!order;
                                    const isSelected = selectedTables.includes(t.name);
                                    
                                    return (
                                        <button 
                                            key={t.id}
                                            onClick={() => handleTableToggle(t.name)}
                                            className={`
                                                relative w-32 h-28 p-3 rounded-2xl flex flex-col justify-between transition-all duration-300 border-2 group
                                                ${isSelected 
                                                    ? 'bg-slate-800 dark:bg-slate-100 border-slate-800 dark:border-slate-100 text-white dark:text-slate-900 shadow-xl scale-105 z-10' 
                                                    : isOccupied
                                                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:border-blue-400 dark:hover:border-blue-600 shadow-sm'
                                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-emerald-400 dark:hover:border-emerald-600 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 shadow-sm'
                                                }
                                            `}
                                        >
                                            <div className="flex justify-between items-start w-full">
                                                <span className="font-black text-xl leading-none">{t.name}</span>
                                                <div className={`p-1.5 rounded-full ${isSelected ? 'bg-white/20' : isOccupied ? 'bg-blue-200/50 dark:bg-blue-800/50' : 'bg-emerald-100 dark:bg-emerald-900/50'}`}>
                                                    {isOccupied ? <User size={14} className={isSelected ? 'text-white' : 'text-blue-600 dark:text-blue-300'} /> : <CheckCircle size={14} className={isSelected ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'} />}
                                                </div>
                                            </div>
                                            
                                            {isOccupied ? (
                                                <div className="flex flex-col items-start mt-2">
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider opacity-70`}>Current Bill</span>
                                                    <span className="font-bold text-lg leading-tight">{currency}{order.totalAmount.toFixed(0)}</span>
                                                </div>
                                            ) : (
                                                <div className="mt-auto">
                                                    <span className={`text-[10px] font-bold uppercase tracking-wide opacity-60 flex items-center gap-1`}>
                                                        Available
                                                    </span>
                                                </div>
                                            )}
                                            
                                            {isSelected && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-white/50 rounded-full"></div>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Category Tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        {['all', 'food', 'drink', 'dessert'].map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat as Category | 'all')}
                                className={`
                                    px-6 py-3 rounded-full text-sm font-bold capitalize whitespace-nowrap transition-all shadow-sm border
                                    ${activeCategory === cat 
                                    ? 'bg-brand-600 border-brand-600 text-white shadow-brand-500/30 scale-105' 
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}
                                `}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Product Grid */}
                <div className="flex-1 overflow-y-auto px-4 pb-28 lg:pb-4 scrollbar-hide">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                        {((activeCategory === 'all' ? products : products.filter(p => p.category === activeCategory))).map(item => {
                            const isOutOfStock = item.stock <= 0;
                            const isLowStock = item.stock > 0 && item.stock <= item.lowStockThreshold;

                            return (
                            <div 
                                key={item.id}
                                onClick={() => initiateAddToCart(item)}
                                className={`
                                    group relative bg-white dark:bg-slate-900 rounded-2xl shadow-sm border transition-all active:scale-[0.98] overflow-hidden cursor-pointer h-full flex flex-col
                                    ${isReportMode ? 'border-red-500/50 ring-2 ring-transparent hover:ring-red-400' : isOutOfStock ? 'opacity-60 cursor-not-allowed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50' : 'border-slate-200 dark:border-slate-800 hover:border-brand-500 dark:hover:border-brand-500 hover:shadow-md'}
                                `}
                            >
                                <div className="aspect-[4/3] w-full bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                                    {item.image ? (
                                        <img src={item.image} alt={item.name} className={`w-full h-full object-cover transition-transform duration-500 ${!isOutOfStock && 'group-hover:scale-110'} ${isOutOfStock ? 'grayscale' : ''}`} />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600 font-black text-4xl select-none">
                                            {item.name.charAt(0)}
                                        </div>
                                    )}
                                    
                                    {isOutOfStock && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[1px]">
                                            <span className="text-white border-2 border-white px-3 py-1 text-xs font-black uppercase tracking-widest rotate-[-12deg]">Sold Out</span>
                                        </div>
                                    )}
                                    
                                    {isLowStock && !isOutOfStock && (
                                        <div className="absolute bottom-2 left-2 bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1">
                                            <AlertTriangle size={10} /> Only {item.stock} left
                                        </div>
                                    )}

                                    {!isOutOfStock && !isReportMode && (
                                        // Quick Add Button
                                        <button 
                                            onClick={(e) => quickAddToCart(e, item)}
                                            className="absolute top-2 right-2 w-8 h-8 bg-brand-600 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all lg:hidden group-hover:flex"
                                        >
                                            <Plus size={16} strokeWidth={3} />
                                        </button>
                                    )}
                                </div>

                                <div className="p-3 flex-1 flex flex-col justify-between">
                                    <div className="mb-2">
                                        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight line-clamp-2">{item.name}</h3>
                                        {item.description && <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">{item.description}</p>}
                                    </div>
                                    
                                    <div className="flex justify-between items-center">
                                        <p className={`font-black text-lg ${isOutOfStock ? 'text-slate-400' : 'text-slate-900 dark:text-white'}`}>{currency}{item.price.toFixed(2)}</p>
                                        
                                        {item.modifiers && item.modifiers.length > 0 ? (
                                            <span className="text-[9px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-1 rounded-md tracking-wide">
                                                Custom
                                            </span>
                                        ) : (
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isOutOfStock ? 'bg-slate-100 dark:bg-slate-800 text-slate-300' : 'bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 group-hover:bg-brand-600 group-hover:text-white'}`}>
                                                <Plus size={16} strokeWidth={3} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )})}
                    </div>
                </div>
            </>
          ) : (
            // Orders View
// ... (No changes to Orders View, keeping existing content)
            <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4 pb-28 lg:pb-4 h-full">
                 <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                     <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Active Orders</h2>
                        <div className="lg:hidden">
                            {isKioskMode ? (
                                <button onClick={() => setShowKioskExitModal(true)} className="p-2 rounded-lg bg-red-50 text-red-600 border border-red-200"><Lock size={20}/></button>
                            ) : (
                                <button onClick={() => setShowSettings(true)} className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"><Settings size={20}/></button>
                            )}
                        </div>
                     </div>
                     
                     <div className="flex gap-2 w-full lg:w-auto bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
                         <button onClick={() => setOrderFilter('all')} className={`flex-1 lg:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${orderFilter === 'all' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>All Orders</button>
                         <button onClick={() => setOrderFilter('cash')} className={`flex-1 lg:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${orderFilter === 'cash' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>Cash Only</button>
                         <button onClick={() => setOrderFilter('card')} className={`flex-1 lg:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${orderFilter === 'card' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>Card Only</button>
                     </div>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                     {orders.length === 0 && (
                         <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
                             <Clock size={48} className="mb-4 opacity-50" />
                             <p>No active orders found.</p>
                         </div>
                     )}
                     
                     {orders
                        .filter(o => orderFilter === 'all' || o.paymentMethod === orderFilter)
                        .sort((a, b) => b.createdAt - a.createdAt)
                        .map(order => (
                         <div key={order.uuid} className={`bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border transition-all hover:shadow-md ${order.status === 'paid' ? 'border-emerald-200 dark:border-emerald-900/30 opacity-75' : 'border-slate-200 dark:border-slate-800'}`}>
                             <div className="flex justify-between items-start mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                                 <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-black text-xl text-slate-900 dark:text-white">
                                            {order.diningOption === 'dine-in' ? `Table ${order.tableNo}` : order.diningOption}
                                        </span>
                                        <span className="text-xs font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">#{order.uuid.slice(0,4)}</span>
                                        {/* Added Sync Status Indicator */}
                                        <div className={`w-2 h-2 rounded-full ${
                                            order.syncStatus === SyncStatus.Synced ? 'bg-green-500' : 
                                            order.syncStatus === SyncStatus.Syncing ? 'bg-yellow-500 animate-pulse' : 
                                            order.syncStatus === SyncStatus.Failed ? 'bg-red-500' : 'bg-slate-300'
                                        }`} title={`Sync Status: ${order.syncStatus}`} />
                                    </div>
                                    <span className="text-xs text-slate-500 dark:text-slate-400">{new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                 </div>
                                 <OrderStatusBadge status={order.status} />
                             </div>
                             
                             <div className="space-y-3 mb-4">
                                 {order.items.slice(0, 4).map((i, idx) => (
                                     <div key={idx} className="flex justify-between text-sm">
                                         <span className="font-medium text-slate-700 dark:text-slate-300">
                                             <span className="font-bold text-slate-900 dark:text-slate-100 mr-2">{i.qty}x</span> 
                                             {i.name}
                                         </span>
                                         <span className="text-slate-500">{currency}{(i.price * i.qty).toFixed(2)}</span>
                                     </div>
                                 ))}
                                 {order.items.length > 4 && (
                                     <div className="text-xs text-slate-400 italic pt-1">
                                         + {order.items.length - 4} more items...
                                     </div>
                                 )}
                             </div>
                             
                             <div className="flex justify-between items-center pt-2">
                                 <div>
                                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total</span>
                                    <p className="text-2xl font-black text-slate-900 dark:text-white">{currency}{order.totalAmount.toFixed(2)}</p>
                                 </div>
                                 {order.status !== 'paid' ? (
                                    <button 
                                        onClick={() => setSelectedOrderForPayment(order)}
                                        className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-3 rounded-xl font-bold text-sm shadow-md shadow-brand-500/20 transition-all active:scale-95 flex items-center gap-2"
                                    >
                                        Pay Bill <ArrowRight size={16} />
                                    </button>
                                 ) : (
                                    <button 
                                        onClick={() => handlePrintReceipt(order)}
                                        className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-xl font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-2"
                                    >
                                        <Printer size={14} /> Receipt
                                    </button>
                                 )}
                             </div>
                         </div>
                     ))}
                 </div>
            </div>
          )}
      </div>
      
      {/* ... (Rest of the modals remain unchanged, logic already implemented in previous steps) */}
      {/* Cart Sidebar (Desktop) */}
      <div className="hidden lg:flex w-[400px] shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-full shadow-xl shadow-slate-200/50 dark:shadow-none z-20">
            <CartPanel 
                cart={cart}
                activeTableOrder={activeTableOrder}
                diningOption={diningOption} 
                setDiningOption={setDiningOption}
                openCartItemModal={openCartItemModal}
                updateCartItemQty={updateCartItemQty}
                cartSubtotal={cart.reduce((acc, item) => {
                    const modPrice = item.selectedModifiers.reduce((sum, m) => sum + m.price, 0);
                    return acc + ((item.price + modPrice) * item.qty);
                }, 0)}
                cartDiscount={cartDiscount}
                setCartDiscount={setCartDiscount}
                cartTax={((Math.max(0, cart.reduce((acc, item) => {
                    const modPrice = item.selectedModifiers.reduce((sum, m) => sum + m.price, 0);
                    return acc + ((item.price + modPrice) * item.qty);
                }, 0) - (cart.reduce((acc, item) => {
                    const modPrice = item.selectedModifiers.reduce((sum, m) => sum + m.price, 0);
                    return acc + ((item.price + modPrice) * item.qty);
                }, 0) * (cartDiscount / 100)) - (selectedReward ? selectedReward.value : 0))) * TAX_RATE)}
                cartTotal={((Math.max(0, cart.reduce((acc, item) => {
                    const modPrice = item.selectedModifiers.reduce((sum, m) => sum + m.price, 0);
                    return acc + ((item.price + modPrice) * item.qty);
                }, 0) - (cart.reduce((acc, item) => {
                    const modPrice = item.selectedModifiers.reduce((sum, m) => sum + m.price, 0);
                    return acc + ((item.price + modPrice) * item.qty);
                }, 0) * (cartDiscount / 100)) - (selectedReward ? selectedReward.value : 0))) * (1 + TAX_RATE))}
                cartNote={cartNote}
                setCartNote={setCartNote}
                placeOrder={requestSendToKitchen}
                handlePayNow={requestPayNow}
                activeCustomer={activeCustomer}
                onCustomerClick={() => setShowCustomerModal(true)}
                selectedReward={selectedReward}
                setSelectedReward={setSelectedReward}
                currency={currency}
                rewards={loyaltyRewards}
            />
      </div>
      
      {/* Mobile Cart View */}
      {waiterViewMode === 'cart' && (
          <div className="lg:hidden fixed inset-0 z-30 bg-slate-50 dark:bg-slate-950 flex flex-col animate-in slide-in-from-right duration-200">
               <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3">
                    <button onClick={() => setWaiterViewMode('menu')} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                        <ChevronRight size={24} className="rotate-180" />
                    </button>
                    <h2 className="font-bold text-lg text-slate-900 dark:text-white">Your Cart</h2>
                    <span className="ml-auto text-sm font-medium text-slate-500 dark:text-slate-400">{cart.reduce((a,c)=>a+c.qty,0)} Items</span>
               </div>
               <CartPanel 
                    cart={cart}
                    activeTableOrder={activeTableOrder}
                    diningOption={diningOption} 
                    setDiningOption={setDiningOption}
                    openCartItemModal={openCartItemModal}
                    updateCartItemQty={updateCartItemQty}
                    cartSubtotal={cart.reduce((acc, item) => {
                        const modPrice = item.selectedModifiers.reduce((sum, m) => sum + m.price, 0);
                        return acc + ((item.price + modPrice) * item.qty);
                    }, 0)}
                    cartDiscount={cartDiscount}
                    setCartDiscount={setCartDiscount}
                    cartTax={((Math.max(0, cart.reduce((acc, item) => {
                        const modPrice = item.selectedModifiers.reduce((sum, m) => sum + m.price, 0);
                        return acc + ((item.price + modPrice) * item.qty);
                    }, 0) - (cart.reduce((acc, item) => {
                        const modPrice = item.selectedModifiers.reduce((sum, m) => sum + m.price, 0);
                        return acc + ((item.price + modPrice) * item.qty);
                    }, 0) * (cartDiscount / 100)) - (selectedReward ? selectedReward.value : 0))) * TAX_RATE)}
                    cartTotal={((Math.max(0, cart.reduce((acc, item) => {
                        const modPrice = item.selectedModifiers.reduce((sum, m) => sum + m.price, 0);
                        return acc + ((item.price + modPrice) * item.qty);
                    }, 0) - (cart.reduce((acc, item) => {
                        const modPrice = item.selectedModifiers.reduce((sum, m) => sum + m.price, 0);
                        return acc + ((item.price + modPrice) * item.qty);
                    }, 0) * (cartDiscount / 100)) - (selectedReward ? selectedReward.value : 0))) * (1 + TAX_RATE))}
                    cartNote={cartNote}
                    setCartNote={setCartNote}
                    placeOrder={requestSendToKitchen}
                    handlePayNow={requestPayNow}
                    activeCustomer={activeCustomer}
                    onCustomerClick={() => setShowCustomerModal(true)}
                    selectedReward={selectedReward}
                    setSelectedReward={setSelectedReward}
                    currency={currency}
                    rewards={loyaltyRewards}
                />
                {/* Spacer for bottom safe area */}
                <div className="h-16 shrink-0 lg:hidden"></div>
          </div>
      )}
      
      {/* ... (Existing Modals logic remains) */}
      <ReceiptOverlay order={receiptOrder} currency={currency} />
      
      {/* ... (Settings, Kiosk, Product Detail Modals) */}
      {/* Only change in Product Detail Modal is ensuring it uses the updated props if any, but since it's local state, it's fine. */}
      {/* Keeping previous Modal code exactly as is for brevity unless logic changed */}
      <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title="Settings">
          {/* ... (Existing Settings Content) */}
          <div className="space-y-6">
              {/* ... (Account, Appearance, Info) */}
              <div className="bg-brand-50 dark:bg-brand-900/20 p-4 rounded-xl border border-brand-200 dark:border-brand-900/30">
                  <h4 className="text-sm font-bold text-brand-900 dark:text-brand-100 mb-3 flex items-center gap-2">
                      <User size={16} /> Account
                  </h4>
                  <div className="flex justify-between items-center mb-4">
                      <div>
                          <p className="font-bold text-slate-900 dark:text-white">{activeUser.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{activeUser.role}</p>
                      </div>
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-[10px] font-bold uppercase rounded-md border border-green-200 dark:border-green-800">
                          Active
                      </span>
                  </div>
                  <button 
                      onClick={handleLogoutClick}
                      className="w-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 py-2.5 rounded-lg font-bold text-sm hover:bg-red-200 dark:hover:bg-red-900/50 flex items-center justify-center gap-2 transition-colors"
                  >
                      <LogOut size={16} /> End Shift & Logout
                  </button>
              </div>

              <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                      <Settings size={16} /> Appearance & Mode
                  </h4>
                  <div className="space-y-3">
                      <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                          <span className="text-slate-700 dark:text-slate-300 font-medium">Dark Mode</span>
                          <button 
                              onClick={toggleTheme}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${theme === 'dark' ? 'bg-brand-600' : 'bg-slate-300'}`}
                          >
                              <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}`}
                              />
                          </button>
                      </div>
                      
                      {activeUser.role === Role.Admin && (
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                            <span className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-2"><Smartphone size={16}/> Kiosk Mode</span>
                            <button 
                                onClick={handleEnableKiosk}
                                className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700"
                            >
                                Enable
                            </button>
                        </div>
                      )}
                  </div>
              </div>

              <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                      <Info size={16} /> System Info
                  </h4>
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                       <div className="flex justify-between text-sm">
                           <span className="text-slate-500">Version</span>
                           <span className="text-slate-900 dark:text-slate-100 font-mono">v2.4.0</span>
                       </div>
                       <div className="flex justify-between text-sm">
                           <span className="text-slate-500">Sync Status</span>
                           <StatusBadge status={isSyncing ? SyncStatus.Syncing : SyncStatus.Synced} />
                       </div>
                  </div>
              </div>
          </div>
      </Modal>
      
      {/* ... (Kiosk Exit Modal) */}
      <Modal isOpen={showKioskExitModal} onClose={() => setShowKioskExitModal(false)} title="Exit Kiosk Mode">
          <div className="space-y-4 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
                  <Lock size={32} />
              </div>
              <p className="text-slate-600 dark:text-slate-300">Enter Admin PIN to unlock the system.</p>
              
              <div className="flex justify-center gap-4 my-4">
                  {[0, 1, 2, 3].map(i => (
                      <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${i < kioskPin.length ? 'bg-red-500 border-red-500' : 'border-slate-300 dark:border-slate-600'}`} />
                  ))}
              </div>
              
              {kioskError && <p className="text-red-500 text-sm font-bold">{kioskError}</p>}
              
              <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                      <button key={num} onClick={() => setKioskPin(p => (p.length < 4 ? p + num : p))} className="h-12 rounded-xl bg-slate-100 dark:bg-slate-700 font-bold text-lg hover:bg-slate-200 dark:hover:bg-slate-600">{num}</button>
                  ))}
                  <button onClick={() => setKioskPin('')} className="h-12 rounded-xl bg-slate-200 dark:bg-slate-800 text-red-500 font-bold">C</button>
                  <button onClick={() => setKioskPin(p => (p.length < 4 ? p + '0' : p))} className="h-12 rounded-xl bg-slate-100 dark:bg-slate-700 font-bold text-lg hover:bg-slate-200 dark:hover:bg-slate-600">0</button>
                  <button onClick={handleExitKiosk} className="h-12 rounded-xl bg-red-600 text-white font-bold flex items-center justify-center"><Unlock size={18}/></button>
              </div>
          </div>
      </Modal>

      {/* Product Detail Modal (Expanded View) */}
      <Modal 
        isOpen={!!detailProduct} 
        onClose={() => setDetailProduct(null)} 
        title={detailProduct?.name || 'Item Details'}
        size="lg"
      >
        {detailProduct && (
            <div className="flex flex-col md:flex-row gap-6">
                {/* Image Section */}
                <div className="w-full md:w-1/2">
                    <div className="aspect-square md:aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 shadow-sm relative">
                        {detailProduct.image ? (
                            <img src={detailProduct.image} alt={detailProduct.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-slate-300">{detailProduct.name[0]}</div>
                        )}
                        <div className="absolute top-4 left-4 bg-white/90 dark:bg-black/80 backdrop-blur-md px-3 py-1 rounded-lg text-sm font-bold text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-700">
                            {currency}{detailProduct.price.toFixed(2)}
                        </div>
                    </div>
                </div>

                {/* Details Section */}
                <div className="w-full md:w-1/2 space-y-6">
                    <div>
                        <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-4">{detailProduct.description || "No description available."}</p>
                    </div>

                    {/* Modifiers */}
                    {detailProduct.modifiers && detailProduct.modifiers.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="font-bold text-sm uppercase text-slate-400 tracking-wider">Customize</h4>
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-2 scrollbar-hide">
                                {detailProduct.modifiers.map(mod => {
                                    const isSelected = detailModifiers.some(m => m.id === mod.id);
                                    return (
                                        <button 
                                            key={mod.id}
                                            onClick={() => toggleDetailModifier(mod)}
                                            className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${isSelected ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-500 dark:border-brand-500 text-brand-700 dark:text-brand-300' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'}`}
                                        >
                                            <span className="font-medium text-sm">{mod.name}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-mono opacity-70">+{currency}{mod.price.toFixed(2)}</span>
                                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'bg-brand-500 border-brand-500 text-white' : 'border-slate-300 dark:border-slate-500'}`}>
                                                    {isSelected && <CheckCircle size={12} />}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    <div>
                         <label className="font-bold text-sm uppercase text-slate-400 tracking-wider block mb-2">Kitchen Note</label>
                         <textarea 
                            value={detailNote}
                            onChange={(e) => setDetailNote(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:border-brand-500 outline-none resize-none"
                            rows={2}
                            placeholder="Allergies, extra crispy, etc..."
                         />
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex gap-4 items-center">
                        <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-xl h-12">
                            <button onClick={() => setDetailQty(Math.max(1, detailQty - 1))} className="w-12 h-full flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 rounded-l-xl"><Minus size={18}/></button>
                            <span className="w-8 text-center font-bold text-lg">{detailQty}</span>
                            <button onClick={() => setDetailQty(detailQty + 1)} className="w-12 h-full flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 rounded-r-xl"><Plus size={18}/></button>
                        </div>
                        <button 
                            onClick={confirmDetailAddToCart}
                            className="flex-1 bg-brand-600 text-white h-12 rounded-xl font-bold hover:bg-brand-700 shadow-lg shadow-brand-500/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <span>Add {currency}{(
                                (detailProduct.price + detailModifiers.reduce((acc, m) => acc + m.price, 0)) * detailQty
                            ).toFixed(2)}</span>
                        </button>
                    </div>
                </div>
            </div>
        )}
      </Modal>

      {/* Confirmation Modal */}
      <Modal isOpen={!!confirmConfig} onClose={() => setConfirmConfig(null)} title={confirmConfig?.title || 'Confirm'}>
         <div className="space-y-6">
            {typeof confirmConfig?.message === 'string' ? (
                 <p className="text-slate-600 dark:text-slate-300 font-medium text-lg text-center py-4">{confirmConfig?.message}</p>
            ) : (
                 confirmConfig?.message
            )}
            
            <div className="flex gap-3">
                <button onClick={() => setConfirmConfig(null)} className="flex-1 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                    Cancel
                </button>
                <button onClick={handleConfirmAction} className="flex-1 py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 shadow-md transition-all active:scale-[0.98]">
                    Confirm
                </button>
            </div>
        </div>
      </Modal>

      {/* Payment Selection Modal */}
      <Modal isOpen={!!selectedOrderForPayment} onClose={() => setSelectedOrderForPayment(null)} title="Payment">
          {selectedOrderForPayment && (
              <div className="space-y-6">
                  <div className="text-center">
                      <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-500 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Banknote size={32} />
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 mb-1 text-sm font-medium">Total Amount Due</p>
                      <p className="text-3xl font-black text-slate-900 dark:text-white">{currency}{selectedOrderForPayment.totalAmount.toFixed(2)}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <button 
                          onClick={() => setPaymentMethod('card')}
                          className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === 'card' ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                      >
                          <CreditCard size={24} />
                          <span className="font-bold text-sm">Credit Card</span>
                      </button>
                      <button 
                          onClick={() => setPaymentMethod('cash')}
                          className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === 'cash' ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                      >
                          <Banknote size={24} />
                          <span className="font-bold text-sm">Cash</span>
                      </button>
                  </div>

                  <button 
                      onClick={handlePaymentAndPrint}
                      className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
                  >
                      {isPrinting ? 'Processing...' : `Pay ${currency}${selectedOrderForPayment.totalAmount.toFixed(2)}`}
                  </button>
              </div>
          )}
      </Modal>
      
      {/* Customer Modal (Create/Search) */}
      <Modal isOpen={showCustomerModal} onClose={() => setShowCustomerModal(false)} title="Customer Loyalty">
         <div className="space-y-6">
             {!activeCustomer ? (
                 <>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="tel" 
                            placeholder="Search by Phone Number" 
                            value={customerSearchPhone}
                            onChange={(e) => setCustomerSearchPhone(e.target.value)}
                            className="w-full pl-10 p-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl"
                        />
                        <button 
                            onClick={handleCustomerSearch}
                            disabled={customerSearchPhone.length < 3 || isSearchingCustomer}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-brand-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50"
                        >
                            {isSearchingCustomer ? '...' : 'Find'}
                        </button>
                    </div>

                    {foundCustomer ? (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-xl flex justify-between items-center animate-in fade-in">
                            <div>
                                <p className="font-bold text-slate-900 dark:text-white">{foundCustomer.name}</p>
                                <p className="text-sm text-green-600 dark:text-green-400 font-bold">{foundCustomer.points} Points</p>
                            </div>
                            <button onClick={handleSelectCustomer} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm">Select</button>
                        </div>
                    ) : (
                        customerSearchPhone.length > 3 && !isSearchingCustomer && (
                            <div className="text-center py-4">
                                <p className="text-slate-500 mb-4">Customer not found.</p>
                                <input 
                                    type="text" 
                                    placeholder="Enter Name" 
                                    value={customerNameInput}
                                    onChange={(e) => setCustomerNameInput(e.target.value)}
                                    className="w-full p-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl mb-3"
                                />
                                <button onClick={handleCreateCustomer} className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl">Register New Customer</button>
                            </div>
                        )
                    )}
                 </>
             ) : (
                 <div className="text-center space-y-4">
                     <div className="w-20 h-20 bg-brand-100 dark:bg-brand-900/30 rounded-full flex items-center justify-center mx-auto text-brand-600 dark:text-brand-400">
                         <User size={40} />
                     </div>
                     <div>
                         <h3 className="text-xl font-bold">{activeCustomer.name}</h3>
                         <p className="text-slate-500">{activeCustomer.phone}</p>
                     </div>
                     <div className="grid grid-cols-3 gap-4">
                         <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl">
                             <p className="text-xs text-slate-500 uppercase font-bold">Points</p>
                             <p className="text-xl font-black text-brand-600">{activeCustomer.points}</p>
                         </div>
                         <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl">
                             <p className="text-xs text-slate-500 uppercase font-bold">Visits</p>
                             <p className="text-xl font-black text-slate-700 dark:text-slate-300">{activeCustomer.visits}</p>
                         </div>
                         <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl">
                             <p className="text-xs text-slate-500 uppercase font-bold">Spent</p>
                             <p className="text-xl font-black text-green-600">{currency}{activeCustomer.totalSpent.toFixed(0)}</p>
                         </div>
                     </div>
                     <button onClick={() => { setActiveCustomer(null); setShowCustomerModal(false); }} className="text-red-500 font-bold text-sm">Detach Customer</button>
                 </div>
             )}
         </div>
      </Modal>

      {/* Cart Item Edit Modal */}
      <Modal isOpen={cartItemModalOpen} onClose={() => setCartItemModalOpen(false)} title="Edit Cart Item">
          <div className="space-y-6">
              {activeCartItemIndex !== null && cart[activeCartItemIndex] && (
                  <>
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                        <div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-lg">{cart[activeCartItemIndex].name}</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {currency}{(cart[activeCartItemIndex].price + cart[activeCartItemIndex].selectedModifiers.reduce((a, b) => a + b.price, 0)).toFixed(2)} each
                            </p>
                            {cart[activeCartItemIndex].selectedModifiers.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {cart[activeCartItemIndex].selectedModifiers.map(m => (
                                        <span key={m.id} className="text-[10px] bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-1.5 rounded text-slate-600 dark:text-slate-300">
                                            {m.name}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                        {/* Quantity Control */}
                        <div className="flex items-center bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 h-12 shadow-sm">
                            <button onClick={() => setActiveCartItemQty(Math.max(0, activeCartItemQty - 1))} className="w-12 h-full flex items-center justify-center text-slate-500 hover:text-red-500 hover:bg-slate-50 dark:hover:bg-slate-600 rounded-l-lg transition-colors">
                                <Minus size={20} />
                            </button>
                            <div className="w-12 h-full flex items-center justify-center font-bold text-lg text-slate-900 dark:text-white border-x border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800">
                                {activeCartItemQty}
                            </div>
                            <button onClick={() => setActiveCartItemQty(activeCartItemQty + 1)} className="w-12 h-full flex items-center justify-center text-slate-500 hover:text-green-500 hover:bg-slate-50 dark:hover:bg-slate-600 rounded-r-lg transition-colors">
                                <Plus size={20} />
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Item Note</label>
                        <textarea 
                            value={activeCartItemNote} 
                            onChange={(e) => setActiveCartItemNote(e.target.value)} 
                            className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none resize-none placeholder-slate-400"
                            placeholder="Special instructions..."
                            rows={3}
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button onClick={removeActiveCartItem} className="flex-1 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl font-bold hover:bg-red-100 dark:hover:bg-red-900/40 flex items-center justify-center gap-2 transition-colors">
                            <Trash2 size={18} /> Remove
                        </button>
                        <button onClick={saveCartItemChanges} className="flex-[2] py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
                            <CheckCheck size={18} /> Save Changes
                        </button>
                    </div>
                  </>
              )}
          </div>
      </Modal>

      {/* Logout Summary Modal */}
      <Modal isOpen={showLogoutSummary} onClose={() => { setShowLogoutSummary(false); setCurrentUser(null); }} title="Shift Summary">
          {sessionStats && (
              <div className="text-center space-y-6">
                  <div className="w-20 h-20 bg-brand-100 dark:bg-brand-900/30 rounded-full flex items-center justify-center mx-auto text-brand-600 dark:text-brand-400">
                      <CheckCheck size={40} />
                  </div>
                  <div>
                      <h3 className="text-2xl font-bold">Shift Ended</h3>
                      <p className="text-slate-500">Good job, {currentUser?.name}!</p>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                      <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl">
                          <p className="text-xs text-slate-500 uppercase font-bold">Sales</p>
                          <p className="text-xl font-black text-green-600">{currency}{sessionStats.sales.toFixed(2)}</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl">
                          <p className="text-xs text-slate-500 uppercase font-bold">Orders</p>
                          <p className="text-xl font-black text-slate-800 dark:text-white">{sessionStats.count}</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl">
                          <p className="text-xs text-slate-500 uppercase font-bold">Time</p>
                          <p className="text-xl font-black text-slate-800 dark:text-white">{sessionStats.duration}</p>
                      </div>
                  </div>
                  <button onClick={confirmLogout} className="w-full bg-slate-900 dark:bg-slate-700 text-white font-bold py-3 rounded-xl">Complete Logout</button>
              </div>
          )}
      </Modal>

      {/* Updated Product Form Modal with Modifiers */}
      <Modal isOpen={showProductModal} onClose={() => { setShowProductModal(false); setEditingProduct(null); }} title="Edit Item & Inventory">
          <div className="space-y-4">
               {/* Form Content ... */}
               <div>
                   <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">Item Name</label>
                   <input className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded p-2 text-slate-900 dark:text-white" value={editingProduct?.name || ''} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} placeholder="Burger" />
               </div>
               <div className="grid grid-cols-2 gap-4">
                   <div>
                       <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">Price ({currency})</label>
                       <input type="number" className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded p-2 text-slate-900 dark:text-white" value={editingProduct?.price || ''} onChange={e => setEditingProduct({...editingProduct, price: parseFloat(e.target.value)})} placeholder="0.00" />
                   </div>
                   <div>
                       <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">Stock</label>
                       <input type="number" className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded p-2 text-slate-900 dark:text-white" value={editingProduct?.stock || 0} onChange={e => setEditingProduct({...editingProduct, stock: parseInt(e.target.value)})} placeholder="0" />
                   </div>
               </div>
               <div>
                   <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">Description</label>
                   <textarea className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded p-2 text-slate-900 dark:text-white" value={editingProduct?.description || ''} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} placeholder="Delicious ingredients..." rows={2} />
               </div>
               <div>
                   <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">Category</label>
                   <select className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded p-2 text-slate-900 dark:text-white" value={editingProduct?.category || 'food'} onChange={e => setEditingProduct({...editingProduct, category: e.target.value as Category})}>
                       <option value="food">Food</option>
                       <option value="drink">Drink</option>
                       <option value="dessert">Dessert</option>
                   </select>
               </div>
               
               {/* Modifiers Section */}
               <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-2">
                   <h4 className="font-bold text-sm mb-2 text-slate-700 dark:text-slate-300">Modifiers / Extras</h4>
                   
                   {/* Add New Modifier */}
                   <div className="flex gap-2 mb-3">
                       <input 
                            className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded p-2 text-sm" 
                            placeholder="Name (e.g. Extra Cheese)"
                            value={newModifierName}
                            onChange={e => setNewModifierName(e.target.value)}
                       />
                       <input 
                            className="w-20 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded p-2 text-sm" 
                            placeholder={`${currency}0.00`}
                            type="number"
                            value={newModifierPrice}
                            onChange={e => setNewModifierPrice(e.target.value)}
                       />
                       <button onClick={handleAddModifier} className="bg-slate-200 dark:bg-slate-700 px-3 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-300"><Plus size={16}/></button>
                   </div>

                   {/* List Modifiers */}
                   <div className="space-y-2 max-h-32 overflow-y-auto bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                       {editingProduct?.modifiers && editingProduct.modifiers.length > 0 ? (
                           editingProduct.modifiers.map((mod) => (
                               <div key={mod.id} className="flex justify-between items-center text-sm p-1">
                                   <span className="text-slate-700 dark:text-slate-300">{mod.name}</span>
                                   <div className="flex items-center gap-2">
                                       <span className="font-mono text-xs opacity-70">+{currency}{mod.price.toFixed(2)}</span>
                                       <button onClick={() => removeModifier(mod.id)} className="text-red-400 hover:text-red-500"><X size={14}/></button>
                                   </div>
                               </div>
                           ))
                       ) : (
                           <p className="text-xs text-slate-400 text-center italic">No modifiers added.</p>
                       )}
                   </div>
               </div>

               <button onClick={handleSaveProduct} className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl mt-4 hover:bg-brand-700">Save Item</button>
          </div>
      </Modal>

      {/* ... (Add Employee Modal remains the same) */}
      <Modal isOpen={showAddEmployee} onClose={() => setShowAddEmployee(false)} title="Add New Employee">
           <div className="space-y-4">
               <div>
                   <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">Name</label>
                   <input className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded p-2 text-slate-900 dark:text-white" value={newEmployee.name || ''} onChange={e => setNewEmployee({...newEmployee, name: e.target.value})} placeholder="John Doe" />
               </div>
               <div>
                   <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">Login PIN (4 digits)</label>
                   <input className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded p-2 text-slate-900 dark:text-white" value={newEmployee.pin || ''} onChange={e => setNewEmployee({...newEmployee, pin: e.target.value})} placeholder="0000" maxLength={4} />
               </div>
               <div>
                   <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">Role</label>
                   <select className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded p-2 text-slate-900 dark:text-white" value={newEmployee.role} onChange={e => setNewEmployee({...newEmployee, role: e.target.value as Role})}>
                       <option value={Role.Waiter}>Waiter</option>
                       <option value={Role.Kitchen}>Kitchen</option>
                       <option value={Role.Admin}>Admin</option>
                   </select>
               </div>
               <div className="grid grid-cols-2 gap-4">
                   <div>
                       <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">Email (Optional)</label>
                       <input className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded p-2 text-slate-900 dark:text-white" value={newEmployee.email || ''} onChange={e => setNewEmployee({...newEmployee, email: e.target.value})} placeholder="@ieat.com" />
                   </div>
                   <div>
                       <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">Phone (Optional)</label>
                       <input className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded p-2 text-slate-900 dark:text-white" value={newEmployee.phone || ''} onChange={e => setNewEmployee({...newEmployee, phone: e.target.value})} placeholder="555-0123" />
                   </div>
               </div>
               <button onClick={handleAddEmployee} className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl mt-2">Create Employee</button>
           </div>
       </Modal>
    </div>
  );
}
