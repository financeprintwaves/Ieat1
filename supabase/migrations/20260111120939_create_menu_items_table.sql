/*
  # Create menu items table

  1. New Tables
    - `menu_items`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `category` (text) - food, drink, dessert
      - `price` (numeric) - base price
      - `cost` (numeric) - cost to prepare
      - `stock` (integer)
      - `low_stock_threshold` (integer)
      - `barcode` (text)
      - `image` (text) - URL
      - `is_trending` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Security
    - Enable RLS on `menu_items` table
    - Add policies for menu management
*/

CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL CHECK (category IN ('food', 'drink', 'dessert')),
  price numeric(10, 2) NOT NULL,
  cost numeric(10, 2) DEFAULT 0,
  stock integer DEFAULT 0,
  low_stock_threshold integer DEFAULT 10,
  barcode text,
  image text,
  is_trending boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read menu items"
  ON menu_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin can create menu items"
  ON menu_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admin can update menu items"
  ON menu_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin can delete menu items"
  ON menu_items FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX idx_menu_items_category ON menu_items(category);
CREATE INDEX idx_menu_items_barcode ON menu_items(barcode);
