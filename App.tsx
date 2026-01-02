
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Utensils, Moon, Sun, LogOut, ShoppingBag, Minus, Plus, CheckCircle,
  Trash2, Store, CreditCard, Banknote, Star, UserCircle, Eye, EyeOff, 
  ChevronDown, Maximize, Minimize, Cloud, RefreshCw, AlertCircle
} from 'lucide-react';
import { 
  Order, MenuItem, Employee, TableConfig, AppSettings, OrderItem, 
  DiningOption, Customer, Role, SyncStatus, Modifier, LoyaltyReward, Branch
} from './types';
import { db, generateUUID } from './services/db';
import { ApiService } from './services/api';
import { analyzeOrderWithGemini } from './services/geminiService';

// Components
import { LoginScreen } from './components/LoginScreen';
import { KitchenView } from './components/KitchenView';
import { CartPanel } from './components/CartPanel';
import { MenuGrid } from './components/MenuGrid';
import { OrderList } from './components/OrderList';
import { AdminDashboard } from './components/AdminDashboard';
import { Modal, PrintingOverlay, ReceiptOverlay } from './components/Shared';

export default function App() {
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<MenuItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tables, setTables] = useState<TableConfig[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [waiterViewMode, setWaiterViewMode] = useState<'menu' | 'orders' | 'kitchen'>('menu');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminTab, setAdminTab] = useState<'dashboard' | 'team' | 'tables' | 'inventory' | 'settings' | 'branches'>('dashboard');
  const [settings, setSettings] = useState<AppSettings>({ id: 'global', currencySymbol: 'OMR', currentBranchId: 'branch-1', taxRate: 0.05 });
  
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [diningOption, setDiningOption] = useState<DiningOption>('dine-in');
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
  const [selectedReward, setSelectedReward] = useState<LoyaltyReward | null>(null);
  const [manualDiscount, setManualDiscount] = useState(0);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [activeCartItemIndex, setActiveCartItemIndex] = useState<number | null>(null);
  const [tempCartItem, setTempCartItem] = useState<OrderItem | null>(null); 
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  
  const [darkMode, setDarkMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Partial<Employee>>({});
  const [editingTable, setEditingTable] = useState<Partial<TableConfig>>({});
  const [editingProduct, setEditingProduct] = useState<Partial<MenuItem>>({});
  const [phoneSearch, setPhoneSearch] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [orderToSettle, setOrderToSettle] = useState<Order | null>(null);
  const [printStatus, setPrintStatus] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const refreshData = async () => {
      setOrders(await db.getOrders());
      setProducts(await db.getProducts());
      setEmployees(await db.getEmployees());
      setTables(await db.getTables());
      setSettings(await db.getSettings());
      setRewards(await db.getRewards());
      setBranches(await db.getBranches());
  };

  useEffect(() => {
      refreshData();
      const interval = setInterval(refreshData, 5000);
      
      const fullscreenChangeHandler = () => {
          setIsFullscreen(!!document.fullscreenElement);
      };
      document.addEventListener('fullscreenchange', fullscreenChangeHandler);

      if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          setDarkMode(true);
      }
      return () => {
          clearInterval(interval);
          document.removeEventListener('fullscreenchange', fullscreenChangeHandler);
      };
  }, []);

  useEffect(() => {
      if (darkMode) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  const toggleFullscreen = () => {
      if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(err => {
              console.error(`Error attempting to enable full-screen mode: ${err.message}`);
          });
      } else {
          document.exitFullscreen();
      }
  };

  const handleCloudSync = async () => {
      const unsynced = orders.filter(o => o.syncStatus === SyncStatus.Unsynced);
      
      setIsSyncing(true);
      setPrintStatus('Synchronizing Master DB...');
      
      try {
          // 1. Push orders if any
          if (unsynced.length > 0) {
              await ApiService.syncOrders(unsynced);
              for (const order of unsynced) {
                  await db.updateOrder(order.uuid, { syncStatus: SyncStatus.Synced });
              }
          }

          // 2. Pull latest product master data
          const masterProducts = await ApiService.getMasterProducts();
          if (masterProducts && masterProducts.length > 0) {
              // Note: You might want to merge or replace local products based on logic
              console.log('Master Products Pulled:', masterProducts.length);
          }

          setPrintStatus('Cloud Sync Successful!');
      } catch (error) {
          console.error('Sync failed:', error);
          setPrintStatus('Sync Failed: Check Connection');
      } finally {
          setTimeout(() => setPrintStatus(null), 2000);
          setIsSyncing(false);
          await refreshData();
      }
  };

  const handleLogout = () => setCurrentUser(null);

  const switchRole = (role: Role) => {
      if (!currentUser) return;
      const updatedUser = { ...currentUser, role };
      setCurrentUser(updatedUser);
      if (role === Role.Admin) {
          setIsAdminMode(true);
          setAdminTab('dashboard');
      } else if (role === Role.Kitchen) {
          setIsAdminMode(false);
          setWaiterViewMode('kitchen');
      } else {
          setIsAdminMode(false);
          setWaiterViewMode('menu');
      }
  };

  const updateBranchContext = async (branchId: string) => {
      const updated = { ...settings, currentBranchId: branchId };
      setSettings(updated);
      await db.saveSettings(updated);
      refreshData();
  };

  const getProductPriceForBranch = (product: MenuItem) => {
      const config = product.branchConfig?.find(b => b.branchId === settings.currentBranchId);
      return config && config.price !== undefined ? config.price : product.price;
  };

  const trendingProducts = useMemo(() => {
      return products.filter(p => {
          const config = p.branchConfig?.find(b => b.branchId === settings.currentBranchId);
          const isVisible = config ? config.isVisible : true;
          return p.isTrending && isVisible;
      }).slice(0, 8); 
  }, [products, settings.currentBranchId]);

  const occupiedTables = useMemo(() => {
      return orders.filter(o => o.status !== 'paid').flatMap(o => o.tableIds);
  }, [orders]);

  const tableBalances = useMemo(() => {
      const balances: Record<string, number> = {};
      orders.filter(o => o.status !== 'paid').forEach(o => {
          o.tableIds.forEach(tid => {
              balances[tid] = (balances[tid] || 0) + o.totalAmount;
          });
      });
      return balances;
  }, [orders]);

  const filteredProducts = useMemo(() => {
      let visible = products.filter(p => {
          const branchConfig = p.branchConfig?.find(b => b.branchId === settings.currentBranchId);
          return branchConfig ? branchConfig.isVisible : true;
      });
      if (selectedCategory === 'all') return visible;
      return visible.filter(p => p.category === selectedCategory);
  }, [products, selectedCategory, settings.currentBranchId]);

  const topSellingProductIds = useMemo(() => {
      return products.slice(0, 3).map(p => p.id);
  }, [products]);

  const activeTableOrder = useMemo(() => {
      if (selectedTables.length === 0) return null;
      return orders.find(o => o.status !== 'paid' && o.tableIds && o.tableIds.some(t => selectedTables.includes(t))) || null;
  }, [orders, selectedTables]);

  const cartSubtotal = cart.reduce((acc, item) => acc + (item.price * item.qty) + item.selectedModifiers.reduce((mAcc, m) => mAcc + m.price, 0) * item.qty, 0);
  const cartTax = cartSubtotal * settings.taxRate;
  const rewardDiscount = selectedReward && activeCustomer ? selectedReward.value : 0;
  const cartTotal = Math.max(0, cartSubtotal + cartTax - manualDiscount - rewardDiscount);

  const handleTableToggle = (tableName: string) => {
      if (selectedTables.includes(tableName)) {
          setSelectedTables(selectedTables.filter(t => t !== tableName));
      } else {
          setSelectedTables([tableName]); 
      }
  };

  const addToCart = (product: MenuItem) => {
      const branchPrice = getProductPriceForBranch(product);
      const existingItemIndex = cart.findIndex(item => item.id === product.id && item.selectedModifiers.length === 0);
      if (existingItemIndex !== -1) {
          const newCart = [...cart];
          newCart[existingItemIndex].qty += 1;
          setCart(newCart);
      } else {
          setCart([...cart, { ...product, price: branchPrice, qty: 1, selectedModifiers: [] }]);
      }
  };

  const placeOrder = async () => {
      if (cart.length === 0) return;
      if (activeTableOrder) {
          await db.addItemsToOrder(
              activeTableOrder.uuid, 
              cart, 
              cartSubtotal, 
              cartTax, 
              cartTotal, 
              selectedTables.length > 0 ? selectedTables : undefined,
              currentUser?.name
          );
      } else {
          const order: Order = {
              uuid: generateUUID(),
              tableIds: selectedTables,
              tableNo: selectedTables.length > 0 ? selectedTables.join(', ') : undefined,
              items: cart,
              subtotal: cartSubtotal,
              tax: cartTax,
              discount: manualDiscount + rewardDiscount,
              totalAmount: cartTotal,
              status: 'pending',
              diningOption,
              syncStatus: SyncStatus.Unsynced,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              opLogId: generateUUID(),
              serverName: currentUser?.name,
              serverId: currentUser?.id,
              customerId: activeCustomer?.id,
              branchId: settings.currentBranchId,
              pointsRedeemed: selectedReward ? selectedReward.cost : 0
          };
          await db.createOrder(order);
          analyzeOrderWithGemini(order).then(insight => {
               db.updateOrder(order.uuid, { aiInsight: insight });
          });
      }
      setCart([]);
      setSelectedTables([]);
      setActiveCustomer(null);
      setManualDiscount(0);
      setSelectedReward(null);
      refreshData();
  };
  
  const processPayment = async (method: 'card' | 'cash') => {
      if (!orderToSettle) return;
      setPrintStatus('Processing Payment...');
      await new Promise(r => setTimeout(r, 1000));
      await db.markOrderAsPaid(orderToSettle.uuid, method, Date.now());
      setPrintStatus('Printing Receipt...');
      await new Promise(r => setTimeout(r, 1500));
      setPrintStatus(null);
      setReceiptOrder(orderToSettle);
      setOrderToSettle(null);
      refreshData();
  };

  const triggerReprint = (order: Order) => {
      setPrintStatus('Printing Receipt...');
      setTimeout(() => {
          setPrintStatus(null);
          setReceiptOrder(order);
      }, 1500);
  };

  const handleOpenCartItem = (index: number) => {
      if (cart[index]) {
          setTempCartItem(JSON.parse(JSON.stringify(cart[index])));
          setActiveCartItemIndex(index);
      }
  };

  const handleSaveCartItem = () => {
      if (activeCartItemIndex !== null && tempCartItem) {
          if (tempCartItem.qty <= 0) {
               const newCart = cart.filter((_, i) => i !== activeCartItemIndex);
               setCart(newCart);
          } else {
               const newCart = [...cart];
               newCart[activeCartItemIndex] = tempCartItem;
               setCart(newCart);
          }
          setActiveCartItemIndex(null);
          setTempCartItem(null);
      }
  };

  const handleSaveProduct = async () => {
      if (editingProduct.name && editingProduct.price !== undefined) {
          const productData = editingProduct as MenuItem;
          if (productData.id) {
              await db.updateProduct(productData.id, productData);
          } else {
              productData.id = generateUUID();
              await db.addProduct(productData);
          }
          setShowProductModal(false);
          refreshData();
      }
  };

  const unsyncedCount = orders.filter(o => o.syncStatus === SyncStatus.Unsynced).length;

  if (!currentUser) return <LoginScreen onLogin={setCurrentUser} />;

  return (
    <div className="h-screen w-screen bg-slate-50 dark:bg-slate-950 flex flex-col overflow-hidden text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
        <nav className="h-16 bg-white dark:bg-slate-900 border-b dark:border-slate-800 px-4 md:px-6 flex items-center justify-between shadow-sm shrink-0 z-40">
            <div className="flex items-center gap-6">
                <h1 className="font-black text-xl md:text-2xl italic text-brand-600 dark:text-brand-400 flex items-center gap-2"><Utensils className="hidden md:block"/>iEat POS</h1>
                
                {/* Global Branch Switcher */}
                <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl border dark:border-slate-700">
                    <Store size={14} className="text-slate-500"/>
                    <select 
                        value={settings.currentBranchId}
                        onChange={(e) => updateBranchContext(e.target.value)}
                        className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer text-slate-700 dark:text-slate-300"
                    >
                        {branches.map(b => <option key={b.id} value={b.id} className="dark:bg-slate-800">{b.name}</option>)}
                    </select>
                </div>
            </div>

            <div className="flex gap-4 items-center overflow-x-auto scrollbar-hide">
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border dark:border-slate-700">
                    <button onClick={() => switchRole(Role.Admin)} className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${currentUser.role === Role.Admin ? 'bg-white dark:bg-slate-600 shadow-sm text-brand-600 dark:text-brand-400' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}>Admin</button>
                    <button onClick={() => switchRole(Role.Waiter)} className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${currentUser.role === Role.Waiter ? 'bg-white dark:bg-slate-600 shadow-sm text-brand-600 dark:text-brand-400' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}>Waiter</button>
                    <button onClick={() => switchRole(Role.Kitchen)} className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${currentUser.role === Role.Kitchen ? 'bg-white dark:bg-slate-600 shadow-sm text-brand-600 dark:text-brand-400' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}>Kitchen</button>
                </div>
                 {isAdminMode ? (
                     ['dashboard', 'team', 'tables', 'inventory', 'branches', 'settings'].map(t => (
                        <button key={t} onClick={()=>setAdminTab(t as any)} className={`px-3 md:px-4 py-1.5 rounded-lg font-bold uppercase text-[10px] md:text-xs whitespace-nowrap transition-all ${adminTab===t ? 'bg-slate-800 dark:bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>{t}</button>
                     ))
                 ) : (
                     ['menu', 'orders', 'kitchen'].filter(t => {
                        if (currentUser.role === Role.Kitchen) return t === 'kitchen';
                        return true;
                     }).map(t => (
                        <button key={t} onClick={()=>setWaiterViewMode(t as any)} className={`px-3 md:px-4 py-1.5 rounded-lg font-bold uppercase text-[10px] md:text-xs whitespace-nowrap transition-all ${waiterViewMode===t ? 'bg-slate-800 dark:bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>{t}</button>
                     ))
                 )}
            </div>

            <div className="flex gap-2 items-center">
                 <button 
                    onClick={handleCloudSync}
                    disabled={isSyncing}
                    className="relative p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300 group"
                    title="Sync with Cloud"
                 >
                    <div className={`${isSyncing ? 'animate-spin' : ''}`}>
                        <RefreshCw size={20} className={unsyncedCount > 0 ? 'text-amber-500' : 'text-slate-400'} />
                    </div>
                    {unsyncedCount > 0 && !isSyncing && (
                        <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                            {unsyncedCount}
                        </span>
                    )}
                 </button>

                 <button 
                    onClick={toggleFullscreen} 
                    className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300"
                    title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                 >
                    {isFullscreen ? <Minimize size={20}/> : <Maximize size={20}/>}
                 </button>

                 <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300">{darkMode ? <Moon size={20}/> : <Sun size={20}/>}</button>
                 <button onClick={handleLogout} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-full"><LogOut size={20}/></button>
            </div>
        </nav>

        <div className="flex-1 flex overflow-hidden relative">
            {isAdminMode ? (
                <AdminDashboard 
                    adminTab={adminTab}
                    settings={settings}
                    setSettings={setSettings}
                    refreshData={refreshData}
                    products={products}
                    currentUser={currentUser}
                    onEditProduct={(p: MenuItem) => { 
                        const currentConfigs = p.branchConfig || [];
                        const mergedConfig = branches.map(b => {
                            const existing = currentConfigs.find(bc => bc.branchId === b.id);
                            return existing || { branchId: b.id, isVisible: true, price: p.price };
                        });
                        setEditingProduct(JSON.parse(JSON.stringify({...p, branchConfig: mergedConfig}))); 
                        setShowProductModal(true); 
                    }}
                    onAddProduct={() => { 
                        setEditingProduct({ 
                            category: 'food', 
                            price: 0, 
                            stock: 0, 
                            branchConfig: branches.map(b => ({ branchId: b.id, isVisible: true, price: 0 })) 
                        }); 
                        setShowProductModal(true); 
                    }}
                    employees={employees}
                    setEditingStaff={setEditingStaff}
                    setShowStaffModal={setShowStaffModal}
                    tables={tables}
                    setShowTableModal={setShowTableModal}
                    branches={branches}
                    orders={orders}
                />
            ) : (
                <>
                {waiterViewMode === 'menu' && (
                     <MenuGrid 
                        addToCart={addToCart}
                        settings={settings}
                        tables={tables}
                        selectedTables={selectedTables}
                        handleTableToggle={handleTableToggle}
                        occupiedTables={occupiedTables}
                        tableBalances={tableBalances}
                        selectedCategory={selectedCategory}
                        setSelectedCategory={setSelectedCategory}
                        filteredProducts={filteredProducts}
                        topSellingProductIds={topSellingProductIds}
                        getProductPriceForBranch={getProductPriceForBranch}
                        orders={orders}
                     />
                )}
                {waiterViewMode === 'orders' && (
                    <OrderList 
                        orders={orders}
                        settings={settings}
                        setOrderToSettle={setOrderToSettle}
                        triggerReprint={triggerReprint}
                    />
                )}
                {waiterViewMode === 'kitchen' && (
                    <KitchenView 
                        orders={orders} 
                        currentUser={currentUser}
                        onCompleteItem={async (orderId: string, idx: number) => { 
                            await db.toggleOrderItemStatus(orderId, idx);
                            refreshData();
                        }} 
                        onReadyOrder={async (orderId: string) => { 
                            await db.updateOrder(orderId, { status: 'ready' });
                            refreshData();
                        }} 
                        onExitKitchen={() => setWaiterViewMode(currentUser.role === Role.Kitchen ? 'kitchen' : 'menu')}
                    />
                )}
                
                {waiterViewMode !== 'kitchen' && (
                  <aside className="hidden md:flex bg-white dark:bg-slate-900 border-l dark:border-slate-800 z-10 flex-col shadow-xl w-[440px]">
                      <div className="flex h-full">
                          <div className="w-20 border-r dark:border-slate-800 flex flex-col py-4 gap-4 overflow-y-auto scrollbar-hide bg-slate-50 dark:bg-slate-900/50">
                              <div className="px-2 text-[10px] font-black text-slate-400 uppercase text-center mb-2 leading-none">Trending<br/>Now</div>
                              {trendingProducts.map(p => (
                                  <button key={p.id} onClick={() => addToCart(p)} className="flex flex-col items-center gap-1 group">
                                      <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm group-hover:border-brand-500 transition-all flex items-center justify-center relative">
                                          {p.image ? <img src={p.image} className="w-full h-full object-cover" /> : <Star size={16} className="text-yellow-500" />}
                                      </div>
                                      <span className="text-[8px] font-black uppercase text-center dark:text-slate-300 truncate w-14">{p.name}</span>
                                  </button>
                              ))}
                          </div>
                          <div className="flex-1">
                              <CartPanel 
                                  cart={cart} 
                                  activeTableOrder={activeTableOrder}
                                  diningOption={diningOption} 
                                  setDiningOption={setDiningOption}
                                  openCartItemModal={handleOpenCartItem} 
                                  cartSubtotal={cartSubtotal}
                                  cartTax={cartTax}
                                  cartTotal={cartTotal}
                                  placeOrder={placeOrder}
                                  handlePayNow={()=>{placeOrder().then(()=>setWaiterViewMode('orders'))}}
                                  activeCustomer={activeCustomer}
                                  onCustomerClick={()=>setShowCustomerModal(true)}
                                  selectedTables={selectedTables}
                                  manualDiscount={manualDiscount}
                                  setManualDiscount={setManualDiscount}
                                  taxRate={settings.taxRate}
                                  currency={settings.currencySymbol}
                                  rewards={rewards}
                                  selectedReward={selectedReward}
                                  setSelectedReward={setSelectedReward}
                                  branches={branches}
                                  currentBranchId={settings.currentBranchId}
                                  onBranchChange={updateBranchContext}
                              />
                          </div>
                      </div>
                  </aside>
                )}
                </>
            )}
        </div>
        
        <Modal isOpen={showProductModal} onClose={()=>setShowProductModal(false)} title={editingProduct.id ? "Configure Product" : "New Product"}>
             <div className="space-y-6 text-sm scrollbar-hide overflow-y-auto max-h-[75vh] pr-1">
                 {/* Product Form Elements Reused */}
                 <button className="w-full bg-slate-900 dark:bg-white dark:text-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] mt-4 shadow-xl hover:shadow-brand-500/10 transition-all active:scale-95" onClick={handleSaveProduct}>Save Product Configuration</button>
             </div>
        </Modal>

        {receiptOrder && <ReceiptOverlay order={receiptOrder} currency={settings.currencySymbol} onClose={() => setReceiptOrder(null)} />}
        <PrintingOverlay status={printStatus} />
    </div>
  );
}
