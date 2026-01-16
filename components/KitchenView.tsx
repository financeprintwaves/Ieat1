import React, { useState, useEffect, useMemo } from 'react';
import { ChefHat, Clock, PlayCircle, CheckCircle2, AlertCircle, List, LayoutGrid, Store } from 'lucide-react';
import { Order, OrderItem, Branch, Role } from '../types';
import { db } from '../services/db';

interface KitchenViewProps {
    orders: Order[];
    currentUser: any;
    onCompleteItem: (orderId: string, idx: number) => void;
    onReadyOrder: (orderId: string) => void;
    onExitKitchen: () => void;
}

export const KitchenView = ({ orders, currentUser, onCompleteItem, onReadyOrder, onExitKitchen }: KitchenViewProps) => {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [showStats, setShowStats] = useState(false);

    const isAdmin = currentUser?.role === Role.Admin;

    useEffect(() => {
        db.getBranches().then(setBranches);
    }, []);

    const activeOrders = useMemo(() => {
        return orders
            .filter((o: Order) => ['pending', 'cooking'].includes(o.status))
            .map(order => ({
                ...order,
                kitchenItems: order.items.filter(item => item.isKitchenItem)
            }))
            .filter(order => order.kitchenItems.length > 0)
            .sort((a, b) => a.createdAt - b.createdAt);
    }, [orders]);

    const getBranchName = (branchId?: string) => {
        return branches.find(b => b.id === branchId)?.name || 'Main Branch';
    };

    const getElapsedTime = (startTime: number) => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleUpdateItemStatus = async (orderId: string, itemIndex: number, newStatus: 'waiting' | 'preparing' | 'done') => {
        try {
            await db.updateOrderItemKitchenStatus(orderId, itemIndex, newStatus);
        } catch (error) {
            console.error('Error updating item status:', error);
        }
    };

    const getStatusColor = (status?: 'waiting' | 'preparing' | 'done') => {
        switch (status) {
            case 'preparing':
                return {
                    bg: 'bg-blue-50 dark:bg-blue-900/20',
                    border: 'border-blue-200 dark:border-blue-800',
                    text: 'text-blue-700 dark:text-blue-300',
                    badge: 'bg-blue-500 text-white'
                };
            case 'done':
                return {
                    bg: 'bg-green-50 dark:bg-green-900/20',
                    border: 'border-green-200 dark:border-green-800',
                    text: 'text-green-700 dark:text-green-300',
                    badge: 'bg-green-500 text-white'
                };
            default:
                return {
                    bg: 'bg-orange-50 dark:bg-orange-900/20',
                    border: 'border-orange-200 dark:border-orange-800',
                    text: 'text-orange-700 dark:text-orange-300',
                    badge: 'bg-orange-500 text-white'
                };
        }
    };

    const getStatusLabel = (status?: 'waiting' | 'preparing' | 'done') => {
        switch (status) {
            case 'preparing':
                return 'Preparing';
            case 'done':
                return 'Done';
            default:
                return 'Waiting';
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-100 dark:bg-slate-950 p-4">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-sm border dark:border-slate-700">
                        <ChefHat className="text-orange-500" size={28} />
                    </div>
                    <div>
                        <h2 className="font-black text-2xl text-slate-800 dark:text-white uppercase tracking-tighter leading-none">
                            Kitchen Display
                        </h2>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">
                            {activeOrders.length} ACTIVE ORDERS
                        </p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={onExitKitchen}
                        className="bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-4 py-2.5 rounded-xl font-black uppercase tracking-widest shadow-sm hover:bg-slate-800 transition-all flex items-center gap-2 text-[10px]"
                    >
                        <LayoutGrid size={16} /> Exit Kitchen
                    </button>
                </div>
            </div>

            {/* Orders Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pb-20">
                {activeOrders.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 opacity-50">
                        <ChefHat size={64} className="text-slate-400 mb-4 animate-bounce" />
                        <h3 className="text-2xl font-black text-slate-500 uppercase tracking-widest">All Clear!</h3>
                        <p className="text-slate-400 font-bold">Waiting for new orders...</p>
                    </div>
                )}

                {activeOrders.map((order) => {
                    const allItemsDone = order.kitchenItems.every((item: OrderItem) => item.kitchenStatus === 'done');
                    const orderDate = new Date(order.createdAt);
                    const elapsedMinutes = Math.floor((Date.now() - order.createdAt) / 60000);
                    const isUrgent = elapsedMinutes > 15;

                    return (
                        <div
                            key={order.uuid}
                            className={`bg-white dark:bg-slate-900 rounded-2xl shadow-xl border-t-4 ${
                                allItemsDone
                                    ? 'border-green-500'
                                    : isUrgent
                                    ? 'border-red-500 animate-pulse'
                                    : 'border-orange-500'
                            } flex flex-col`}
                        >
                            {/* Order Header */}
                            <div className="p-4 border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">
                                                Order No
                                            </span>
                                            <span className="text-lg font-black text-brand-600 dark:text-brand-400 font-mono">
                                                #{order.uuid.slice(0, 8)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Store size={12} className="text-slate-400" />
                                            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
                                                {getBranchName(order.branchId)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`flex items-center gap-1 text-xs font-bold ${isUrgent ? 'text-red-600' : 'text-slate-600 dark:text-slate-400'}`}>
                                            <Clock size={14} />
                                            <span>{elapsedMinutes} min</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs mt-3">
                                    <div>
                                        <span className="text-slate-500 dark:text-slate-400 font-semibold">Table:</span>
                                        <span className="ml-1 font-bold dark:text-white">
                                            {order.tableNo || order.diningOption}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 dark:text-slate-400 font-semibold">Time:</span>
                                        <span className="ml-1 font-bold dark:text-white">
                                            {orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Items List */}
                            <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                                {order.kitchenItems.map((item: OrderItem, idx: number) => {
                                    const status = item.kitchenStatus || 'waiting';
                                    const colors = getStatusColor(status);
                                    const originalIndex = order.items.findIndex(i => i === item);

                                    return (
                                        <div
                                            key={idx}
                                            className={`${colors.bg} border ${colors.border} rounded-xl p-3 transition-all`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="bg-slate-900 dark:bg-white dark:text-slate-900 text-white w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black">
                                                            {item.qty}
                                                        </span>
                                                        <span className="font-bold text-sm dark:text-white">
                                                            {item.name}
                                                        </span>
                                                    </div>
                                                    {item.notes && (
                                                        <div className="mt-2 p-2 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-800 rounded-lg">
                                                            <p className="text-xs font-bold text-yellow-800 dark:text-yellow-200 italic">
                                                                Note: {item.notes}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                                <span className={`${colors.badge} px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider`}>
                                                    {getStatusLabel(status)}
                                                </span>
                                            </div>

                                            {/* Status Control Buttons */}
                                            <div className="flex gap-2 mt-3">
                                                {status === 'waiting' && (
                                                    <button
                                                        onClick={() => handleUpdateItemStatus(order.uuid, originalIndex, 'preparing')}
                                                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs uppercase tracking-wide transition-all active:scale-95 flex items-center justify-center gap-2"
                                                    >
                                                        <PlayCircle size={14} />
                                                        Start
                                                    </button>
                                                )}
                                                {status === 'preparing' && (
                                                    <button
                                                        onClick={() => handleUpdateItemStatus(order.uuid, originalIndex, 'done')}
                                                        className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-xs uppercase tracking-wide transition-all active:scale-95 flex items-center justify-center gap-2"
                                                    >
                                                        <CheckCircle2 size={14} />
                                                        Complete
                                                    </button>
                                                )}
                                                {status === 'done' && (
                                                    <div className="flex-1 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-2">
                                                        <CheckCircle2 size={14} />
                                                        Completed
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Ready Button */}
                            {allItemsDone && (
                                <div className="p-4 border-t dark:border-slate-800 bg-green-50 dark:bg-green-900/20">
                                    <button
                                        onClick={() => onReadyOrder(order.uuid)}
                                        className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle2 size={16} />
                                        Ready to Serve
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
