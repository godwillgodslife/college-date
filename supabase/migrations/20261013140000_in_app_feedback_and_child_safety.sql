-- ============================================================================
-- Migration: 20261013140000_in_app_feedback_and_child_safety.sql
-- Description: In-App User Feedback Mechanism & Child Safety Standards Storage
-- Compliant with Google Play Child Safety Standards Policy (CSAE / CSAM prevention)
-- ============================================================================

-- 1. Create public.in_app_feedback table
CREATE TABLE IF NOT EXISTS public.in_app_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    category TEXT NOT NULL CHECK (category IN (
        'child_safety',
        'safety_harassment',
        'feedback_suggestion',
        'bug_issue',
        'other'
    )),
    message TEXT NOT NULL,
    contact_email TEXT,
    target_info TEXT,
    device_info JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'under_review', 'resolved', 'escalated_to_authorities', 'dismissed')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for rapid lookup by status and category (urgent queue for child_safety)
CREATE INDEX IF NOT EXISTS idx_in_app_feedback_category_status 
ON public.in_app_feedback(category, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_in_app_feedback_user_id 
ON public.in_app_feedback(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.in_app_feedback ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert feedback
DROP POLICY IF EXISTS "Authenticated users can submit in-app feedback" ON public.in_app_feedback;
CREATE POLICY "Authenticated users can submit in-app feedback"
ON public.in_app_feedback FOR INSERT TO authenticated
WITH CHECK (true);

-- Allow anonymous users to submit feedback (e.g., pre-login safety concerns)
DROP POLICY IF EXISTS "Anonymous users can submit in-app feedback" ON public.in_app_feedback;
CREATE POLICY "Anonymous users can submit in-app feedback"
ON public.in_app_feedback FOR INSERT TO anon
WITH CHECK (true);

-- Users can view their own submitted feedback
DROP POLICY IF EXISTS "Users can view own feedback" ON public.in_app_feedback;
CREATE POLICY "Users can view own feedback"
ON public.in_app_feedback FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- 2. Authoritative RPC Function to submit in-app feedback & child safety concerns
CREATE OR REPLACE FUNCTION public.submit_in_app_feedback(
    p_category TEXT,
    p_message TEXT,
    p_contact_email TEXT DEFAULT NULL,
    p_target_info TEXT DEFAULT NULL,
    p_device_info JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_feedback_id UUID;
    v_clean_category TEXT;
    v_ticket_ref TEXT;
BEGIN
    -- Validate message length
    IF p_message IS NULL OR length(trim(p_message)) < 3 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Message must be at least 3 characters long.');
    END IF;

    -- Normalize category
    v_clean_category := lower(trim(coalesce(p_category, 'feedback_suggestion')));
    IF v_clean_category NOT IN ('child_safety', 'safety_harassment', 'feedback_suggestion', 'bug_issue', 'other') THEN
        v_clean_category := 'other';
    END IF;

    -- Insert feedback
    INSERT INTO public.in_app_feedback (
        user_id,
        category,
        message,
        contact_email,
        target_info,
        device_info,
        status
    ) VALUES (
        v_user_id,
        v_clean_category,
        p_message,
        p_contact_email,
        p_target_info,
        coalesce(p_device_info, '{}'::jsonb),
        'pending'
    )
    RETURNING id INTO v_feedback_id;

    v_ticket_ref := 'TCD-' || upper(substr(replace(v_feedback_id::text, '-', ''), 1, 8));

    RETURN jsonb_build_object(
        'success', true,
        'feedback_id', v_feedback_id,
        'ticket_ref', v_ticket_ref,
        'category', v_clean_category,
        'message', CASE 
            WHEN v_clean_category = 'child_safety' THEN 'Your child safety concern has been received with high priority and routed immediately to our Child Safety Officer.'
            ELSE 'Thank you for your feedback! Our team has received your submission.'
        END
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_in_app_feedback(TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated, anon;
