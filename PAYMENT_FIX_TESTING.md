# Payment Fix - Testing & Troubleshooting Guide

## Quick Summary
**Issue**: Payments were showing "successful" locally but not syncing to Supabase/MySQL  
**Fix**: Added automatic sync trigger after payment completion  
**Status**: ✅ FIXED

## What Changed

### File: App.tsx (Line 393-400)
Added automatic sync after payment is queued:
```typescript
setTimeout(async () => {
    try {
        console.log('Auto-syncing payment to cloud...');
        await handleSync();
    } catch (err) {
        console.error('Auto-sync failed, will retry on next manual sync:', err);
    }
}, 1000);
```

### File: App.tsx (Line 124-146)
Enhanced logging in sync function to track payment operations.

## Testing Procedure

### Step 1: Create Test Order
1. Add items to cart (e.g., 2x Coffee, 1x Pastry)
2. View total amount

### Step 2: Process Payment
1. Click **"Settle & Print"** button
2. Select payment method:
   - **Cash**: Enter cash amount
   - **Card**: Enter card amount + receipt number
   - **Split**: Mix of cash and card
3. Click **"Complete Payment"**
4. See "Payment Successful!" message

### Step 3: Monitor Console Logs
Open Developer Tools (F12) → Console tab and look for:

```
Starting payment process with: {cashAmount: X, cardAmount: Y, cardRef: "..."}
Payment transaction created
Marking order as paid with method: cash
Order payment status updated
Payment sync operation queued: payment-1234567890-abc123
Auto-syncing payment to cloud...
Syncing payment operation: payment-1234567890-abc123
Successfully synced operation: payment-1234567890-abc123
```

✅ If you see these logs in order = **SUCCESS**

### Step 4: Verify in Supabase
1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to your project
3. Check **Tables → payment_transactions**
   - New record should exist with:
     - `order_id`: Your order UUID
     - `transaction_type`: 'cash', 'card', or 'partial'
     - `status`: 'completed'
     - `total_amount`: Correct amount
4. Check **Tables → orders**
   - Order record should have:
     - `status`: 'paid'
     - `payment_status`: 'complete'
     - `payment_method`: 'cash', 'card', or 'split'
     - `paid_at`: Current timestamp

### Step 5: Verify in MySQL (Backend)
If you have MySQL access:
```sql
-- Check payment transaction was synced
SELECT * FROM payment_transactions WHERE order_id = 'YOUR_ORDER_UUID';

-- Check order status
SELECT id, status, payment_status, payment_method, paid_at 
FROM orders WHERE uuid = 'YOUR_ORDER_UUID';
```

### Step 6: Check Bills/Reports
1. Go to Reports or Admin panel
2. Find the order by table number or date
3. Verify it shows as **"PAID"**
4. Verify payment method is displayed correctly

## Troubleshooting

### Issue: "Auto-sync failed, will retry on next manual sync"

**Possible Causes:**
1. Backend server (server.js) not running
2. Network connectivity issue
3. Incorrect API endpoint configuration

**Solution:**
- Check backend is running: `node server.js` should show "iEat Backend running on port 3001"
- Verify CORS settings in server.js allow requests
- Check browser network tab (F12 → Network) for failed requests to `/api/sync/payment`
- Manually click "Sync to Cloud" button to retry

### Issue: Payment synced but order still shows as unpaid

**Possible Causes:**
1. Page not refreshed after sync
2. Cache issue
3. Wrong order ID

**Solution:**
- Refresh the page (F5 or Cmd+R)
- Clear browser cache
- Check console logs to verify sync succeeded
- Verify order UUID in payment record matches the displayed order

### Issue: Payment appears in Supabase but not in MySQL

**Possible Causes:**
1. Server endpoint not receiving data correctly
2. MySQL connection issue
3. Data validation failure

**Solution:**
- Check server.js logs for errors
- Verify server.js has correct MySQL credentials
- Check that all required fields are present in sync data:
  - orderId
  - totalAmount
  - cashAmount or cardAmount

### Issue: Console shows no auto-sync logs

**Possible Causes:**
1. Browser console not open when payment processed
2. Auto-sync already completed before checking logs
3. handleSync() not defined

**Solution:**
- Open DevTools BEFORE clicking payment button
- Filter console for "Auto-sync" or "Sync" keywords
- Check if payment appears in IndexedDB manually:
  1. F12 → Application tab → IndexedDB
  2. Look for database "ieatpos_offline"
  3. Check "sync_queue" store
  4. If operations are still pending, sync failed

## Browser Storage Inspection

### Accessing Local Data (F12 → Application)

**IndexedDB - Sync Queue:**
```
ieatpos_offline → sync_queue
```
Look for pending payment operations. If they exist after 5 seconds, sync failed.

**IndexedDB - Orders:**
```
ieatpos_offline → orders
```
Should show your order with status 'paid' and payment details.

**LocalStorage:**
Useful for debugging authentication and app state.

## Console Commands for Quick Testing

Paste these in browser console (F12 → Console):

```javascript
// Check pending sync operations
const pending = await offlineStorage.getPendingSyncOperations();
console.log('Pending operations:', pending);

// Check order status locally
const order = await offlineStorage.getOrder('ORDER_UUID_HERE');
console.log('Order status:', order);

// Manually trigger sync
await handleSync();
```

## Expected Timeline

After clicking "Complete Payment":
- **0s**: Payment Successful! message shown
- **0-1s**: Local data updated, sync queued
- **1s**: Auto-sync starts
- **1-2s**: Payment sent to backend
- **2s**: "Payment Successful!" clears from screen
- **3s**: Page refreshes with updated data

Total time: **~3-4 seconds** for full payment cycle.

## Success Criteria Checklist

✅ Payment shows "successful" immediately  
✅ Console shows auto-sync logs  
✅ Supabase shows payment_transactions record  
✅ Supabase shows order.payment_status = 'complete'  
✅ MySQL shows updated order status  
✅ Bills/reports show order as paid  
✅ Subsequent syncs don't re-process same payment  

## If Issues Persist

1. **Collect these logs:**
   - Browser console output (F12 → Console, right-click → Save as)
   - Server logs (terminal where server.js is running)
   - Network tab showing `/api/sync/payment` requests

2. **Check these files:**
   - App.tsx - handlePaymentComplete function (line ~330)
   - services/api.ts - syncPayment method (line ~58)
   - server.js - /api/sync/payment endpoint (line ~114)
   - services/db.ts - createPaymentTransaction (line ~713)

3. **Verify setup:**
   - `.env` file has correct VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
   - `.env.local` has correct DB_HOST, DB_USER, DB_PASSWORD
   - Backend port 3001 is not in use by another service
   - MySQL/Supabase connections are working
