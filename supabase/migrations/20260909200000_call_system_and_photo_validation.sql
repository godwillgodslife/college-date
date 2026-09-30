-- Migration: 20260909200000_call_system_and_photo_validation.sql
-- Description: Core schema, security RLS, triggers, and RPCs for:
-- 1. Dedicated call_sessions & call_ice_candidates WebRTC signaling tables
-- 2. Real-time call publication and state machine transitions
-- 3. Camera toggle state synchronization across peers
-- 4. Authoritative profile photo validation and promotion

-- ============================================================================
-- 1. CALL SESSIONS & ICE CANDIDATES TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.call_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    caller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    call_type TEXT NOT NULL CHECK (call_type IN ('voice', 'video')),
    call_state TEXT NOT NULL DEFAULT 'calling' CHECK (
        call_state IN (
            'calling', 'ringing', 'accepted', 'connecting', 'connected',
            'rejected', 'cancelled', 'busy', 'timeout', 'failed', 'ended'
        )
    ),
    sdp_offer JSONB,
    sdp_answer JSONB,
    caller_camera_off BOOLEAN DEFAULT false,
    receiver_camera_off BOOLEAN DEFAULT false,
    end_reason TEXT,
    started_at TIMESTAMPTZ DEFAULT now(),
    answered_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.call_ice_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id UUID NOT NULL REFERENCES public.call_sessions(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    candidate JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indices for rapid real-time lookups
CREATE INDEX IF NOT EXISTS idx_call_sessions_match ON public.call_sessions(match_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_caller ON public.call_sessions(caller_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_receiver ON public.call_sessions(receiver_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_state ON public.call_sessions(call_state);
CREATE INDEX IF NOT EXISTS idx_call_ice_candidates_call ON public.call_ice_candidates(call_id);

-- Storage bucket for pending avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('pending-avatars', 'pending-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_ice_candidates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for call_sessions
DROP POLICY IF EXISTS "Participants can view own call sessions" ON public.call_sessions;
CREATE POLICY "Participants can view own call sessions"
ON public.call_sessions FOR SELECT TO authenticated
USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Participants can update own call sessions" ON public.call_sessions;
CREATE POLICY "Participants can update own call sessions"
ON public.call_sessions FOR UPDATE TO authenticated
USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Callers can insert call sessions" ON public.call_sessions;
CREATE POLICY "Callers can insert call sessions"
ON public.call_sessions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = caller_id);

-- RLS Policies for call_ice_candidates
DROP POLICY IF EXISTS "Participants can view ICE candidates" ON public.call_ice_candidates;
CREATE POLICY "Participants can view ICE candidates"
ON public.call_ice_candidates FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.call_sessions cs
        WHERE cs.id = call_ice_candidates.call_id
        AND (cs.caller_id = auth.uid() OR cs.receiver_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "Senders can insert ICE candidates" ON public.call_ice_candidates;
CREATE POLICY "Senders can insert ICE candidates"
ON public.call_ice_candidates FOR INSERT TO authenticated
WITH CHECK (auth.uid() = sender_id);

-- Storage policy for pending-avatars
DROP POLICY IF EXISTS "Authenticated users can upload pending avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload pending avatars"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'pending-avatars');

DROP POLICY IF EXISTS "Public can view pending avatars" ON storage.objects;
CREATE POLICY "Public can view pending avatars"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'pending-avatars');

DROP POLICY IF EXISTS "Users can delete own pending avatars" ON storage.objects;
CREATE POLICY "Users can delete own pending avatars"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'pending-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Add to Realtime Publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'call_sessions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.call_sessions;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'call_ice_candidates'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.call_ice_candidates;
    END IF;
END $$;

ALTER TABLE public.call_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.call_ice_candidates REPLICA IDENTITY FULL;

-- ============================================================================
-- 2. SECURITY DEFINER CALL SIGNALING RPCS
-- ============================================================================

-- RPC: initiate_call_session
CREATE OR REPLACE FUNCTION public.initiate_call_session(
    p_match_id UUID,
    p_call_type TEXT DEFAULT 'voice'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_recipient_id UUID;
    v_user1 UUID;
    v_user2 UUID;
    v_caller_name TEXT;
    v_caller_avatar TEXT;
    v_call_id UUID;
    v_is_premium BOOLEAN;
    v_call_minutes INT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    -- Validate match membership
    SELECT user1_id, user2_id INTO v_user1, v_user2
    FROM public.matches
    WHERE id = p_match_id AND (user1_id = v_user_id OR user2_id = v_user_id);

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Match not found');
    END IF;

    v_recipient_id := CASE WHEN v_user1 = v_user_id THEN v_user2 ELSE v_user1 END;

    -- Check if either user has blocked the other
    IF EXISTS (
        SELECT 1 FROM public.user_blocks
        WHERE (blocker_id = v_user_id AND blocked_id = v_recipient_id)
           OR (blocker_id = v_recipient_id AND blocked_id = v_user_id)
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Communication blocked between users.');
    END IF;

    -- Check caller profile & limits
    SELECT full_name, avatar_url, coalesce(is_premium, false), coalesce(call_minutes_today, 0)
    INTO v_caller_name, v_caller_avatar, v_is_premium, v_call_minutes
    FROM public.profiles
    WHERE id = v_user_id;

    IF NOT v_is_premium AND v_call_minutes >= 20 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Daily call limit of 20 minutes reached.');
    END IF;

    -- Terminate any existing active/calling/ringing calls for this match
    UPDATE public.call_sessions
    SET call_state = 'ended',
        end_reason = 'new_call_started',
        ended_at = now()
    WHERE match_id = p_match_id
      AND call_state IN ('calling', 'ringing', 'accepted', 'connecting', 'connected');

    -- Insert new call session
    INSERT INTO public.call_sessions (
        match_id,
        caller_id,
        receiver_id,
        call_type,
        call_state,
        started_at,
        updated_at
    ) VALUES (
        p_match_id,
        v_user_id,
        v_recipient_id,
        coalesce(p_call_type, 'voice'),
        'calling',
        now(),
        now()
    ) RETURNING id INTO v_call_id;

    -- Mirror state to matches table for legacy compatibility and notification triggers
    UPDATE public.matches
    SET call_state = 'ringing',
        call_type = coalesce(p_call_type, 'voice'),
        caller_id = v_user_id,
        call_updated_at = now()
    WHERE id = p_match_id;

    -- Insert high-priority incoming call notification
    INSERT INTO public.notifications (
        user_id,
        actor_id,
        type,
        title,
        content,
        priority,
        metadata
    ) VALUES (
        v_recipient_id,
        v_user_id,
        'call',
        'Incoming ' || CASE WHEN p_call_type = 'video' THEN 'Video' ELSE 'Voice' END || ' Call',
        coalesce(v_caller_name, 'Someone') || ' is calling you...',
        'critical',
        jsonb_build_object(
            'call_id', v_call_id,
            'match_id', p_match_id,
            'call_type', coalesce(p_call_type, 'voice'),
            'caller_id', v_user_id,
            'caller_name', v_caller_name,
            'caller_avatar', v_caller_avatar
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'call_id', v_call_id,
        'match_id', p_match_id,
        'caller_id', v_user_id,
        'receiver_id', v_recipient_id,
        'call_type', coalesce(p_call_type, 'voice'),
        'call_state', 'calling'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.initiate_call_session(UUID, TEXT) TO authenticated;

-- RPC: respond_call_session
CREATE OR REPLACE FUNCTION public.respond_call_session(
    p_call_id UUID,
    p_action TEXT,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_session RECORD;
    v_new_state TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    IF p_action NOT IN ('accepted', 'rejected', 'ended', 'cancelled', 'busy', 'timeout', 'connected') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid call action: ' || coalesce(p_action, 'null'));
    END IF;

    SELECT * INTO v_session
    FROM public.call_sessions
    WHERE id = p_call_id AND (caller_id = v_user_id OR receiver_id = v_user_id);

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Call session not found or unauthorized');
    END IF;

    v_new_state := p_action;

    IF p_action = 'accepted' THEN
        UPDATE public.call_sessions
        SET call_state = 'accepted',
            answered_at = coalesce(answered_at, now()),
            updated_at = now()
        WHERE id = p_call_id;

        UPDATE public.matches
        SET call_state = 'accepted',
            call_updated_at = now()
        WHERE id = v_session.match_id;

    ELSIF p_action = 'connected' THEN
        UPDATE public.call_sessions
        SET call_state = 'connected',
            updated_at = now()
        WHERE id = p_call_id;

        UPDATE public.matches
        SET call_state = 'connected',
            call_updated_at = now()
        WHERE id = v_session.match_id;

    ELSE -- 'rejected', 'ended', 'cancelled', 'busy', 'timeout'
        UPDATE public.call_sessions
        SET call_state = v_new_state,
            end_reason = coalesce(p_reason, p_action),
            ended_at = now(),
            updated_at = now()
        WHERE id = p_call_id;

        UPDATE public.matches
        SET call_state = v_new_state,
            call_updated_at = now()
        WHERE id = v_session.match_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'call_id', p_call_id,
        'match_id', v_session.match_id,
        'call_state', v_new_state,
        'end_reason', coalesce(p_reason, p_action)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.respond_call_session(UUID, TEXT, TEXT) TO authenticated;

-- RPC: submit_call_sdp
CREATE OR REPLACE FUNCTION public.submit_call_sdp(
    p_call_id UUID,
    p_sdp_type TEXT,
    p_sdp JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_session RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    SELECT * INTO v_session
    FROM public.call_sessions
    WHERE id = p_call_id AND (caller_id = v_user_id OR receiver_id = v_user_id);

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Call session not found or unauthorized');
    END IF;

    IF p_sdp_type = 'offer' THEN
        UPDATE public.call_sessions
        SET sdp_offer = p_sdp,
            call_state = 'ringing',
            updated_at = now()
        WHERE id = p_call_id;
    ELSIF p_sdp_type = 'answer' THEN
        UPDATE public.call_sessions
        SET sdp_answer = p_sdp,
            call_state = 'connecting',
            updated_at = now()
        WHERE id = p_call_id;
    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'Invalid sdp type: ' || coalesce(p_sdp_type, 'null'));
    END IF;

    RETURN jsonb_build_object('success', true, 'call_id', p_call_id, 'sdp_type', p_sdp_type);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_call_sdp(UUID, TEXT, JSONB) TO authenticated;

-- RPC: add_call_ice_candidate
CREATE OR REPLACE FUNCTION public.add_call_ice_candidate(
    p_call_id UUID,
    p_candidate JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_session RECORD;
    v_cand_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    SELECT * INTO v_session
    FROM public.call_sessions
    WHERE id = p_call_id AND (caller_id = v_user_id OR receiver_id = v_user_id);

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Call session not found or unauthorized');
    END IF;

    INSERT INTO public.call_ice_candidates (
        call_id,
        sender_id,
        candidate,
        created_at
    ) VALUES (
        p_call_id,
        v_user_id,
        p_candidate,
        now()
    ) RETURNING id INTO v_cand_id;

    RETURN jsonb_build_object('success', true, 'candidate_id', v_cand_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_call_ice_candidate(UUID, JSONB) TO authenticated;

-- RPC: toggle_call_camera
CREATE OR REPLACE FUNCTION public.toggle_call_camera(
    p_call_id UUID,
    p_camera_off BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_session RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    SELECT * INTO v_session
    FROM public.call_sessions
    WHERE id = p_call_id AND (caller_id = v_user_id OR receiver_id = v_user_id);

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Call session not found or unauthorized');
    END IF;

    IF v_session.caller_id = v_user_id THEN
        UPDATE public.call_sessions
        SET caller_camera_off = p_camera_off,
            updated_at = now()
        WHERE id = p_call_id;
    ELSE
        UPDATE public.call_sessions
        SET receiver_camera_off = p_camera_off,
            updated_at = now()
        WHERE id = p_call_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'call_id', p_call_id,
        'user_id', v_user_id,
        'camera_off', p_camera_off
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_call_camera(UUID, BOOLEAN) TO authenticated;

-- ============================================================================
-- 3. PROFILE PHOTO VALIDATION & PROMOTION RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.promote_validated_avatar(
    p_user_id UUID,
    p_photo_url TEXT,
    p_slot_index INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id UUID;
    v_current_photos TEXT[];
    v_new_photos TEXT[];
    v_slot INT;
BEGIN
    v_caller_id := auth.uid();
    -- Allow user themselves or service role
    IF v_caller_id IS NOT NULL AND v_caller_id != p_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized profile modification');
    END IF;

    v_slot := coalesce(p_slot_index, 0);

    SELECT profile_photos INTO v_current_photos
    FROM public.profiles
    WHERE id = p_user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
    END IF;

    v_new_photos := coalesce(v_current_photos, ARRAY[]::TEXT[]);
    WHILE array_length(v_new_photos, 1) IS NULL OR array_length(v_new_photos, 1) <= v_slot LOOP
        v_new_photos := array_append(v_new_photos, NULL::TEXT);
    END LOOP;

    v_new_photos[v_slot + 1] := p_photo_url;

    IF v_slot = 0 THEN
        UPDATE public.profiles
        SET avatar_url = p_photo_url,
            profile_photos = v_new_photos,
            photo_updated_at = now(),
            updated_at = now()
        WHERE id = p_user_id;
    ELSE
        UPDATE public.profiles
        SET profile_photos = v_new_photos,
            photo_updated_at = now(),
            updated_at = now()
        WHERE id = p_user_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'avatar_url', p_photo_url,
        'slot', v_slot
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.promote_validated_avatar(UUID, TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.promote_validated_avatar(UUID, TEXT, INT) TO service_role;
