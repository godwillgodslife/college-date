-- Realtime Postgres Changes needs a stable SELECT contract for the published
-- row payload. RLS still limits every visible message to match participants.

revoke all on public.messages from anon;
grant select on public.messages to authenticated;

-- Message inserts and updates remain RPC-only.
revoke insert, update, delete, truncate, references, trigger
on public.messages from authenticated;

-- Rollback:
-- 1. Revoke SELECT on public.messages from authenticated.
-- 2. Restore the column-level SELECT grant from
--    20260813103000_native_text_messaging_contract.sql if Realtime is removed.
