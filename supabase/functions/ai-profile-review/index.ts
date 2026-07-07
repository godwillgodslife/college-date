// Supabase Edge Function: ai-profile-review
// Deploy: supabase functions deploy ai-profile-review
// Required secret for live AI review: OPENROUTER_API_KEY
// Optional: OPENROUTER_PROFILE_REVIEW_MODEL, AI_PROFILE_REVIEW_ENABLED=false

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

function normalizeReview(raw: Partial<AiReview> | null): AiReview {
  const score = Math.max(0, Math.min(100, Number(raw?.score ?? 40)));
  const flags = Array.isArray(raw?.flags) ? raw.flags.map(String).slice(0, 10) : [];
  let status: AiReview['status'] = raw?.status === 'verified' || raw?.status === 'rejected' || raw?.status === 'needs_review'
    ? raw.status
    : score >= 75 && flags.length === 0
      ? 'verified'
      : score < 35
        ? 'rejected'
        : 'needs_review';

  if (flags.some((flag) => /minor|child|explicit|impersonation/i.test(flag))) {
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
      : 'unclear',
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

async function runOpenRouterReview(profile: Record<string, unknown>, imageUrls: string[]) {
  const apiKey = Deno.env.get('OPENROUTER_API_KEY');
  const enabled = Deno.env.get('AI_PROFILE_REVIEW_ENABLED') !== 'false';
  let model = Deno.env.get('OPENROUTER_PROFILE_REVIEW_MODEL') || 'openai/gpt-4o-mini';

  if (!apiKey || !enabled) {
    return {
      provider: 'placeholder',
      model: 'local-placeholder',
      review: normalizeReview({
        status: imageUrls.length > 0 ? 'needs_review' : 'rejected',
        score: imageUrls.length > 0 ? 55 : 20,
        photo_origin: 'unclear',
        summary: 'AI profile review is wired, but the provider key is not enabled yet.',
        flags: imageUrls.length > 0 ? ['provider_not_configured'] : ['missing_profile_photo', 'provider_not_configured'],
      }),
      raw: null,
    };
  }

  const textPrompt = [
    'You are a trust and safety reviewer for a campus dating app.',
    'Review the profile text and images for whether this appears to be a real adult student profile.',
    'Do not identify a person. Do not claim certainty. Return JSON only.',
    'Check: likely real human photo, likely AI-generated/stock/edited image, adult-safety concerns, campus/student consistency, scam or impersonation risk.',
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

  console.log(`[OpenRouter Profile Review] Sending request to model: ${model}`);
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
      max_tokens: 500,
    }),
  });

  let raw = await response.json().catch(() => null);

  // Auto fallback to free model on credit failure (402)
  if (response.status === 402 || raw?.error?.code === 402) {
    console.warn(`[OpenRouter Profile Review] Model ${model} failed with 402 (Insufficient credits). Retrying with openrouter/free...`);
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
        max_tokens: 500,
      }),
    });
    raw = await response.json().catch(() => null);
  }

  if (!response.ok) {
    const errorMsg = raw?.error?.message || `AI provider request failed with status ${response.status}`;
    console.error(`[OpenRouter Profile Review] Error: ${errorMsg}`);
    throw new Error(errorMsg);
  }

  const text = raw?.choices?.[0]?.message?.content || '{}';
  
  try {
    const parsed = JSON.parse(text);
    return {
      provider: 'openrouter',
      model,
      review: normalizeReview(parsed),
      raw,
    };
  } catch (parseError) {
    console.error('[OpenRouter Profile Review] Failed to parse JSON response. Content:', text);
    throw new Error(`Failed to parse AI review response as JSON: ${parseError.message}`);
  }
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
    await req.json().catch(() => ({}));

    await adminClient
      .from('profiles')
      .update({ ai_verification_status: 'reviewing' })
      .eq('id', userId);

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) return jsonResponse({ error: 'Profile not found' }, 404);

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

    const { error: reviewError } = await adminClient
      .from('ai_profile_reviews')
      .insert(reviewInsert);
    if (reviewError) throw reviewError;

    const { error: profileUpdateError } = await adminClient
      .from('profiles')
      .update({
        ai_verification_status: review.status,
        ai_verification_score: review.score,
        ai_photo_origin: review.photo_origin,
        ai_review_summary: review.summary,
        ai_review_flags: review.flags,
        ai_reviewed_at: now,
        is_verified: review.status === 'verified',
      })
      .eq('id', userId);
    if (profileUpdateError) throw profileUpdateError;

    return jsonResponse({ success: true, review });
  } catch (error) {
    console.error('ai-profile-review error:', error);
    return jsonResponse({ success: false, error: error.message || 'AI review failed' }, 500);
  }
});
