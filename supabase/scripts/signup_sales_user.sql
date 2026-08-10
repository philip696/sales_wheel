-- Signup & user creation examples
-- Run migration 004_username_signup.sql first.
--
-- Passwords are hashed with bcrypt into auth.users.encrypted_password.
-- Usernames are stored in public.sales.username.

-- ─────────────────────────────────────────────
-- 1. Signup via SQL function (hashes password)
-- ─────────────────────────────────────────────
SELECT public.signup_sales_user(
  p_username  := 'johndoe',
  p_email     := 'john@example.com',
  p_password  := 'password123',
  p_name      := 'John Doe',
  p_sales_code := 'S001'
);

-- ─────────────────────────────────────────────
-- 2. Verify user was created
-- ─────────────────────────────────────────────
SELECT id, username, email, sales_code, role, status
FROM public.sales
WHERE username = 'johndoe';

-- Password hash exists in auth.users (never query/display in production)
-- SELECT id, email, encrypted_password IS NOT NULL AS has_password
-- FROM auth.users WHERE email = 'john@example.com';

-- ─────────────────────────────────────────────
-- 3. Promote user to admin (optional)
-- ─────────────────────────────────────────────
-- UPDATE public.sales SET role = 'admin' WHERE username = 'johndoe';

-- ─────────────────────────────────────────────
-- 4. Login from the mobile app
-- ─────────────────────────────────────────────
-- Use email + password with Supabase Auth:
--   supabase.auth.signInWithPassword({ email: 'john@example.com', password: 'password123' })

-- ─────────────────────────────────────────────
-- 5. Signup from the mobile app (alternative)
-- ─────────────────────────────────────────────
-- Call RPC then sign in:
--   await supabase.rpc('signup_sales_user', {
--     p_username: 'johndoe',
--     p_email: 'john@example.com',
--     p_password: 'password123',
--     p_name: 'John Doe',
--   });
--   await supabase.auth.signInWithPassword({ email: 'john@example.com', password: 'password123' });

-- Or use built-in Supabase signup (also hashes password automatically):
--   await supabase.auth.signUp({
--     email: 'john@example.com',
--     password: 'password123',
--     options: { data: { username: 'johndoe', name: 'John Doe', sales_code: 'S001' } }
--   });
