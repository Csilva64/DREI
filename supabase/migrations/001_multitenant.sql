-- ============================================================
-- OPCO Dashboard · Multi-Tenant Migration
-- Run in Supabase SQL Editor (in order)
-- ============================================================

-- 1. Core tenant tables

CREATE TABLE IF NOT EXISTS organizations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  plan        TEXT NOT NULL DEFAULT 'starter',
  suspended_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organization_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'member',
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org  ON organization_members(organization_id);

CREATE TABLE IF NOT EXISTS organization_branding (
  organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  company_name    TEXT NOT NULL,
  logo_url        TEXT,
  favicon_url     TEXT,
  primary_color   TEXT DEFAULT '#f97316',
  accent_color    TEXT DEFAULT '#3b82f6',
  locale          TEXT DEFAULT 'pt-BR',
  currency        TEXT DEFAULT 'BRL',
  custom_domain   TEXT UNIQUE,
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- 2. Add organization_id to tenant data tables (nullable first)

ALTER TABLE monthly_revenue    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE client_data        ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE operator_payouts   ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE dashboard_kpis     ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- 3. Seed OPCO as first organization

INSERT INTO organizations (id, slug, name, plan)
VALUES ('6f8b4c2a-1d3e-4f5a-9b7c-8d0e2f1a3b5c', 'opco', 'OPCO Tours', 'pro')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO organization_branding (organization_id, company_name, primary_color, locale, currency)
VALUES ('6f8b4c2a-1d3e-4f5a-9b7c-8d0e2f1a3b5c', 'OPCO Tours', '#f97316', 'pt-BR', 'BRL')
ON CONFLICT (organization_id) DO NOTHING;

-- 4. Tag all existing rows with OPCO org id

UPDATE monthly_revenue  SET organization_id = '6f8b4c2a-1d3e-4f5a-9b7c-8d0e2f1a3b5c' WHERE organization_id IS NULL;
UPDATE client_data      SET organization_id = '6f8b4c2a-1d3e-4f5a-9b7c-8d0e2f1a3b5c' WHERE organization_id IS NULL;
UPDATE operator_payouts SET organization_id = '6f8b4c2a-1d3e-4f5a-9b7c-8d0e2f1a3b5c' WHERE organization_id IS NULL;
UPDATE dashboard_kpis   SET organization_id = '6f8b4c2a-1d3e-4f5a-9b7c-8d0e2f1a3b5c' WHERE organization_id IS NULL;

-- 5. Make NOT NULL after data migration

ALTER TABLE monthly_revenue  ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE client_data      ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE operator_payouts ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE dashboard_kpis   ALTER COLUMN organization_id SET NOT NULL;

-- 6. Enroll all existing users in OPCO org as owners

INSERT INTO organization_members (organization_id, user_id, role)
SELECT '6f8b4c2a-1d3e-4f5a-9b7c-8d0e2f1a3b5c', id, 'owner'
FROM auth.users
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- 7. RLS on new tables

ALTER TABLE organizations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_branding  ENABLE ROW LEVEL SECURITY;

-- Members can read their own org
CREATE POLICY "Read own org"
  ON organizations FOR SELECT TO authenticated
  USING (id = (auth.jwt() ->> 'organization_id')::UUID);

CREATE POLICY "Read own org members"
  ON organization_members FOR SELECT TO authenticated
  USING (organization_id = (auth.jwt() ->> 'organization_id')::UUID);

CREATE POLICY "Read own branding"
  ON organization_branding FOR SELECT TO authenticated
  USING (organization_id = (auth.jwt() ->> 'organization_id')::UUID);

-- Admins/owners can write branding
CREATE POLICY "Admin write branding"
  ON organization_branding FOR ALL TO authenticated
  USING (
    organization_id = (auth.jwt() ->> 'organization_id')::UUID
    AND (auth.jwt() ->> 'organization_role') IN ('owner', 'admin')
  )
  WITH CHECK (
    organization_id = (auth.jwt() ->> 'organization_id')::UUID
    AND (auth.jwt() ->> 'organization_role') IN ('owner', 'admin')
  );

-- 8. Drop old permissive RLS policies, add org-scoped ones

DROP POLICY IF EXISTS "Authenticated read revenue"   ON monthly_revenue;
DROP POLICY IF EXISTS "Authenticated read clients"   ON client_data;
DROP POLICY IF EXISTS "Authenticated read operators" ON operator_payouts;
DROP POLICY IF EXISTS "Authenticated read kpis"      ON dashboard_kpis;
DROP POLICY IF EXISTS "Authenticated write revenue"  ON monthly_revenue;
DROP POLICY IF EXISTS "Authenticated write kpis"     ON dashboard_kpis;

CREATE POLICY "Org read revenue"
  ON monthly_revenue FOR SELECT TO authenticated
  USING (organization_id = (auth.jwt() ->> 'organization_id')::UUID);

CREATE POLICY "Org write revenue"
  ON monthly_revenue FOR ALL TO authenticated
  USING (organization_id = (auth.jwt() ->> 'organization_id')::UUID)
  WITH CHECK (organization_id = (auth.jwt() ->> 'organization_id')::UUID);

CREATE POLICY "Org read clients"
  ON client_data FOR SELECT TO authenticated
  USING (organization_id = (auth.jwt() ->> 'organization_id')::UUID);

CREATE POLICY "Org write clients"
  ON client_data FOR ALL TO authenticated
  USING (organization_id = (auth.jwt() ->> 'organization_id')::UUID)
  WITH CHECK (organization_id = (auth.jwt() ->> 'organization_id')::UUID);

CREATE POLICY "Org read operators"
  ON operator_payouts FOR SELECT TO authenticated
  USING (organization_id = (auth.jwt() ->> 'organization_id')::UUID);

CREATE POLICY "Org write operators"
  ON operator_payouts FOR ALL TO authenticated
  USING (organization_id = (auth.jwt() ->> 'organization_id')::UUID)
  WITH CHECK (organization_id = (auth.jwt() ->> 'organization_id')::UUID);

CREATE POLICY "Org read kpis"
  ON dashboard_kpis FOR SELECT TO authenticated
  USING (organization_id = (auth.jwt() ->> 'organization_id')::UUID);

CREATE POLICY "Org write kpis"
  ON dashboard_kpis FOR ALL TO authenticated
  USING (organization_id = (auth.jwt() ->> 'organization_id')::UUID)
  WITH CHECK (organization_id = (auth.jwt() ->> 'organization_id')::UUID);

-- 9. JWT Custom Claims Hook (schema PUBLIC — SQL Editor tem permissão aqui)
-- Após executar: Supabase → Authentication → Hooks → apontar para public.custom_access_token_hook

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  claims    JSONB;
  org_id    UUID;
  org_role  TEXT;
BEGIN
  SELECT om.organization_id, om.role
    INTO org_id, org_role
    FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
   WHERE om.user_id = (event ->> 'user_id')::UUID
     AND o.suspended_at IS NULL
   ORDER BY CASE om.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END
   LIMIT 1;

  claims := event -> 'claims';

  IF org_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{organization_id}',   to_jsonb(org_id::TEXT));
    claims := jsonb_set(claims, '{organization_role}', to_jsonb(org_role));
  END IF;

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO authenticated;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO anon;
