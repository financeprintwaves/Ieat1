-- Fix payment_method enum to include 'partial' and 'split'
DO $$
BEGIN
  -- Drop the existing constraint
  ALTER TABLE orders 
  DROP CONSTRAINT IF EXISTS orders_payment_method_check;
  
  -- Add new constraint that allows 'card', 'cash', 'partial', and 'split'
  ALTER TABLE orders
  ADD CONSTRAINT orders_payment_method_check 
  CHECK (payment_method IN ('card', 'cash', 'partial', 'split'));
  
  EXCEPTION WHEN OTHERS THEN
    -- If constraint doesn't exist, just add it
    ALTER TABLE orders
    ADD CONSTRAINT orders_payment_method_check 
    CHECK (payment_method IN ('card', 'cash', 'partial', 'split'));
END $$;
