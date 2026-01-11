/*
  # Create app settings table

  1. New Tables
    - `app_settings`
      - `id` (text, primary key) - usually 'global'
      - `currency_symbol` (text) - e.g., 'OMR'
      - `current_branch_id` (uuid, foreign key)
      - `tax_rate` (numeric) - tax percentage as decimal (e.g., 0.05 for 5%)
      - `updated_at` (timestamp)
  
  2. Notes
    - Global application configuration
    - Single row or multiple settings per branch
*/

CREATE TABLE IF NOT EXISTS app_settings (
  id text PRIMARY KEY,
  currency_symbol text DEFAULT 'OMR',
  current_branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  tax_rate numeric(5, 4) DEFAULT 0.05 CHECK (tax_rate >= 0 AND tax_rate <= 1),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read settings"
  ON app_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin can update settings"
  ON app_settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

INSERT INTO app_settings (id, currency_symbol, tax_rate)
VALUES ('global', 'OMR', 0.05)
ON CONFLICT (id) DO NOTHING;
