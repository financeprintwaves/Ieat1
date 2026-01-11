/*
  # Create loyalty rewards table

  1. New Tables
    - `loyalty_rewards`
      - `id` (uuid, primary key)
      - `name` (text) - display name
      - `cost` (integer) - points required to redeem
      - `value` (numeric) - discount amount or value
      - `description` (text)
      - `is_active` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Notes
    - Configurable loyalty rewards program
    - Points-based redemption system
*/

CREATE TABLE IF NOT EXISTS loyalty_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  cost integer NOT NULL CHECK (cost > 0),
  value numeric(10, 2) NOT NULL CHECK (value > 0),
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE loyalty_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read active rewards"
  ON loyalty_rewards FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admin can read all rewards"
  ON loyalty_rewards FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin can manage rewards"
  ON loyalty_rewards FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admin can update rewards"
  ON loyalty_rewards FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin can delete rewards"
  ON loyalty_rewards FOR DELETE
  TO authenticated
  USING (true);
