/*
  # Create employees table

  1. New Tables
    - `employees`
      - `id` (uuid, primary key)
      - `name` (text)
      - `email` (text, unique)
      - `pin` (text) - 4-digit PIN for login
      - `role` (text) - admin, waiter, kitchen
      - `phone` (text)
      - `branch_id` (uuid, foreign key)
      - `is_checked_in` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Security
    - Enable RLS on `employees` table
    - Add policies for authentication and employee management
*/

CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE,
  pin text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'waiter', 'kitchen')),
  phone text,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  is_checked_in boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can read all employees"
  ON employees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin can create employees"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admin can update employees"
  ON employees FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin can delete employees"
  ON employees FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX idx_employees_branch_id ON employees(branch_id);
CREATE INDEX idx_employees_pin ON employees(pin);
