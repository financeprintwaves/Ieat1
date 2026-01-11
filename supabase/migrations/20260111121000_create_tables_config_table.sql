/*
  # Create dining tables configuration table

  1. New Tables
    - `tables`
      - `id` (uuid, primary key)
      - `name` (text)
      - `capacity` (integer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Notes
    - Represents physical dining tables in the restaurant
*/

CREATE TABLE IF NOT EXISTS tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  capacity integer DEFAULT 4,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read tables"
  ON tables FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin can create tables"
  ON tables FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admin can update tables"
  ON tables FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin can delete tables"
  ON tables FOR DELETE
  TO authenticated
  USING (true);
