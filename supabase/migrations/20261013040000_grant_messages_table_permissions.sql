-- Migration: 20261013040000_grant_messages_table_permissions.sql
-- Description: Authoritative grant of full table-level permissions on public.messages for authenticated and service_role.
-- Fixes PostgreSQL error 42501 (HTTP 403 Forbidden: "permission denied for table messages") when selecting, inserting, or updating messages.

-- 1. Ensure seen_at column exists
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS seen_at timestamptz;

-- 2. Grant table-level permissions to authenticated role and service_role
-- Note: Row Level Security (RLS) policies enforce match participant isolation
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.messages TO authenticated;
GRANT ALL ON TABLE public.messages TO service_role;

-- 3. Ensure permissions on native messaging RPCs
GRANT EXECUTE ON FUNCTION public.get_native_conversations(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_native_messages(uuid, timestamptz, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_native_text_message(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_native_messages_read(uuid) TO authenticated;
