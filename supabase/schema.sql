-- ============================================================
-- OPCO Dashboard · Schema + Seed
-- Run once in Supabase SQL Editor
-- ============================================================

-- 1. Tables

CREATE TABLE IF NOT EXISTS dashboard_kpis (
  id SERIAL PRIMARY KEY,
  total_revenue NUMERIC NOT NULL,
  best_month TEXT NOT NULL,
  best_month_value NUMERIC NOT NULL,
  monthly_average NUMERIC NOT NULL,
  total_payouts NUMERIC NOT NULL,
  yoy_growth NUMERIC NOT NULL
);

CREATE TABLE IF NOT EXISTS monthly_revenue (
  id SERIAL PRIMARY KEY,
  sort_order INTEGER NOT NULL,
  month TEXT NOT NULL,
  year INTEGER NOT NULL,
  revenue NUMERIC NOT NULL,
  opco NUMERIC NOT NULL,
  sabrina NUMERIC NOT NULL,
  giovani NUMERIC NOT NULL,
  gabriella NUMERIC NOT NULL,
  is_highlight BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS client_data (
  id SERIAL PRIMARY KEY,
  rank INTEGER NOT NULL,
  name TEXT NOT NULL,
  revenue NUMERIC NOT NULL,
  percentage NUMERIC NOT NULL
);

CREATE TABLE IF NOT EXISTS operator_payouts (
  id SERIAL PRIMARY KEY,
  sort_order INTEGER NOT NULL,
  name TEXT NOT NULL,
  total NUMERIC NOT NULL,
  percentage NUMERIC NOT NULL
);

-- 2. Row Level Security (authenticated users can read)

ALTER TABLE dashboard_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE operator_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read kpis"
  ON dashboard_kpis FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated read revenue"
  ON monthly_revenue FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated read clients"
  ON client_data FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated read operators"
  ON operator_payouts FOR SELECT TO authenticated USING (true);

-- 3. Seed data (idempotent — delete first)

TRUNCATE dashboard_kpis, monthly_revenue, client_data, operator_payouts RESTART IDENTITY;

INSERT INTO dashboard_kpis
  (total_revenue, best_month, best_month_value, monthly_average, total_payouts, yoy_growth)
VALUES
  (5643434.24, 'Out/25', 2388611.98, 512948, 640125.26, -74.0);

INSERT INTO monthly_revenue
  (sort_order, month, year, revenue, opco, sabrina, giovani, gabriella, is_highlight)
VALUES
  ( 0, 'Abr/25',  2025,  202379.73,  16935.77, 2415.41, 2415.41,     0.00, false),
  ( 1, 'Mai/25',  2025,   77359.85,   6790.93,  943.19,  943.19,     0.00, false),
  ( 2, 'Jun/25',  2025,   65200.59,   7359.46, 1378.30, 1378.30,     0.00, false),
  ( 3, 'Set/25',  2025,  282971.13,  19295.37, 2679.91, 2679.91,     0.00, false),
  ( 4, 'Out/25',  2025, 2388611.98, 293437.50, 6509.74, 6509.74, 45266.70, true),
  ( 5, 'Nov/25',  2025,  646377.67,  42804.69, 6575.95, 6575.95,     0.00, false),
  ( 6, 'Dez/25',  2025,  262303.84,  18051.47, 2507.15, 2507.15,     0.00, false),
  ( 7, 'Fev/26',  2026,  174867.23,   9504.93, 1320.13, 1320.13,     0.00, false),
  ( 8, 'Fev/26C', 2026, 1068875.70,  57688.72, 8884.81, 8884.81, 15704.73, false),
  ( 9, 'Mar/26',  2026,  105050.89,   9996.60, 1388.42, 1388.42,     0.00, false),
  (10, 'Abr/26',  2026,  369435.63,  21977.52, 3052.43, 3052.43,     0.00, false);

INSERT INTO client_data
  (rank, name, revenue, percentage)
VALUES
  (1, 'JAPAN GRACE CO LTD',  2044324.54, 60.5),
  (2, 'GEBECO',              1171416.45, 34.7),
  (3, 'IKARUS TOURS GMBH',    358584.31, 10.6),
  (4, 'PHOENIX REISEN',       240245.95,  7.1),
  (5, 'DREAMLINES',           154226.00,  4.6);

INSERT INTO operator_payouts
  (sort_order, name, total, percentage)
VALUES
  (0, 'OPCO',      503842.95, 78.7),
  (1, 'SABRINA',    37655.44,  5.9),
  (2, 'GIOVANI',    37655.44,  5.9),
  (3, 'GABRIELLA',  60971.43,  9.5);
