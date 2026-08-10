-- Initial schema for Sales Attendance & Spin Wheel App
-- Security principle: backend validates all business rules

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Helper: haversine distance in meters
CREATE OR REPLACE FUNCTION public.haversine_distance_meters(
  lat1 DOUBLE PRECISION,
  lon1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION,
  lon2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 6371000 * 2 * ASIN(
    SQRT(
      POWER(SIN(RADIANS(lat2 - lat1) / 2), 2) +
      COS(RADIANS(lat1)) * COS(RADIANS(lat2)) *
      POWER(SIN(RADIANS(lon2 - lon1) / 2), 2)
    )
  );
$$;

-- sales profiles (linked to Supabase Auth)
CREATE TABLE public.sales (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  sales_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  role TEXT NOT NULL DEFAULT 'sales' CHECK (role IN ('sales', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sales_status ON public.sales(status);
CREATE INDEX idx_sales_role ON public.sales(role);

-- stores
CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  address TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 50 CHECK (radius_meters > 0 AND radius_meters <= 5000),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stores_status ON public.stores(status);
CREATE INDEX idx_stores_name ON public.stores(name);
CREATE INDEX idx_stores_code ON public.stores(store_code);

-- attendance records
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE RESTRICT,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  gps_accuracy DOUBLE PRECISION,
  distance_meters DOUBLE PRECISION,
  photo_path TEXT,
  client_captured_at TIMESTAMPTZ NOT NULL,
  server_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_attendance_sales_id ON public.attendance(sales_id);
CREATE INDEX idx_attendance_store_id ON public.attendance(store_id);
CREATE INDEX idx_attendance_status ON public.attendance(status);
CREATE INDEX idx_attendance_created_at ON public.attendance(created_at DESC);

-- rewards (admin-managed)
CREATE TABLE public.rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  value TEXT NOT NULL,
  probability NUMERIC(5, 4) NOT NULL CHECK (probability >= 0 AND probability <= 1),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rewards_status ON public.rewards(status);

-- spins (one per sales per store per day enforced by unique constraint)
CREATE TABLE public.spins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE RESTRICT,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  attendance_id UUID NOT NULL REFERENCES public.attendance(id) ON DELETE RESTRICT,
  reward_id UUID REFERENCES public.rewards(id) ON DELETE SET NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  spin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sales_id, store_id, spin_date)
);

CREATE INDEX idx_spins_sales_id ON public.spins(sales_id);
CREATE INDEX idx_spins_store_id ON public.spins(store_id);
CREATE INDEX idx_spins_attendance_id ON public.spins(attendance_id);
CREATE INDEX idx_spins_created_at ON public.spins(created_at DESC);

-- device tracking
CREATE TABLE public.devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  device_identifier TEXT NOT NULL,
  platform TEXT,
  app_version TEXT,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sales_id, device_identifier)
);

CREATE INDEX idx_devices_sales_id ON public.devices(sales_id);

-- audit logs
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN (
    'LOGIN',
    'ATTENDANCE_STARTED',
    'GPS_REJECTED',
    'CAMERA_CAPTURED',
    'ATTENDANCE_SUBMITTED',
    'ATTENDANCE_APPROVED',
    'ATTENDANCE_REJECTED',
    'SPIN_STARTED',
    'SPIN_REJECTED',
    'SPIN_COMPLETED'
  )),
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_sales_id ON public.audit_logs(sales_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Helper: check if current user is admin (must be after sales table)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sales
    WHERE id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
  );
$$;

-- Auto-create sales profile on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.sales (id, sales_code, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'sales_code', 'S' || SUBSTR(NEW.id::TEXT, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Prevent clients from setting attendance status directly
CREATE OR REPLACE FUNCTION public.enforce_attendance_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.status := 'pending';
    NEW.server_created_at := now();
  ELSIF TG_OP = 'UPDATE' THEN
    IF NOT public.is_admin() AND NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Only admins can change attendance status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER attendance_status_guard
  BEFORE INSERT OR UPDATE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.enforce_attendance_status();
