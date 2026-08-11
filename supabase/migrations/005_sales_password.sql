
-- ============================================================
-- Add password hash to public.sales
-- ============================================================
--
-- IMPORTANT:
-- Store only a bcrypt hash.
-- Never store the plaintext password.
--
-- This does NOT remove Supabase Auth.
-- It adds a password_hash field to the existing
-- public.sales table.
-- ============================================================

ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS password_hash TEXT;


-- ============================================================
-- Update signup_sales_user()
-- ============================================================

CREATE OR REPLACE FUNCTION public.signup_sales_user(
  p_username TEXT,
  p_email TEXT,
  p_password TEXT,
  p_name TEXT DEFAULT NULL,
  p_sales_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id UUID := gen_random_uuid();
  v_username TEXT := lower(trim(p_username));
  v_email TEXT := lower(trim(p_email));
  v_password_hash TEXT;
BEGIN

  -- ----------------------------------------------------------
  -- Validate username
  -- ----------------------------------------------------------

  IF v_username IS NULL
     OR length(v_username) < 3 THEN

    RAISE EXCEPTION
      'Username must be at least 3 characters';

  END IF;


  -- ----------------------------------------------------------
  -- Validate email
  -- ----------------------------------------------------------

  IF v_email IS NULL
     OR position('@' IN v_email) = 0 THEN

    RAISE EXCEPTION
      'Valid email is required';

  END IF;


  -- ----------------------------------------------------------
  -- Validate password
  -- ----------------------------------------------------------

  IF p_password IS NULL
     OR length(p_password) < 6 THEN

    RAISE EXCEPTION
      'Password must be at least 6 characters';

  END IF;


  -- ----------------------------------------------------------
  -- Check username
  -- ----------------------------------------------------------

  IF EXISTS (
    SELECT 1
    FROM public.sales AS s
    WHERE lower(s.username) = v_username
  ) THEN

    RAISE EXCEPTION
      'Username already taken';

  END IF;


  -- ----------------------------------------------------------
  -- Check email
  -- ----------------------------------------------------------

  IF EXISTS (
    SELECT 1
    FROM auth.users AS u
    WHERE lower(u.email) = v_email
  ) THEN

    RAISE EXCEPTION
      'Email already registered';

  END IF;


  -- ----------------------------------------------------------
  -- Generate bcrypt password hash
  -- ----------------------------------------------------------

  v_password_hash :=
    crypt(p_password, gen_salt('bf'));


  -- ----------------------------------------------------------
  -- Create Supabase Auth user
  -- ----------------------------------------------------------

  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  VALUES (
    v_user_id,

    '00000000-0000-0000-0000-000000000000',

    'authenticated',

    'authenticated',

    v_email,

    v_password_hash,

    now(),

    '{"provider":"email","providers":["email"]}'::jsonb,

    jsonb_build_object(
      'name',
      COALESCE(p_name, p_username),

      'username',
      v_username,

      'sales_code',
      p_sales_code
    ),

    now(),

    now(),

    '',

    '',

    '',

    ''
  );


  -- ----------------------------------------------------------
  -- Create email identity
  -- ----------------------------------------------------------

  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id,

    v_user_id,

    v_user_id::text,

    jsonb_build_object(
      'sub',
      v_user_id::text,

      'email',
      v_email,

      'email_verified',
      true,

      'phone_verified',
      false
    ),

    'email',

    now(),

    now(),

    now()
  );


  -- ----------------------------------------------------------
  -- Explicitly create/update the existing sales profile
  -- ----------------------------------------------------------
  --
  -- This uses the EXISTING public.sales table.
  -- No new table is created.
  --

  INSERT INTO public.sales (
    id,
    sales_code,
    name,
    email,
    username,
    password_hash
  )
  VALUES (
    v_user_id,

    COALESCE(
      p_sales_code,
      'S' || SUBSTR(v_user_id::TEXT, 1, 8)
    ),

    COALESCE(
      p_name,
      p_username
    ),

    v_email,

    v_username,

    v_password_hash
  );


  -- ----------------------------------------------------------
  -- Return created user information
  -- ----------------------------------------------------------

  RETURN jsonb_build_object(
    'user_id',
    v_user_id,

    'username',
    v_username,

    'email',
    v_email
  );

END;
$$;


-- ============================================================
-- Permissions
-- ============================================================

GRANT EXECUTE
ON FUNCTION public.signup_sales_user(
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT
)
TO anon;

GRANT EXECUTE
ON FUNCTION public.signup_sales_user(
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT
)
TO authenticated;

