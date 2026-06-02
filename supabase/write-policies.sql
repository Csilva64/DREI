-- Run in Supabase SQL Editor to enable write access for authenticated users

CREATE POLICY "Authenticated write revenue"
  ON monthly_revenue FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated write kpis"
  ON dashboard_kpis FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
