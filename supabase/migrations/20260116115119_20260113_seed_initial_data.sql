/*
  # Seed initial branches and users
  
  1. Branches Created
    - Main Branch
    - Arabic Bar
  
  2. Employees Created
    - Royal (Admin) - PIN: 8122
    - Jerry (Waiter) - PIN: 1517
*/

-- Insert default branches
INSERT INTO branches (name, address)
VALUES 
  ('Main Branch', '123 Main St'),
  ('Arabic Bar', '456 Downtown')
ON CONFLICT (name) DO NOTHING;

-- Insert default employees
INSERT INTO employees (name, email, pin, role, branch_id, is_checked_in)
SELECT 
  'Royal',
  'royal@ieat.com',
  '8122',
  'admin',
  (SELECT id FROM branches WHERE name = 'Main Branch' LIMIT 1),
  false
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE email = 'royal@ieat.com');

INSERT INTO employees (name, email, pin, role, branch_id, is_checked_in)
SELECT 
  'Jerry',
  'jerry@ieat.com',
  '1517',
  'waiter',
  (SELECT id FROM branches WHERE name = 'Main Branch' LIMIT 1),
  false
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE email = 'jerry@ieat.com');
