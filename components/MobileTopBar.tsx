import React from 'react';
import { ShoppingBag, CreditCard } from 'lucide-react';

export const MobileTopBar = ({
    itemCount,
    totalAmount,
    currency,
    onCartClick,
    onPayClick,
    isPayDisabled
}: {
    itemCount: number;
    totalAmount: number;
    currency: string;
    onCartClick: () => void;
    onPayClick: () => void;
    isPayDisabled: boolean;
}) => {
    return (
        <div className="md:hidden fixed top-16 left-0 right-0 h-14 bg-white dark:bg-slate-900 border-b dark:border-slate-800 px-4 flex items-center justify-between gap-3 z-40 shadow-sm">
            <button
                onClick={onCartClick}
                className="flex-1 flex items-center justify-between gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-3 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors active:scale-95"
            >
                <div className="flex items-center gap-2">
                    <ShoppingBag size={20} className="text-slate-600 dark:text-slate-400" />
                    {itemCount > 0 && (
                        <span className="bg-brand-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            {itemCount}
                        </span>
                    )}
                </div>
                <span className="font-bold text-sm dark:text-white">
                    {currency}{totalAmount.toFixed(2)}
                </span>
            </button>

            <button
                onClick={onPayClick}
                disabled={isPayDisabled}
                className="flex-shrink-0 h-12 w-12 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-lg flex items-center justify-center transition-colors active:scale-95 disabled:cursor-not-allowed shadow-md"
                title="Proceed to payment"
            >
                <CreditCard size={20} />
            </button>
        </div>
    );
};
