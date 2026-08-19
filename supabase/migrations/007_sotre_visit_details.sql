-- Store visit details (phone, owner, usual order, notes)
--
-- These fields used to live only on-device (src/services/localStoreService.ts,
-- backed by expo-secure-store), which meant they never synced between
-- devices, were invisible to admins, and broke on web (SecureStore has no
-- web implementation). This migration moves them onto public.stores, the
-- same table the rest of the app already reads/writes through storeService.ts.
--
-- public.stores is the only table that holds store fields — attendance and
-- spins only reference stores via store_id (FK), so no other table needs
-- these columns.

ALTER TABLE public.stores
  ADD COLUMN phone_number TEXT NOT NULL DEFAULT '',
  ADD COLUMN owner_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN usual_order TEXT NOT NULL DEFAULT '',
  ADD COLUMN notes TEXT NOT NULL DEFAULT '';

-- Existing RLS on public.stores:
--   authenticated_read_active_stores -> any authenticated user can SELECT
--     active stores (or all stores, if admin)
--   admin_manage_stores              -> only admins can INSERT/UPDATE/DELETE
--
-- Sales reps need to edit phone_number/owner_name/usual_order/notes for
-- stores they visit, but should NOT be able to touch store_code, name,
-- coordinates, radius, or status — those stay admin-only. Row Level
-- Security policies can only restrict which *rows* a statement touches, not
-- which *columns* it may write, so a blanket UPDATE policy for sales would
-- also let them rewrite GPS coordinates or the geofence radius.
--
-- The existing app already solves the same problem (submit_attendance,
-- request_spin, signup_sales_user) with a SECURITY DEFINER RPC that only
-- writes the specific columns it's meant to. This follows that pattern:
-- the function runs with elevated privilege, but only ever touches these
-- four columns, regardless of what the caller passes.
CREATE OR REPLACE FUNCTION public.update_store_visit_details(
  p_store_id UUID,
  p_phone_number TEXT,
  p_owner_name TEXT,
  p_usual_order TEXT,
  p_notes TEXT
)
RETURNS public.stores
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store public.stores;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.stores
  SET
    phone_number = COALESCE(p_phone_number, ''),
    owner_name = COALESCE(p_owner_name, ''),
    usual_order = COALESCE(p_usual_order, ''),
    notes = COALESCE(p_notes, '')
  WHERE id = p_store_id
  RETURNING * INTO v_store;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Store not found';
  END IF;

  RETURN v_store;
END;
$$;

-- Callable by any signed-in sales user (or admin); the function body is the
-- only thing deciding what gets written, same as the other RPCs in this app.
GRANT EXECUTE ON FUNCTION public.update_store_visit_details(UUID, TEXT, TEXT, TEXT, TEXT)
  TO authenticated;