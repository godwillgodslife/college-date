-- Migration: Secure Push Subscriptions RPC
-- Provides a SECURITY DEFINER function to securely retrieve active OneSignal subscription IDs
-- for a recipient user without exposing broad table RLS permissions on user_notification_devices.

CREATE OR REPLACE FUNCTION public.get_user_push_subscriptions(p_user_id uuid)
RETURNS TABLE (
    onesignal_subscription_id text,
    permission_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.onesignal_subscription_id,
        d.permission_status
    FROM public.user_notification_devices d
    WHERE d.user_id = p_user_id
      AND d.revoked_at IS NULL
      AND d.onesignal_subscription_id IS NOT NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_push_subscriptions(uuid) TO authenticated, anon;
