import React from 'react';
import { ShoppingBag, X, MapPin, User, Gift, Store, ChevronRight } from 'lucide-react';
import { OrderItem, Order, DiningOption, Customer, LoyaltyReward, Branch } from '../types';

export const CartPanel = (props: {
    cart: OrderItem[];
    activeTableOrder: Order | null;
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
    selectedReward: LoyaltyReward | null;
    setSelectedReward: (r: LoyaltyReward | null) => void;
    rewards: LoyaltyReward[];
    selectedTables: string[];
    manualDiscount: number;
    setManualDiscount: (v: number) => void;
    taxRate: number;
    currency: string;
    onClose?: () => void;
    branches: Branch[];
    currentBranchId: string;
    onBranchChange: (id: string) => void;
}) => {
    return (
        <div className="h-full flex flex-col bg-white dark:bg-slate-900">
            <div className="p-4 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                <h2 className="font-black text-xl flex items-center gap-2 dark:text-white"><ShoppingBag size={20}/> Current Order</h2>
                {props.onClose && <button onClick={props.onClose}><X className="dark:text-white"/></button>}
            </div>

            <div className="p-4 border-b dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
                {/* Branch Selection Context */}
                <div className="p-3 bg-brand-50 dark:bg-brand-900/10 rounded-xl border border-brand-100 dark:border-brand-900/30 flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center text-brand-600 shadow-sm">
                            <Store size={16}/>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 leading-none mb-1">Active Branch</p>
                            <select 
                                value={props.currentBranchId}
                                onChange={(e) => props.onBranchChange(e.target.value)}
                                className="bg-transparent border-none p-0 font-black text-xs uppercase tracking-tight outline-none dark:text-white cursor-pointer"
                            >
                                {props.branches.map(b => <option key={b.id} value={b.id} className="dark:bg-slate-800">{b.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                    {(['dine-in', 'take-out', 'delivery'] as DiningOption[]).map(opt => (
                        <button key={opt} onClick={() => props.setDiningOption(opt)} className={`flex-1 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${props.diningOption === opt ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                            {opt}
                        </button>
                    ))}
                </div>
                {props.selectedTables.length > 0 && (
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300">
                        <MapPin size={16}/> Table: {props.selectedTables.join(', ')}
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {props.cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 opacity-50">
                        <ShoppingBag size={48} strokeWidth={1}/>
                        <p className="font-black uppercase text-xs tracking-widest italic">Ticket is empty</p>
                    </div>
                ) : (
                    props.cart.map((item, i) => (
                        <div key={i} onClick={() => props.openCartItemModal(i)} className="flex justify-between items-start p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all group">
                            <div className="flex items-start gap-3">
                                <span className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 w-6 h-6 rounded flex items-center justify-center text-xs font-bold">{item.qty}</span>
                                <div>
                                    <p className="font-bold text-sm dark:text-white leading-tight">{item.name}</p>
                                    {item.selectedModifiers.length > 0 && <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">{item.selectedModifiers.map(m=>m.name).join(', ')}</p>}
                                    {item.notes && <p className="text-[10px] text-amber-600 dark:text-amber-500 italic mt-0.5">"{item.notes}"</p>}
                                </div>
                            </div>
                            <span className="font-bold text-sm dark:text-white">{props.currency}{((item.price + item.selectedModifiers.reduce((a,b)=>a+b.price,0)) * item.qty).toFixed(2)}</span>
                        </div>
                    ))
                )}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-800 space-y-3">
                {/* Customer Section */}
                <button onClick={props.onCustomerClick} className="w-full flex justify-between items-center p-3 bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 hover:border-brand-400 transition-colors group">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 group-hover:text-brand-500"><User size={16}/></div>
                        <div className="text-left">
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase leading-none mb-1">Customer</p>
                            <p className="font-black text-xs dark:text-white truncate max-w-[120px] tracking-tight">{props.activeCustomer ? props.activeCustomer.name : 'Guest'}</p>
                        </div>
                    </div>
                    {props.activeCustomer ? (
                        <div className="text-right">
                             <p className="text-[10px] font-black text-emerald-500 tracking-tighter uppercase">{props.activeCustomer.points} pts</p>
                        </div>
                    ) : (
                        <ChevronRight size={14} className="text-slate-300"/>
                    )}
                </button>

                {props.activeCustomer && props.activeCustomer.points > 0 && (
                     <div className="space-y-2">
                         <div className="flex justify-between items-center">
                            <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 flex items-center gap-1 uppercase tracking-widest"><Gift size={12}/> Loyalty Rewards</span>
                            {props.selectedReward && <button onClick={() => props.setSelectedReward(null)} className="text-[9px] text-rose-500 font-black uppercase hover:underline">Remove</button>}
                         </div>
                         <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                             {props.rewards.filter(r => r.cost <= (props.activeCustomer?.points || 0)).map(r => (
                                 <button 
                                    key={r.id} 
                                    onClick={() => props.setSelectedReward(r.id === props.selectedReward?.id ? null : r)}
                                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-tighter transition-all ${props.selectedReward?.id === r.id ? 'bg-brand-500 text-white border-brand-500' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}
                                 >
                                     {r.name}
                                 </button>
                             ))}
                             {props.rewards.filter(r => r.cost <= (props.activeCustomer?.points || 0)).length === 0 && (
                                 <span className="text-[10px] italic text-slate-400 font-medium">No rewards available yet</span>
                             )}
                         </div>
                     </div>
                )}

                <div className="space-y-1 pt-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400"><span>Subtotal</span><span className="text-slate-700 dark:text-slate-200">{props.currency}{props.cartSubtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400"><span>Tax ({(props.taxRate * 100).toFixed(0)}%)</span><span className="text-slate-700 dark:text-slate-200">{props.currency}{props.cartTax.toFixed(2)}</span></div>
                    
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-rose-500">
                        <span>Discount</span>
                        <div className="flex items-center gap-1">
                            <span>- {props.currency}</span>
                            <input 
                                type="number" 
                                className="w-16 p-1 text-right bg-transparent border-b border-rose-200 focus:border-rose-500 outline-none font-black" 
                                value={props.manualDiscount || ''} 
                                onChange={(e) => props.setManualDiscount(parseFloat(e.target.value) || 0)}
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    {props.selectedReward && <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-brand-500"><span>Reward Applied</span><span>-{props.currency}{props.selectedReward.value.toFixed(2)}</span></div>}
                    <div className="flex justify-between text-2xl font-black dark:text-white pt-2 border-t dark:border-slate-700 mt-2 tracking-tighter"><span>Total</span><span>{props.currency}{props.cartTotal.toFixed(2)}</span></div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button onClick={props.placeOrder} disabled={props.cart.length === 0} className="py-3 bg-slate-900 dark:bg-slate-700 text-white rounded-xl font-black uppercase text-[11px] tracking-widest disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800 transition-all active:scale-95 shadow-lg">Kitchen</button>
                    <button onClick={props.handlePayNow} disabled={props.cart.length === 0} className="py-3 bg-brand-600 text-white rounded-xl font-black uppercase text-[11px] tracking-widest disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-700 transition-all active:scale-95 shadow-lg shadow-brand-500/20">Pay Now</button>
                </div>
            </div>
        </div>
    );
};
