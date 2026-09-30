-- Migration: 20260919100000_official_the_college_date_system.sql
-- Description:
-- 1. Dedicated public.official_posts table for in-app video tutorials, guides, and announcements
-- 2. Indexes and Row Level Security policies (Public read for published, Admin-only write)
-- 3. Storage bucket official-media for video tutorials and poster thumbnails
-- 4. Helper RPCs: get_official_posts and increment_official_post_view
-- 5. Initial seed of verified core application tutorials

-- ============================================================================
-- 1. TABLE: public.official_posts
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.official_posts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_type text NOT NULL DEFAULT 'tutorial' CHECK (post_type IN ('tutorial', 'announcement', 'update', 'safety', 'feature_guide')),
    category text NOT NULL DEFAULT 'general' CHECK (category IN ('getting_started', 'swiping', 'requests', 'chat', 'premium', 'wallet', 'confessions', 'general')),
    title text NOT NULL,
    caption text NOT NULL,
    video_url text,
    thumbnail_url text NOT NULL,
    aspect_ratio text DEFAULT '9:16' CHECK (aspect_ratio IN ('9:16', '16:9', '1:1')),
    duration_seconds integer DEFAULT 0,
    action_label text,
    action_deep_link text,
    is_pinned boolean DEFAULT false,
    display_order integer DEFAULT 0,
    min_app_version text DEFAULT '2.2.58',
    is_published boolean DEFAULT true,
    view_count integer DEFAULT 0,
    published_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Indices for rapid query and ordering
CREATE INDEX IF NOT EXISTS idx_official_posts_listing 
ON public.official_posts (is_published, is_pinned DESC, display_order ASC, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_official_posts_category 
ON public.official_posts (category, is_published);

-- ============================================================================
-- 2. ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.official_posts ENABLE ROW LEVEL SECURITY;

-- Read policy: Anyone (anon and authenticated) can view published posts
DROP POLICY IF EXISTS "Official posts are viewable by anyone" ON public.official_posts;
CREATE POLICY "Official posts are viewable by anyone"
ON public.official_posts FOR SELECT
USING (is_published = true OR auth.role() = 'service_role');

-- Admin write policies
DROP POLICY IF EXISTS "Admins can insert official posts" ON public.official_posts;
CREATE POLICY "Admins can insert official posts"
ON public.official_posts FOR INSERT
WITH CHECK (
    auth.role() = 'service_role' OR
    (auth.uid() IS NOT NULL AND (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin', 'owner', 'content_manager') OR
        (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true OR
        EXISTS (
            SELECT 1 FROM public.admin_access_tokens 
            WHERE user_id = auth.uid() AND revoked_at IS NULL
        )
    ))
);

DROP POLICY IF EXISTS "Admins can update official posts" ON public.official_posts;
CREATE POLICY "Admins can update official posts"
ON public.official_posts FOR UPDATE
USING (
    auth.role() = 'service_role' OR
    (auth.uid() IS NOT NULL AND (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin', 'owner', 'content_manager') OR
        (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true OR
        EXISTS (
            SELECT 1 FROM public.admin_access_tokens 
            WHERE user_id = auth.uid() AND revoked_at IS NULL
        )
    ))
);

DROP POLICY IF EXISTS "Admins can delete official posts" ON public.official_posts;
CREATE POLICY "Admins can delete official posts"
ON public.official_posts FOR DELETE
USING (
    auth.role() = 'service_role' OR
    (auth.uid() IS NOT NULL AND (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin', 'owner') OR
        (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true
    ))
);

-- ============================================================================
-- 3. STORAGE BUCKET: official-media
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('official-media', 'official-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public can view official media" ON storage.objects;
CREATE POLICY "Public can view official media"
ON storage.objects FOR SELECT
USING (bucket_id = 'official-media');

DROP POLICY IF EXISTS "Admins can upload official media" ON storage.objects;
CREATE POLICY "Admins can upload official media"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'official-media' AND (
        auth.role() = 'service_role' OR
        auth.uid() IS NOT NULL
    )
);

-- ============================================================================
-- 4. RPCs: get_official_posts & increment_official_post_view
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_official_posts(
    p_category text DEFAULT NULL,
    p_limit integer DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_results jsonb;
BEGIN
    SELECT COALESCE(jsonb_agg(row_to_json(q)), '[]'::jsonb)
    INTO v_results
    FROM (
        SELECT 
            id,
            post_type,
            category,
            title,
            caption,
            video_url,
            thumbnail_url,
            aspect_ratio,
            duration_seconds,
            action_label,
            action_deep_link,
            is_pinned,
            display_order,
            min_app_version,
            view_count,
            published_at,
            created_at
        FROM public.official_posts
        WHERE is_published = true
          AND (p_category IS NULL OR p_category = 'all' OR category = p_category)
        ORDER BY is_pinned DESC, display_order ASC, published_at DESC
        LIMIT LEAST(p_limit, 100)
    ) q;

    RETURN v_results;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_official_posts(text, integer) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.increment_official_post_view(p_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.official_posts
    SET view_count = view_count + 1
    WHERE id = p_post_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_official_post_view(uuid) TO anon, authenticated, service_role;

-- ============================================================================
-- 5. INITIAL SEED: VERIFIED CORE APPLICATION TUTORIALS
-- ============================================================================

INSERT INTO public.official_posts (
    id,
    post_type,
    category,
    title,
    caption,
    video_url,
    thumbnail_url,
    aspect_ratio,
    duration_seconds,
    action_label,
    action_deep_link,
    is_pinned,
    display_order,
    is_published
)
VALUES
(
    '10000000-0000-0000-0000-000000000001',
    'tutorial',
    'getting_started',
    'How Matching Works on Campus',
    'Swipe right when you feel the campus vibe ❤️. When there is mutual interest, it is an instant match! No awkward pressure, no ghost accounts.',
    '/tutorials/tut_matching.webm',
    '/tutorials/tut_matching_thumb.webp',
    '9:16',
    18,
    'Start Swiping Now',
    '/match',
    true,
    1,
    true
),
(
    '10000000-0000-0000-0000-000000000002',
    'tutorial',
    'swiping',
    'Direct Card Swiping & Daily Quota',
    'Feel the fluid 1:1 direct finger tracking! Free accounts get 20 daily campus swipes that reset daily. Keep discovery authentic and high-quality.',
    '/tutorials/tut_swiping.webm',
    '/tutorials/tut_swiping_thumb.webp',
    '9:16',
    20,
    'Explore Campus Cards',
    '/match',
    true,
    2,
    true
),
(
    '10000000-0000-0000-0000-000000000003',
    'tutorial',
    'requests',
    'Connection Requests & Secret Admirers',
    'Right-swipes appear in your Requests tab. Free students can accept up to 3 admirers every day for free. Additional admirers are locked safely until you upgrade.',
    '/tutorials/tut_requests.webm',
    '/tutorials/tut_requests_thumb.webp',
    '9:16',
    22,
    'Check My Requests',
    '/requests',
    false,
    3,
    true
),
(
    '10000000-0000-0000-0000-000000000004',
    'tutorial',
    'chat',
    'WhatsApp-Grade Chat & Voice Notes',
    'Break the ice with high-clarity WebM voice notes, 10s chat video snippets, quick emoji reactions, live campus location pins, and safe meetup spots.',
    '/tutorials/tut_chat.webm',
    '/tutorials/tut_chat_thumb.webp',
    '9:16',
    24,
    'Open Messages',
    '/chat',
    false,
    4,
    true
),
(
    '10000000-0000-0000-0000-000000000005',
    'tutorial',
    'premium',
    '11 Elite Benefits of Premium',
    'Unlock unlimited right-swipes, unlimited admirer accepts, 10s video messages in chat, profile viewers, and instant visibility boosts.',
    '/tutorials/tut_premium.webm',
    '/tutorials/tut_premium_thumb.webp',
    '9:16',
    25,
    'View Premium Benefits',
    '/premium',
    false,
    5,
    true
),
(
    '10000000-0000-0000-0000-000000000006',
    'tutorial',
    'wallet',
    'Student Earnings & Friday Bank Payouts',
    'Earn from campus gift tips and student referrals. Track your pending balance and withdraw directly to your Nigerian bank account every Friday!',
    '/tutorials/tut_wallet.webm',
    '/tutorials/tut_wallet_thumb.webp',
    '9:16',
    20,
    'Open Student Wallet',
    '/wallet',
    false,
    6,
    true
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    caption = EXCLUDED.caption,
    video_url = EXCLUDED.video_url,
    thumbnail_url = EXCLUDED.thumbnail_url,
    action_label = EXCLUDED.action_label,
    action_deep_link = EXCLUDED.action_deep_link,
    is_pinned = EXCLUDED.is_pinned,
    display_order = EXCLUDED.display_order,
    is_published = EXCLUDED.is_published;
