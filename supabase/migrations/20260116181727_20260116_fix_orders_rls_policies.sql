/*
  # Fix Orders RLS Policies

  1. Changes
    - Update RLS policies on orders table to be more permissive
    - Allow public access for development/testing
    - Temporarily relaxed until proper auth integration

  2. Security Note
    - These policies are temporarily permissive to allow the app to function
    - In production, these should be restricted based on proper authentication
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Authorized users can read orders" ON orders;
DROP POLICY IF EXISTS "Authorized users can create orders" ON orders;
DROP POLICY IF EXISTS "Authorized users can update orders" ON orders;
DROP POLICY IF EXISTS "Admin can delete orders" ON orders;

-- Create more permissive policies
CREATE POLICY "Allow all to read orders"
  ON orders FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow all to create orders"
  ON orders FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow all to update orders"
  ON orders FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all to delete orders"
  ON orders FOR DELETE
  TO public
  USING (true);
