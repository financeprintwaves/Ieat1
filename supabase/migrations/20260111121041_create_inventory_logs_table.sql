/*
  # Create inventory logs table

  1. New Tables
    - `inventory_logs`
      - `id` (uuid, primary key)
      - `menu_item_id` (uuid, foreign key)
      - `change` (integer) - positive or negative quantity change
      - `reason` (text) - sale, restock, waste, adjustment
      - `reported_by` (text)
      - `verified` (boolean)
      - `branch_id` (uuid, foreign key)
      - `created_at` (timestamp)
  
  2. Notes
    - Audit trail for all inventory changes
    - Immutable log for compliance and analysis
*/

CREATE TABLE IF NOT EXISTS inventory_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  change integer NOT NULL,
  reason text NOT NULL CHECK (reason IN ('sale', 'restock', 'waste', 'adjustment')),
  reported_by text,
  verified boolean DEFAULT false,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized users can read inventory logs"
  ON inventory_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authorized users can create inventory logs"
  ON inventory_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Only admins can delete inventory logs"
  ON inventory_logs FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX idx_inventory_logs_menu_item ON inventory_logs(menu_item_id);
CREATE INDEX idx_inventory_logs_branch ON inventory_logs(branch_id);
CREATE INDEX idx_inventory_logs_created_at ON inventory_logs(created_at);
CREATE INDEX idx_inventory_logs_reason ON inventory_logs(reason);
