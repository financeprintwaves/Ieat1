import React from 'react';
import { X, ShoppingBag, Minus, Plus, User, ChevronRight, Gift, Store, MapPin } from 'lucide-react';
import { OrderItem, DiningOption, Customer, LoyaltyReward, Branch } from '../types';

export const CartBottomSheet = ({
    isOpen,
    onClose,
    cart,
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
    selectedTables,
    manualDiscount,
    setManualDiscount,
    currency,
    rewards,
    selectedReward,
    setSelectedReward,
    branches,
    currentBranchId,
    onBranchChange,
    updateCartItemQty,
    taxRate
}: {
    isOpen: boolean;
    onClose: () => void;
    cart: OrderItem[];
    diningOption: DiningOption;
    setDiningOption: (opt: DiningOption) => void;
    openCartItemModal: (idx: number) => void;
    cartSubtotal: number;
    cartTax: number;
    cartTotal: number;
    placeOrder: () => void;
    handlePayNow: () => void;
    activeCustomer: Customer | null;
    onCustomerClick: () => void;
    selectedTables: string[];
    manualDiscount: number;
    setManualDiscount: (v: number) => void;
    currency: string;
    rewards: LoyaltyReward[];
    selectedReward: LoyaltyReward | null;
    setSelectedReward: (r: LoyaltyReward | null) => void;
    branches: Branch[];
    currentBranchId: string;
    onBranchChange: (id: string) => void;
    updateCartItemQty: (idx: number, delta: number) => void;
    taxRate: number;
}) => {
    if (!isOpen) return null;

    return (
        <>
            <div
                className="fixed inset-0 bg-black/40 z-40 md:hidden"
                onClick={onClose}
            />
            <div className="fixed bottom-0 left-0 right-0 max-h-[85vh] bg-white dark:bg-slate-900 rounded-t-3xl z-50 md:hidden flex flex-col overflow-hidden shadow-2xl">
                <div className="p-4 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900 flex-shrink-0">
                    <h2 className="font-black text-lg flex items-center gap-2 dark:text-white">
                        <ShoppingBag size={20} /> Current Order
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <X size={24} className="dark:text-white" />
                    </button>
                </div>

                <div className="p-4 border-b dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 flex-shrink-0">
                    <div className="p-3 bg-brand-50 dark:bg-brand-900/10 rounded-xl border border-brand-100 dark:border-brand-900/30 flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center text-brand-600 shadow-sm">
                                <Store size={16} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400 leading-none mb-1">
                                    Active Branch
                                </p>
                                <select
                                    value={currentBranchId}
                                    onChange={(e) => onBranchChange(e.target.value)}
                                    className="bg-transparent border-none p-0 font-black text-xs uppercase tracking-tight outline-none dark:text-white cursor-pointer"
                                >
                                    {branches.map((b) => (
                                        <option key={b.id} value={b.id} className="dark:bg-slate-800">
                                            {b.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg gap-1">
                        {(['dine-in', 'take-out', 'delivery'] as DiningOption[]).map((opt) => (
                            <button
                                key={opt}
                                onClick={() => setDiningOption(opt)}
                                className={`flex-1 py-2 rounded-md text-xs font-bold uppercase transition-all ${
                                    diningOption === opt
                                        ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white'
                                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                }`}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>

                    {selectedTables.length > 0 && (
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300">
                            <MapPin size={16} /> Table: {selectedTables.join(', ')}
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 opacity-50">
                            <ShoppingBag size={48} strokeWidth={1} />
                            <p className="font-black uppercase text-xs tracking-widest italic">
                                Ticket is empty
                            </p>
                        </div>
                    ) : (
                        cart.map((item, i) => (
                            <div
                                key={i}
                                className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all group"
                            >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                updateCartItemQty(i, -1);
                                            }}
                                            className="w-7 h-7 rounded bg-slate-200 dark:bg-slate-700 hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center"
                                        >
                                            <Minus size={14} />
                                        </button>
                                        <span className="w-8 text-center text-xs font-bold dark:text-white">
                                            {item.qty}
                                        </span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                updateCartItemQty(i, 1);
                                            }}
                                            className="w-7 h-7 rounded bg-slate-200 dark:bg-slate-700 hover:bg-green-500 hover:text-white transition-colors flex items-center justify-center"
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openCartItemModal(i)}>
                                        <p className="font-bold text-sm dark:text-white leading-tight truncate">
                                            {item.name}
                                        </p>
                                        {item.selectedModifiers.length > 0 && (
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                                {item.selectedModifiers.map((m) => m.name).join(', ')}
                                            </p>
                                        )}
                                        {item.notes && (
                                            <p className="text-[10px] text-amber-600 dark:text-amber-500 italic mt-0.5 truncate">
                                                "{item.notes}"
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <span className="font-bold text-sm dark:text-white ml-2 flex-shrink-0">
                                    {currency}
                                    {((item.price + item.selectedModifiers.reduce((a, b) => a + b.price, 0)) *
                                        item.qty).toFixed(2)}
                                </span>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-800 space-y-3 flex-shrink-0 max-h-96 overflow-y-auto">
                    <button
                        onClick={onCustomerClick}
                        className="w-full flex justify-between items-center p-2 bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 hover:border-brand-400 transition-colors group"
                    >
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 group-hover:text-brand-500">
                                <User size={12} />
                            </div>
                            <div className="text-left">
                                <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase leading-none mb-0.5">
                                    Customer
                                </p>
                                <p className="font-black text-xs dark:text-white truncate max-w-[100px] tracking-tight">
                                    {activeCustomer ? activeCustomer.name : 'Guest'}
                                </p>
                            </div>
                        </div>
                        {activeCustomer ? (
                            <div className="text-right">
                                <p className="text-[9px] font-black text-emerald-500 tracking-tighter uppercase">
                                    {activeCustomer.points} pts
                                </p>
                            </div>
                        ) : (
                            <ChevronRight size={12} className="text-slate-300" />
                        )}
                    </button>

                    {activeCustomer && activeCustomer.points > 0 && (
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-[8px] font-black text-slate-500 dark:text-slate-400 flex items-center gap-1 uppercase tracking-wider">
                                    <Gift size={10} /> Loyalty
                                </span>
                                {selectedReward && (
                                    <button
                                        onClick={() => setSelectedReward(null)}
                                        className="text-[8px] text-rose-500 font-black uppercase hover:underline"
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                            <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-1">
                                {rewards
                                    .filter((r) => r.cost <= (activeCustomer?.points || 0))
                                    .map((r) => (
                                        <button
                                            key={r.id}
                                            onClick={() =>
                                                setSelectedReward(r.id === selectedReward?.id ? null : r)
                                            }
                                            className={`flex-shrink-0 px-2 py-1 rounded-md border text-[8px] font-black uppercase tracking-tight transition-all ${
                                                selectedReward?.id === r.id
                                                    ? 'bg-brand-500 text-white border-brand-500'
                                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                                            }`}
                                        >
                                            {r.name}
                                        </button>
                                    ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-2 pt-2 border-t dark:border-slate-700">
                        <div className="flex justify-between text-sm dark:text-white">
                            <span className="text-slate-600 dark:text-slate-400">Subtotal:</span>
                            <span className="font-bold">
                                {currency}
                                {cartSubtotal.toFixed(2)}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm dark:text-white">
                            <span className="text-slate-600 dark:text-slate-400">Tax:</span>
                            <span className="font-bold">
                                {currency}
                                {cartTax.toFixed(2)}
                            </span>
                        </div>
                        {manualDiscount > 0 && (
                            <div className="flex justify-between text-sm dark:text-white">
                                <span className="text-slate-600 dark:text-slate-400">Discount:</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                    -{currency}
                                    {manualDiscount.toFixed(2)}
                                </span>
                            </div>
                        )}
                        <div className="flex justify-between text-lg font-black dark:text-white pt-2 border-t dark:border-slate-700">
                            <span>Total:</span>
                            <span className="text-brand-600 dark:text-brand-400">
                                {currency}
                                {cartTotal.toFixed(2)}
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                        <button
                            onClick={() => {
                                placeOrder();
                                onClose();
                            }}
                            disabled={cart.length === 0}
                            className="flex-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 dark:text-white py-3 rounded-lg font-bold uppercase text-sm transition-colors"
                        >
                            Add Order
                        </button>
                        <button
                            onClick={handlePayNow}
                            disabled={cart.length === 0}
                            className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white py-3 rounded-lg font-bold uppercase text-sm transition-colors disabled:cursor-not-allowed"
                        >
                            Pay Now
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};
