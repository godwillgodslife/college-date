-- ══════════════════════════════════════════════════════════════════════════
-- THE COLLEGE DATE — TERMS, POLICIES & USER AGREEMENT SYSTEM
-- Migration: 20260922100000_terms_policy_acceptance_system.sql
-- Description:
--   1. Master 'policies' table with versioning and content paths.
--   2. Immutable 'user_policy_acceptances' audit ledger with tamper-proof RLS.
--   3. Authoritative RPCs: record_policy_acceptance, get_user_accepted_policies,
--      and get_pending_policy_requirements.
-- ══════════════════════════════════════════════════════════════════════════

-- 1. Create Master Policies Table
CREATE TABLE IF NOT EXISTS public.policies (
    policy_id TEXT NOT NULL,
    version TEXT NOT NULL,
    title TEXT NOT NULL,
    content_url TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    requires_reacceptance BOOLEAN NOT NULL DEFAULT false,
    effective_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (policy_id, version)
);

COMMENT ON TABLE public.policies IS 'Authoritative registry of platform terms, privacy, and community policies with semantic versioning.';

-- 2. Pre-seed Active Standard Policies
INSERT INTO public.policies (policy_id, version, title, content_url, is_active, requires_reacceptance, effective_at)
VALUES
    ('terms', '2.0', 'Terms of Service', '/terms', true, false, '2026-09-21 00:00:00+00'),
    ('privacy', '2.0', 'Privacy Policy', '/privacy', true, false, '2026-09-21 00:00:00+00'),
    ('safety', '1.0', 'Safety & Guidelines', '/safety', true, false, '2026-07-20 00:00:00+00'),
    ('child_safety', '1.0', 'Child Safety Standards', '/child-safety-standards', true, false, '2026-05-13 00:00:00+00'),
    ('marketplace', '1.0', 'Marketplace Escrow Terms', '/terms', true, false, '2026-09-21 00:00:00+00')
ON CONFLICT (policy_id, version) DO UPDATE SET
    title = EXCLUDED.title,
    content_url = EXCLUDED.content_url,
    is_active = EXCLUDED.is_active,
    requires_reacceptance = EXCLUDED.requires_reacceptance,
    effective_at = EXCLUDED.effective_at;

-- 3. Create Immutable User Policy Acceptances Audit Ledger
CREATE TABLE IF NOT EXISTS public.user_policy_acceptances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    policy_id TEXT NOT NULL,
    policy_version TEXT NOT NULL,
    accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    platform TEXT NOT NULL CHECK (platform IN ('web', 'android', 'ios')),
    app_version TEXT NOT NULL,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT fk_policy FOREIGN KEY (policy_id, policy_version)
        REFERENCES public.policies(policy_id, version) ON UPDATE CASCADE
);

COMMENT ON TABLE public.user_policy_acceptances IS 'Immutable legal audit ledger recording user consent, accepted policy version, timestamp, and platform context.';

-- 4. High-Performance Indexing
CREATE INDEX IF NOT EXISTS idx_user_policy_acceptances_user
ON public.user_policy_acceptances (user_id, policy_id, policy_version);

CREATE INDEX IF NOT EXISTS idx_user_policy_acceptances_accepted_at
ON public.user_policy_acceptances (accepted_at DESC);

-- 5. Row Level Security Configuration
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_policy_acceptances ENABLE ROW LEVEL SECURITY;

-- Policies Table: Public Read, Restricted Write
DROP POLICY IF EXISTS "Anyone can read active policies" ON public.policies;
CREATE POLICY "Anyone can read active policies"
ON public.policies FOR SELECT
USING (true);

-- User Policy Acceptances Table:
-- Authenticated users can SELECT only their own consent records
DROP POLICY IF EXISTS "Users can view own policy acceptances" ON public.user_policy_acceptances;
CREATE POLICY "Users can view own policy acceptances"
ON public.user_policy_acceptances FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Authenticated users can INSERT their own consent records
DROP POLICY IF EXISTS "Users can record own policy acceptances" ON public.user_policy_acceptances;
CREATE POLICY "Users can record own policy acceptances"
ON public.user_policy_acceptances FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- CRITICAL LEGAL SECURITY SAFEGUARD:
-- Revoke UPDATE and DELETE permissions from authenticated and anon roles.
-- Consent records are immutable legal audit ledgers; they cannot be altered or purged by clients.
REVOKE UPDATE, DELETE ON public.user_policy_acceptances FROM anon, authenticated;

-- 6. Authoritative RPC: record_policy_acceptance
CREATE OR REPLACE FUNCTION public.record_policy_acceptance(
    p_policy_id TEXT,
    p_version TEXT,
    p_platform TEXT DEFAULT 'web',
    p_app_version TEXT DEFAULT '2.2.60',
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_record_id UUID;
    v_platform TEXT := LOWER(COALESCE(p_platform, 'web'));
    v_user_agent TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
    END IF;

    -- Validate platform value
    IF v_platform NOT IN ('web', 'android', 'ios') THEN
        v_platform := 'web';
    END IF;

    -- Verify policy exists
    IF NOT EXISTS (
        SELECT 1 FROM public.policies 
        WHERE policy_id = p_policy_id AND version = p_version
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'invalid_policy_or_version');
    END IF;

    -- Capture client user agent safely if available
    BEGIN
        v_user_agent := current_setting('request.headers', true)::jsonb->>'user-agent';
    EXCEPTION WHEN OTHERS THEN
        v_user_agent := NULL;
    END;

    -- Insert into immutable ledger
    INSERT INTO public.user_policy_acceptances (
        user_id,
        policy_id,
        policy_version,
        platform,
        app_version,
        user_agent,
        metadata,
        accepted_at
    ) VALUES (
        v_user_id,
        p_policy_id,
        p_version,
        v_platform,
        COALESCE(p_app_version, '2.2.60'),
        v_user_agent,
        COALESCE(p_metadata, '{}'::jsonb),
        now()
    )
    RETURNING id INTO v_record_id;

    RETURN jsonb_build_object(
        'success', true,
        'acceptance_id', v_record_id,
        'policy_id', p_policy_id,
        'version', p_version,
        'accepted_at', now()
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_policy_acceptance(TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- 7. Authoritative RPC: get_user_accepted_policies
CREATE OR REPLACE FUNCTION public.get_user_accepted_policies(p_user_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_target_id UUID := COALESCE(p_user_id, auth.uid());
    v_result JSONB;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
    END IF;

    -- Enforce privacy: users can only fetch their own records
    IF auth.uid() <> v_target_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'forbidden');
    END IF;

    -- Query distinct latest accepted version per policy
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'policy_id', sub.policy_id,
                'version', sub.policy_version,
                'accepted_at', sub.latest_accepted_at,
                'platform', sub.platform,
                'app_version', sub.app_version
            )
        ),
        '[]'::jsonb
    )
    INTO v_result
    FROM (
        SELECT DISTINCT ON (policy_id)
            policy_id,
            policy_version,
            accepted_at AS latest_accepted_at,
            platform,
            app_version
        FROM public.user_policy_acceptances
        WHERE user_id = v_target_id
        ORDER BY policy_id, accepted_at DESC
    ) sub;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_target_id,
        'accepted_policies', v_result
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_accepted_policies(UUID) TO authenticated;

-- 8. Authoritative RPC: get_pending_policy_requirements
CREATE OR REPLACE FUNCTION public.get_pending_policy_requirements(p_user_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_target_id UUID := COALESCE(p_user_id, auth.uid());
    v_pending JSONB;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
    END IF;

    IF auth.uid() <> v_target_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'forbidden');
    END IF;

    -- Find active policies that require re-acceptance and user hasn't accepted yet
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'policy_id', p.policy_id,
                'version', p.version,
                'title', p.title,
                'content_url', p.content_url,
                'effective_at', p.effective_at
            )
        ),
        '[]'::jsonb
    )
    INTO v_pending
    FROM public.policies p
    WHERE p.is_active = true
      AND p.requires_reacceptance = true
      AND NOT EXISTS (
          SELECT 1 FROM public.user_policy_acceptances a
          WHERE a.user_id = v_target_id
            AND a.policy_id = p.policy_id
            AND a.policy_version = p.version
      );

    RETURN jsonb_build_object(
        'success', true,
        'has_pending', jsonb_array_length(v_pending) > 0,
        'pending_policies', v_pending
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pending_policy_requirements(UUID) TO authenticated;
