-- Row Level Security policies

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- sales policies
CREATE POLICY "sales_read_own_profile"
  ON public.sales FOR SELECT
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "sales_update_own_profile"
  ON public.sales FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM public.sales WHERE id = auth.uid()));

CREATE POLICY "admin_manage_sales"
  ON public.sales FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- stores policies
CREATE POLICY "authenticated_read_active_stores"
  ON public.stores FOR SELECT
  USING (auth.role() = 'authenticated' AND (status = 'active' OR public.is_admin()));

CREATE POLICY "admin_manage_stores"
  ON public.stores FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- attendance policies
CREATE POLICY "sales_read_own_attendance"
  ON public.attendance FOR SELECT
  USING (sales_id = auth.uid() OR public.is_admin());

CREATE POLICY "sales_insert_own_attendance"
  ON public.attendance FOR INSERT
  WITH CHECK (sales_id = auth.uid());

CREATE POLICY "admin_manage_attendance"
  ON public.attendance FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- rewards policies
CREATE POLICY "sales_read_active_rewards"
  ON public.rewards FOR SELECT
  USING (auth.role() = 'authenticated' AND (status = 'active' OR public.is_admin()));

CREATE POLICY "admin_manage_rewards"
  ON public.rewards FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- spins policies
CREATE POLICY "sales_read_own_spins"
  ON public.spins FOR SELECT
  USING (sales_id = auth.uid() OR public.is_admin());

CREATE POLICY "sales_insert_own_spins"
  ON public.spins FOR INSERT
  WITH CHECK (sales_id = auth.uid());

CREATE POLICY "admin_manage_spins"
  ON public.spins FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- devices policies
CREATE POLICY "sales_manage_own_devices"
  ON public.devices FOR ALL
  USING (sales_id = auth.uid())
  WITH CHECK (sales_id = auth.uid());

CREATE POLICY "admin_read_devices"
  ON public.devices FOR SELECT
  USING (public.is_admin());

-- audit_logs policies
CREATE POLICY "sales_insert_own_audit_logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (sales_id = auth.uid() OR sales_id IS NULL);

CREATE POLICY "sales_read_own_audit_logs"
  ON public.audit_logs FOR SELECT
  USING (sales_id = auth.uid() OR public.is_admin());

CREATE POLICY "admin_manage_audit_logs"
  ON public.audit_logs FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Allow sales reps to create stores, not just admins
--
-- app/(sales)/add-store.tsx lets a sales rep add a store while physically
-- standing at it (GPS-verified against the coordinates being submitted,
-- see calculateDistanceMeters()/verifyUserIsAtStore() in that screen).
-- Previously this wrote to on-device storage only (src/services/
-- localStoreService.ts) because the "admin_manage_stores" policy from
-- 002_rls_policies.sql restricts INSERT/UPDATE/DELETE on public.stores to
-- admins, which would have rejected a plain insert from a sales account.
--
-- This adds a second, narrower INSERT policy for sales rather than
-- widening admin_manage_stores itself: sales reps may only INSERT, and
-- only with status = 'active' and the same fixed 50m radius the app
-- already enforces client-side (STORE_RADIUS_METERS in add-store.tsx).
-- UPDATE/DELETE on stores -- store_code, name, coordinates, radius,
-- status -- remain admin-only via admin_manage_stores. (Sales-editable
-- visit-detail fields go through update_store_visit_details() from
-- 007_store_visit_details.sql instead, which is scoped to those four
-- columns regardless of table-level RLS.)
--
-- Postgres RLS policies for the same command are combined with OR, so this
-- policy adds to admin_manage_stores rather than replacing it -- admins
-- keep full access, sales gain this one additional path.
CREATE POLICY "sales_create_stores"
  ON public.stores FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND status = 'active'
    AND radius_meters = 50
  );