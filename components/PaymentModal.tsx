import React, { useState } from 'react';
import { CreditCard, Banknote, AlertCircle, CheckCircle, X } from 'lucide-react';
import { Modal } from './Shared';

interface PaymentModalProps {
  isOpen: boolean;
  totalAmount: number;
  currency: string;
  onPaymentComplete: (cashAmount: number, cardAmount: number, cardRef?: string) => Promise<void>;
  onClose: () => void;
  isProcessing?: boolean;
}

export function PaymentModal({
  isOpen,
  totalAmount,
  currency,
  onPaymentComplete,
  onClose,
  isProcessing = false
}: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'partial'>('cash');
  const [cashAmount, setCashAmount] = useState(0);
  const [cardAmount, setCardAmount] = useState(0);
  const [cardReference, setCardReference] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleMethodChange = (method: 'cash' | 'card' | 'partial') => {
    setPaymentMethod(method);
    setError(null);

    if (method === 'cash') {
      setCashAmount(totalAmount);
      setCardAmount(0);
    } else if (method === 'card') {
      setCashAmount(0);
      setCardAmount(totalAmount);
    } else {
      setCashAmount(totalAmount / 2);
      setCardAmount(totalAmount / 2);
    }
  };

  const totalEntered = cashAmount + cardAmount;
  const variance = Math.abs(totalEntered - totalAmount);
  const isValid = variance < 0.01;

  const handlePaymentSubmit = async () => {
    if (!isValid) {
      setError(`Payment mismatch: Expected ${totalAmount.toFixed(2)}, entered ${totalEntered.toFixed(2)}`);
      return;
    }

    if (cardAmount > 0 && !cardReference.trim()) {
      setError('Card reference/receipt number is required');
      return;
    }

    try {
      await onPaymentComplete(cashAmount, cardAmount, cardReference);
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setCashAmount(0);
        setCardAmount(0);
        setCardReference('');
        setError(null);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment processing failed');
    }
  };

  const renderAmount = (amount: number) => `${currency} ${amount.toFixed(3)}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Process Payment">
      <div className="space-y-6 text-sm">
        {success ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle size={32} className="text-green-600 dark:text-green-400" />
            </div>
            <p className="font-bold text-green-700 dark:text-green-300">Payment Processed Successfully</p>
          </div>
        ) : (
          <>
            <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase mb-2">Total Amount Due</p>
              <p className="text-3xl font-black text-slate-900 dark:text-white">{renderAmount(totalAmount)}</p>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">Payment Method</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'cash', icon: Banknote, label: 'Cash' },
                  { id: 'card', icon: CreditCard, label: 'Card' },
                  { id: 'partial', icon: null, label: 'Split' }
                ].map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    onClick={() => handleMethodChange(id as any)}
                    className={`p-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                      paymentMethod === id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    {Icon && <Icon size={16} />}
                    <span className="text-xs font-bold">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {(paymentMethod === 'cash' || paymentMethod === 'partial') && (
              <div>
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-2 block">
                  Cash Amount
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={totalAmount}
                    value={cashAmount}
                    onChange={(e) => setCashAmount(parseFloat(e.target.value) || 0)}
                    disabled={isProcessing}
                    className="flex-1 px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-sm"
                  />
                  <button
                    onClick={() => setCashAmount(totalAmount)}
                    className="px-4 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                  >
                    Full
                  </button>
                </div>
              </div>
            )}

            {(paymentMethod === 'card' || paymentMethod === 'partial') && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-2 block">
                    Card Amount
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={totalAmount}
                      value={cardAmount}
                      onChange={(e) => setCardAmount(parseFloat(e.target.value) || 0)}
                      disabled={isProcessing}
                      className="flex-1 px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-sm"
                    />
                    <button
                      onClick={() => setCardAmount(totalAmount)}
                      className="px-4 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                    >
                      Full
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-2 block">
                    Card Reference / Receipt #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 1234567890"
                    value={cardReference}
                    onChange={(e) => setCardReference(e.target.value)}
                    disabled={isProcessing}
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                  />
                </div>
              </div>
            )}

            {paymentMethod === 'partial' && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 rounded-lg">
                <p className="text-xs font-semibold text-blue-900 dark:text-blue-200">
                  Cash: {renderAmount(cashAmount)} + Card: {renderAmount(cardAmount)}
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  Total: {renderAmount(totalEntered)}
                </p>
              </div>
            )}

            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-slate-600 dark:text-slate-400">Amount Entered:</span>
                <span className={`font-mono font-bold ${isValid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {renderAmount(totalEntered)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">Expected:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {renderAmount(totalAmount)}
                </span>
              </div>
              {!isValid && (
                <div className="text-xs text-red-600 dark:text-red-400 mt-2 font-semibold">
                  Variance: {renderAmount(variance)}
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-lg flex gap-2">
                <AlertCircle size={16} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isProcessing}
                className="flex-1 px-4 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-bold uppercase text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePaymentSubmit}
                disabled={!isValid || isProcessing}
                className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-bold uppercase text-xs transition-colors active:scale-95"
              >
                {isProcessing ? 'Processing...' : 'Complete Payment'}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
