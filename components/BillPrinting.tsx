import React, { useRef, useState, useEffect } from 'react';
import { Download, Printer, Copy, X, Usb, Check, AlertCircle } from 'lucide-react';
import { Order, AppSettings } from '../types';
import { printerService } from '../services/printerService';

interface BillPrintingProps {
  order: Order;
  settings: AppSettings;
  onClose: () => void;
  onPrint?: () => void;
  variant?: 'customer' | 'kitchen' | 'admin';
}

export function BillPrinting({
  order,
  settings,
  onClose,
  onPrint,
  variant = 'customer'
}: BillPrintingProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [usbPrinterStatus, setUsbPrinterStatus] = useState<{ connected: boolean; printerName: string | null }>({ connected: false, printerName: null });
  const [isUsbPrinting, setIsUsbPrinting] = useState(false);
  const [usbPrintError, setUsbPrintError] = useState<string | null>(null);

  useEffect(() => {
    const status = printerService.getStatus();
    setUsbPrinterStatus(status);
  }, []);

  const handlePrint = () => {
    if (printRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(printRef.current.innerHTML);
        printWindow.document.close();
        printWindow.print();
        onPrint?.();
      }
    }
  };

  const handleConnectUSBPrinter = async () => {
    try {
      setUsbPrintError(null);
      const connected = await printerService.requestPrinter();
      if (connected) {
        const status = printerService.getStatus();
        setUsbPrinterStatus(status);
      }
    } catch (error) {
      console.error('Failed to connect to USB printer:', error);
      setUsbPrintError('Failed to connect to printer. Make sure your printer is connected via USB.');
    }
  };

  const handleUSBPrint = async () => {
    if (!usbPrinterStatus.connected) {
      setUsbPrintError('No USB printer connected. Please connect a printer first.');
      return;
    }

    setIsUsbPrinting(true);
    setUsbPrintError(null);

    try {
      if (variant === 'kitchen') {
        await printerService.printKitchenOrder(order, 'iEat POS');
      } else {
        await printerService.printReceipt(
          order,
          'iEat POS',
          'Restaurant Management System',
          settings.currencySymbol
        );
      }
      onPrint?.();
    } catch (error) {
      console.error('Failed to print via USB:', error);
      setUsbPrintError('Failed to print. Please check your printer connection.');
    } finally {
      setIsUsbPrinting(false);
    }
  };

  const handleDownloadPDF = () => {
    const element = printRef.current;
    if (!element) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 400;
    canvas.height = element.scrollHeight;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `receipt-${order.uuid}.png`;
      link.click();
    };
    img.src = 'data:text/html;base64,' + btoa(element.innerHTML);
  };

  const paymentBreakdown = (order as any).payment_breakdown_json || {};
  const cashAmount = paymentBreakdown.cashAmount || 0;
  const cardAmount = paymentBreakdown.cardAmount || 0;

  const formatCurrency = (amount: number) => `${settings.currencySymbol}${amount.toFixed(2)}`;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-md max-h-[90vh] flex flex-col w-full">
        <div className="flex justify-between items-center p-4 border-b dark:border-slate-800">
          <h3 className="font-bold text-lg">Bill / Receipt</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div
            ref={printRef}
            className="w-full bg-white text-slate-900 p-6 font-mono text-sm space-y-3"
            style={{ fontSize: '11px' }}
          >
            <div className="text-center space-y-1 pb-3 border-b border-slate-300">
              <div className="font-bold text-lg">iEat POS</div>
              <div className="text-xs">Restaurant Management System</div>
              <div className="text-xs">{new Date(order.createdAt).toLocaleString()}</div>
            </div>

            <div className="space-y-1 pb-3 border-b border-slate-300">
              <div className="flex justify-between">
                <span>Order #</span>
                <span className="font-bold">{order.uuid.slice(0, 8).toUpperCase()}</span>
              </div>
              {order.tableNo && (
                <div className="flex justify-between">
                  <span>Table</span>
                  <span className="font-bold">{order.tableNo}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Type</span>
                <span className="capitalize">{order.diningOption}</span>
              </div>
              {order.serverName && (
                <div className="flex justify-between">
                  <span>Server</span>
                  <span>{order.serverName}</span>
                </div>
              )}
            </div>

            {variant !== 'kitchen' && (
              <div className="space-y-1 pb-3 border-b border-slate-300">
                <div className="font-bold mb-2">Items</div>
                {order.items.map((item, i) => (
                  <div key={i} className="space-y-0.5">
                    <div className="flex justify-between">
                      <span>{item.name}</span>
                      <span>{item.qty} x {formatCurrency(item.price)}</span>
                    </div>
                    {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                      <div className="text-xs text-slate-600 ml-2">
                        {item.selectedModifiers.map(m => m.name).join(', ')}
                      </div>
                    )}
                    {item.notes && (
                      <div className="text-xs text-slate-600 italic ml-2">Note: {item.notes}</div>
                    )}
                    <div className="flex justify-between text-xs text-slate-700">
                      <span></span>
                      <span>{formatCurrency((item.price + item.selectedModifiers.reduce((a: number, b: any) => a + b.price, 0)) * item.qty)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {variant === 'kitchen' && (
              <div className="space-y-1 pb-3 border-b border-slate-300">
                <div className="font-bold mb-2">Prep Items</div>
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span>{item.qty}x {item.name}</span>
                    <span>{item.completed ? '✓ DONE' : '◯ PENDING'}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-1 pb-3 border-b border-slate-300">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Tax ({(settings.taxRate * 100).toFixed(0)}%)</span>
                <span>{formatCurrency(order.tax)}</span>
              </div>
            </div>

            <div className="pb-3 border-b border-slate-300">
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{formatCurrency(order.totalAmount)}</span>
              </div>
            </div>

            {variant !== 'kitchen' && order.status === 'paid' && (
              <div className="space-y-1 pb-3 border-b border-slate-300">
                <div className="font-bold mb-2">Payment</div>
                {cashAmount > 0 && (
                  <div className="flex justify-between">
                    <span>Cash</span>
                    <span>{formatCurrency(cashAmount)}</span>
                  </div>
                )}
                {cardAmount > 0 && (
                  <div className="flex justify-between">
                    <span>Card</span>
                    <span>{formatCurrency(cardAmount)}</span>
                  </div>
                )}
                {paymentBreakdown.cardReference && (
                  <div className="flex justify-between text-xs">
                    <span>Ref</span>
                    <span>{paymentBreakdown.cardReference}</span>
                  </div>
                )}
              </div>
            )}

            <div className="text-center space-y-2 pt-3">
              <div className="text-xs font-bold">Thank You!</div>
              <div className="text-xs">Powered by iEat POS</div>
              <div className="text-xs text-slate-600">Visit us again soon</div>
            </div>

            {variant === 'admin' && (
              <div className="text-center text-xs pt-3 border-t border-slate-300 mt-3">
                <div className="font-bold mb-1">Admin Details</div>
                <div>Status: {order.status}</div>
                <div>Sync: {(order as any).sync_status || 'synced'}</div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t dark:border-slate-800 space-y-3 bg-slate-50 dark:bg-slate-800">
          {usbPrintError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-lg flex gap-2">
              <AlertCircle size={16} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 dark:text-red-300">{usbPrintError}</p>
            </div>
          )}

          {usbPrinterStatus.connected && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-2 rounded-lg flex items-center gap-2">
              <Check size={14} className="text-green-600 dark:text-green-400" />
              <span className="text-xs text-green-700 dark:text-green-300">
                USB Printer Connected: {usbPrinterStatus.printerName || 'Unknown'}
              </span>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleUSBPrint}
              disabled={!usbPrinterStatus.connected || isUsbPrinting}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <Usb size={16} />
              {isUsbPrinting ? 'Printing...' : 'USB Print'}
            </button>

            {!usbPrinterStatus.connected && (
              <button
                onClick={handleConnectUSBPrinter}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <Usb size={16} />
                Connect Printer
              </button>
            )}

            <button
              onClick={handlePrint}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <Printer size={16} />
              Browser Print
            </button>

            <button
              onClick={handleDownloadPDF}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <Download size={16} />
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg font-bold text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
