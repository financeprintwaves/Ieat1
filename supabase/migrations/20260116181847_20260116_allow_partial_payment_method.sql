/*
  # Allow partial payment method in orders

  1. Changes
    - Update payment_method CHECK constraint to allow 'partial' payment method
    - This allows for split payments (cash + card)

  2. Note
    - Existing constraint only allowed 'card' or 'cash'
    - Now allows 'card', 'cash', or 'partial'
*/

-- Drop the existing constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;

-- Add new constraint that allows 'partial'
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check 
  CHECK (payment_method IS NULL OR payment_method IN ('card', 'cash', 'partial'));
