/*
  # Create branch menu configuration table

  1. New Tables
    - `branch_menu_config`
      - `id` (uuid, primary key)
      - `branch_id` (uuid, foreign key)
      - `menu_item_id` (uuid, foreign key)
      - `is_visible` (boolean) - whether item shows in this branch
      - `price` (numeric) - branch-specific price
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Notes
    - Allows per-branch menu customization and pricing
    - Composite unique constraint: one config per branch/item combo
*/

CREATE TABLE IF NOT EXISTS branch_menu_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  is_visible boolean DEFAULT true,
  price numeric(10, 2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(branch_id, menu_item_id)
);

ALTER TABLE branch_menu_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read branch menu config"
  ON branch_menu_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin can manage branch menu config"
  ON branch_menu_config FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admin can update branch menu config"
  ON branch_menu_config FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin can delete branch menu config"
  ON branch_menu_config FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX idx_branch_menu_config_branch ON branch_menu_config(branch_id);
CREATE INDEX idx_branch_menu_config_item ON branch_menu_config(menu_item_id);
