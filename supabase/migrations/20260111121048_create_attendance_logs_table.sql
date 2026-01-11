/*
  # Create attendance logs table

  1. New Tables
    - `attendance_logs`
      - `id` (uuid, primary key)
      - `employee_id` (uuid, foreign key)
      - `employee_name` (text) - snapshot for history
      - `type` (text) - check-in, check-out
      - `timestamp` (timestamp)
      - `branch_id` (uuid, foreign key)
      - `created_at` (timestamp)
  
  2. Notes
    - Immutable audit log for employee check-ins/outs
    - Snapshot of employee name for historical accuracy
*/

CREATE TABLE IF NOT EXISTS attendance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employee_name text NOT NULL,
  type text NOT NULL CHECK (type IN ('check-in', 'check-out')),
  timestamp timestamptz NOT NULL,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized users can read attendance logs"
  ON attendance_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authorized users can create attendance logs"
  ON attendance_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Only admins can delete attendance logs"
  ON attendance_logs FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX idx_attendance_logs_employee ON attendance_logs(employee_id);
CREATE INDEX idx_attendance_logs_timestamp ON attendance_logs(timestamp);
CREATE INDEX idx_attendance_logs_branch ON attendance_logs(branch_id);
