-- Debug Supabase Permissions and RLS Issues
-- Run these queries in your Supabase SQL Editor to diagnose write failures

-- 1. Check if RLS is enabled on chat_sessions
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'chat_sessions';

-- 2. Check existing RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'chat_sessions';

-- 3. Check current authenticated user
SELECT auth.uid() as current_user_id, auth.role() as current_role;

-- 4. Test if we can insert manually (replace with your actual user ID)
-- INSERT INTO chat_sessions (
--   id, 
--   user_id, 
--   adk_session_id, 
--   session_title,
--   session_metadata
-- ) VALUES (
--   gen_random_uuid(),
--   auth.uid(),  -- This should match your OAuth user ID
--   'test-adk-session-123',
--   'Test Session',
--   '{}'::jsonb
-- );

-- 5. Check table permissions
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'chat_sessions' 
AND table_schema = 'public';

-- 6. Fix missing UUID default (if needed)
-- ALTER TABLE public.chat_sessions 
-- ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 7. Enable RLS if not enabled
-- ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

-- 8. Create basic RLS policies (if missing)
-- CREATE POLICY "Users can manage their own sessions" ON public.chat_sessions
-- FOR ALL USING (auth.uid() = user_id);

-- 9. Grant permissions to authenticated role
-- GRANT ALL ON public.chat_sessions TO authenticated;