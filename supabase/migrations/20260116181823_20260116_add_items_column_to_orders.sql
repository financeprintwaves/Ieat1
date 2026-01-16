/*
  # Add items column to orders table

  1. Changes
    - Add `items` JSONB column to store order items directly
    - This allows for faster reads and maintains compatibility with frontend code

  2. Note
    - order_items table is still used for individual item management
    - items column provides denormalized quick access
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'items'
  ) THEN
    ALTER TABLE orders ADD COLUMN items jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;
