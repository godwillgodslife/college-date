-- Migration: 20260907183000_allow_deleted_and_system_message_types.sql
-- Expand messages_type_check constraint to include 'deleted', 'system', 'image', 'emoji', and all existing types

ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_type_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_type_check 
    CHECK (type IS NULL OR type IN ('text', 'image', 'voice', 'sticker', 'gift', 'emoji', 'call_log', 'system', 'deleted'));
