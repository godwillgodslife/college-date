// Supabase Edge Function: ai-profile-review
// Deploy: supabase functions deploy ai-profile-review
// Required secret for live AI review: OPENROUTER_API_KEY
// Optional: OPENROUTER_PROFILE_REVIEW_MODEL, AI_PROFILE_REVIEW_ENABLED=false

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { routeVerificationAttempt } from './verificationRouter.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type AiReview = {
  status: 'verified' | 'needs_review' | 'rejected';
  score: number;
  photo_origin: 'camera_likely' | 'edited_likely' | 'ai_generated_likely' | 'unclear';
  summary: string;
  flags: string[];
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function extractJson(rawText: string): Record<string, unknown> {
  if (!rawText || typeof rawText !== 'string') return {};
  let clean = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    clean = clean.substring(firstBrace, lastBrace + 1);
  }

  clean = clean.replace(/\\+"/g, '"');

  try {
    return JSON.parse(clean);
  } catch (_e) {
    const statusMatch = clean.match(/"status"\s*:\s*"([^"]+)"/i);
    const scoreMatch = clean.match(/"score"\s*:\s*(\d+)/i);
    const summaryMatch = clean.match(/"summary"\s*:\s*"([^"]+)"/i);
    const originMatch = clean.match(/"photo_origin"\s*:\s*"([^"]+)"/i);

    if (statusMatch) {
      return {
        status: statusMatch[1].toLowerCase(),
        score: scoreMatch ? parseInt(scoreMatch[1], 10) : 85,
        summary: summaryMatch ? summaryMatch[1] : 'Facial verification completed.',
        photo_origin: originMatch ? originMatch[1] : 'camera_likely',
        flags: [],
      };
    }
    return {};
  }
}

function normalizeReview(raw: Partial<AiReview> | null): AiReview {
  const score = Math.max(0, Math.min(100, Number(raw?.score ?? 80)));
  const flags = Array.isArray(raw?.flags) ? raw.flags.map(String).slice(0, 10) : [];
  let status: AiReview['status'] = raw?.status === 'verified' || raw?.status === 'rejected' || raw?.status === 'needs_review'
    ? raw.status
    : score >= 70 && flags.length === 0
      ? 'verified'
      : score < 35
        ? 'rejected'
        : 'needs_review';

  if (flags.some((flag) => /minor|child|explicit/i.test(flag))) {
    status = 'needs_review';
  }

  return {
    status,
    score,
    photo_origin: raw?.photo_origin === 'camera_likely' ||
      raw?.photo_origin === 'edited_likely' ||
      raw?.photo_origin === 'ai_generated_likely' ||
      raw?.photo_origin === 'unclear'
      ? raw.photo_origin
      : 'camera_likely',
    summary: String(raw?.summary || 'AI review completed.').slice(0, 500),
    flags,
  };
}

function getProfileImages(profile: Record<string, unknown>) {
  const urls = new Set<string>();
  if (typeof profile.avatar_url === 'string' && profile.avatar_url.startsWith('http')) {
    urls.add(profile.avatar_url);
  }

  if (Array.isArray(profile.profile_photos)) {
    profile.profile_photos.forEach((url) => {
      if (typeof url === 'string' && url.startsWith('http')) urls.add(url);
    });
  }

  return Array.from(urls).slice(0, 4);
}

function normalizeSelfieReview(raw: Record<string, unknown>, livenessScore: number): AiReview {
  const isRawEmpty = !raw || Object.keys(raw).length === 0;
  if (isRawEmpty) {
    return {
      status: 'needs_review',
      score: Math.min(65, Math.max(50, livenessScore)),
      photo_origin: 'camera_likely',
      summary: 'Selfie captured with live motion. Verification response was incomplete and is queued for review.',
      flags: ['incomplete_model_response'],
    };
  }

  const match = raw?.match === true ||
    raw?.status === 'verified' ||
    String(raw?.status).toLowerCase().includes('verif') ||
    String(raw?.match).toLowerCase() === 'true';

  const score = Math.max(0, Math.min(100, Number(raw?.confidence ?? raw?.score ?? 85)));
  const flags = Array.isArray(raw?.flags) ? raw.flags.map(String).slice(0, 10) : [];
  const hasSevereSafetyFlags = flags.some((flag) => /minor|child|explicit|weapon/i.test(flag));

  // Determine status authoritatively:
  let status: AiReview['status'] = 'needs_review';
  if (hasSevereSafetyFlags || raw?.status === 'rejected' || raw?.match === false || score < 35) {
    status = 'rejected';
  } else if (match && score >= 45) {
    status = 'verified';
  } else {
    status = 'needs_review';
  }

  return {
    status,
    score: Math.max(score, livenessScore, 85),
    photo_origin: 'camera_likely',
    summary: String(raw?.summary || (status === 'verified' ? 'Face matched successfully with live interactive verification.' : status === 'rejected' ? 'Facial verification rejected.' : 'Facial verification pending review.')),
    flags,
  };
}

// Preserved fallback contract: ensures needs_review is returned when providers fail or credits exhaust
const FALLBACK_MOTION_REVIEW = {
  status: 'needs_review' as const,
  model: 'liveness-motion-pending',
  summary: 'Live presence recorded. Cloud verification is currently queued for manual review.',
};

// 1-to-1 Biometric Face Match: compares live camera selfie with user candidate or profile photo
// Credit-aware routing: OpenRouter Primary -> Liveness Fallback (LIVENESS_FALLBACK_API_KEY) -> Safe Motion Queue
async function runSelfieFaceMatch(
  selfieBase64: string,
  profilePhotoUrl?: string | null,
  livenessScore = 85,
  userId = 'anonymous',
  sessionId?: string,
  sessionTimestamp?: number,
  compactFrameBase64?: string | null,
  stageFrames?: string[],
  livfaceSessionId?: string,
  readOnly = false
) {
  return await routeVerificationAttempt({
    selfieBase64,
    compactFrameBase64,
    stageFrames,
    livfaceSessionId,
    profilePhotoUrl,
    livenessScore,
    userId,
    sessionId,
    sessionTimestamp,
    readOnly,
  });
}

async function runOpenRouterReview(profile: Record<string, unknown>, imageUrls: string[]) {
  const apiKey = Deno.env.get('OPENROUTER_API_KEY');
  const enabled = Deno.env.get('AI_PROFILE_REVIEW_ENABLED') !== 'false';
  let model = Deno.env.get('OPENROUTER_PROFILE_REVIEW_MODEL') || 'openai/gpt-4o-mini';

  if (!apiKey || !enabled) {
    return {
      provider: 'placeholder',
      model: 'local-placeholder',
      review: normalizeReview({
        status: 'needs_review',
        score: imageUrls.length > 0 ? 60 : 30,
        photo_origin: 'camera_likely',
        summary: 'Profile saved successfully. AI verification is pending credit reload or manual review.',
        flags: ['ai_credits_exhausted_or_offline'],
      }),
      raw: null,
    };
  }

  const textPrompt = [
    'You are a trust and safety reviewer for Nigerian campus dating app (The College Date).',
    'Review the student profile and images for genuine student membership.',
    'Guidelines: Students attend universities across Nigeria and take pictures in various lighting, poses, or formal clothes.',
    'Do not penalize clean or formal studio photos. Only flag obvious commercial watermarks or severe safety issues.',
    'JSON schema: {"status":"verified|needs_review|rejected","score":0-100,"photo_origin":"camera_likely|edited_likely|ai_generated_likely|unclear","summary":"short explanation","flags":["short_flags"]}',
    '',
    `Profile: ${JSON.stringify({
      full_name: profile.full_name,
      age: profile.age,
      university: profile.university,
      level: profile.level,
      bio: profile.bio,
      interests: profile.interests,
      attraction_goal: profile.attraction_goal,
    })}`,
  ].join('\n');

  const content = [
    { type: 'text', text: textPrompt },
    ...imageUrls.map((url) => ({ type: 'image_url', image_url: { url } })),
  ];

  let response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://www.thecollegedate.com',
      'X-Title': 'The College Date',
    },
    body: JSON.stringify({
      model,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content }],
      temperature: 0.1,
      max_tokens: 1500,
    }),
  });

  let raw = await response.json().catch(() => null);

  if (response.status === 402 || raw?.error?.code === 402) {
    model = 'openrouter/free';
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://www.thecollegedate.com',
        'X-Title': 'The College Date',
      },
      body: JSON.stringify({
        model,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content }],
        temperature: 0.1,
        max_tokens: 1500,
      }),
    });
    raw = await response.json().catch(() => null);
  }

  if (!response.ok) {
    console.warn(`[OpenRouter Profile Review] API failed with ${response.status}, queuing for review without verified badge`);
    return {
      provider: 'fallback-safety',
      model: 'profile-pending-review',
      review: {
        status: 'needs_review' as const,
        score: 60,
        photo_origin: 'camera_likely' as const,
        summary: 'Student profile saved. AI verification is queued pending credit renewal or admin check.',
        flags: ['ai_credit_exhausted_or_error'],
      },
      raw: null,
    };
  }

  const text = raw?.choices?.[0]?.message?.content || '{}';
  const parsed = extractJson(text);

  return {
    provider: 'openrouter',
    model,
    review: normalizeReview(parsed),
    raw,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData?.user?.id) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const userId = authData.user.id;
    const body = await req.json().catch(() => ({}));

    // Handle dedicated 1-to-1 Selfie Face Verification or Read-Only Face Comparison (Campus Finder)
    if (body.action === 'verify_selfie' || body.action === 'compare_faces_readonly') {
      const {
        selfieBase64,
        compactFrameBase64,
        stageFrames,
        livfaceSessionId,
        profilePhotoUrl,
        livenessScore,
        sessionId,
        sessionTimestamp,
        readOnly,
      } = body;

      if (!selfieBase64) {
        return jsonResponse({ error: 'Selfie capture is required' }, 400);
      }

      const isReadOnly = Boolean(readOnly || body.action === 'compare_faces_readonly');

      if (isReadOnly) {
        // Read-only 1-to-1 comparison (e.g., Campus Finder): NEVER mutate the searching user's profile or audit logs
        const routingResult = await runSelfieFaceMatch(
          selfieBase64,
          profilePhotoUrl,
          livenessScore,
          userId,
          sessionId,
          sessionTimestamp,
          compactFrameBase64,
          stageFrames,
          livfaceSessionId,
          true
        );
        const { review, providerUsed, routeReason } = routingResult;
        const isApproved = review.status === 'verified';
        return jsonResponse({
          success: true,
          verified: isApproved,
          review,
          provider_used: providerUsed,
          route_reason: routeReason,
          read_only: true,
        });
      }

      const { data: profile } = await adminClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      const photoToCompare = profilePhotoUrl || profile?.avatar_url || (Array.isArray(profile?.profile_photos) ? profile.profile_photos[0] : null);

      const routingResult = await runSelfieFaceMatch(
        selfieBase64,
        photoToCompare,
        livenessScore,
        userId,
        sessionId,
        sessionTimestamp,
        compactFrameBase64,
        stageFrames,
        livfaceSessionId,
        false
      );
      const { provider, model, review, raw, providerUsed, routeReason } = routingResult;

      const now = new Date().toISOString();
      const isApproved = review.status === 'verified';

      const { error: updateError } = await adminClient
        .from('profiles')
        .update({
          ai_verification_status: review.status,
          ai_verification_score: review.score,
          ai_photo_origin: review.photo_origin,
          ai_review_summary: review.summary,
          ai_reviewed_at: now,
          is_verified: isApproved,
          photo_verified: isApproved,
        })
        .eq('id', userId);

      if (updateError) {
        console.error('[ai-profile-review] Failed to update profile verification state:', updateError);
      }

      await adminClient.from('ai_profile_reviews').insert({
        user_id: userId,
        status: review.status,
        score: review.score,
        photo_origin: review.photo_origin,
        summary: `Selfie Verification: ${review.summary}`,
        flags: review.flags,
        provider,
        model,
        raw_result: raw,
        updated_at: now,
      });

      return jsonResponse({
        success: true,
        verified: isApproved,
        review,
        provider_used: providerUsed,
        route_reason: routeReason,
      });
    }

    // Default: Background Profile Text & Photos Moderation Review
    // Policy: Verified Badge (is_verified / photo_verified) is granted EXCLUSIVELY by 1-to-1 live selfie
    // verification (verify_selfie) and Admin manual verification (admin_set_user_status).
    // Replacing the primary profile photo (avatarChanged === true) resets verification until re-verified.
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) return jsonResponse({ error: 'Profile not found' }, 404);

    const avatarChanged = Boolean(body.avatarChanged);
    const alreadyVerified = Boolean((profile.photo_verified || profile.is_verified) && !avatarChanged);

    if (avatarChanged) {
      await adminClient
        .from('profiles')
        .update({
          is_verified: false,
          photo_verified: false,
          ai_verification_status: 'not_started',
        })
        .eq('id', userId);
    } else if (!alreadyVerified) {
      await adminClient
        .from('profiles')
        .update({ ai_verification_status: 'reviewing' })
        .eq('id', userId);
    }

    const imageUrls = getProfileImages(profile);
    const { provider, model, review, raw } = await runOpenRouterReview(profile, imageUrls);

    const now = new Date().toISOString();
    const reviewInsert = {
      user_id: userId,
      status: review.status,
      score: review.score,
      photo_origin: review.photo_origin,
      summary: review.summary,
      flags: review.flags,
      provider,
      model,
      raw_result: raw,
      updated_at: now,
    };

    await adminClient
      .from('ai_profile_reviews')
      .insert(reviewInsert);

    if (!alreadyVerified) {
      // Never grant or revoke is_verified / photo_verified from background text/photo review;
      // only record moderation metadata for unverified profiles.
      const safeStatus = avatarChanged
        ? 'not_started'
        : review.status === 'rejected'
        ? 'rejected'
        : 'not_started';

      await adminClient
        .from('profiles')
        .update({
          ai_verification_status: safeStatus,
          ai_verification_score: review.score,
          ai_photo_origin: review.photo_origin,
          ai_review_summary: review.summary,
          ai_review_flags: review.flags,
          ai_reviewed_at: now,
        })
        .eq('id', userId);
    }

    return jsonResponse({ success: true, review });
  } catch (error) {
    console.error('ai-profile-review error:', error);
    return jsonResponse({
      success: true,
      verified: false,
      review: {
        status: 'needs_review',
        score: 50,
        photo_origin: 'camera_likely',
        summary: 'Profile saved. Verification is currently pending review.',
        flags: ['system_fallback'],
      },
    }, 200);
  }
});
