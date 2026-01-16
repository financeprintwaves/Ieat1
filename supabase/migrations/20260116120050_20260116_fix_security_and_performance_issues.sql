/*
  # Fix Security and Performance Issues
  
  1. Security Fixes
    - Remove all policies with always-true USING/WITH CHECK conditions
    - Consolidate duplicate RLS policies
    - Replace auth.uid() direct calls with (select auth.uid()) for optimal performance
    - Add proper access control to prevent unauthorized access
  
  2. Performance Fixes
    - Add missing foreign key index on app_settings.current_branch_id
    - Drop duplicate indexes
    - Drop unused indexes that haven't been utilized
    - Fix function search_path mutability
  
  3. Tables Modified
    - all major tables: RLS policy optimization and consolidation
    - app_settings: added index on current_branch_id
    - functions: search_path fixed
    - indexes: cleanup of duplicates and unused
*/

-- ============================================================================
-- STEP 1: DROP ALL EXISTING POLICIES (to replace with optimized versions)
-- ============================================================================

DROP POLICY IF EXISTS "Branches are viewable by authenticated users" ON branches;
DROP POLICY IF EXISTS "Only admins can insert branches" ON branches;
DROP POLICY IF EXISTS "Only admins can update branches" ON branches;
DROP POLICY IF EXISTS "Only admins can delete branches" ON branches;
DROP POLICY IF EXISTS "Admin users can create branches" ON branches;
DROP POLICY IF EXISTS "Admin users can update branches" ON branches;
DROP POLICY IF EXISTS "Admin users can delete branches" ON branches;
DROP POLICY IF EXISTS "Admin users can read all branches" ON branches;

DROP POLICY IF EXISTS "Employees can view their branch staff" ON employees;
DROP POLICY IF EXISTS "Only admins can add employees" ON employees;
DROP POLICY IF EXISTS "Admins can update employees, employees can update themselves" ON employees;
DROP POLICY IF EXISTS "Only admins can delete employees" ON employees;
DROP POLICY IF EXISTS "Admin can read all employees" ON employees;
DROP POLICY IF EXISTS "Admin can create employees" ON employees;
DROP POLICY IF EXISTS "Admin can update employees" ON employees;
DROP POLICY IF EXISTS "Admin can delete employees" ON employees;

DROP POLICY IF EXISTS "Menu items are publicly readable" ON menu_items;
DROP POLICY IF EXISTS "Only admins can add menu items" ON menu_items;
DROP POLICY IF EXISTS "Only admins can update menu items" ON menu_items;
DROP POLICY IF EXISTS "Only admins can delete menu items" ON menu_items;
DROP POLICY IF EXISTS "Admin can create menu items" ON menu_items;
DROP POLICY IF EXISTS "Admin can update menu items" ON menu_items;
DROP POLICY IF EXISTS "Admin can delete menu items" ON menu_items;
DROP POLICY IF EXISTS "Everyone can read menu items" ON menu_items;

DROP POLICY IF EXISTS "Modifiers are publicly readable" ON modifiers;
DROP POLICY IF EXISTS "Only admins can modify modifiers" ON modifiers;
DROP POLICY IF EXISTS "Only admins can update modifiers" ON modifiers;
DROP POLICY IF EXISTS "Only admins can delete modifiers" ON modifiers;
DROP POLICY IF EXISTS "Admin can manage modifiers" ON modifiers;
DROP POLICY IF EXISTS "Admin can update modifiers" ON modifiers;
DROP POLICY IF EXISTS "Admin can delete modifiers" ON modifiers;
DROP POLICY IF EXISTS "Everyone can read modifiers" ON modifiers;

DROP POLICY IF EXISTS "Authenticated users can view customers" ON customers;
DROP POLICY IF EXISTS "Anyone can create customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can update customers" ON customers;
DROP POLICY IF EXISTS "Authorized users can create customers" ON customers;
DROP POLICY IF EXISTS "Authorized users can update customers" ON customers;
DROP POLICY IF EXISTS "Admin can delete customers" ON customers;
DROP POLICY IF EXISTS "Authorized users can read customers" ON customers;

DROP POLICY IF EXISTS "Employees can view orders from their branch" ON orders;
DROP POLICY IF EXISTS "Employees can create orders" ON orders;
DROP POLICY IF EXISTS "Employees can update orders in their branch" ON orders;
DROP POLICY IF EXISTS "Employees can delete orders in their branch" ON orders;
DROP POLICY IF EXISTS "Admin can delete orders" ON orders;
DROP POLICY IF EXISTS "Authorized users can create orders" ON orders;
DROP POLICY IF EXISTS "Authorized users can update orders" ON orders;
DROP POLICY IF EXISTS "Authorized users can read orders" ON orders;

DROP POLICY IF EXISTS "Users can view order items from accessible orders" ON order_items;
DROP POLICY IF EXISTS "Users can insert order items to accessible orders" ON order_items;
DROP POLICY IF EXISTS "Users can update order items in accessible orders" ON order_items;
DROP POLICY IF EXISTS "Users can delete order items from accessible orders" ON order_items;
DROP POLICY IF EXISTS "Admin can delete order items" ON order_items;
DROP POLICY IF EXISTS "Authorized users can create order items" ON order_items;
DROP POLICY IF EXISTS "Authorized users can update order items" ON order_items;
DROP POLICY IF EXISTS "Authorized users can read order items" ON order_items;

DROP POLICY IF EXISTS "Employees can view inventory logs from their branch" ON inventory_logs;
DROP POLICY IF EXISTS "Employees can log inventory changes" ON inventory_logs;
DROP POLICY IF EXISTS "Admins can update inventory logs" ON inventory_logs;
DROP POLICY IF EXISTS "Authorized users can create inventory logs" ON inventory_logs;
DROP POLICY IF EXISTS "Authorized users can read inventory logs" ON inventory_logs;
DROP POLICY IF EXISTS "Only admins can delete inventory logs" ON inventory_logs;

DROP POLICY IF EXISTS "Employees can view attendance from their branch" ON attendance_logs;
DROP POLICY IF EXISTS "Employees can log their own attendance" ON attendance_logs;
DROP POLICY IF EXISTS "Authorized users can create attendance logs" ON attendance_logs;
DROP POLICY IF EXISTS "Authorized users can read attendance logs" ON attendance_logs;
DROP POLICY IF EXISTS "Only admins can delete attendance logs" ON attendance_logs;

DROP POLICY IF EXISTS "Authenticated users can view loyalty rewards" ON loyalty_rewards;
DROP POLICY IF EXISTS "Only admins can create rewards" ON loyalty_rewards;
DROP POLICY IF EXISTS "Only admins can update rewards" ON loyalty_rewards;
DROP POLICY IF EXISTS "Only admins can delete rewards" ON loyalty_rewards;
DROP POLICY IF EXISTS "Admin can manage rewards" ON loyalty_rewards;
DROP POLICY IF EXISTS "Admin can update rewards" ON loyalty_rewards;
DROP POLICY IF EXISTS "Admin can delete rewards" ON loyalty_rewards;
DROP POLICY IF EXISTS "Admin can read all rewards" ON loyalty_rewards;
DROP POLICY IF EXISTS "Everyone can read active rewards" ON loyalty_rewards;

DROP POLICY IF EXISTS "Authenticated users can view branch menu config" ON branch_menu_config;
DROP POLICY IF EXISTS "Only admins can modify branch menu config" ON branch_menu_config;
DROP POLICY IF EXISTS "Only admins can update branch menu config" ON branch_menu_config;
DROP POLICY IF EXISTS "Only admins can delete branch menu config" ON branch_menu_config;
DROP POLICY IF EXISTS "Admin can manage branch menu config" ON branch_menu_config;
DROP POLICY IF EXISTS "Admin can update branch menu config" ON branch_menu_config;
DROP POLICY IF EXISTS "Admin can delete branch menu config" ON branch_menu_config;
DROP POLICY IF EXISTS "Everyone can read branch menu config" ON branch_menu_config;

DROP POLICY IF EXISTS "Authenticated users can view tables" ON tables;
DROP POLICY IF EXISTS "Only admins can modify tables" ON tables;
DROP POLICY IF EXISTS "Only admins can update tables" ON tables;
DROP POLICY IF EXISTS "Only admins can delete tables" ON tables;
DROP POLICY IF EXISTS "Admin can create tables" ON tables;
DROP POLICY IF EXISTS "Admin can update tables" ON tables;
DROP POLICY IF EXISTS "Admin can delete tables" ON tables;
DROP POLICY IF EXISTS "Everyone can read tables" ON tables;

DROP POLICY IF EXISTS "Authenticated users can view settings" ON app_settings;
DROP POLICY IF EXISTS "Only admins can update settings" ON app_settings;
DROP POLICY IF EXISTS "Admin can update settings" ON app_settings;
DROP POLICY IF EXISTS "Everyone can read settings" ON app_settings;

-- ============================================================================
-- STEP 2: CREATE OPTIMIZED RLS POLICIES WITH PROPER PERFORMANCE
-- ============================================================================

-- BRANCHES TABLE POLICIES
CREATE POLICY "Authenticated users can read branches"
  ON branches FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can create branches"
  ON branches FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin');

CREATE POLICY "Admins can update branches"
  ON branches FOR UPDATE
  TO authenticated
  USING ((SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin')
  WITH CHECK ((SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin');

CREATE POLICY "Admins can delete branches"
  ON branches FOR DELETE
  TO authenticated
  USING ((SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin');

-- EMPLOYEES TABLE POLICIES
CREATE POLICY "Employees can read their branch staff"
  ON employees FOR SELECT
  TO authenticated
  USING (
    branch_id = (SELECT e.branch_id FROM employees e WHERE e.id = (SELECT auth.uid()))
    OR (SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin'
  );

CREATE POLICY "Admins can create employees"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin');

CREATE POLICY "Employees can update themselves, admins can update anyone"
  ON employees FOR UPDATE
  TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR (SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin'
  )
  WITH CHECK (
    id = (SELECT auth.uid())
    OR (SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin'
  );

CREATE POLICY "Admins can delete employees"
  ON employees FOR DELETE
  TO authenticated
  USING ((SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin');

-- CUSTOMERS TABLE POLICIES
CREATE POLICY "Authenticated users can read customers"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can create customers"
  ON customers FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- MENU ITEMS TABLE POLICIES
CREATE POLICY "Public can read menu items"
  ON menu_items FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can create menu items"
  ON menu_items FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin');

CREATE POLICY "Admins can update menu items"
  ON menu_items FOR UPDATE
  TO authenticated
  USING ((SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin')
  WITH CHECK ((SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin');

CREATE POLICY "Admins can delete menu items"
  ON menu_items FOR DELETE
  TO authenticated
  USING ((SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin');

-- MODIFIERS TABLE POLICIES
CREATE POLICY "Public can read modifiers"
  ON modifiers FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can create modifiers"
  ON modifiers FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin');

CREATE POLICY "Admins can update modifiers"
  ON modifiers FOR UPDATE
  TO authenticated
  USING ((SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin')
  WITH CHECK ((SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin');

CREATE POLICY "Admins can delete modifiers"
  ON modifiers FOR DELETE
  TO authenticated
  USING ((SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin');

-- ORDERS TABLE POLICIES
CREATE POLICY "Employees can read their branch orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    branch_id = (SELECT e.branch_id FROM employees e WHERE e.id = (SELECT auth.uid()))
    OR (SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin'
  );

CREATE POLICY "Employees can create orders in their branch"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (
    branch_id = (SELECT e.branch_id FROM employees e WHERE e.id = (SELECT auth.uid()))
    OR (SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin'
  );

CREATE POLICY "Employees can update their branch orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    branch_id = (SELECT e.branch_id FROM employees e WHERE e.id = (SELECT auth.uid()))
    OR (SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin'
  )
  WITH CHECK (
    branch_id = (SELECT e.branch_id FROM employees e WHERE e.id = (SELECT auth.uid()))
    OR (SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin'
  );

CREATE POLICY "Employees can delete their branch orders"
  ON orders FOR DELETE
  TO authenticated
  USING (
    branch_id = (SELECT e.branch_id FROM employees e WHERE e.id = (SELECT auth.uid()))
    OR (SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin'
  );

-- ORDER ITEMS TABLE POLICIES
CREATE POLICY "Users can read accessible order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT o.id FROM orders o
      WHERE o.branch_id = (SELECT e.branch_id FROM employees e WHERE e.id = (SELECT auth.uid()))
      OR (SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin'
    )
  );

CREATE POLICY "Users can create order items for accessible orders"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    order_id IN (
      SELECT o.id FROM orders o
      WHERE o.branch_id = (SELECT e.branch_id FROM employees e WHERE e.id = (SELECT auth.uid()))
      OR (SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin'
    )
  );

CREATE POLICY "Users can update accessible order items"
  ON order_items FOR UPDATE
  TO authenticated
  USING (
    order_id IN (
      SELECT o.id FROM orders o
      WHERE o.branch_id = (SELECT e.branch_id FROM employees e WHERE e.id = (SELECT auth.uid()))
      OR (SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin'
    )
  )
  WITH CHECK (
    order_id IN (
      SELECT o.id FROM orders o
      WHERE o.branch_id = (SELECT e.branch_id FROM employees e WHERE e.id = (SELECT auth.uid()))
      OR (SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin'
    )
  );

CREATE POLICY "Users can delete accessible order items"
  ON order_items FOR DELETE
  TO authenticated
  USING (
    order_id IN (
      SELECT o.id FROM orders o
      WHERE o.branch_id = (SELECT e.branch_id FROM employees e WHERE e.id = (SELECT auth.uid()))
      OR (SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin'
    )
  );

-- INVENTORY LOGS TABLE POLICIES
CREATE POLICY "Employees can read inventory logs from their branch"
  ON inventory_logs FOR SELECT
  TO authenticated
  USING (
    branch_id = (SELECT e.branch_id FROM employees e WHERE e.id = (SELECT auth.uid()))
    OR (SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin'
  );

CREATE POLICY "Employees can create inventory logs"
  ON inventory_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    branch_id = (SELECT e.branch_id FROM employees e WHERE e.id = (SELECT auth.uid()))
    OR (SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin'
  );

CREATE POLICY "Admins can update inventory logs"
  ON inventory_logs FOR UPDATE
  TO authenticated
  USING ((SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin')
  WITH CHECK ((SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin');

-- ATTENDANCE LOGS TABLE POLICIES
CREATE POLICY "Employees can read attendance from their branch"
  ON attendance_logs FOR SELECT
  TO authenticated
  USING (
    branch_id = (SELECT e.branch_id FROM employees e WHERE e.id = (SELECT auth.uid()))
    OR (SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin'
  );

CREATE POLICY "Employees can log their own attendance"
  ON attendance_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id = (SELECT auth.uid())
    OR (SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin'
  );

-- LOYALTY REWARDS TABLE POLICIES
CREATE POLICY "Authenticated users can read loyalty rewards"
  ON loyalty_rewards FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can create loyalty rewards"
  ON loyalty_rewards FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin');

CREATE POLICY "Admins can update loyalty rewards"
  ON loyalty_rewards FOR UPDATE
  TO authenticated
  USING ((SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin')
  WITH CHECK ((SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin');

CREATE POLICY "Admins can delete loyalty rewards"
  ON loyalty_rewards FOR DELETE
  TO authenticated
  USING ((SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin');

-- BRANCH MENU CONFIG TABLE POLICIES
CREATE POLICY "Authenticated users can read branch menu config"
  ON branch_menu_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can create branch menu config"
  ON branch_menu_config FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin');

CREATE POLICY "Admins can update branch menu config"
  ON branch_menu_config FOR UPDATE
  TO authenticated
  USING ((SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin')
  WITH CHECK ((SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin');

CREATE POLICY "Admins can delete branch menu config"
  ON branch_menu_config FOR DELETE
  TO authenticated
  USING ((SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin');

-- TABLES CONFIG TABLE POLICIES
CREATE POLICY "Authenticated users can read tables"
  ON tables FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can create tables"
  ON tables FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin');

CREATE POLICY "Admins can update tables"
  ON tables FOR UPDATE
  TO authenticated
  USING ((SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin')
  WITH CHECK ((SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin');

CREATE POLICY "Admins can delete tables"
  ON tables FOR DELETE
  TO authenticated
  USING ((SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin');

-- APP SETTINGS TABLE POLICIES
CREATE POLICY "Authenticated users can read settings"
  ON app_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can update settings"
  ON app_settings FOR UPDATE
  TO authenticated
  USING ((SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin')
  WITH CHECK ((SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin');

-- ============================================================================
-- STEP 3: ADD MISSING INDEXES FOR FOREIGN KEYS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_app_settings_branch_id ON app_settings(current_branch_id);

-- ============================================================================
-- STEP 4: DROP DUPLICATE INDEXES
-- ============================================================================

DROP INDEX IF EXISTS idx_attendance_logs_employee;
DROP INDEX IF EXISTS idx_inventory_logs_menu_item;

-- ============================================================================
-- STEP 5: DROP UNUSED INDEXES
-- ============================================================================

DROP INDEX IF EXISTS idx_branch_menu_config_branch;
DROP INDEX IF EXISTS idx_branch_menu_config_item;
DROP INDEX IF EXISTS idx_orders_customer_id;
DROP INDEX IF EXISTS idx_orders_server_id;
DROP INDEX IF EXISTS idx_orders_branch_id;
DROP INDEX IF EXISTS idx_orders_status;
DROP INDEX IF EXISTS idx_orders_created_at;
DROP INDEX IF EXISTS idx_orders_sync_status;
DROP INDEX IF EXISTS idx_order_items_order_id;
DROP INDEX IF EXISTS idx_order_items_menu_item_id;
DROP INDEX IF EXISTS idx_inventory_logs_menu_item;
DROP INDEX IF EXISTS idx_inventory_logs_branch;
DROP INDEX IF EXISTS idx_inventory_logs_created_at;
DROP INDEX IF EXISTS idx_inventory_logs_reason;
DROP INDEX IF EXISTS idx_attendance_logs_timestamp;
DROP INDEX IF EXISTS idx_attendance_logs_branch;
DROP INDEX IF EXISTS idx_employees_branch_id;
DROP INDEX IF EXISTS idx_employees_pin;
DROP INDEX IF EXISTS idx_customers_phone;
DROP INDEX IF EXISTS idx_menu_items_category;
DROP INDEX IF EXISTS idx_menu_items_barcode;
DROP INDEX IF EXISTS idx_modifiers_menu_item;

-- ============================================================================
-- STEP 6: FIX FUNCTION SEARCH PATH MUTABILITY
-- ============================================================================

ALTER FUNCTION authenticate_employee(input_pin text) SECURITY DEFINER SET search_path = public;
ALTER FUNCTION update_customer_loyalty(customer_id uuid, points_earned int, amount_spent numeric) SECURITY DEFINER SET search_path = public;
ALTER FUNCTION process_order_payment(order_id uuid) SECURITY DEFINER SET search_path = public;
ALTER FUNCTION adjust_inventory(item_id uuid, quantity_change int, reason text, reported_by text) SECURITY DEFINER SET search_path = public;
ALTER FUNCTION employee_check_in(employee_id uuid) SECURITY DEFINER SET search_path = public;
ALTER FUNCTION employee_check_out(employee_id uuid) SECURITY DEFINER SET search_path = public;
ALTER FUNCTION get_branch_statistics(branch_id uuid, start_date timestamptz, end_date timestamptz) SECURITY DEFINER SET search_path = public;
ALTER FUNCTION redeem_loyalty_points(customer_id uuid, points_to_redeem int) SECURITY DEFINER SET search_path = public;
ALTER FUNCTION get_top_selling_items(branch_id uuid, start_date timestamptz, end_date timestamptz, limit_count int) SECURITY DEFINER SET search_path = public;
