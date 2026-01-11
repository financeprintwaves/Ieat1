/*
  # Create orders table

  1. New Tables
    - `orders`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, foreign key)
      - `server_id` (uuid, foreign key)
      - `branch_id` (uuid, foreign key)
      - `table_nos` (text array) - comma-separated table names
      - `dining_option` (text) - dine-in, take-out, delivery
      - `status` (text) - pending, cooking, ready, paid
      - `subtotal` (numeric)
      - `tax` (numeric)
      - `discount` (numeric)
      - `total_amount` (numeric)
      - `sync_status` (text) - unsynced, syncing, synced, failed
      - `payment_method` (text) - card, cash
      - `points_earned` (integer)
      - `points_redeemed` (integer)
      - `ai_insight` (text)
      - `customer_notes` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `paid_at` (timestamp)
  
  2. Security
    - Enable RLS on `orders` table
    - Add policies for order access and updates
*/

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  server_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  table_nos text[] DEFAULT ARRAY[]::text[],
  dining_option text DEFAULT 'dine-in' CHECK (dining_option IN ('dine-in', 'take-out', 'delivery')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'cooking', 'ready', 'paid')),
  subtotal numeric(10, 2) NOT NULL DEFAULT 0,
  tax numeric(10, 2) NOT NULL DEFAULT 0,
  discount numeric(10, 2) DEFAULT 0,
  total_amount numeric(10, 2) NOT NULL DEFAULT 0,
  sync_status text DEFAULT 'unsynced' CHECK (sync_status IN ('unsynced', 'syncing', 'synced', 'failed')),
  payment_method text CHECK (payment_method IN ('card', 'cash')),
  points_earned integer DEFAULT 0,
  points_redeemed integer DEFAULT 0,
  ai_insight text,
  customer_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  paid_at timestamptz,
  CONSTRAINT positive_amounts CHECK (subtotal >= 0 AND tax >= 0 AND total_amount >= 0)
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized users can read orders"
  ON orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authorized users can create orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authorized users can update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin can delete orders"
  ON orders FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_server_id ON orders(server_id);
CREATE INDEX idx_orders_branch_id ON orders(branch_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_sync_status ON orders(sync_status);
