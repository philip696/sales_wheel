-- Storage bucket and server-side business logic functions

-- Attendance photos storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attendance-photos',
  'attendance-photos',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: sales upload to their own folder, admins read all
CREATE POLICY "sales_upload_own_attendance_photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'attendance-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "sales_read_own_attendance_photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'attendance-photos'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );

CREATE POLICY "admin_manage_attendance_photos"
  ON storage.objects FOR ALL
  USING (bucket_id = 'attendance-photos' AND public.is_admin())
  WITH CHECK (bucket_id = 'attendance-photos' AND public.is_admin());

-- Server-side attendance validation
CREATE OR REPLACE FUNCTION public.submit_attendance(
  p_store_id UUID,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_gps_accuracy DOUBLE PRECISION,
  p_client_captured_at TIMESTAMPTZ,
  p_photo_path TEXT
)
RETURNS TABLE (
  attendance_id UUID,
  status TEXT,
  distance_meters DOUBLE PRECISION,
  rejection_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sales_id UUID;
  v_store RECORD;
  v_distance DOUBLE PRECISION;
  v_status TEXT := 'pending';
  v_rejection TEXT := NULL;
  v_attendance_id UUID;
BEGIN
  v_sales_id := auth.uid();
  IF v_sales_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_store
  FROM public.stores
  WHERE id = p_store_id AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Store not found or inactive';
  END IF;

  v_distance := public.haversine_distance_meters(
    p_latitude, p_longitude,
    v_store.latitude, v_store.longitude
  );

  IF v_distance > v_store.radius_meters THEN
    v_status := 'rejected';
    v_rejection := format('Distance %.1fm exceeds allowed radius of %sm', v_distance, v_store.radius_meters);
  ELSIF p_gps_accuracy IS NULL OR p_gps_accuracy <= 0 OR p_gps_accuracy > 100 THEN
    v_status := 'rejected';
    v_rejection := 'GPS accuracy insufficient';
  ELSIF p_photo_path IS NULL OR length(trim(p_photo_path)) = 0 THEN
    v_status := 'rejected';
    v_rejection := 'Attendance photo required';
  ELSE
    v_status := 'approved';
  END IF;

  INSERT INTO public.attendance (
    sales_id, store_id, latitude, longitude, gps_accuracy,
    distance_meters, photo_path, client_captured_at, status, rejection_reason
  ) VALUES (
    v_sales_id, p_store_id, p_latitude, p_longitude, p_gps_accuracy,
    v_distance, p_photo_path, p_client_captured_at, v_status, v_rejection
  )
  RETURNING id INTO v_attendance_id;

  INSERT INTO public.audit_logs (sales_id, action, store_id, metadata)
  VALUES (
    v_sales_id,
    CASE WHEN v_status = 'approved' THEN 'ATTENDANCE_APPROVED' ELSE 'ATTENDANCE_REJECTED' END,
    p_store_id,
    jsonb_build_object(
      'attendance_id', v_attendance_id,
      'distance_meters', v_distance,
      'gps_accuracy', p_gps_accuracy,
      'rejection_reason', v_rejection
    )
  );

  RETURN QUERY SELECT v_attendance_id, v_status, v_distance, v_rejection;
END;
$$;

-- Server-side spin with reward selection and duplicate prevention
CREATE OR REPLACE FUNCTION public.request_spin(
  p_attendance_id UUID,
  p_store_id UUID,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION
)
RETURNS TABLE (
  spin_id UUID,
  status TEXT,
  reward_id UUID,
  reward_name TEXT,
  reward_value TEXT,
  rejection_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sales_id UUID;
  v_attendance RECORD;
  v_spin_id UUID;
  v_reward RECORD;
  v_random NUMERIC;
  v_cumulative NUMERIC := 0;
  v_status TEXT := 'completed';
  v_rejection TEXT := NULL;
  v_today DATE := CURRENT_DATE;
BEGIN
  v_sales_id := auth.uid();
  IF v_sales_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_attendance
  FROM public.attendance
  WHERE id = p_attendance_id
    AND sales_id = v_sales_id
    AND store_id = p_store_id
    AND status = 'approved';

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, 'rejected'::TEXT, NULL::UUID, NULL::TEXT, NULL::TEXT,
      'No approved attendance found for this store'::TEXT;
    RETURN;
  END IF;

  -- Attempt insert with unique constraint for one spin per store per day
  BEGIN
    INSERT INTO public.spins (sales_id, store_id, attendance_id, latitude, longitude, spin_date, status)
    VALUES (v_sales_id, p_store_id, p_attendance_id, p_latitude, p_longitude, v_today, 'pending')
    RETURNING id INTO v_spin_id;
  EXCEPTION WHEN unique_violation THEN
    RETURN QUERY SELECT NULL::UUID, 'rejected'::TEXT, NULL::UUID, NULL::TEXT, NULL::TEXT,
      'Already spun at this store today'::TEXT;
    RETURN;
  END;

  -- Weighted random reward selection (server-side)
  v_random := random();
  FOR v_reward IN
    SELECT * FROM public.rewards WHERE status = 'active' ORDER BY probability DESC
  LOOP
    v_cumulative := v_cumulative + v_reward.probability;
    IF v_random <= v_cumulative THEN
      UPDATE public.spins
      SET reward_id = v_reward.id, status = 'completed'
      WHERE id = v_spin_id;

      INSERT INTO public.audit_logs (sales_id, action, store_id, metadata)
      VALUES (v_sales_id, 'SPIN_COMPLETED', p_store_id,
        jsonb_build_object('spin_id', v_spin_id, 'reward_id', v_reward.id));

      RETURN QUERY SELECT v_spin_id, 'completed'::TEXT, v_reward.id, v_reward.name, v_reward.value, NULL::TEXT;
      RETURN;
    END IF;
  END LOOP;

  -- No reward matched (probabilities don't sum to 1)
  UPDATE public.spins SET status = 'completed', reward_id = NULL WHERE id = v_spin_id;

  INSERT INTO public.audit_logs (sales_id, action, store_id, metadata)
  VALUES (v_sales_id, 'SPIN_COMPLETED', p_store_id,
    jsonb_build_object('spin_id', v_spin_id, 'reward_id', NULL));

  RETURN QUERY SELECT v_spin_id, 'completed'::TEXT, NULL::UUID, 'No Reward'::TEXT, '0'::TEXT, NULL::TEXT;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.submit_attendance TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_spin TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.haversine_distance_meters TO authenticated;
