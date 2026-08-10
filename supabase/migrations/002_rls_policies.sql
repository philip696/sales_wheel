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
