-- Username support + secure signup with bcrypt password hashing
--
-- IMPORTANT: Passwords are NEVER stored in public tables.
-- Hashed credentials live in auth.users.encrypted_password (managed by Supabase Auth).
-- public.sales stores the username profile linked to auth.users.id.

-- Username on sales profile
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS username TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_username
  ON public.sales (lower(username));

-- Keep handle_new_user in sync with username metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.sales (id, sales_code, name, email, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'sales_code', 'S' || SUBSTR(NEW.id::TEXT, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      split_part(NEW.email, '@', 1)
    )
  );
  RETURN NEW;
END;
$$;

-- Signup: hash password with bcrypt, create auth.users row, sales row via trigger
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
  v_encrypted_password TEXT;
BEGIN
  IF v_username IS NULL OR length(v_username) < 3 THEN
    RAISE EXCEPTION 'Username must be at least 3 characters';
  END IF;

  IF v_email IS NULL OR position('@' in v_email) = 0 THEN
    RAISE EXCEPTION 'Valid email is required';
  END IF;

  IF p_password IS NULL OR length(p_password) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.sales WHERE lower(username) = v_username
  ) THEN
    RAISE EXCEPTION 'Username already taken';
  END IF;

  IF EXISTS (
    SELECT 1 FROM auth.users WHERE lower(email) = v_email
  ) THEN
    RAISE EXCEPTION 'Email already registered';
  END IF;

  -- bcrypt hash (never store plaintext)
  v_encrypted_password := crypt(p_password, gen_salt('bf'));

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
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    v_email,
    v_encrypted_password,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'name', COALESCE(p_name, p_username),
      'username', v_username,
      'sales_code', p_sales_code
    ),
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    v_user_id,
    v_user_id::text,
    jsonb_build_object(
      'sub', v_user_id::text,
      'email', v_email,
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    now(),
    now(),
    now()
  );

  RETURN jsonb_build_object(
    'user_id', v_user_id,
    'username', v_username,
    'email', v_email
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.signup_sales_user(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.signup_sales_user(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
