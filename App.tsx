// ... imports
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Wifi, WifiOff, Server, Tablet, ChefHat, Activity, RefreshCw, Trash2, Plus, Minus, 
  CreditCard, Banknote, Printer, CheckCircle, X, ShieldAlert, Bluetooth, 
  ShoppingBag, Truck, Utensils, Tag, Package, Barcode, TrendingUp, AlertTriangle, 
  FileText, Settings, Clock, CheckSquare, Square, Edit3, Users, LogOut, List, UserCheck, UserX, Filter,
  ArrowRight, Timer, DollarSign, ChevronRight, LayoutGrid, History, CheckCheck, PlayCircle, Grid, BrainCircuit, Flag, Info, User, Star, Search, UserPlus, Gift
} from 'lucide-react';
import { db, generateUUID } from './services/db';
import { analyzeOrderWithGemini, generateDailyInsight } from './services/geminiService';
import { Order, SyncStatus, Role, OrderItem, MenuItem, DiningOption, Category, Modifier, InventoryLog, Employee, TableConfig, Customer } from './types';
import { MOCK_TABLES } from './constants';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

// --- Constants ---
const TAX_RATE = 0.08; // 8%

const StatusBadge = ({ status }: { status: SyncStatus }) => {
  const colors = {
    [SyncStatus.Synced]: 'bg-green-100 text-green-700 border-green-200',
    [SyncStatus.Syncing]: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    [SyncStatus.Unsynced]: 'bg-slate-200 text-slate-600 border-slate-300',
    [SyncStatus.Failed]: 'bg-red-100 text-red-700 border-red-200',
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
    pending: 'bg-slate-100 text-slate-600 border-slate-200',
    cooking: 'bg-orange-50 text-orange-600 border-orange-200',
    ready: 'bg-green-100 text-green-700 border-green-200',
    paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm transition-all">
      {/* Mobile: Bottom Sheet style (rounded-t-2xl), Desktop: Rounded-2xl */}
      <div className={`bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full ${maxWidth} overflow-hidden animate-in slide-in-from-bottom duration-300 sm:fade-in sm:zoom-in flex flex-col max-h-[90vh] sm:max-h-[85vh]`}>
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <h3 className="font-bold text-lg text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-2 bg-slate-200 rounded-full hover:bg-slate-300 transition-colors">
            <X size={20} className="text-slate-600" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
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
  redeemPoints,
  setRedeemPoints
}: {
  cart: OrderItem[];
  activeTableOrder: Order | undefined;
  diningOption: DiningOption;
  setDiningOption: (opt: DiningOption) => void;
  openCartItemModal: (index: number) => void;
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
  redeemPoints: boolean;
  setRedeemPoints: (val: boolean) => void;
}) => {
  return (
    <div className="flex flex-col h-full bg-white">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 bg-slate-50">
            {/* Dining Options Segmented Control */}
            <div className="flex bg-slate-200 p-1 rounded-lg mb-4">
                {(['dine-in', 'take-out', 'delivery'] as DiningOption[]).map((opt) => (
                    <button
                        key={opt}
                        onClick={() => setDiningOption(opt)}
                        className={`flex-1 py-1.5 text-xs font-bold uppercase rounded-md transition-all ${diningOption === opt ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        {opt}
                    </button>
                ))}
            </div>

            {/* Customer Attachment */}
            <button 
                onClick={onCustomerClick}
                className={`w-full p-2.5 rounded-lg border-2 border-dashed flex items-center justify-between mb-2 transition-colors ${activeCustomer ? 'border-brand-300 bg-brand-50' : 'border-slate-300 hover:bg-slate-50'}`}
            >
                <div className="flex items-center gap-2">
                    <User size={16} className={activeCustomer ? 'text-brand-600' : 'text-slate-400'} />
                    {activeCustomer ? (
                        <div className="text-left">
                            <p className="text-xs font-bold text-slate-800">{activeCustomer.name}</p>
                            <p className="text-[10px] text-brand-600 font-bold flex items-center gap-1">
                                <Star size={10} fill="currentColor" /> {activeCustomer.points} Points
                            </p>
                        </div>
                    ) : (
                        <span className="text-xs font-bold text-slate-500">Add Customer (Optional)</span>
                    )}
                </div>
                {activeCustomer ? <Edit3 size={14} className="text-brand-400"/> : <Plus size={14} className="text-slate-400" />}
            </button>

            {/* Current Active Order Summary if appending */}
            {activeTableOrder && (
                <div className="mb-2 bg-blue-50 border border-blue-100 p-2 rounded-lg text-xs text-blue-800 flex justify-between items-center">
                    <span className="font-bold">Existing Order Total</span>
                    <span className="font-bold text-lg">${activeTableOrder.totalAmount.toFixed(2)}</span>
                </div>
            )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4">
                    <ShoppingBag size={48} strokeWidth={1.5} />
                    <p className="font-medium text-sm">Cart is empty</p>
                </div>
            ) : (
                cart.map((item, index) => (
                    <div 
                        key={index} 
                        onClick={() => openCartItemModal(index)}
                        className="flex justify-between items-start pb-3 border-b border-slate-50 last:border-0 last:pb-0 cursor-pointer group hover:bg-slate-50 transition-colors -mx-4 px-4"
                    >
                        <div className="flex gap-3">
                             <div className="w-6 h-6 bg-slate-100 rounded flex items-center justify-center text-xs font-bold text-slate-600 group-hover:bg-brand-100 group-hover:text-brand-600 transition-colors mt-0.5">
                                 {item.qty}
                             </div>
                             <div>
                                 <p className="text-sm font-bold text-slate-800 leading-tight">{item.name}</p>
                                 {item.selectedModifiers.length > 0 && (
                                     <div className="flex flex-wrap gap-1 mt-1">
                                         {item.selectedModifiers.map((m, i) => (
                                             <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                                                 {m.name}
                                             </span>
                                         ))}
                                     </div>
                                 )}
                                 {item.notes && (
                                     <p className="text-[10px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100 italic mt-1 inline-flex items-center gap-1">
                                        <Edit3 size={8} /> {item.notes}
                                     </p>
                                 )}
                             </div>
                        </div>
                        <span className="text-sm font-bold text-slate-700 mt-0.5">
                            ${((item.price + item.selectedModifiers.reduce((a, b) => a + b.price, 0)) * item.qty).toFixed(2)}
                        </span>
                    </div>
                ))
            )}
        </div>

        {/* Footer / Totals */}
        <div className="p-4 bg-slate-50 border-t border-slate-200">
             <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm text-slate-500">
                      <span>Subtotal</span>
                      <span className="font-medium text-slate-900">${cartSubtotal.toFixed(2)}</span>
                  </div>
                  
                  {/* Loyalty Redemption Option */}
                  {activeCustomer && activeCustomer.points >= 100 && (
                      <button 
                        onClick={() => setRedeemPoints(!redeemPoints)}
                        className={`w-full py-2 px-3 rounded-lg border text-xs font-bold flex justify-between items-center mb-2 transition-all ${redeemPoints ? 'bg-green-100 border-green-300 text-green-700' : 'bg-white border-slate-300 text-slate-500 hover:border-brand-300'}`}
                      >
                          <div className="flex items-center gap-2">
                             <div className={`w-4 h-4 rounded border flex items-center justify-center ${redeemPoints ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 bg-white'}`}>
                                 {redeemPoints && <CheckCircle size={12} />}
                             </div>
                             <span>Redeem 100 pts</span>
                          </div>
                          <span>-$10.00</span>
                      </button>
                  )}

                  {/* Discount Toggle */}
                  <div className="flex justify-between items-center text-sm text-slate-500">
                      <span className="flex items-center gap-2">Discount <span className="text-[10px] bg-slate-200 px-1 rounded">{cartDiscount}%</span></span>
                      <div className="flex gap-1">
                          {[0, 10, 20].map(d => (
                              <button 
                                key={d} 
                                onClick={() => setCartDiscount(d)}
                                className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold border ${cartDiscount === d ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                              >
                                  {d}
                              </button>
                          ))}
                      </div>
                  </div>
                  <div className="flex justify-between text-sm text-slate-500">
                      <span>Tax ({(TAX_RATE * 100)}%)</span>
                      <span className="font-medium text-slate-900">${cartTax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-end pt-2 border-t border-slate-200">
                      <span className="font-bold text-slate-800">Total</span>
                      <span className="font-bold text-2xl text-brand-600">${cartTotal.toFixed(2)}</span>
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
                        className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                     />
                     <Edit3 size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                 </div>

                 <div className="grid grid-cols-2 gap-3">
                     <button 
                        onClick={placeOrder}
                        disabled={cart.length === 0}
                        className="bg-white border border-slate-300 text-slate-700 font-bold py-3 rounded-xl text-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-[0.98] transition-transform"
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

const LoginScreen = ({ onLogin }: { onLogin: (user: Employee) => void }) => {
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
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
                <div className="bg-brand-600 p-8 text-center text-white">
                    <Server size={48} className="mx-auto mb-4 opacity-90" />
                    <h1 className="text-2xl font-bold">iEat POS</h1>
                    <p className="text-brand-100 mt-2">Enter your PIN to continue</p>
                </div>
                <div className="p-6">
                    <div className="mb-6 flex justify-center gap-4">
                        {[0, 1, 2, 3].map(i => (
                            <div key={i} className={`w-4 h-4 rounded-full border-2 ${i < pin.length ? 'bg-brand-500 border-brand-500' : 'border-slate-300'}`} />
                        ))}
                    </div>
                    {error && <div className="text-red-500 text-center text-sm font-bold mb-4">{error}</div>}
                    
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                            <button key={num} onClick={() => handleNumClick(num.toString())} className="h-16 rounded-xl bg-slate-50 hover:bg-slate-100 text-2xl font-bold text-slate-700 active:scale-95 transition-all">
                                {num}
                            </button>
                        ))}
                        <button onClick={handleClear} className="h-16 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold active:scale-95 transition-all flex items-center justify-center">C</button>
                        <button onClick={() => handleNumClick('0')} className="h-16 rounded-xl bg-slate-50 hover:bg-slate-100 text-2xl font-bold text-slate-700 active:scale-95 transition-all">0</button>
                        <button onClick={handleLogin} className="h-16 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold active:scale-95 transition-all flex items-center justify-center">
                            GO
                        </button>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-slate-400">Default Admin PIN: 1234</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function App() {
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
  
  // Waiter State
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
  const [redeemPoints, setRedeemPoints] = useState(false);
  
  // New: Multiple Table Selection
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');
  const [diningOption, setDiningOption] = useState<DiningOption>('dine-in');
  const [cartDiscount, setCartDiscount] = useState<number>(0); // Percentage 0-100
  const [cartNote, setCartNote] = useState<string>('');
  const [orderFilter, setOrderFilter] = useState<'all' | 'card' | 'cash'>('all'); // New: Order Filter

  // Modifiers Modal State
  const [modModalOpen, setModModalOpen] = useState(false);
  const [selectedProductForMod, setSelectedProductForMod] = useState<MenuItem | null>(null);
  const [tempModifiers, setTempModifiers] = useState<Modifier[]>([]);
  const [tempNote, setTempNote] = useState('');

  // Cart Item Options Modal State
  const [cartItemModalOpen, setCartItemModalOpen] = useState(false);
  const [activeCartItemIndex, setActiveCartItemIndex] = useState<number | null>(null);
  const [activeCartItemNote, setActiveCartItemNote] = useState('');
  const [activeCartItemQty, setActiveCartItemQty] = useState(1); // Local state for modal
  
  // Payment State
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<Order | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('card');
  const [isPrinterConnecting, setIsPrinterConnecting] = useState(false);
  const [isPrinterConnected, setIsPrinterConnected] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // Admin State
  const [dailyInsight, setDailyInsight] = useState<string | null>(null);
  const [showInsightModal, setShowInsightModal] = useState(false);
  const [adminTab, setAdminTab] = useState<'dashboard' | 'inventory' | 'reports' | 'team' | 'tables'>('dashboard');
  
  // Admin - Employee Form
  const [newEmployee, setNewEmployee] = useState<Partial<Employee>>({ role: Role.Waiter });
  const [showAddEmployee, setShowAddEmployee] = useState(false);

  // Admin - Inventory Product Form
  const [editingProduct, setEditingProduct] = useState<Partial<MenuItem> | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);

  // Admin - Table Form
  const [editingTable, setEditingTable] = useState<Partial<TableConfig> | null>(null);
  const [showTableModal, setShowTableModal] = useState(false);

  // Logout Summary Modal
  const [showLogoutSummary, setShowLogoutSummary] = useState(false);
  const [sessionStats, setSessionStats] = useState<{sales: number, count: number, duration: string} | null>(null);

  // Kitchen State
  const [kitchenTab, setKitchenTab] = useState<'pending' | 'finished'>('pending');

  const refreshData = useCallback(() => {
    setOrders(db.getOrders());
    setProducts(db.getProducts());
    setEmployees(db.getEmployees());
    setTables(db.getTables());
    setInventoryLogs(db.getInventoryLogs());
  }, []);

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
      if (!user.isCheckedIn) {
        await db.logAttendance(user.id, 'check-in');
      }
      setSessionStartTime(Date.now());
      setCurrentUser(user);
      setRole(user.role);
      setTimeout(refreshData, 100);
  };

  const handleLogoutClick = () => {
      const now = Date.now();
      const sessionDurationMs = now - sessionStartTime;
      const hours = Math.floor(sessionDurationMs / 3600000);
      const minutes = Math.floor((sessionDurationMs % 3600000) / 60000);
      const seconds = Math.floor(((sessionDurationMs % 3600000) % 60000) / 1000);
      const durationStr = `${hours}h ${minutes}m ${seconds}s`;

      const sessionOrders = orders.filter(o => 
          o.status === 'paid' && 
          o.paidAt && 
          o.paidAt >= sessionStartTime
      );
      
      const totalSales = sessionOrders.reduce((acc, curr) => acc + curr.totalAmount, 0);

      setSessionStats({
          sales: totalSales,
          count: sessionOrders.length,
          duration: durationStr
      });
      setShowLogoutSummary(true);
  };

  const confirmLogout = async () => {
      if (!currentUser) return;
      await db.logAttendance(currentUser.id, 'check-out');
      setShowLogoutSummary(false);
      setSessionStats(null);
      setCurrentUser(null);
      setRole(Role.Waiter);
      refreshData();
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

  // --- Cart Actions ---
  const initiateAddToCart = (item: MenuItem, forceCustomize = false) => {
      if (isReportMode) {
          setReportItem(item);
          setReportQty(1);
          setReportReason('waste');
          return;
      }

      if (forceCustomize || (item.modifiers && item.modifiers.length > 0)) {
          setSelectedProductForMod(item);
          setTempModifiers([]);
          setTempNote('');
          setModModalOpen(true);
      } else {
          addToCart(item, [], '');
      }
  };

  const confirmModifiers = () => {
      if (selectedProductForMod) {
          addToCart(selectedProductForMod, tempModifiers, tempNote);
          setModModalOpen(false);
          setSelectedProductForMod(null);
      }
  };

  const toggleModifier = (mod: Modifier) => {
      setTempModifiers(prev => {
          const exists = prev.find(m => m.id === mod.id);
          if (exists) return prev.filter(m => m.id !== mod.id);
          return [...prev, mod];
      });
  };

  const addToCart = (item: MenuItem, modifiers: Modifier[], note: string) => {
    const newItem: OrderItem = {
        ...item,
        qty: 1,
        selectedModifiers: modifiers,
        notes: note
    };

    setCart(prev => {
        const existingIdx = prev.findIndex(i => 
            i.id === item.id && 
            JSON.stringify(i.selectedModifiers.map(m=>m.id).sort()) === JSON.stringify(modifiers.map(m=>m.id).sort()) &&
            i.notes === note
        );

        if (existingIdx >= 0) {
            const newCart = [...prev];
            newCart[existingIdx].qty += 1;
            return newCart;
        }
        return [...prev, newItem];
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
    
    const loyaltyDiscount = redeemPoints ? 10.00 : 0;
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
          pointsRedeemed: redeemPoints ? 100 : 0
        };
        await db.createOrder(newOrder);
        resultOrder = newOrder;
    }

    setCart([]);
    setCartDiscount(0);
    setCartNote('');
    setActiveCustomer(null);
    setRedeemPoints(false);
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
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await db.markOrderAsPaid(selectedOrderForPayment.uuid, paymentMethod, Date.now());
    
    setIsPrinting(false);
    setSelectedOrderForPayment(null);
    setIsPrinterConnected(false);
    refreshData();
  };

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
              isCheckedIn: false
          });
          setNewEmployee({ role: Role.Waiter });
          setShowAddEmployee(false);
          refreshData();
      }
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
              } as MenuItem);
          }
          setShowProductModal(false);
          setEditingProduct(null);
          refreshData();
      }
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

  if (!currentUser) {
      return <LoginScreen onLogin={handleLogin} />;
  }
  
  const activeUser = employees.find(e => e.id === currentUser.id) || currentUser;

  const WaiterView = () => {
    const filteredProducts = activeCategory === 'all' 
        ? products 
        : products.filter(p => p.category === activeCategory);

    // Cart Calculations (Automatic recalculation based on cart state)
    const cartSubtotal = cart.reduce((acc, item) => {
        const modPrice = item.selectedModifiers.reduce((sum, m) => sum + m.price, 0);
        return acc + ((item.price + modPrice) * item.qty);
    }, 0);
    
    const loyaltyDiscount = redeemPoints ? 10.00 : 0;
    const percentageDiscountAmount = cartSubtotal * (cartDiscount / 100);
    const totalDiscount = percentageDiscountAmount + loyaltyDiscount;

    const cartTax = (Math.max(0, cartSubtotal - totalDiscount)) * TAX_RATE;
    const cartTotal = (Math.max(0, cartSubtotal - totalDiscount)) + cartTax;

    const totalCash = orders.filter(o => o.paymentMethod === 'cash' && o.status === 'paid').reduce((a, c) => a + c.totalAmount, 0);
    const totalCard = orders.filter(o => o.paymentMethod === 'card' && o.status === 'paid').reduce((a, c) => a + c.totalAmount, 0);
    
    const cartItemCount = cart.reduce((a,c) => a + c.qty, 0);

    const totalTables = tables.length;
    const currentOccupiedCount = tables.filter(t => occupiedTablesMap.has(t.name)).length;
    const occupancyRate = (currentOccupiedCount / totalTables) * 100;
    const isRestaurantFull = currentOccupiedCount >= totalTables;

    return (
    <div className="flex flex-col h-full lg:flex-row gap-4 p-4 max-w-7xl mx-auto w-full pb-24 lg:pb-6 relative">
      
      {/* Waiter View Header - Add Report Toggle */}
      {waiterViewMode === 'menu' && (
          <div className="absolute top-4 right-4 z-50 lg:hidden">
              <button 
                  onClick={() => setIsReportMode(!isReportMode)}
                  className={`p-2 rounded-full shadow-lg border-2 transition-all ${isReportMode ? 'bg-red-500 text-white border-red-600 animate-pulse' : 'bg-white text-slate-500 border-slate-200'}`}
                  title="Report Issue"
              >
                  <AlertTriangle size={20} />
              </button>
          </div>
      )}

      {/* Mobile Floating Cart Summary */}
      {waiterViewMode === 'menu' && cart.length > 0 && !isReportMode && (
          <div className="fixed bottom-20 left-4 right-4 z-30 lg:hidden">
              <button 
                  onClick={() => setWaiterViewMode('cart')}
                  className="w-full bg-brand-600 text-white rounded-xl shadow-xl shadow-brand-600/30 p-4 flex items-center justify-between animate-in slide-in-from-bottom duration-300"
              >
                  <div className="flex items-center gap-3">
                      <div className="bg-white/20 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                          {cartItemCount}
                      </div>
                      <span className="font-bold text-sm">View Cart</span>
                  </div>
                  <div className="flex items-center gap-2">
                      <span className="font-bold text-lg">${(cartTotal + (activeTableOrder?.totalAmount || 0)).toFixed(2)}</span>
                      <ChevronRight size={20} />
                  </div>
              </button>
          </div>
      )}

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 lg:hidden pb-safe">
          <div className="flex justify-around items-center h-16">
               <button onClick={() => setWaiterViewMode('menu')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${waiterViewMode === 'menu' ? 'text-brand-600' : 'text-slate-400'}`}>
                   <Utensils size={24} strokeWidth={waiterViewMode === 'menu' ? 2.5 : 2} />
                   <span className="text-[10px] font-bold">Menu</span>
               </button>
               <button onClick={() => setWaiterViewMode('cart')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 relative ${waiterViewMode === 'cart' ? 'text-brand-600' : 'text-slate-400'}`}>
                   <div className="relative">
                        <ShoppingBag size={24} strokeWidth={waiterViewMode === 'cart' ? 2.5 : 2} />
                        {cartItemCount > 0 && <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full border border-white">{cartItemCount}</span>}
                   </div>
                   <span className="text-[10px] font-bold">Cart</span>
               </button>
               <button onClick={() => setWaiterViewMode('orders')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${waiterViewMode === 'orders' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><List size={18} /> Orders</button>
          </div>
      </div>

      {waiterViewMode === 'menu' && (
      <>
        {/* Menu Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="hidden lg:flex w-full items-center justify-center gap-4 mb-4 shrink-0">
                <div className="flex w-full max-w-md bg-white p-1 rounded-xl border border-slate-200">
                    <button onClick={() => setWaiterViewMode('menu')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${waiterViewMode === 'menu' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><Utensils size={18} /> Menu</button>
                    <button onClick={() => setWaiterViewMode('orders')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all text-slate-500 hover:bg-slate-50`}><List size={18} /> Orders</button>
                </div>
                 <button onClick={() => setIsReportMode(!isReportMode)} className={`p-3 rounded-xl shadow-sm border transition-all flex items-center gap-2 font-bold text-sm ${isReportMode ? 'bg-red-50 text-red-600 border-red-200 animate-pulse ring-2 ring-red-500 ring-offset-2' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`} title="Report Issue"><AlertTriangle size={18} /> {isReportMode ? "Reporting Issue..." : "Report Issue"}</button>
            </div>
            
            {isReportMode && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-2 rounded-lg mb-3 flex justify-between items-center text-sm font-bold animate-in slide-in-from-top">
                    <span>⚠️ Select an item to report waste or stock issue.</span>
                    <button onClick={() => setIsReportMode(false)} className="underline text-xs">Cancel</button>
                </div>
            )}

            <div className="bg-white shadow-sm p-3 rounded-xl border border-slate-200 mb-3 sticky top-0 z-20">
                 <div className="flex justify-between items-center mb-2 px-1">
                     <div className="flex items-center gap-2">
                         <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><LayoutGrid size={14}/> Capacity</span>
                         <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${isRestaurantFull ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                            {isRestaurantFull ? <AlertTriangle size={10} /> : <CheckCircle size={10} />}
                            {currentOccupiedCount}/{totalTables} {isRestaurantFull && '(FULL)'}
                         </div>
                     </div>
                     <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-500 ${isRestaurantFull ? 'bg-red-500' : 'bg-emerald-500'}`} style={{width: `${occupancyRate}%`}}></div>
                     </div>
                 </div>

                 <div className="overflow-x-auto scrollbar-hide pb-2 px-1">
                    <div className="flex gap-3 w-max">
                        {tables.map(t => {
                            const order = occupiedTablesMap.get(t.name);
                            const isOccupied = !!order;
                            const isSelected = selectedTables.includes(t.name);
                            
                            let cardBase = "min-w-[110px] h-28 p-3 rounded-2xl flex flex-col justify-between transition-all duration-200 border-2 relative group";
                            let colors = "";
                            let icon = null;
                            let info = null;

                            if (isSelected) {
                                colors = "bg-slate-800 border-slate-800 text-white shadow-xl scale-105 z-10";
                                icon = <CheckCircle size={18} className="text-emerald-400" />;
                                info = (
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-medium opacity-70 uppercase tracking-wider">Current</span>
                                        <span className="text-xl font-bold">${(order?.totalAmount || 0).toFixed(2)}</span>
                                    </div>
                                );
                            } else if (isOccupied) {
                                colors = "bg-blue-50 border-blue-200 text-blue-700 hover:border-blue-300 hover:shadow-md";
                                icon = <Utensils size={18} className="text-blue-400" />;
                                info = (
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-medium opacity-60 uppercase tracking-wider">Total</span>
                                        <span className="text-lg font-bold text-blue-900">${order.totalAmount.toFixed(2)}</span>
                                    </div>
                                );
                            } else {
                                colors = "bg-emerald-50 border-emerald-100 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100";
                                icon = <User size={18} className="text-emerald-400" />;
                                info = (
                                    <div className="mt-auto">
                                        <span className="px-2 py-1 rounded-lg bg-emerald-100/50 text-xs font-bold uppercase tracking-wide">Free</span>
                                    </div>
                                );
                            }

                            return (
                                <button 
                                    key={t.id}
                                    onClick={() => handleTableToggle(t.name)}
                                    className={`${cardBase} ${colors}`}
                                >
                                    <div className="flex justify-between items-start w-full">
                                        <span className="font-bold text-lg">{t.name}</span>
                                        {icon}
                                    </div>
                                    {info}
                                </button>
                            );
                        })}
                    </div>
                 </div>
                 
                 {activeTableOrder && (
                    <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between items-center px-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Active Order: {selectedTables.join(', ')}</span>
                        <span className="text-slate-900 font-bold text-sm">
                            ${activeTableOrder.totalAmount.toFixed(2)}
                        </span>
                    </div>
                )}
            </div>

            <div className="mb-4 sticky top-[7.5rem] lg:top-0 z-10 bg-slate-50 pb-1">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {['all', 'food', 'drink', 'dessert'].map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat as Category | 'all')}
                            className={`px-5 py-2.5 rounded-full text-sm font-bold capitalize whitespace-nowrap transition-all shadow-sm ${
                                activeCategory === cat 
                                ? 'bg-brand-600 text-white shadow-brand-500/30 transform scale-105' 
                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map(item => {
                const isOutOfStock = item.stock <= 0;
                const isLowStock = item.stock > 0 && item.stock <= item.lowStockThreshold;

                return (
                <div 
                key={item.id}
                onClick={() => initiateAddToCart(item)}
                className={`
                    group relative bg-white rounded-2xl shadow-sm border transition-all active:scale-[0.98] overflow-hidden cursor-pointer
                    ${isReportMode ? 'border-red-300 ring-2 ring-transparent hover:ring-red-400' : isOutOfStock ? 'opacity-60 cursor-not-allowed border-slate-100 bg-slate-50' : 'border-slate-100 hover:border-brand-500 hover:shadow-md'}
                    flex flex-row sm:flex-col items-stretch h-24 sm:h-auto
                `}
                >
                <div className="w-24 sm:w-full h-full sm:h-36 shrink-0 bg-slate-100 relative overflow-hidden">
                    {item.image ? (
                        <img src={item.image} alt={item.name} className={`w-full h-full object-cover transition-transform duration-500 ${!isOutOfStock && 'group-hover:scale-110'} ${isOutOfStock ? 'grayscale' : ''}`} />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 font-bold text-xl sm:text-4xl">
                            {item.name.charAt(0)}
                        </div>
                    )}
                    {isOutOfStock && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="text-white border border-white px-2 py-0.5 text-[10px] font-bold rounded uppercase rotate-[-10deg]">Sold Out</span>
                        </div>
                    )}
                    {isLowStock && (
                        <div className="absolute top-1 left-1 bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                            Low: {item.stock}
                        </div>
                    )}
                    {isReportMode && (
                        <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                             <AlertTriangle className="text-red-600 drop-shadow-md" size={32} />
                        </div>
                    )}
                    {!isOutOfStock && !isReportMode && (
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                initiateAddToCart(item, true);
                            }}
                            className="absolute top-2 right-2 w-8 h-8 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center text-slate-600 hover:text-brand-600 hover:bg-white shadow-sm z-10 transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                            title="Customize (Add Notes)"
                        >
                            <Edit3 size={14} />
                        </button>
                    )}
                </div>

                <div className="p-3 flex-1 min-w-0 flex flex-col justify-between sm:justify-start h-full">
                    <div>
                        <div className="flex justify-between items-start w-full">
                            <h3 className="font-bold text-slate-800 text-left text-sm leading-tight line-clamp-2">{item.name}</h3>
                        </div>
                        {item.description && <p className="text-[10px] text-slate-400 mt-1 line-clamp-1 text-left hidden sm:block">{item.description}</p>}
                    </div>
                    
                    <div className="flex justify-between items-end w-full pt-1 sm:pt-2">
                        <p className={`font-bold ${isOutOfStock ? 'text-slate-400' : 'text-brand-700'}`}>${item.price.toFixed(2)}</p>
                        {item.modifiers && item.modifiers.length > 0 ? (
                            <span className="text-[9px] bg-slate-100 px-2 py-1 rounded-md text-slate-500 font-semibold uppercase tracking-wide">Custom</span>
                        ) : (
                            <div className="w-6 h-6 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center sm:hidden">
                                <Plus size={14} strokeWidth={3} />
                            </div>
                        )}
                    </div>
                </div>
                </div>
            )})}
            </div>
        </div>
      </>
      )}

      {/* Mobile Cart View */}
// ... rest of file (Cart View and below) remains the same