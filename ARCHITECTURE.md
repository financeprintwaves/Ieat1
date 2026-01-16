# iEat POS - System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     iEat POS Application                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Waiter     │  │   Kitchen    │  │    Admin     │          │
│  │     POS      │  │   Display    │  │  Dashboard   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         │                  │                  │                 │
└─────────────────────────────────────────────────────────────────┘
         │                  │                  │
    ┌────┴──────────────────┴──────────────────┴────┐
    │                                                │
    │        Core Business Logic Layer              │
    │                                                │
    │  ┌───────────────────────────────────────┐   │
    │  │   PaymentService                      │   │
    │  │   ├─ validatePartialPayment()         │   │
    │  │   ├─ processPayment()                 │   │
    │  │   ├─ requestRefund()                  │   │
    │  │   └─ reconcileCash()                  │   │
    │  └───────────────────────────────────────┘   │
    │                                                │
    │  ┌───────────────────────────────────────┐   │
    │  │   ReportingService                    │   │
    │  │   ├─ getSalesReport()                 │   │
    │  │   ├─ getItemSalesReport()             │   │
    │  │   ├─ getUserPerformanceReport()       │   │
    │  │   └─ getPaymentSplitReport()          │   │
    │  └───────────────────────────────────────┘   │
    │                                                │
    │  ┌───────────────────────────────────────┐   │
    │  │   OfflineStorageService               │   │
    │  │   ├─ saveOrder()                      │   │
    │  │   ├─ queueSyncOperation()             │   │
    │  │   ├─ getCacheEntry()                  │   │
    │  │   └─ getPendingSyncOperations()       │   │
    │  └───────────────────────────────────────┘   │
    │                                                │
    └────────────────────┬─────────────────────────┘
                         │
         ┌───────────────┴──────────────────┐
         │                                   │
    ┌────▼─────────┐              ┌────────▼─────┐
    │  Supabase    │              │  IndexedDB   │
    │  PostgreSQL  │              │  (Offline)   │
    └──────────────┘              └──────────────┘
```

---

## Database Schema

### Core Tables (Existing)
```
├── orders
├── order_items
├── menu_items
├── employees
├── customers
├── branches
├── tables
├── inventory_logs
├── attendance_logs
└── loyalty_rewards
```

### Enhanced Tables (New)
```
├── payment_transactions
│   ├── id (uuid, PK)
│   ├── order_id (FK)
│   ├── transaction_type (cash|card|partial)
│   ├── cash_amount, card_amount
│   ├── validation_status (pending|valid|mismatch)
│   ├── status (pending|completed|refunded|failed)
│   ├── payment_reference (card receipt)
│   └── processed_by_id (FK)
│
├── payment_ledger
│   ├── id (uuid, PK)
│   ├── transaction_id (FK)
│   ├── employee_id (FK)
│   ├── branch_id (FK)
│   ├── cash_in, cash_out
│   ├── balance_difference
│   └── reconciled_at
│
├── refund_history
│   ├── id (uuid, PK)
│   ├── order_id (FK)
│   ├── original_transaction_id (FK)
│   ├── refund_amount
│   ├── refund_method (cash|card|partial)
│   ├── reason
│   ├── approved_by_id (FK)
│   ├── status (pending|completed|failed)
│   └── processed_at
│
└── audit_logs
    ├── id (uuid, PK)
    ├── employee_id (FK)
    ├── branch_id (FK)
    ├── action_type (string)
    ├── resource_type (string)
    ├── resource_id (uuid)
    ├── old_values (jsonb)
    ├── new_values (jsonb)
    ├── ip_address
    └── created_at
```

### Modifications to Existing Tables
```
orders
├── +payment_status (pending|partial|complete)
└── +payment_breakdown_json (jsonb)
```

---

## Data Flow Diagrams

### Payment Processing Flow
```
┌──────────────┐
│ Order Ready  │
│ for Payment  │
└────────┬─────┘
         │
         ▼
┌──────────────────────┐
│ Open PaymentModal    │ ◄──── User enters cash+card amounts
├──────────────────────┤
│ - Cash Amount Input  │ ◄──── Card Reference Input (if card)
│ - Card Amount Input  │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────────┐
│ validatePartialPayment() │
├──────────────────────────┤
│ Check: |total_entered    │
│   - total_expected|      │ < 0.01 (tolerance)
└────────┬─────────────────┘
         │
    ┌────┴─────────┐
    │              │
  VALID         INVALID
    │              │
    ▼              ▼
┌─────────┐    ┌──────────┐
│ Process │    │ Show     │
│ Payment │    │ Error    │
└────┬────┘    │ Message  │
     │         └──────────┘
     ▼
┌─────────────────────────┐
│ createPaymentTransaction│
├─────────────────────────┤
│ - Insert into DB        │
│ - Create Audit Log      │
│ - Update Order Status   │
└────────┬────────────────┘
         │
         ▼
┌─────────────────┐
│ Payment Success │ ◄──── Generate Receipt
└─────────────────┘
```

### Reporting Data Flow
```
┌────────────────┐
│ Admin Opens    │
│ Reports Tab    │
└────────┬───────┘
         │
         ▼
┌──────────────────────┐
│ Select Filters:      │
│ - Date Range         │
│ - Branch             │
│ - Report Type        │
└────────┬─────────────┘
         │
         ▼
┌────────────────────────────┐
│ ReportingService           │
├────────────────────────────┤
│ Query payment_transactions │
│ Query order_items          │
│ Query orders               │
│ Query menu_items           │
│ Aggregate & Calculate      │
└────────┬───────────────────┘
         │
         ▼
┌──────────────────────┐
│ Return Report Data:  │
│ - Sales Summary      │
│ - Item Rankings      │
│ - User Performance   │
│ - Payment Split      │
└──────────────────────┘
```

### Offline Sync Flow
```
┌──────────────┐
│ App Offline  │
└────────┬─────┘
         │
    ┌────┴────────────────────┐
    │                         │
    ▼                         ▼
┌─────────────┐    ┌───────────────────┐
│ Create      │    │ Queue Operation   │
│ Order (POS) │    │ to Sync Queue     │
└────┬────────┘    │                   │
     │             │ - Type: Action    │
     │             │ - Data: Payload   │
     │             │ - Timestamp       │
     │             └────┬──────────────┘
     │                  │
     └──────────┬───────┘
                │
                ▼
        ┌──────────────────┐
        │ IndexedDB Stores │
        │ - Orders         │
        │ - Queue Item     │
        └────────┬─────────┘
                 │
         [App Regains Connection]
                 │
                 ▼
        ┌──────────────────────┐
        │ getPendingSyncOps()  │
        └────────┬─────────────┘
                 │
                 ▼
        ┌──────────────────────┐
        │ Process Each Op:     │
        │ - Send to Server     │
        │ - Verify Success     │
        │ - Mark Completed     │
        └────────┬─────────────┘
                 │
                 ▼
        ┌──────────────────────┐
        │ Sync Complete        │
        │ App = Latest Data    │
        └──────────────────────┘
```

---

## Role-Based Access Control

```
┌─────────────────────────────────────────────────────────────┐
│                    RBAC Matrix                              │
├──────────────────┬──────────┬──────────┬────────────────────┤
│ Resource         │ Waiter   │ Kitchen  │ Admin              │
├──────────────────┼──────────┼──────────┼────────────────────┤
│ Orders (View)    │ Own + All│ Active   │ All                │
│ Orders (Create)  │ YES      │ NO       │ YES                │
│ Orders (Update)  │ Own      │ Status   │ All                │
│ Orders (Delete)  │ NO       │ NO       │ YES                │
│                  │          │          │                    │
│ Payments (View)  │ YES      │ NO       │ YES                │
│ Payments (Create)│ YES      │ NO       │ YES                │
│ Refunds (View)   │ NO       │ NO       │ YES                │
│ Refunds (Approve)│ NO       │ NO       │ YES                │
│                  │          │          │                    │
│ Menu (View)      │ YES      │ YES      │ YES                │
│ Menu (Edit)      │ NO       │ NO       │ YES                │
│                  │          │          │                    │
│ Inventory (View) │ NO       │ YES      │ YES                │
│ Inventory (Edit) │ NO       │ NO       │ YES                │
│                  │          │          │                    │
│ Reports (View)   │ NO       │ NO       │ YES                │
│ Reports (Export) │ NO       │ NO       │ YES                │
│                  │          │          │                    │
│ Audit Logs       │ NO       │ NO       │ YES                │
│ User Mgmt        │ NO       │ NO       │ YES                │
├──────────────────┴──────────┴──────────┴────────────────────┤
│ Row Level Security: Branch-based access for Waiter/Kitchen  │
│ All Tables Protected: No public read without auth            │
└──────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

```
App.tsx (Root)
│
├── Navigation Bar
│   ├── Role Switcher (Admin/Waiter/Kitchen)
│   ├── Branch Selector
│   ├── Cloud Sync Button
│   └── Settings
│
├── Waiter Interface
│   ├── MenuGrid
│   │   ├── Category Filter
│   │   └── Product Grid
│   │
│   ├── CartPanel
│   │   ├── Order Items List
│   │   ├── Discount Input
│   │   ├── Loyalty Rewards
│   │   └── Totals Summary
│   │
│   ├── PaymentModal (NEW)
│   │   ├── Payment Method Select
│   │   ├── Amount Validation
│   │   └── Card Reference
│   │
│   ├── OrderList
│   │   └── Order History
│   │
│   └── KitchenView
│       ├── Ticket Display
│       └── Status Tracking
│
├── Admin Interface
│   ├── AdminDashboard
│   │   ├── Dashboard Tab (KPIs)
│   │   ├── Team Tab (Staff Mgmt)
│   │   ├── Tables Tab
│   │   ├── Inventory Tab
│   │   ├── Branches Tab
│   │   └── Settings Tab
│   │
│   └── ReportingDashboard (NEW)
│       ├── Overview Tab
│       ├── Items Tab
│       ├── Categories Tab
│       ├── Users Tab
│       └── Payments Tab
│
├── BillPrinting (NEW)
│   ├── Customer Receipt
│   ├── Kitchen Ticket
│   └── Admin Report
│
└── Shared Components
    ├── Modal
    ├── PrintingOverlay
    └── ReceiptOverlay
```

---

## API Integration Points

### Payment Gateway Integration
```
PaymentModal
    │
    └─► Payment Service
        │
        └─► [EXTERNAL: Stripe/Square/PayPal]
            │
            └─► Card Processor
                │
                └─► Payment Confirmation
                    │
                    └─► Create Transaction Record
```

### Reporting Export
```
ReportingDashboard
    │
    ├─► CSV Export (via JavaScript)
    │
    ├─► PDF Generation (via external library)
    │
    └─► Email Distribution (via Edge Function)
```

---

## Offline Architecture

```
┌─────────────────────────────────────────┐
│        IndexedDB (Client-side)          │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ orders (Object Store)           │   │
│  │ ├─ UUID (Key)                   │   │
│  │ └─ Order Data (Value)           │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ products (Object Store)         │   │
│  │ ├─ Product ID (Key)             │   │
│  │ └─ Menu Data (Value)            │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ sync_queue (Object Store)       │   │
│  │ ├─ Sync ID (Key)                │   │
│  │ ├─ Operation Type               │   │
│  │ ├─ Status (pending/failed)      │   │
│  │ └─ Timestamp                    │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ cache (Object Store)            │   │
│  │ ├─ Key                          │   │
│  │ ├─ Value                        │   │
│  │ └─ Expires At (TTL)             │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
         │
         │ [When Online]
         │
         ▼
    Supabase API
```

---

## Security Layers

```
┌──────────────────────────────────────────────┐
│ Layer 1: Authentication                      │
│ - Employee PIN verification                  │
│ - JWT Token-based sessions                   │
└──────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────┐
│ Layer 2: Authorization (RLS Policies)        │
│ - Branch-based access                        │
│ - Role-based restrictions                    │
│ - Employee ownership checks                  │
└──────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────┐
│ Layer 3: Data Validation                     │
│ - Payment amount validation                  │
│ - Refund amount limits                       │
│ - Inventory variance checks                  │
└──────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────┐
│ Layer 4: Audit Logging                       │
│ - All transactions logged                    │
│ - Employee attribution                       │
│ - Timestamp tracking                         │
└──────────────────────────────────────────────┘
```

---

## Performance Optimization

### Database Indexes
```
payment_transactions:
├─ order_id (for order-level queries)
├─ status (for filtering completed/pending)
├─ created_at (for date-range reports)
└─ processed_by_id (for user performance)

payment_ledger:
├─ branch_id (for reconciliation)
├─ reconciled_at (for time-range queries)
└─ employee_id (for employee tracking)

audit_logs:
├─ employee_id (for user activity)
├─ branch_id (for branch audits)
├─ created_at (for date filtering)
└─ action_type (for specific action queries)
```

### Client-side Caching
```
Cache Strategy:
├─ Menu Items: 1 hour TTL
├─ Branch Info: 24 hour TTL
├─ User Data: Session duration
└─ Report Data: 5 minute TTL
```

### Query Optimization
```
Pagination:
├─ Default: 50 records per page
├─ Sorting: By date/revenue/name
└─ Filtering: Branch + Date range

Lazy Loading:
├─ Images: Load on demand
├─ Reports: Progressive loading
└─ Modals: Render on open
```

---

## Deployment Checklist

- [ ] Run database migrations
- [ ] Verify RLS policies enabled
- [ ] Test payment validation logic
- [ ] Enable audit logging
- [ ] Configure sync service
- [ ] Test offline functionality
- [ ] Load test reporting queries
- [ ] Security audit (RLS verification)
- [ ] Backup database
- [ ] Train staff on new features

---

**Architecture Version**: 2.0 - Enterprise Edition
**Last Updated**: 2026-01-16
**Status**: Production Ready
