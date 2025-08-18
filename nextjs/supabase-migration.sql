-- Supabase Migration: Create chat_sessions and user_state tables
-- Run this SQL in your Supabase SQL Editor to create the required tables

-- Drop existing tables if they exist (be careful with this in production!)
DROP TABLE IF EXISTS public.user_state CASCADE;
DROP TABLE IF EXISTS public.chat_sessions CASCADE;

-- Create chat_sessions table for bridging Supabase auth with ADK backend
CREATE TABLE public.chat_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  adk_session_id TEXT UNIQUE,
  session_title TEXT,
  session_metadata JSONB DEFAULT '{}',
  last_message_at TIMESTAMP WITH TIME ZONE,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_state table for storing user preferences
CREATE TABLE public.user_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_session_id UUID REFERENCES public.chat_sessions(id) ON DELETE SET NULL,
  ui_preferences JSONB DEFAULT '{}',
  chat_preferences JSONB DEFAULT '{}',
  last_active TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_adk_session_id ON public.chat_sessions(adk_session_id);
CREATE INDEX idx_chat_sessions_updated_at ON public.chat_sessions(updated_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_state ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can create their own sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can delete their own sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can view their own state" ON public.user_state;
DROP POLICY IF EXISTS "Users can insert their own state" ON public.user_state;
DROP POLICY IF EXISTS "Users can update their own state" ON public.user_state;
DROP POLICY IF EXISTS "Users can delete their own state" ON public.user_state;

-- Create RLS policies for chat_sessions
CREATE POLICY "Users can view their own sessions" ON public.chat_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions" ON public.chat_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" ON public.chat_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions" ON public.chat_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for user_state
CREATE POLICY "Users can view their own state" ON public.user_state
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own state" ON public.user_state
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own state" ON public.user_state
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own state" ON public.user_state
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_state_updated_at BEFORE UPDATE ON public.user_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON public.chat_sessions TO authenticated;
GRANT ALL ON public.user_state TO authenticated;

-- Test that tables were created successfully
SELECT 'chat_sessions table created' AS status WHERE EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'chat_sessions'
)
UNION ALL
SELECT 'user_state table created' AS status WHERE EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'user_state'
);
