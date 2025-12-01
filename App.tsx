
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Wifi, WifiOff, Server, Tablet, ChefHat, Activity, RefreshCw, Trash2, Plus, Minus, 
  CreditCard, Banknote, Printer, CheckCircle, X, ShieldAlert, Bluetooth, 
  ShoppingBag, Truck, Utensils, Tag, Package, Barcode, TrendingUp, AlertTriangle, 
  FileText, Settings, Clock, CheckSquare, Square, Edit3, Users, LogOut, List
} from 'lucide-react';
import { db } from './services/db';
import { analyzeOrderWithGemini, generateDailyInsight } from './services/geminiService';
import { Order, SyncStatus, Role, OrderItem, MenuItem, DiningOption, Category, Modifier, InventoryLog, Employee } from './types';
import { MOCK_TABLES } from './constants';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

// --- Constants ---
const TAX_RATE = 0.08; // 8%

// --- Components ---

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

const Modal = ({ isOpen, onClose, children, title, size = 'md' }: { isOpen: boolean; onClose: () => void; children?: React.ReactNode; title: string, size?: 'md' | 'lg' }) => {
  if (!isOpen) return null;
  const maxWidth = size === 'lg' ? 'max-w-2xl' : 'max-w-md';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidth} overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]`}>
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <h3 className="font-bold text-lg text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- Login Screen ---
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

// --- Main App ---

export default function App() {
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  
  const [role, setRole] = useState<Role>(Role.Waiter);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<MenuItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Waiter State
  const [waiterViewMode, setWaiterViewMode] = useState<'menu' | 'orders'>('menu');
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>(MOCK_TABLES[0]);
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');
  const [diningOption, setDiningOption] = useState<DiningOption>('dine-in');
  const [cartDiscount, setCartDiscount] = useState<number>(0); // Percentage 0-100
  const [cartNote, setCartNote] = useState<string>('');
  
  // Modifiers Modal State
  const [modModalOpen, setModModalOpen] = useState(false);
  const [selectedProductForMod, setSelectedProductForMod] = useState<MenuItem | null>(null);
  const [tempModifiers, setTempModifiers] = useState<Modifier[]>([]);
  const [tempNote, setTempNote] = useState('');

  // Cart Item Options Modal State
  const [cartItemModalOpen, setCartItemModalOpen] = useState(false);
  const [activeCartItemIndex, setActiveCartItemIndex] = useState<number | null>(null);
  const [activeCartItemNote, setActiveCartItemNote] = useState('');
  
  // Payment State
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<Order | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('card');
  const [isPrinterConnecting, setIsPrinterConnecting] = useState(false);
  const [isPrinterConnected, setIsPrinterConnected] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // Admin State
  const [dailyInsight, setDailyInsight] = useState<string | null>(null);
  const [adminTab, setAdminTab] = useState<'dashboard' | 'inventory' | 'reports' | 'team'>('dashboard');
  
  // Admin - Employee Form
  const [newEmployee, setNewEmployee] = useState<Partial<Employee>>({ role: Role.Waiter });
  const [showAddEmployee, setShowAddEmployee] = useState(false);

  // --- Core Sync Logic ---
  
  const refreshData = useCallback(() => {
    setOrders(db.getOrders());
    setProducts(db.getProducts());
    setEmployees(db.getEmployees());
  }, []);

  useEffect(() => {
    if (currentUser) {
        refreshData();
        const interval = setInterval(refreshData, 2000);
        return () => clearInterval(interval);
    }
  }, [refreshData, currentUser]);

  const toggleNetwork = () => setIsOnline(prev => !prev);

  // Sync Engine
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

  // --- Login/Logout ---
  const handleLogin = (user: Employee) => {
      setCurrentUser(user);
      setRole(user.role);
  };

  const handleLogout = () => {
      setCurrentUser(null);
      setRole(Role.Waiter);
  };

  // --- Cart Actions ---

  const initiateAddToCart = (item: MenuItem) => {
      if (item.modifiers && item.modifiers.length > 0) {
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
        // Try to find identical item (same id, same modifiers)
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

  const updateCartQty = (index: number, delta: number) => {
    setCart(prev => {
      const newCart = [...prev];
      const item = newCart[index];
      const newQty = item.qty + delta;
      if (newQty <= 0) {
          return newCart.filter((_, i) => i !== index);
      }
      newCart[index] = { ...item, qty: newQty };
      return newCart;
    });
  };

  const openCartItemModal = (index: number) => {
      setActiveCartItemIndex(index);
      setActiveCartItemNote(cart[index].notes || '');
      setCartItemModalOpen(true);
  };

  const saveCartItemChanges = () => {
      if (activeCartItemIndex !== null) {
          setCart(prev => {
              const newCart = [...prev];
              newCart[activeCartItemIndex].notes = activeCartItemNote;
              return newCart;
          });
          setCartItemModalOpen(false);
          setActiveCartItemIndex(null);
      }
  };

  const removeActiveCartItem = () => {
      if (activeCartItemIndex !== null) {
          updateCartQty(activeCartItemIndex, -999); // Triggers removal logic in updateCartQty
          setCartItemModalOpen(false);
          setActiveCartItemIndex(null);
      }
  };

  const placeOrder = async () => {
    if (cart.length === 0) return;

    const subtotal = cart.reduce((acc, item) => {
        const modPrice = item.selectedModifiers.reduce((sum, m) => sum + m.price, 0);
        return acc + ((item.price + modPrice) * item.qty);
    }, 0);

    const discountAmount = subtotal * (cartDiscount / 100);
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = taxableAmount * TAX_RATE;
    const totalAmount = taxableAmount + taxAmount;

    const newOrder: Order = {
      uuid: crypto.randomUUID(),
      tableNo: diningOption === 'dine-in' ? selectedTable : undefined,
      items: [...cart],
      subtotal,
      discount: discountAmount,
      tax: taxAmount,
      totalAmount,
      status: 'pending',
      diningOption,
      syncStatus: SyncStatus.Unsynced,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      opLogId: crypto.randomUUID(),
      customerNotes: cartNote
    };

    await db.createOrder(newOrder);
    setCart([]);
    setCartDiscount(0);
    setCartNote('');
    refreshData();
  };

  // --- Payment & Printer ---
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
    await db.updateOrder(selectedOrderForPayment.uuid, {
      status: 'paid',
      paymentMethod: paymentMethod,
      paidAt: Date.now(),
      syncStatus: SyncStatus.Unsynced
    });
    setIsPrinting(false);
    setSelectedOrderForPayment(null);
    setIsPrinterConnected(false);
    refreshData();
  };

  const handleGenerateInsight = async () => {
      const insight = await generateDailyInsight(orders);
      setDailyInsight(insight);
  }

  // --- Employee Actions ---
  const handleAddEmployee = async () => {
      if (newEmployee.name && newEmployee.pin) {
          await db.addEmployee({
              id: crypto.randomUUID(),
              name: newEmployee.name,
              pin: newEmployee.pin,
              email: newEmployee.email || '',
              phone: newEmployee.phone || '',
              role: newEmployee.role as Role
          });
          setNewEmployee({ role: Role.Waiter });
          setShowAddEmployee(false);
          refreshData();
      }
  };

  // --- Views ---

  if (!currentUser) {
      return <LoginScreen onLogin={handleLogin} />;
  }

  const WaiterView = () => {
    const filteredProducts = activeCategory === 'all' 
        ? products 
        : products.filter(p => p.category === activeCategory);

    const cartSubtotal = cart.reduce((acc, item) => {
        const modPrice = item.selectedModifiers.reduce((sum, m) => sum + m.price, 0);
        return acc + ((item.price + modPrice) * item.qty);
    }, 0);
    const cartTax = (cartSubtotal * (1 - cartDiscount/100)) * TAX_RATE;
    const cartTotal = (cartSubtotal * (1 - cartDiscount/100)) + cartTax;

    return (
    <div className="flex flex-col h-full lg:flex-row gap-4 p-4 max-w-7xl mx-auto w-full">
      {/* Waiter Navigation (Mobile) */}
      <div className="lg:hidden flex gap-2 mb-2">
          <button 
             onClick={() => setWaiterViewMode('menu')}
             className={`flex-1 py-2 rounded-lg font-bold text-sm ${waiterViewMode === 'menu' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 border'}`}
          >
              Menu
          </button>
          <button 
             onClick={() => setWaiterViewMode('orders')}
             className={`flex-1 py-2 rounded-lg font-bold text-sm ${waiterViewMode === 'orders' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 border'}`}
          >
              Orders & Bill
          </button>
      </div>

      {waiterViewMode === 'menu' && (
      <>
        {/* Menu Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* Sticky Header (Mobile Only) */}
            <div className="lg:hidden sticky top-0 z-30 bg-white/95 backdrop-blur shadow-sm p-3 rounded-lg border border-slate-200 mb-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                     <span className="text-xs font-bold text-slate-500 uppercase">Table</span>
                     <select 
                        value={selectedTable} 
                        onChange={(e) => setSelectedTable(e.target.value)}
                        className="bg-slate-100 border-none rounded text-sm font-bold text-slate-900 py-1 pl-2 pr-6"
                     >
                         {MOCK_TABLES.map(t => <option key={t} value={t}>{t}</option>)}
                     </select>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Cart Total</span>
                    <span className="text-brand-600 font-black text-lg">${cartTotal.toFixed(2)}</span>
                </div>
            </div>

            {/* Filters */}
            <div className="mb-4 space-y-3">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {['all', 'food', 'drink', 'dessert'].map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat as Category | 'all')}
                            className={`px-4 py-2 rounded-full text-sm font-semibold capitalize whitespace-nowrap transition-all ${
                                activeCategory === cat 
                                ? 'bg-brand-600 text-white shadow-brand-500/30 shadow-md' 
                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
                
                {/* Desktop Table Selector */}
                <div className="hidden lg:flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 w-fit">
                    <span className="text-xs font-bold text-slate-500 uppercase px-1">Table</span>
                    <div className="h-4 w-px bg-slate-200"></div>
                    <div className="flex gap-1 overflow-x-auto max-w-[300px] scrollbar-hide">
                        {MOCK_TABLES.map(t => (
                            <button 
                                key={t}
                                onClick={() => setSelectedTable(t)}
                                className={`w-8 h-8 rounded-md text-xs font-bold flex items-center justify-center transition-colors ${
                                    selectedTable === t ? 'bg-slate-800 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            
            {/* Product List/Grid */}
            {/* Mobile: 1 col (List style), Tablet/Desktop: Grid style */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto pb-24 lg:pb-0 pr-1">
            {filteredProducts.map(item => {
                const isOutOfStock = item.stock <= 0;
                const isLowStock = item.stock > 0 && item.stock <= item.lowStockThreshold;

                return (
                <button 
                key={item.id}
                onClick={() => initiateAddToCart(item)}
                disabled={isOutOfStock}
                className={`
                    group relative bg-white rounded-xl shadow-sm border transition-all active:scale-[0.98] overflow-hidden
                    ${isOutOfStock ? 'opacity-60 cursor-not-allowed border-slate-100 bg-slate-50' : 'border-slate-100 hover:border-brand-500 hover:shadow-md'}
                    /* Mobile: Flex Row layout */
                    flex flex-row sm:flex-col items-center sm:items-start h-24 sm:h-auto
                `}
                >
                {/* Image Container */}
                <div className="w-24 sm:w-full h-24 sm:h-32 shrink-0 bg-slate-100 relative overflow-hidden">
                    {item.image ? (
                        <img src={item.image} alt={item.name} className={`w-full h-full object-cover transition-transform duration-500 ${!isOutOfStock && 'group-hover:scale-110'} ${isOutOfStock ? 'grayscale' : ''}`} />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 font-bold text-xl sm:text-4xl">
                            {item.name.charAt(0)}
                        </div>
                    )}
                    
                    {/* Out of Stock Overlay */}
                    {isOutOfStock && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="text-white border border-white px-2 py-0.5 text-[10px] font-bold rounded uppercase rotate-[-10deg]">Sold Out</span>
                        </div>
                    )}
                    {/* Low Stock Badge */}
                    {isLowStock && (
                        <div className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-orange-500 text-white text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                            Low: {item.stock}
                        </div>
                    )}
                </div>

                {/* Content Container */}
                <div className="p-3 flex-1 w-full min-w-0 flex flex-col justify-center sm:justify-start h-full">
                    <div className="flex justify-between items-start w-full">
                        <h3 className="font-semibold text-slate-800 text-left text-sm line-clamp-2 leading-tight">{item.name}</h3>
                    </div>
                    {item.description && <p className="text-[10px] text-slate-400 mt-1 line-clamp-1 text-left hidden sm:block">{item.description}</p>}
                    
                    <div className="flex justify-between items-center mt-auto w-full pt-1 sm:pt-2">
                        <p className={`font-bold ${isOutOfStock ? 'text-slate-400' : 'text-brand-700'}`}>${item.price.toFixed(2)}</p>
                        {item.modifiers && item.modifiers.length > 0 && (
                            <span className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 uppercase tracking-wide">Custom</span>
                        )}
                    </div>
                </div>
                </button>
            )})}
            </div>
        </div>

        {/* Cart Sidebar (Visible on Desktop) */}
        <div className="hidden lg:flex w-96 bg-white rounded-2xl shadow-xl border border-slate-200 flex-col h-[calc(100vh-8rem)]">
            <CartPanel 
                cart={cart}
                diningOption={diningOption} 
                setDiningOption={setDiningOption}
                openCartItemModal={openCartItemModal}
                cartSubtotal={cartSubtotal}
                cartDiscount={cartDiscount}
                setCartDiscount={setCartDiscount}
                cartTax={cartTax}
                cartTotal={cartTotal}
                cartNote={cartNote}
                setCartNote={setCartNote}
                placeOrder={placeOrder}
            />
        </div>
      </>
      )}

      {/* Orders & Bill View */}
      {waiterViewMode === 'orders' && (
          <div className="flex-1 overflow-y-auto bg-slate-100 p-2 rounded-lg">
             <div className="flex justify-between items-center mb-4">
                 <h2 className="text-lg font-bold text-slate-800">Active Orders</h2>
                 {/* Desktop switch button back to menu could go here */}
                 <button onClick={() => setWaiterViewMode('menu')} className="lg:hidden text-brand-600 text-sm font-bold">Close</button>
             </div>
             <div className="space-y-3">
                 {orders.filter(o => o.status !== 'paid').map(order => (
                     <div key={order.uuid} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                         <div className="flex justify-between items-center mb-2">
                             <span className="font-bold text-lg">
                                 {order.diningOption === 'dine-in' ? `Table ${order.tableNo}` : order.diningOption.toUpperCase()}
                             </span>
                             <span className="text-xs text-slate-400">#{order.uuid.slice(0,5)}</span>
                         </div>
                         <div className="text-sm text-slate-600 mb-3">
                             {order.items.map(i => `${i.qty}x ${i.name}`).join(', ')}
                         </div>
                         <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                             <span className="font-bold text-xl">${order.totalAmount.toFixed(2)}</span>
                             <button 
                                onClick={() => setSelectedOrderForPayment(order)}
                                className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-800"
                             >
                                 Pay / Bill
                             </button>
                         </div>
                     </div>
                 ))}
                 {orders.filter(o => o.status !== 'paid').length === 0 && (
                     <div className="text-center text-slate-400 py-10">No active orders</div>
                 )}
             </div>
          </div>
      )}
    </div>
    );
  };

  const CartPanel = ({ cart, diningOption, setDiningOption, openCartItemModal, cartSubtotal, cartDiscount, setCartDiscount, cartTax, cartTotal, cartNote, setCartNote, placeOrder }: any) => (
      <>
        {/* Dining Option Toggle */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 rounded-t-2xl grid grid-cols-3 gap-1">
            <button onClick={() => setDiningOption('dine-in')} className={`flex flex-col items-center py-2 rounded-lg text-xs font-medium transition-colors ${diningOption === 'dine-in' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>
                <Utensils size={16} className="mb-1"/> Dine In
            </button>
            <button onClick={() => setDiningOption('take-out')} className={`flex flex-col items-center py-2 rounded-lg text-xs font-medium transition-colors ${diningOption === 'take-out' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>
                <ShoppingBag size={16} className="mb-1"/> Take Out
            </button>
            <button onClick={() => setDiningOption('delivery')} className={`flex flex-col items-center py-2 rounded-lg text-xs font-medium transition-colors ${diningOption === 'delivery' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>
                <Truck size={16} className="mb-1"/> Delivery
            </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 italic text-sm">
              <ShoppingBag size={32} className="mb-2 opacity-20" />
              <span>Start adding items</span>
            </div>
          ) : (
            cart.map((item: any, idx: number) => (
              <div 
                key={idx} 
                onClick={() => openCartItemModal(idx)}
                className="flex flex-col bg-slate-50 p-3 rounded-lg border border-slate-100 relative cursor-pointer hover:bg-slate-100 transition-colors active:scale-[0.99]"
              >
                 <div className="flex justify-between items-start mb-1">
                     <div className="flex-1 min-w-0 mr-2">
                        <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                          {item.name}
                          <Edit3 size={10} className="text-slate-400" />
                        </p>
                        <p className="text-xs text-slate-500">${item.price.toFixed(2)}</p>
                     </div>
                     <div className="flex items-center gap-2">
                        <div className="flex items-center bg-white border border-slate-200 rounded-md h-7 shadow-sm">
                            <div className="w-6 h-full flex items-center justify-center text-slate-500 bg-slate-50 border-r border-slate-100 text-xs font-bold">x{item.qty}</div>
                        </div>
                     </div>
                 </div>
                 
                 {(item.selectedModifiers.length > 0 || item.notes) && (
                     <div className="text-[10px] text-slate-500 mt-1 pl-2 border-l-2 border-slate-200">
                         {item.selectedModifiers.map((m: any, mi: number) => (
                             <div key={mi} className="flex justify-between">
                                 <span>+ {m.name}</span>
                                 <span>${m.price.toFixed(2)}</span>
                             </div>
                         ))}
                         {item.notes && <div className="italic text-slate-400 mt-0.5">"{item.notes}"</div>}
                     </div>
                 )}
              </div>
            ))
          )}
        </div>

        {/* Footer Calculations */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl space-y-2">
            <div className="flex justify-between text-xs text-slate-500">
                <span>Subtotal</span>
                <span>${cartSubtotal.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between items-center text-xs text-slate-500">
                <span className="flex items-center gap-1">
                    Discount 
                    <input 
                        type="number" 
                        min="0" max="100"
                        value={cartDiscount}
                        onChange={(e) => setCartDiscount(Number(e.target.value))}
                        className="w-10 bg-white border border-slate-200 rounded px-1 text-center"
                    />
                    %
                </span>
                <span className="text-red-400">-${(cartSubtotal * cartDiscount / 100).toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-xs text-slate-500">
                <span>Tax (8%)</span>
                <span>${cartTax.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="font-bold text-slate-800">Total</span>
                <span className="text-xl font-bold text-brand-700">${cartTotal.toFixed(2)}</span>
            </div>
            
            <input 
                type="text"
                placeholder="Order notes (allergies, etc.)"
                value={cartNote}
                onChange={(e) => setCartNote(e.target.value)}
                className="w-full text-xs bg-white border border-slate-200 rounded p-2 focus:outline-none focus:border-brand-500"
            />

            <button
                onClick={placeOrder}
                disabled={cart.length === 0}
                className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold shadow-brand-500/20 shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
                Send Order
            </button>
        </div>
      </>
  );

  const AdminView = () => {
      // Sub-Views
      const Dashboard = () => {
          const revenue = orders.reduce((a,b) => a + b.totalAmount, 0);
          const totalOrders = orders.length;
          const lowStockCount = products.filter(p => p.stock <= p.lowStockThreshold).length;

          const chartData = orders.slice(0, 20).map(o => ({
              name: `T${o.tableNo || 'O'}`,
              amount: o.totalAmount,
          }));

          return (
            <div className="space-y-6 animate-in fade-in">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-slate-500 text-xs font-bold uppercase tracking-wide">Revenue</p>
                                <h3 className="text-2xl font-bold text-slate-900 mt-1">${revenue.toFixed(2)}</h3>
                            </div>
                            <div className="p-2 bg-green-50 text-green-600 rounded-lg"><Banknote size={20} /></div>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                         <div className="flex justify-between items-start">
                            <div>
                                <p className="text-slate-500 text-xs font-bold uppercase tracking-wide">Orders</p>
                                <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalOrders}</h3>
                            </div>
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><ShoppingBag size={20} /></div>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                         <div className="flex justify-between items-start">
                            <div>
                                <p className="text-slate-500 text-xs font-bold uppercase tracking-wide">Low Stock</p>
                                <h3 className={`text-2xl font-bold mt-1 ${lowStockCount > 0 ? 'text-red-600' : 'text-slate-900'}`}>{lowStockCount} Items</h3>
                            </div>
                            <div className={`p-2 rounded-lg ${lowStockCount > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-400'}`}><AlertTriangle size={20} /></div>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                        <div>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-wide">AI Strategy</p>
                            <p className="text-xs text-slate-700 italic mt-1 line-clamp-2">{dailyInsight || "No insight yet"}</p>
                        </div>
                        <button onClick={handleGenerateInsight} className="text-xs text-brand-600 font-semibold self-start hover:underline mt-2">Generate</button>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h4 className="font-bold text-slate-800 mb-4">Recent Sales</h4>
                        <div className="h-64">
                             <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                                    <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                    <Bar dataKey="amount" fill="#0ea5e9" radius={[4, 4, 4, 4]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-slate-100 bg-slate-50">
                            <h4 className="font-bold text-slate-800">Active Orders</h4>
                        </div>
                        <div className="overflow-y-auto flex-1 p-0">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-500 bg-white uppercase sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3">Order</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {orders.slice(0, 6).map(o => (
                                        <tr key={o.uuid}>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-slate-900">#{o.uuid.slice(0,5)}</div>
                                                <div className="text-xs text-slate-500">{new Date(o.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${o.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-700'}`}>{o.status}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium">${o.totalAmount.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
          );
      };

      const Inventory = () => (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
              <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                          <tr>
                              <th className="p-4">Item Name</th>
                              <th className="p-4">Category</th>
                              <th className="p-4">Price / Cost</th>
                              <th className="p-4">Stock Level</th>
                              <th className="p-4 text-center">Status</th>
                              <th className="p-4 text-right">Actions</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {products.map(p => (
                              <tr key={p.id} className="hover:bg-slate-50 group">
                                  <td className="p-4 font-medium text-slate-900">{p.name}</td>
                                  <td className="p-4 text-slate-500 capitalize">{p.category}</td>
                                  <td className="p-4 text-slate-600">
                                      <div className="flex flex-col">
                                        <span>${p.price.toFixed(2)}</span>
                                        <span className="text-xs text-slate-400">Cost: ${p.cost.toFixed(2)}</span>
                                      </div>
                                  </td>
                                  <td className="p-4">
                                      <div className="flex items-center gap-3">
                                          <span className="font-mono text-slate-700 w-8">{p.stock}</span>
                                          <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                              <div 
                                                className={`h-full rounded-full ${p.stock <= p.lowStockThreshold ? 'bg-red-500' : 'bg-green-500'}`} 
                                                style={{ width: `${Math.min((p.stock / 50) * 100, 100)}%` }} 
                                              />
                                          </div>
                                      </div>
                                  </td>
                                  <td className="p-4 text-center">
                                      {p.stock <= 0 ? (
                                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">Out of Stock</span>
                                      ) : p.stock <= p.lowStockThreshold ? (
                                          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-bold">Low Stock</span>
                                      ) : (
                                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">OK</span>
                                      )}
                                  </td>
                                  <td className="p-4 text-right">
                                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button 
                                            onClick={() => db.adjustStock(p.id, p.stock + 10, 'restock').then(refreshData)}
                                            className="p-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100" 
                                            title="Quick Restock (+10)"
                                          >
                                              <Package size={16} />
                                          </button>
                                          <button className="p-2 bg-slate-100 text-slate-600 rounded hover:bg-slate-200" title="Print Barcode">
                                              <Barcode size={16} />
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      );

      const Reports = () => {
          const profits = products.map(p => ({
              name: p.name,
              margin: p.price - p.cost,
              marginPercent: ((p.price - p.cost) / p.price) * 100
          })).sort((a,b) => b.margin - a.margin);

          return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h4 className="font-bold text-slate-800 mb-4">Profit Margin Analysis</h4>
                    <div className="space-y-4">
                        {profits.slice(0, 5).map((p, i) => (
                            <div key={i}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="font-medium text-slate-700">{p.name}</span>
                                    <span className="text-green-600 font-bold">${p.margin.toFixed(2)} ({p.marginPercent.toFixed(0)}%)</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2">
                                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${p.marginPercent}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
                    <FileText size={48} className="text-slate-300 mb-4" />
                    <h3 className="text-lg font-bold text-slate-700">Detailed Report Generation</h3>
                    <p className="text-sm text-slate-500 mb-6 max-w-xs">Download full CSV reports for accounting and tax purposes.</p>
                    <button className="px-6 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800">Export Sales Data</button>
                </div>
            </div>
          );
      };

      const Team = () => (
          <div className="animate-in fade-in">
             <div className="flex justify-between items-center mb-6">
                 <h3 className="text-lg font-bold text-slate-700">Employee Management</h3>
                 <button onClick={() => setShowAddEmployee(true)} className="bg-brand-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2">
                     <Plus size={16} /> Add Employee
                 </button>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {employees.map(emp => (
                     <div key={emp.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-start">
                         <div>
                             <h4 className="font-bold text-slate-800">{emp.name}</h4>
                             <p className="text-xs text-slate-500 font-mono mb-2">PIN: {emp.pin}</p>
                             <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded bg-slate-100 text-slate-600`}>{emp.role}</span>
                             {emp.email && <p className="text-xs text-slate-500 mt-2">{emp.email}</p>}
                         </div>
                         <button onClick={() => db.deleteEmployee(emp.id).then(refreshData)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg">
                             <Trash2 size={16} />
                         </button>
                     </div>
                 ))}
             </div>
             
             <Modal isOpen={showAddEmployee} onClose={() => setShowAddEmployee(false)} title="Add New Employee">
                 <div className="space-y-4">
                     <div>
                         <label className="block text-sm font-bold text-slate-700 mb-1">Name</label>
                         <input className="w-full border border-slate-200 rounded p-2" value={newEmployee.name || ''} onChange={e => setNewEmployee({...newEmployee, name: e.target.value})} placeholder="John Doe" />
                     </div>
                     <div>
                         <label className="block text-sm font-bold text-slate-700 mb-1">Login PIN (4 digits)</label>
                         <input className="w-full border border-slate-200 rounded p-2" value={newEmployee.pin || ''} onChange={e => setNewEmployee({...newEmployee, pin: e.target.value})} placeholder="0000" maxLength={4} />
                     </div>
                     <div>
                         <label className="block text-sm font-bold text-slate-700 mb-1">Role</label>
                         <select className="w-full border border-slate-200 rounded p-2" value={newEmployee.role} onChange={e => setNewEmployee({...newEmployee, role: e.target.value as Role})}>
                             <option value={Role.Waiter}>Waiter</option>
                             <option value={Role.Kitchen}>Kitchen</option>
                             <option value={Role.Admin}>Admin</option>
                         </select>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                         <div>
                             <label className="block text-sm font-bold text-slate-700 mb-1">Email (Optional)</label>
                             <input className="w-full border border-slate-200 rounded p-2" value={newEmployee.email || ''} onChange={e => setNewEmployee({...newEmployee, email: e.target.value})} placeholder="@ieat.com" />
                         </div>
                         <div>
                             <label className="block text-sm font-bold text-slate-700 mb-1">Phone (Optional)</label>
                             <input className="w-full border border-slate-200 rounded p-2" value={newEmployee.phone || ''} onChange={e => setNewEmployee({...newEmployee, phone: e.target.value})} placeholder="555-0123" />
                         </div>
                     </div>
                     <button onClick={handleAddEmployee} className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl mt-2">Create Employee</button>
                 </div>
             </Modal>
          </div>
      );

      return (
        <div className="p-6 max-w-7xl mx-auto w-full">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <ShieldAlert className="text-brand-600" />
                Backoffice
            </h2>
            
            {/* Tabs */}
            <div className="flex border-b border-slate-200 mb-6 overflow-x-auto">
                <button 
                    onClick={() => setAdminTab('dashboard')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${adminTab === 'dashboard' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Dashboard
                </button>
                <button 
                    onClick={() => setAdminTab('inventory')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${adminTab === 'inventory' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Inventory
                </button>
                <button 
                    onClick={() => setAdminTab('reports')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${adminTab === 'reports' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Reports
                </button>
                <button 
                    onClick={() => setAdminTab('team')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${adminTab === 'team' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Team
                </button>
            </div>

            {adminTab === 'dashboard' && <Dashboard />}
            {adminTab === 'inventory' && <Inventory />}
            {adminTab === 'reports' && <Reports />}
            {adminTab === 'team' && <Team />}
        </div>
      );
  };

  const KitchenView = () => {
    // Only show tickets that are NOT completely paid/closed. 
    // Standard KDS shows 'pending', 'cooking', 'ready'. 
    // We can filter out 'paid' or allow them if needed, but usually once served/paid they vanish.
    const activeOrders = orders.filter(o => o.status !== 'paid').sort((a,b) => a.createdAt - b.createdAt);
    
    // Force re-render every minute to update the "min ago" timers and colors
    const [currentTime, setCurrentTime] = useState(Date.now());
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(Date.now()), 10000); // 10 sec update
        return () => clearInterval(timer);
    }, []);

    const getWaitTimeStatus = (createdAt: number) => {
        const elapsedMins = (currentTime - createdAt) / 60000;
        if (elapsedMins > 20) return { color: 'bg-red-600', text: 'Critical', border: 'border-red-600' };
        if (elapsedMins > 10) return { color: 'bg-orange-500', text: 'Late', border: 'border-orange-500' };
        return { color: 'bg-emerald-600', text: 'On Time', border: 'border-emerald-600' };
    };

    const handleToggleItem = async (orderId: string, itemIdx: number) => {
        await db.toggleOrderItemStatus(orderId, itemIdx);
        refreshData();
    };

    const handleBumpOrder = async (orderId: string) => {
        // Mark order as ready/served (depending on flow). Here: bump to 'ready' then dismiss manually? 
        // Or if already ready, mark as served/paid (remove from screen).
        // Let's assume bump means "Order Complete/Ready to Serve".
        await db.updateOrder(orderId, { status: 'ready', syncStatus: SyncStatus.Unsynced });
        refreshData();
    };

    return (
      <div className="p-4 max-w-[1920px] mx-auto w-full min-h-screen bg-slate-100">
          <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <ChefHat className="text-brand-600" />
                  Kitchen Display System
              </h2>
              <div className="flex gap-4 text-sm font-semibold">
                  <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-600"></span> &lt; 10m</div>
                  <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-500"></span> 10-20m</div>
                  <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-600"></span> &gt; 20m</div>
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-start">
              {activeOrders.length === 0 ? (
                  <div className="col-span-full h-[60vh] flex flex-col items-center justify-center text-slate-400 border-4 border-dashed border-slate-200 rounded-3xl">
                      <ChefHat size={64} className="mb-4 opacity-50" />
                      <p className="text-xl font-medium">All Caught Up!</p>
                      <p className="text-sm">No active tickets.</p>
                  </div>
              ) : (
                  activeOrders.map(order => {
                      const statusColor = getWaitTimeStatus(order.createdAt);
                      const elapsedMins = Math.floor((currentTime - order.createdAt) / 60000);
                      const allItemsDone = order.items.every(i => i.completed);

                      return (
                      <div key={order.uuid} className={`bg-white rounded-lg shadow-md border-t-8 ${statusColor.border} overflow-hidden flex flex-col h-fit animate-in fade-in duration-300`}>
                          {/* Ticket Header */}
                          <div className={`${statusColor.color} p-3 text-white flex justify-between items-center`}>
                              <div>
                                  <h3 className="font-bold text-xl leading-none">
                                      {order.diningOption === 'dine-in' ? `TBL ${order.tableNo}` : order.diningOption.substring(0,4).toUpperCase()}
                                  </h3>
                                  <p className="text-[10px] opacity-90 font-mono mt-1">#{order.uuid.substring(0,5)}</p>
                              </div>
                              <div className="text-right">
                                  <div className="text-2xl font-bold leading-none">{elapsedMins}m</div>
                                  <span className="text-[10px] uppercase font-bold opacity-90">{statusColor.text}</span>
                              </div>
                          </div>
                          
                          {/* Alerts (Notes / AI) */}
                          {order.customerNotes && (
                              <div className="bg-yellow-100 text-yellow-900 px-3 py-2 text-xs font-bold border-b border-yellow-200 flex items-start gap-1">
                                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                                  <span className="uppercase">{order.customerNotes}</span>
                              </div>
                          )}
                          {order.aiInsight && (
                              <div className="bg-purple-100 text-purple-900 px-3 py-2 text-xs font-bold border-b border-purple-200 flex items-start gap-1">
                                  <ChefHat size={14} className="mt-0.5 shrink-0" />
                                  <span>{order.aiInsight}</span>
                              </div>
                          )}

                          {/* Items List */}
                          <div className="p-0 flex-1">
                              <ul className="divide-y divide-slate-100">
                                  {order.items.map((item, i) => (
                                      <li 
                                        key={i} 
                                        onClick={() => handleToggleItem(order.uuid, i)}
                                        className={`p-3 cursor-pointer hover:bg-slate-50 transition-colors flex items-start gap-3 ${item.completed ? 'opacity-40 grayscale' : ''}`}
                                      >
                                          <div className={`mt-0.5 ${item.completed ? 'text-slate-400' : 'text-slate-900'}`}>
                                            {item.completed ? <CheckSquare size={20} /> : <Square size={20} />}
                                          </div>
                                          <div className="flex-1">
                                              <div className="flex items-baseline justify-between">
                                                  <span className={`text-lg font-bold mr-2 ${item.completed ? 'line-through decoration-2' : 'text-slate-800'}`}>
                                                      {item.qty}
                                                  </span>
                                                  <span className={`flex-1 font-semibold text-sm ${item.completed ? 'line-through decoration-2' : 'text-slate-700'}`}>
                                                      {item.name}
                                                  </span>
                                              </div>
                                              
                                              {/* Modifiers */}
                                              {item.selectedModifiers.length > 0 && (
                                                  <div className="text-xs text-red-600 font-bold mt-1 pl-6">
                                                      {item.selectedModifiers.map(m => `+ ${m.name}`).join(', ')}
                                                  </div>
                                              )}
                                              {item.notes && (
                                                  <div className="text-xs bg-yellow-50 text-yellow-800 p-1 mt-1 rounded border border-yellow-100 italic">
                                                      Note: {item.notes}
                                                  </div>
                                              )}
                                          </div>
                                      </li>
                                  ))}
                              </ul>
                          </div>

                          {/* Footer Actions */}
                          <div className="p-2 border-t border-slate-100 bg-slate-50">
                              <button 
                                  onClick={() => handleBumpOrder(order.uuid)}
                                  className={`w-full py-3 rounded-md font-bold text-sm shadow-sm transition-all active:scale-[0.98] ${
                                      allItemsDone || order.status === 'ready'
                                        ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200' 
                                        : 'bg-white border border-slate-300 text-slate-500 hover:bg-slate-100'
                                  }`}
                              >
                                  {order.status === 'ready' ? 'BUMP TICKET (DONE)' : allItemsDone ? 'MARK ORDER READY' : 'BUMP ANYWAY'}
                              </button>
                          </div>
                      </div>
                  )})
              )}
          </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-brand-500/30">
                <Server size={18} strokeWidth={3} />
            </div>
            <h1 className="font-bold text-xl tracking-tight text-slate-900 hidden sm:block">iEat<span className="text-brand-600">POS</span></h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
             {/* Role & User Info */}
             <div className="hidden md:flex items-center gap-3 bg-slate-100 py-1.5 px-3 rounded-lg border border-slate-200">
                 <div className="flex flex-col items-end leading-none">
                     <span className="text-xs font-bold text-slate-800">{currentUser.name}</span>
                     <span className="text-[10px] uppercase text-brand-600 font-bold tracking-wide">{role}</span>
                 </div>
                 <div className="h-6 w-px bg-slate-300"></div>
                 {/* Role Switcher (Visible only if Admin) */}
                 {currentUser.role === Role.Admin ? (
                    <div className="flex gap-1">
                        <button onClick={() => setRole(Role.Waiter)} className={`p-1 rounded ${role === Role.Waiter ? 'bg-white shadow text-brand-600' : 'text-slate-400 hover:text-slate-600'}`} title="Waiter View"><Tablet size={14} /></button>
                        <button onClick={() => setRole(Role.Kitchen)} className={`p-1 rounded ${role === Role.Kitchen ? 'bg-white shadow text-brand-600' : 'text-slate-400 hover:text-slate-600'}`} title="Kitchen View"><ChefHat size={14} /></button>
                        <button onClick={() => setRole(Role.Admin)} className={`p-1 rounded ${role === Role.Admin ? 'bg-white shadow text-brand-600' : 'text-slate-400 hover:text-slate-600'}`} title="Admin View"><ShieldAlert size={14} /></button>
                    </div>
                 ) : (
                     <div className="text-slate-400"><Tablet size={14}/></div>
                 )}
             </div>

            <button onClick={toggleNetwork} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold transition-colors ${isOnline ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'}`}>
                {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
                <span className="hidden sm:inline">{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
            </button>
            
            <button onClick={handleLogout} className="text-slate-400 hover:text-red-600 p-2 transition-colors" title="Logout">
                <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Sync Banner */}
      {isSyncing && (
          <div className="bg-brand-600 text-white text-xs py-1 px-4 text-center font-medium animate-in slide-in-from-top duration-300">
              <span className="inline-flex items-center gap-2"><RefreshCw className="animate-spin w-3 h-3" /> Syncing with Master Node...</span>
          </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {role === Role.Waiter ? <WaiterView /> : role === Role.Kitchen ? <KitchenView /> : <AdminView />}
      </main>

      {/* Modifiers Modal */}
      <Modal isOpen={modModalOpen} onClose={() => setModModalOpen(false)} title={`Customize ${selectedProductForMod?.name || 'Item'}`}>
          <div className="space-y-4">
              {selectedProductForMod?.modifiers && selectedProductForMod.modifiers.length > 0 && (
                  <div>
                      <h4 className="text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Add-ons</h4>
                      <div className="space-y-2">
                          {selectedProductForMod.modifiers.map(mod => {
                              const isSelected = tempModifiers.some(m => m.id === mod.id);
                              return (
                                  <button 
                                      key={mod.id}
                                      onClick={() => toggleModifier(mod)}
                                      className={`w-full flex justify-between items-center p-3 rounded-lg border transition-all ${isSelected ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                                  >
                                      <span className="font-medium">{mod.name}</span>
                                      <div className="flex items-center gap-3">
                                          <span className="text-sm">+{mod.price > 0 ? `$${mod.price.toFixed(2)}` : 'Free'}</span>
                                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300'}`}>
                                              {isSelected && <CheckCircle size={12} />}
                                          </div>
                                      </div>
                                  </button>
                              );
                          })}
                      </div>
                  </div>
              )}
              
              <div>
                  <h4 className="text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Special Instructions</h4>
                  <textarea 
                      value={tempNote}
                      onChange={(e) => setTempNote(e.target.value)}
                      placeholder="e.g. No sauce, Extra napkins..."
                      className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                      rows={3}
                  />
              </div>

              <div className="pt-2">
                  <button 
                      onClick={confirmModifiers}
                      className="w-full bg-brand-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-brand-700 transition-colors"
                  >
                      Add to Order - ${(
                          (selectedProductForMod?.price || 0) + 
                          tempModifiers.reduce((acc, m) => acc + m.price, 0)
                      ).toFixed(2)}
                  </button>
              </div>
          </div>
      </Modal>

      {/* Cart Item Detail Modal */}
      <Modal isOpen={cartItemModalOpen} onClose={() => setCartItemModalOpen(false)} title="Edit Cart Item">
          {activeCartItemIndex !== null && cart[activeCartItemIndex] && (
              <div className="space-y-6">
                  <div className="text-center">
                      <h3 className="text-xl font-bold text-slate-800">{cart[activeCartItemIndex].name}</h3>
                      <p className="text-sm text-slate-500">${cart[activeCartItemIndex].price.toFixed(2)}</p>
                  </div>

                  <div className="flex items-center justify-center gap-6 py-4">
                      <button 
                        onClick={() => updateCartQty(activeCartItemIndex, -1)} 
                        className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 active:scale-95 transition-all"
                      >
                          <Minus size={28} />
                      </button>
                      <span className="text-4xl font-bold text-slate-900 w-12 text-center">{cart[activeCartItemIndex].qty}</span>
                      <button 
                        onClick={() => updateCartQty(activeCartItemIndex, 1)} 
                        className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 hover:bg-brand-200 active:scale-95 transition-all"
                      >
                          <Plus size={28} />
                      </button>
                  </div>

                  <div>
                      <label className="text-sm font-bold text-slate-700 block mb-2">Instructions</label>
                      <textarea 
                        value={activeCartItemNote}
                        onChange={(e) => setActiveCartItemNote(e.target.value)}
                        placeholder="Add notes for the kitchen..."
                        className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                        rows={3}
                      />
                  </div>

                  <div className="flex gap-3 pt-2">
                      <button 
                        onClick={removeActiveCartItem}
                        className="flex-1 bg-red-50 text-red-600 border border-red-200 py-3 rounded-xl font-bold hover:bg-red-100 flex items-center justify-center gap-2"
                      >
                          <Trash2 size={18} /> Remove Item
                      </button>
                      <button 
                        onClick={saveCartItemChanges}
                        className="flex-[2] bg-brand-600 text-white py-3 rounded-xl font-bold hover:bg-brand-700 shadow-lg"
                      >
                          Update Cart
                      </button>
                  </div>
              </div>
          )}
      </Modal>

      {/* Payment Modal */}
      <Modal isOpen={!!selectedOrderForPayment} onClose={() => setSelectedOrderForPayment(null)} title="Checkout & Print">
        {selectedOrderForPayment && (
            <div className="space-y-6">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-slate-500 text-sm">Order Type</span>
                        <span className="font-bold text-slate-900 capitalize">{selectedOrderForPayment.diningOption}</span>
                    </div>
                    {selectedOrderForPayment.tableNo && (
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-slate-500 text-sm">Table</span>
                            <span className="font-bold text-slate-900">#{selectedOrderForPayment.tableNo}</span>
                        </div>
                    )}
                    <div className="border-t border-slate-200 my-2 pt-2 space-y-1">
                        <div className="flex justify-between text-sm text-slate-500">
                            <span>Subtotal</span>
                            <span>${selectedOrderForPayment.subtotal.toFixed(2)}</span>
                        </div>
                        {selectedOrderForPayment.discount > 0 && (
                            <div className="flex justify-between text-sm text-red-500">
                                <span>Discount</span>
                                <span>-${selectedOrderForPayment.discount.toFixed(2)}</span>
                            </div>
                        )}
                         <div className="flex justify-between text-sm text-slate-500">
                            <span>Tax</span>
                            <span>${selectedOrderForPayment.tax.toFixed(2)}</span>
                        </div>
                    </div>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-200">
                        <span className="text-slate-900 font-bold">Total Due</span>
                        <span className="text-2xl font-bold text-brand-600">${selectedOrderForPayment.totalAmount.toFixed(2)}</span>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Payment Method</label>
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => setPaymentMethod('card')} className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${paymentMethod === 'card' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-300'}`}>
                            <CreditCard size={24} className="mb-2" /><span className="font-semibold text-sm">Card</span>
                        </button>
                        <button onClick={() => setPaymentMethod('cash')} className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${paymentMethod === 'cash' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-300'}`}>
                            <Banknote size={24} className="mb-2" /><span className="font-semibold text-sm">Cash</span>
                        </button>
                    </div>
                </div>

                <div>
                     <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Printer Connection</label>
                     {!isPrinterConnected ? (
                         <button onClick={connectPrinter} disabled={isPrinterConnecting} className="w-full flex items-center justify-center gap-2 p-3 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50">
                            {isPrinterConnecting ? <><RefreshCw className="animate-spin" size={18} /> Scanning...</> : <><Bluetooth size={18} /> Connect Printer</>}
                         </button>
                     ) : (
                        <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700">
                            <Printer size={20} /><span className="font-medium text-sm flex-1">Epson TM-m30 Ready</span><CheckCircle size={18} />
                        </div>
                     )}
                </div>

                <div className="pt-4 border-t border-slate-100">
                     <div className="flex justify-between items-center mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-500 uppercase">Total To Charge</span>
                            <span className="text-2xl font-bold text-slate-900">${selectedOrderForPayment.totalAmount.toFixed(2)}</span>
                        </div>
                        <div className="text-right">
                             <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Method</span>
                             <span className="px-3 py-1 rounded-full bg-white border border-slate-200 text-sm font-semibold text-slate-700 capitalize shadow-sm">
                                {paymentMethod}
                             </span>
                        </div>
                     </div>

                    <button onClick={handlePaymentAndPrint} disabled={!isPrinterConnected || isPrinting} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98]">
                        {isPrinting ? (
                            <><RefreshCw className="animate-spin" /> Processing Transaction...</>
                        ) : (
                            <><Printer size={20} /> Print Invoice & Close</>
                        )}
                    </button>
                </div>
            </div>
        )}
      </Modal>
    </div>
  );
}
