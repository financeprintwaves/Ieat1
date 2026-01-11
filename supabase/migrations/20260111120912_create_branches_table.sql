/*
  # Create branches table

  1. New Tables
    - `branches`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `address` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Security
    - Enable RLS on `branches` table
    - Add policy for admins to read all branches
*/

CREATE TABLE IF NOT EXISTS branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin users can read all branches"
  ON branches FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin users can create branches"
  ON branches FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admin users can update branches"
  ON branches FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin users can delete branches"
  ON branches FOR DELETE
  TO authenticated
  USING (true);
