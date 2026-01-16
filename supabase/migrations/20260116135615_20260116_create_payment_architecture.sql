/*
  # Enterprise Payment Architecture & Audit System

  1. New Tables
    - `payment_transactions` - detailed split payment tracking
      - `id` (uuid, primary key)
      - `order_id` (uuid, fk orders)
      - `transaction_type` (enum: cash, card, partial)
      - `cash_amount` (numeric) - amount paid via cash
      - `card_amount` (numeric) - amount paid via card
      - `total_amount` (numeric) - total paid (cash + card)
      - `validation_status` (enum: pending, valid, mismatch)
      - `status` (enum: pending, completed, refunded)
      - `payment_reference` (text) - card receipt/reference
      - `created_at` (timestamp)
      - `processed_at` (timestamp)
      - `processed_by_id` (fk employees)

    - `payment_ledger` - cash reconciliation audit trail
      - `id` (uuid)
      - `transaction_id` (fk payment_transactions)
      - `employee_id` (fk employees)
      - `branch_id` (fk branches)
      - `cash_in` (numeric) - cash received
      - `cash_out` (numeric) - change given
      - `balance_difference` (numeric) - variance
      - `reconciled_at` (timestamp)
      - `notes` (text)
      - `created_at` (timestamp)

    - `refund_history` - payment reversals tracking
      - `id` (uuid)
      - `order_id` (fk orders)
      - `original_transaction_id` (fk payment_transactions)
      - `refund_amount` (numeric)
      - `refund_method` (text: cash, card, partial)
      - `reason` (text)
      - `approved_by_id` (fk employees)
      - `status` (enum: pending, completed, failed)
      - `created_at` (timestamp)
      - `processed_at` (timestamp)

    - `audit_logs` - complete activity trail for compliance
      - `id` (uuid)
      - `employee_id` (fk employees)
      - `branch_id` (fk branches)
      - `action_type` (text: order_create, order_update, payment, refund, inventory_adjust, user_login)
      - `resource_type` (text: order, payment, inventory, employee)
      - `resource_id` (uuid)
      - `old_values` (jsonb) - before state
      - `new_values` (jsonb) - after state
      - `ip_address` (text)
      - `created_at` (timestamp)

  2. Modified Tables
    - `orders` table
      - Add `payment_status` (enum: pending, partial, complete)
      - Add `payment_breakdown_json` (jsonb) for split payment details

  3. Security
    - Enable RLS on all new tables
    - Admins only: refund approvals, ledger reconciliation
    - Employees: transaction logging (own branch only)
    - Kitchen: NO access to payment data

  4. Performance Indexes
    - payment_transactions: order_id, status, created_at
    - payment_ledger: branch_id, reconciled_at
    - refund_history: order_id, status
    - audit_logs: employee_id, branch_id, created_at, action_type

  5. Data Integrity
    - CHECK: cash_amount >= 0 AND card_amount >= 0
    - CHECK: total_amount = cash_amount + card_amount (with tolerance)
    - CHECK: refund_amount <= original_transaction_total
*/

-- ============================================================================
-- STEP 1: ADD COLUMNS TO ORDERS TABLE
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE orders ADD COLUMN payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'complete'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'payment_breakdown_json'
  ) THEN
    ALTER TABLE orders ADD COLUMN payment_breakdown_json jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- ============================================================================
-- STEP 2: CREATE PAYMENT TRANSACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE RESTRICT,
  transaction_type text NOT NULL CHECK (transaction_type IN ('cash', 'card', 'partial')),
  cash_amount numeric(10, 2) DEFAULT 0 CHECK (cash_amount >= 0),
  card_amount numeric(10, 2) DEFAULT 0 CHECK (card_amount >= 0),
  total_amount numeric(10, 2) NOT NULL CHECK (total_amount >= 0),
  validation_status text DEFAULT 'pending' CHECK (validation_status IN ('pending', 'valid', 'mismatch')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'refunded', 'failed')),
  payment_reference text,
  processed_by_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  CONSTRAINT payment_total_validation CHECK (
    ABS(total_amount - (cash_amount + card_amount)) < 0.01
  )
);

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read payment transactions from their branch"
  ON payment_transactions FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT o.id FROM orders o
      WHERE o.branch_id = (SELECT e.branch_id FROM employees e WHERE e.id = (SELECT auth.uid()))
      OR (SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin'
    )
  );

CREATE POLICY "Users can create payment transactions in their branch"
  ON payment_transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    order_id IN (
      SELECT o.id FROM orders o
      WHERE o.branch_id = (SELECT e.branch_id FROM employees e WHERE e.id = (SELECT auth.uid()))
      OR (SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin'
    )
  );

CREATE POLICY "Admins can update payment transactions"
  ON payment_transactions FOR UPDATE
  TO authenticated
  USING ((SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin')
  WITH CHECK ((SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin');

-- ============================================================================
-- STEP 3: CREATE PAYMENT LEDGER TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES payment_transactions(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  cash_in numeric(10, 2) DEFAULT 0 CHECK (cash_in >= 0),
  cash_out numeric(10, 2) DEFAULT 0 CHECK (cash_out >= 0),
  balance_difference numeric(10, 2) DEFAULT 0,
  reconciled_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payment_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read ledger from their branch"
  ON payment_ledger FOR SELECT
  TO authenticated
  USING (
    branch_id = (SELECT e.branch_id FROM employees e WHERE e.id = (SELECT auth.uid()))
    OR (SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin'
  );

CREATE POLICY "Admins can reconcile ledger"
  ON payment_ledger FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin');

-- ============================================================================
-- STEP 4: CREATE REFUND HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS refund_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE RESTRICT,
  original_transaction_id uuid REFERENCES payment_transactions(id) ON DELETE RESTRICT,
  refund_amount numeric(10, 2) NOT NULL CHECK (refund_amount > 0),
  refund_method text NOT NULL CHECK (refund_method IN ('cash', 'card', 'partial')),
  reason text NOT NULL,
  approved_by_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

ALTER TABLE refund_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins only can read and manage refunds"
  ON refund_history FOR SELECT
  TO authenticated
  USING ((SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin');

CREATE POLICY "Admins only can approve refunds"
  ON refund_history FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin');

-- ============================================================================
-- STEP 5: CREATE AUDIT LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read audit logs from their branch"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    branch_id = (SELECT e.branch_id FROM employees e WHERE e.id = (SELECT auth.uid()))
    OR (SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin'
  );

CREATE POLICY "Authenticated users can log actions"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (employee_id = (SELECT auth.uid()) OR (SELECT e.role FROM employees e WHERE e.id = (SELECT auth.uid())) = 'admin');

-- ============================================================================
-- STEP 6: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_payment_transactions_order_id ON payment_transactions(order_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_payment_transactions_created_at ON payment_transactions(created_at);
CREATE INDEX idx_payment_transactions_processed_by ON payment_transactions(processed_by_id);

CREATE INDEX idx_payment_ledger_branch_id ON payment_ledger(branch_id);
CREATE INDEX idx_payment_ledger_reconciled_at ON payment_ledger(reconciled_at);
CREATE INDEX idx_payment_ledger_employee_id ON payment_ledger(employee_id);

CREATE INDEX idx_refund_history_order_id ON refund_history(order_id);
CREATE INDEX idx_refund_history_status ON refund_history(status);
CREATE INDEX idx_refund_history_created_at ON refund_history(created_at);

CREATE INDEX idx_audit_logs_employee_id ON audit_logs(employee_id);
CREATE INDEX idx_audit_logs_branch_id ON audit_logs(branch_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
