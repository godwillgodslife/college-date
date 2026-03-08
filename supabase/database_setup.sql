-- 1. Ensure notifications table has necessary columns and RLS
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = recipient_id);

-- Policy: Users can update their own notifications (to mark as read)
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = recipient_id);

-- 2. Function to trigger Edge Function via Webhook
-- Note: This is a placeholder. In Supabase Dashboard, you'd set this up via the Webhooks UI.
-- However, we can track the logic here.

-- 3. Database Triggers for In-App Notifications
-- We want to automatically create a record in the notifications table when events happen.

-- Trigger for New Messages
CREATE OR REPLACE FUNCTION public.handle_new_message_notification()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notifications (recipient_id, sender_id, type, title, content, metadata)
    VALUES (
        NEW.recipient_id,
        NEW.sender_id,
        'message',
        'New Message',
        SUBSTRING(NEW.content FROM 1 FOR 50),
        jsonb_build_object('message_id', NEW.id)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_message_notify ON public.messages;
CREATE TRIGGER on_new_message_notify
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.handle_new_message_notification();

-- Trigger for Paid Swipes (Earnings)
CREATE OR REPLACE FUNCTION public.handle_paid_swipe_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger when status changes to 'paid'
    IF (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'paid') THEN
        INSERT INTO public.notifications (recipient_id, sender_id, type, title, content, metadata)
        VALUES (
            NEW.receiver_id, -- assuming receiver_id is the one being paid
            NEW.sender_id,
            'payment',
            'Money Received! 💰',
            'You just earned ₦250 from a new match. Check your wallet to withdraw.',
            jsonb_build_object('swipe_id', NEW.id, 'amount', 250)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_swipe_paid_notify ON public.swipes;
CREATE TRIGGER on_swipe_paid_notify
AFTER UPDATE ON public.swipes
FOR EACH ROW EXECUTE FUNCTION public.handle_paid_swipe_notification();
