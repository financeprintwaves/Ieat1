/*
  # Add missing fields to menu_items table

  ## Changes
  1. Add missing columns to menu_items table
    - `is_kitchen_item` (boolean) - marks if item needs kitchen preparation
    - `menu_category` (text) - additional categorization (indian-bar, arabic-bar, general)
  
  2. Set default values
    - `is_kitchen_item` defaults to false
    - `menu_category` defaults to 'general'

  ## Notes
  - These fields are used by the application but were missing from the original schema
  - Using IF NOT EXISTS pattern to prevent errors on re-run
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'menu_items' AND column_name = 'is_kitchen_item'
  ) THEN
    ALTER TABLE menu_items ADD COLUMN is_kitchen_item boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'menu_items' AND column_name = 'menu_category'
  ) THEN
    ALTER TABLE menu_items ADD COLUMN menu_category text DEFAULT 'general';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_menu_items_is_kitchen ON menu_items(is_kitchen_item);
CREATE INDEX IF NOT EXISTS idx_menu_items_menu_category ON menu_items(menu_category);
