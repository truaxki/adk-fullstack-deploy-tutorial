-- Test User ID Extraction and Authentication Flow
-- Run these queries in your Supabase SQL Editor while logged into the app

-- 1. Check if you're currently authenticated
SELECT 
  auth.uid() as current_user_id,
  auth.role() as current_role,
  CASE 
    WHEN auth.uid() IS NULL THEN '❌ NOT AUTHENTICATED'
    ELSE '✅ AUTHENTICATED'
  END as auth_status;

-- 2. Get detailed auth user information
SELECT 
  auth.uid() as user_id,
  auth.email() as user_email,
  auth.jwt() ->> 'aud' as audience,
  auth.jwt() ->> 'iss' as issuer,
  auth.jwt() ->> 'sub' as subject;

-- 3. Check auth.users table directly (if you have access)
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at,
  raw_app_meta_data ->> 'provider' as oauth_provider
FROM auth.users 
ORDER BY last_sign_in_at DESC 
LIMIT 5;

-- 4. Test if your user ID can INSERT into chat_sessions
-- (Replace this with a real test - be careful not to create duplicate data)
/*
WITH test_data AS (
  SELECT 
    gen_random_uuid() as test_id,
    auth.uid() as user_id,
    'test-adk-session-' || extract(epoch from now()) as adk_session_id
)
INSERT INTO public.chat_sessions (
  id, 
  user_id, 
  adk_session_id, 
  session_title,
  session_metadata,
  message_count
)
SELECT 
  test_id,
  user_id,
  adk_session_id,
  'Test Session - ' || to_char(now(), 'YYYY-MM-DD HH24:MI:SS'),
  '{"test": true}'::jsonb,
  0
FROM test_data
WHERE user_id IS NOT NULL
RETURNING *;
*/

-- 5. Check what's in chat_sessions currently
SELECT 
  id,
  user_id,
  adk_session_id,
  session_title,
  created_at,
  CASE 
    WHEN user_id = auth.uid() THEN '✅ YOUR SESSION'
    ELSE '❌ OTHER USER'
  END as ownership
FROM public.chat_sessions
ORDER BY created_at DESC
LIMIT 10;

-- 6. Test RLS policy by trying a simple SELECT
SELECT 
  COUNT(*) as total_sessions,
  COUNT(CASE WHEN user_id = auth.uid() THEN 1 END) as your_sessions,
  auth.uid() as your_user_id
FROM public.chat_sessions;