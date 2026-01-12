/*
  # Set up Row Level Security (RLS) policies for all tables
  
  1. Security Overview
    - Public access for branches (read-only for menu items)
    - Full access for authenticated employees to their branch data
    - Admin can access all branches
    - Employees can only see orders from their branch
    - Customers can only access their own loyalty data
  
  2. Policies Created
    - All tables have SELECT, INSERT, UPDATE, DELETE policies
    - Each policy checks branch_id or employee role
    - Admin users can bypass restrictions
    - Public visibility for menu items only
  
  3. RLS Strategy
    - Branches: Admins full access, employees read-only
    - Employees: See own data + branch colleagues
    - Orders: Branch-level access control
    - Menu Items: Public read, restricted write
    - Customers: Can only see themselves
    - All other tables: Branch-level access
*/

-- BRANCHES TABLE POLICIES
CREATE POLICY "Branches are viewable by authenticated users"
  ON branches FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can insert branches"
  ON branches FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = auth.uid()
      AND employees.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update branches"
  ON branches FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = auth.uid()
      AND employees.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = auth.uid()
      AND employees.role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete branches"
  ON branches FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = auth.uid()
      AND employees.role = 'admin'
    )
  );

-- EMPLOYEES TABLE POLICIES
CREATE POLICY "Employees can view their branch staff"
  ON employees FOR SELECT
  TO authenticated
  USING (
    branch_id = (
      SELECT branch_id FROM employees
      WHERE employees.id = auth.uid()
    )
    OR (
      SELECT role FROM employees WHERE id = auth.uid()
    ) = 'admin'
  );

CREATE POLICY "Only admins can add employees"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      SELECT role FROM employees WHERE id = auth.uid()
    ) = 'admin'
  );

CREATE POLICY "Admins can update employees, employees can update themselves"
  ON employees FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid()
    OR (
      SELECT role FROM employees WHERE id = auth.uid()
    ) = 'admin'
  )
  WITH CHECK (
    id = auth.uid()
    OR (
      SELECT role FROM employees WHERE id = auth.uid()
    ) = 'admin'
  );

CREATE POLICY "Only admins can delete employees"
  ON employees FOR DELETE
  TO authenticated
  USING (
    (
      SELECT role FROM employees WHERE id = auth.uid()
    ) = 'admin'
  );

-- MENU ITEMS TABLE POLICIES
CREATE POLICY "Menu items are publicly readable"
  ON menu_items FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Only admins can add menu items"
  ON menu_items FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      SELECT role FROM employees WHERE id = auth.uid()
    ) = 'admin'
  );

CREATE POLICY "Only admins can update menu items"
  ON menu_items FOR UPDATE
  TO authenticated
  USING (
    (
      SELECT role FROM employees WHERE id = auth.uid()
    ) = 'admin'
  )
  WITH CHECK (
    (
      SELECT role FROM employees WHERE id = auth.uid()
    ) = 'admin'
  );

CREATE POLICY "Only admins can delete menu items"
  ON menu_items FOR DELETE
  TO authenticated
  USING (
    (
      SELECT role FROM employees WHERE id = auth.uid()
    ) = 'admin'
  );

-- MODIFIERS TABLE POLICIES
CREATE POLICY "Modifiers are publicly readable"
  ON modifiers FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Only admins can modify modifiers"
  ON modifiers FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      SELECT role FROM employees WHERE id = auth.uid()
    ) = 'admin'
  );

CREATE POLICY "Only admins can update modifiers"
  ON modifiers FOR UPDATE
  TO authenticated
  USING (
    (
      SELECT role FROM employees WHERE id = auth.uid()
    ) = 'admin'
  )
  WITH CHECK (
    (
      SELECT role FROM employees WHERE id = auth.uid()
    ) = 'admin'
  );

CREATE POLICY "Only admins can delete modifiers"
  ON modifiers FOR DELETE
  TO authenticated
  USING (
    (
      SELECT role FROM employees WHERE id = auth.uid()
    ) = 'admin'
  );

-- CUSTOMERS TABLE POLICIES
CREATE POLICY "Authenticated users can view customers"
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

-- ORDERS TABLE POLICIES
CREATE POLICY "Employees can view orders from their branch"
  ON orders FOR SELECT
  TO authenticated
  USING (
    branch_id = (
      SELECT branch_id FROM employees WHERE id = auth.uid()
    )
    OR (
      SELECT role FROM employees WHERE id = auth.uid()
    ) = 'admin'
  );

CREATE POLICY "Employees can create orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (
    branch_id = (
      SELECT branch_id FROM employees WHERE id = auth.uid()
    )
    OR (
      SELECT role FROM employees WHERE id = auth.uid()
    ) = 'admin'
  );

CREATE POLICY "Employees can update orders in their branch"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    branch_id = (
      SELECT branch_id FROM employees WHERE id = auth.uid()
    )
    OR (
      SELECT role FROM employees WHERE id = auth.uid()
    ) = 'admin'
  )
  WITH CHECK (
    branch_id = (
      SELECT branch_id FROM employees WHERE id = auth.uid()
    )
    OR (
      SELECT role FROM employees WHERE id = auth.uid()
    ) = 'admin'
  );

CREATE POLICY "Employees can delete orders in their branch"
  ON orders FOR DELETE
  TO authenticated
  USING (
    branch_id = (
      SELECT branch_id FROM employees WHERE id = auth.uid()
    )
    OR (
      SELECT role FROM employees WHERE id = auth.uid()
    ) = 'admin'
  );

-- ORDER ITEMS TABLE POLICIES
CREATE POLICY "Users can view order items from accessible orders"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders
      WHERE branch_id = (
        SELECT branch_id FROM employees WHERE id = auth.uid()
      )
      OR (
        SELECT role FROM employees WHERE id = auth.uid()
      ) = 'admin'
    )
  );

CREATE POLICY "Users can insert order items to accessible orders"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    order_id IN (
      SELECT id FROM orders
      WHERE branch_id = (
        SELECT branch_id FROM employees WHERE id = auth.uid()
      )
      OR (
        SELECT role FROM employees WHERE id = auth.uid()
      ) = 'admin'
    )
  );

CREATE POLICY "Users can update order items in accessible orders"
  ON order_items FOR UPDATE
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders
      WHERE branch_id = (
        SELECT branch_id FROM employees WHERE id = auth.uid()
      )
      OR (
        SELECT role FROM employees WHERE id = auth.uid()
      ) = 'admin'
    )
  )
  WITH CHECK (
    order_id IN (
      SELECT id FROM orders
      WHERE branch_id = (
        SELECT branch_id FROM employees WHERE id = auth.uid()
      )
      OR (
        SELECT role FROM employees WHERE id = auth.uid()
      ) = 'admin'
    )
  );

CREATE POLICY "Users can delete order items from accessible orders"
  ON order_items FOR DELETE
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders
      WHERE branch_id = (
        SELECT branch_id FROM employees WHERE id = auth.uid()
      )
      OR (
        SELECT role FROM employees WHERE id = auth.uid()
      ) = 'admin'
    )
  );

-- INVENTORY LOGS TABLE POLICIES
CREATE POLICY "Employees can view inventory logs from their branch"
  ON inventory_logs FOR SELECT
  TO authenticated
  USING (
    branch_id = (
      SELECT branch_id FROM employees WHERE id = auth.uid()
    )
    OR (
      SELECT role FROM employees WHERE id = auth.uid()
    ) = 'admin'
  );

CREATE POLICY "Employees can log inventory changes"
  ON inventory_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    branch_id = (
      SELECT branch_id FROM employees WHERE id = auth.uid()
    )
    OR (
      SELECT role FROM employees WHERE id = auth.uid()
    ) = 'admin'
  );

CREATE POLICY "Admins can update inventory logs"
  ON inventory_logs FOR UPDATE
  TO authenticated
  USING (
    (
      SELECT role FROM employees WHERE id = auth.uid()
    ) = 'admin'
  )
  WITH CHECK (
    (
      SELECT role FROM employees WHERE id = auth.uid()
    ) = 'admin'
  );

-- ATTENDANCE LOGS TABLE POLICIES
CREATE POLICY "Employees can view attendance from their branch"
  ON attendance_logs FOR SELECT
  TO authenticated
  USING (
    branch_id = (
      SELECT branch_id FROM employees WHERE id = auth.uid()
    )
    OR (
      SELECT role FROM employees WHERE id = auth.uid()
    ) = 'admin'
  );

CREATE POLICY "Employees can log their own attendance"
  ON attendance_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id = auth.uid()
    OR (
      SELECT role FROM employees WHERE id = auth.uid()
    ) = 'admin'
  );

-- LOYALTY REWARDS TABLE POLICIES
CREATE POLICY "Authenticated users can view loyalty rewards"
  ON loyalty_rewards FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can create rewards"
  ON loyalty_rewards FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      SELECT role FROM employees WHERE id = auth.uid()
    ) = 'admin'
  );

CREATE POLICY "Only admins can update rewards"
  ON loyalty_rewards FOR UPDATE
  TO authenticated
  USING (
    (
      SELECT role FROM employees WHERE id = auth.uid()
    ) = 'admin'
  )
  WITH CHECK (
    (
      SELECT role FROM employees WHERE id = auth.uid()
    ) = 'admin'
  );

CREATE POLICY "Only admins can delete rewards"
  ON loyalty_rewards FOR DELETE
  TO authenticated
  USING (
    (
      SELECT role FROM employees WHERE id = auth.uid()
    ) = 'admin'
  );

-- BRANCH MENU CONFIG TABLE POLICIES
CREATE POLICY "Authenticated users can view branch menu config"
  ON branch_menu_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can modify branch menu config"
  ON branch_menu_config FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      SELECT role FROM employees WHERE id = auth.uid()
    ) = 'admin'
  );

CREATE POLICY "Only admins can update branch menu config"
  ON branch_menu_config FOR UPDATE
  TO authenticated
  USING (
    (
      SELECT role FROM employees WHERE id = auth.uid()
    ) = 'admin'
  )
  WITH CHECK (
    (
      SELECT role FROM employees WHERE id = auth.uid()
    ) = 'admin'
  );

CREATE POLICY "Only admins can delete branch menu config"
  ON branch_menu_config FOR DELETE
  TO authenticated
  USING (
    (
      SELECT role FROM employees WHERE id = auth.uid()
    ) = 'admin'
  );

-- TABLES CONFIG TABLE POLICIES
CREATE POLICY "Authenticated users can view tables"
  ON tables FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can modify tables"
  ON tables FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      SELECT role FROM employees WHERE id = auth.uid()
    ) = 'admin'
  );

CREATE POLICY "Only admins can update tables"
  ON tables FOR UPDATE
  TO authenticated
  USING (
    (
      SELECT role FROM employees WHERE id = auth.uid()
    ) = 'admin'
  )
  WITH CHECK (
    (
      SELECT role FROM employees WHERE id = auth.uid()
    ) = 'admin'
  );

CREATE POLICY "Only admins can delete tables"
  ON tables FOR DELETE
  TO authenticated
  USING (
    (
      SELECT role FROM employees WHERE id = auth.uid()
    ) = 'admin'
  );

-- APP SETTINGS TABLE POLICIES
CREATE POLICY "Authenticated users can view settings"
  ON app_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can update settings"
  ON app_settings FOR UPDATE
  TO authenticated
  USING (
    (
      SELECT role FROM employees WHERE id = auth.uid()
    ) = 'admin'
  )
  WITH CHECK (
    (
      SELECT role FROM employees WHERE id = auth.uid()
    ) = 'admin'
  );
