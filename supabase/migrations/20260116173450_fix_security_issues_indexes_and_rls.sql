/*
  # Fix Security Issues - Indexes and RLS Policies

  1. Performance Improvements
    - Add missing indexes for all foreign key columns to improve query performance
    - Remove unused indexes that are not being utilized

  2. Security Improvements
    - Fix RLS policies on customers table to restrict access to authenticated users only
    - Remove overly permissive policies that allow public access

  ## Foreign Key Indexes Added
    - attendance_logs.branch_id
    - branch_menu_config.menu_item_id
    - employees.branch_id (if not exists)
    - inventory_logs.branch_id
    - modifiers.menu_item_id
    - order_items.menu_item_id
    - order_items.order_id
    - orders.branch_id
    - orders.customer_id
    - orders.server_id
    - payment_ledger.transaction_id
    - refund_history.approved_by_id
    - refund_history.original_transaction_id

  ## Unused Indexes Removed
    - Various unused indexes that are not contributing to query performance

  ## RLS Policy Fixes
    - Updated customers table policies to require authentication
    - Removed policies that allow public/anonymous access
*/

-- =====================================================
-- ADD MISSING FOREIGN KEY INDEXES
-- =====================================================

-- attendance_logs.branch_id
CREATE INDEX IF NOT EXISTS idx_attendance_logs_branch_id ON public.attendance_logs(branch_id);

-- branch_menu_config.menu_item_id
CREATE INDEX IF NOT EXISTS idx_branch_menu_config_menu_item_id ON public.branch_menu_config(menu_item_id);

-- employees.branch_id (may already exist from original migration, but add if not)
CREATE INDEX IF NOT EXISTS idx_employees_branch_id ON public.employees(branch_id);

-- inventory_logs.branch_id
CREATE INDEX IF NOT EXISTS idx_inventory_logs_branch_id ON public.inventory_logs(branch_id);

-- modifiers.menu_item_id
CREATE INDEX IF NOT EXISTS idx_modifiers_menu_item_id ON public.modifiers(menu_item_id);

-- order_items.menu_item_id
CREATE INDEX IF NOT EXISTS idx_order_items_menu_item_id ON public.order_items(menu_item_id);

-- order_items.order_id
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

-- orders.branch_id
CREATE INDEX IF NOT EXISTS idx_orders_branch_id ON public.orders(branch_id);

-- orders.customer_id
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);

-- orders.server_id
CREATE INDEX IF NOT EXISTS idx_orders_server_id ON public.orders(server_id);

-- payment_ledger.transaction_id
CREATE INDEX IF NOT EXISTS idx_payment_ledger_transaction_id ON public.payment_ledger(transaction_id);

-- refund_history.approved_by_id
CREATE INDEX IF NOT EXISTS idx_refund_history_approved_by_id ON public.refund_history(approved_by_id);

-- refund_history.original_transaction_id
CREATE INDEX IF NOT EXISTS idx_refund_history_original_txn_id ON public.refund_history(original_transaction_id);

-- =====================================================
-- REMOVE UNUSED INDEXES
-- =====================================================

-- These indexes exist but are not being used by queries
DROP INDEX IF EXISTS public.idx_inventory_logs_menu_item_id;
DROP INDEX IF EXISTS public.idx_attendance_logs_employee_id;
DROP INDEX IF EXISTS public.idx_app_settings_branch_id;
DROP INDEX IF EXISTS public.idx_payment_transactions_order_id;
DROP INDEX IF EXISTS public.idx_payment_transactions_status;
DROP INDEX IF EXISTS public.idx_payment_transactions_created_at;
DROP INDEX IF EXISTS public.idx_payment_transactions_processed_by;
DROP INDEX IF EXISTS public.idx_payment_ledger_branch_id;
DROP INDEX IF EXISTS public.idx_payment_ledger_reconciled_at;
DROP INDEX IF EXISTS public.idx_payment_ledger_employee_id;
DROP INDEX IF EXISTS public.idx_refund_history_order_id;
DROP INDEX IF EXISTS public.idx_refund_history_status;
DROP INDEX IF EXISTS public.idx_refund_history_created_at;
DROP INDEX IF EXISTS public.idx_audit_logs_employee_id;
DROP INDEX IF EXISTS public.idx_audit_logs_branch_id;
DROP INDEX IF EXISTS public.idx_audit_logs_created_at;
DROP INDEX IF EXISTS public.idx_audit_logs_action_type;
DROP INDEX IF EXISTS public.idx_audit_logs_resource_type;
DROP INDEX IF EXISTS public.idx_menu_items_is_kitchen;
DROP INDEX IF EXISTS public.idx_menu_items_menu_category;

-- =====================================================
-- FIX RLS POLICIES ON CUSTOMERS TABLE
-- =====================================================

-- Drop the overly permissive policies that allow public access
DROP POLICY IF EXISTS "Anyone can create customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can update customers" ON public.customers;

-- Create properly restricted policies
-- Only authenticated users (employees) can manage customers

CREATE POLICY "Authenticated users can view customers"
  ON public.customers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create customers"
  ON public.customers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update customers"
  ON public.customers
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete customers"
  ON public.customers
  FOR DELETE
  TO authenticated
  USING (true);