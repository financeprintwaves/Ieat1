/*
  # Create database functions for business logic
  
  1. Functions Created
    - `authenticate_employee(pin text)`: Authenticates employee by PIN
    - `process_order_payment(order_id uuid)`: Updates order status to paid
    - `update_customer_loyalty(customer_id uuid, points_earned int, amount_spent numeric)`: Updates customer points and spending
    - `get_branch_statistics(branch_id uuid, start_date timestamptz, end_date timestamptz)`: Get branch sales data
    - `adjust_inventory(item_id uuid, quantity_change int, reason text, reported_by text)`: Log and adjust inventory
    - `employee_check_in(employee_id uuid)`: Mark employee as checked in
    - `employee_check_out(employee_id uuid)`: Mark employee as checked out
    - `get_top_selling_items(branch_id uuid, start_date timestamptz, end_date timestamptz)`: Get best sellers
    - `redeem_loyalty_points(customer_id uuid, points_to_redeem int)`: Redeem customer points
  
  2. Function Purpose
    - Centralize complex business logic in database
    - Ensure data consistency across transactions
    - Improve performance with server-side computation
    - Enable audit trails through logging
*/

-- Function to authenticate employee by PIN
CREATE OR REPLACE FUNCTION authenticate_employee(input_pin text)
RETURNS TABLE(id uuid, name text, email text, role text, branch_id uuid) AS $$
BEGIN
  RETURN QUERY
  SELECT e.id, e.name, e.email, e.role, e.branch_id
  FROM employees e
  WHERE e.pin = input_pin
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update customer loyalty points and spending
CREATE OR REPLACE FUNCTION update_customer_loyalty(
  customer_id uuid,
  points_earned int,
  amount_spent numeric
)
RETURNS TABLE(id uuid, name text, phone text, points int, total_spent numeric, visits int) AS $$
BEGIN
  UPDATE customers
  SET 
    points = points + points_earned,
    total_spent = total_spent + amount_spent,
    visits = visits + 1,
    updated_at = now()
  WHERE id = customer_id;
  
  RETURN QUERY
  SELECT c.id, c.name, c.phone, c.points, c.total_spent, c.visits
  FROM customers c
  WHERE c.id = customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process order payment
CREATE OR REPLACE FUNCTION process_order_payment(order_id uuid)
RETURNS TABLE(id uuid, status text, paid_at timestamptz, total_amount numeric) AS $$
BEGIN
  UPDATE orders
  SET 
    status = 'paid',
    paid_at = now(),
    sync_status = 'unsynced',
    updated_at = now()
  WHERE id = order_id;
  
  RETURN QUERY
  SELECT o.id, o.status, o.paid_at, o.total_amount
  FROM orders o
  WHERE o.id = order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to adjust inventory and log changes
CREATE OR REPLACE FUNCTION adjust_inventory(
  item_id uuid,
  quantity_change int,
  reason text,
  reported_by text DEFAULT 'System'
)
RETURNS TABLE(id uuid, name text, stock int) AS $$
BEGIN
  UPDATE menu_items
  SET stock = stock + quantity_change
  WHERE id = item_id;
  
  INSERT INTO inventory_logs (menu_item_id, change, reason, reported_by, verified)
  VALUES (item_id, quantity_change, reason, reported_by, false);
  
  RETURN QUERY
  SELECT m.id, m.name, m.stock
  FROM menu_items m
  WHERE m.id = item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for employee check-in
CREATE OR REPLACE FUNCTION employee_check_in(employee_id uuid)
RETURNS TABLE(id uuid, name text, is_checked_in boolean) AS $$
BEGIN
  UPDATE employees
  SET is_checked_in = true
  WHERE id = employee_id;
  
  INSERT INTO attendance_logs (employee_id, employee_name, type, timestamp)
  SELECT id, name, 'check-in', now()
  FROM employees
  WHERE id = employee_id;
  
  RETURN QUERY
  SELECT e.id, e.name, e.is_checked_in
  FROM employees e
  WHERE e.id = employee_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for employee check-out
CREATE OR REPLACE FUNCTION employee_check_out(employee_id uuid)
RETURNS TABLE(id uuid, name text, is_checked_in boolean) AS $$
BEGIN
  UPDATE employees
  SET is_checked_in = false
  WHERE id = employee_id;
  
  INSERT INTO attendance_logs (employee_id, employee_name, type, timestamp)
  SELECT id, name, 'check-out', now()
  FROM employees
  WHERE id = employee_id;
  
  RETURN QUERY
  SELECT e.id, e.name, e.is_checked_in
  FROM employees e
  WHERE e.id = employee_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get branch statistics
CREATE OR REPLACE FUNCTION get_branch_statistics(
  branch_id uuid,
  start_date timestamptz,
  end_date timestamptz
)
RETURNS TABLE(
  total_orders bigint,
  total_revenue numeric,
  total_tax numeric,
  avg_order_value numeric,
  completed_orders bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT o.id)::bigint,
    SUM(o.total_amount)::numeric,
    SUM(o.tax)::numeric,
    AVG(o.total_amount)::numeric,
    COUNT(DISTINCT CASE WHEN o.status = 'paid' THEN o.id END)::bigint
  FROM orders o
  WHERE o.branch_id = get_branch_statistics.branch_id
    AND o.created_at >= start_date
    AND o.created_at <= end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to redeem loyalty points
CREATE OR REPLACE FUNCTION redeem_loyalty_points(
  customer_id uuid,
  points_to_redeem int
)
RETURNS TABLE(id uuid, points int, success boolean) AS $$
DECLARE
  current_points int;
BEGIN
  SELECT c.points INTO current_points FROM customers c WHERE c.id = customer_id;
  
  IF current_points >= points_to_redeem THEN
    UPDATE customers
    SET points = points - points_to_redeem
    WHERE id = customer_id;
    
    RETURN QUERY
    SELECT customer_id, (current_points - points_to_redeem)::int, true;
  ELSE
    RETURN QUERY
    SELECT customer_id, current_points, false;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get top selling items
CREATE OR REPLACE FUNCTION get_top_selling_items(
  branch_id uuid,
  start_date timestamptz,
  end_date timestamptz,
  limit_count int DEFAULT 10
)
RETURNS TABLE(
  item_id uuid,
  item_name text,
  total_quantity int,
  total_revenue numeric,
  order_count int
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.name,
    SUM(oi.quantity)::int,
    SUM(oi.quantity * oi.unit_price)::numeric,
    COUNT(DISTINCT oi.order_id)::int
  FROM order_items oi
  JOIN orders o ON oi.order_id = o.id
  JOIN menu_items m ON oi.menu_item_id = m.id
  WHERE o.branch_id = get_top_selling_items.branch_id
    AND o.created_at >= start_date
    AND o.created_at <= end_date
  GROUP BY m.id, m.name
  ORDER BY SUM(oi.quantity) DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_orders_branch_id ON orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_menu_item_id ON inventory_logs(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_created_at ON inventory_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_employee_id ON attendance_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_branch_id ON employees(branch_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category);
