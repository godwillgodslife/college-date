-- Fix for broken confessions insert by dropping the misconfigured webhook trigger
DROP TRIGGER IF EXISTS confession_notification_trigger ON public.confessions;
DROP FUNCTION IF EXISTS public.notify_on_confession();
