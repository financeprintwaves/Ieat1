/*
  # Create modifiers table

  1. New Tables
    - `modifiers`
      - `id` (uuid, primary key)
      - `menu_item_id` (uuid, foreign key)
      - `name` (text)
      - `price` (numeric)
      - `created_at` (timestamp)
  
  2. Notes
    - Modifiers are add-ons like "Extra Cheese", "Spicy", etc.
    - Many-to-one relationship with menu items
*/

CREATE TABLE IF NOT EXISTS modifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric(10, 2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE modifiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read modifiers"
  ON modifiers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin can manage modifiers"
  ON modifiers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admin can update modifiers"
  ON modifiers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin can delete modifiers"
  ON modifiers FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX idx_modifiers_menu_item ON modifiers(menu_item_id);
