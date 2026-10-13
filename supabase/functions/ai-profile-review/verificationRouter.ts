// Server-Authoritative Verification Orchestration Layer
// Manages primary OpenRouter vision provider, Liveness fallback provider,
// deterministic quota-recovery cooldowns, and biometric verification integrity.

export type VerificationStatus = 'verified' | 'needs_review' | 'rejected';

export interface AiReview {
  status: VerificationStatus;
  score: number;
  photo_origin: 'camera_likely' | 'edited_likely' | 'ai_generated_likely' | 'unclear';
  summary: string;
  flags: string[];
}

export interface VerificationRoutingResult {
  provider: string;
  model: string;
  review: AiReview;
  raw: unknown;
  providerUsed: 'primary' | 'fallback' | 'free_motion_queue';
  routeReason?: string;
  sessionId?: string;
}

export interface ProviderStatus {
  name: string;
  isAvailable: boolean;
  cooldownUntil: number; // timestamp in ms
  failureCount: number;
  lastFailureReason?: string;
}

export interface VerificationAttemptParams {
  selfieBase64: string;
  profilePhotoUrl?: string | null;
  livenessScore?: number;
  userId: string;
  sessionId?: string;
  sessionTimestamp?: number;
}

// Environment helper compatible across Deno Edge Functions and Node.js test runners
export function getEnv(key: string): string | undefined {
  try {
    // @ts-ignore Deno global
    if (typeof Deno !== 'undefined' && Deno?.env?.get) {
      // @ts-ignore Deno global
      return Deno.env.get(key);
    }
  } catch (_e) {
    // Ignore and fallback to process
  }
  try {
    // @ts-ignore Node global
    if (typeof process !== 'undefined' && process?.env) {
      // @ts-ignore Node global
      return process.env[key];
    }
  } catch (_e) {
    // Fallback
  }
  return undefined;
}

// Configurable constants
const DEFAULT_PRIMARY_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
const DEFAULT_FALLBACK_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
const DEFAULT_TIMEOUT_MS = 8000; // 8 seconds per provider attempt
const MAX_SESSION_AGE_MS = 5 * 60 * 1000; // 5 minutes session expiration

// In-memory provider state
let primaryState: ProviderStatus = {
  name: 'openrouter',
  isAvailable: true,
  cooldownUntil: 0,
  failureCount: 0,
};

let fallbackState: ProviderStatus = {
  name: 'liveness_fallback',
  isAvailable: true,
  cooldownUntil: 0,
  failureCount: 0,
};

// In-flight sessions map to prevent duplicate concurrent verification requests
const inFlightSessions = new Map<string, number>();

export function getProviderState(): { primary: ProviderStatus; fallback: ProviderStatus } {
  const now = Date.now();
  if (primaryState.cooldownUntil > 0 && now >= primaryState.cooldownUntil) {
    primaryState.isAvailable = true;
    primaryState.cooldownUntil = 0;
    primaryState.failureCount = 0;
    primaryState.lastFailureReason = undefined;
  }
  if (fallbackState.cooldownUntil > 0 && now >= fallbackState.cooldownUntil) {
    fallbackState.isAvailable = true;
    fallbackState.cooldownUntil = 0;
    fallbackState.failureCount = 0;
    fallbackState.lastFailureReason = undefined;
  }
  return {
    primary: { ...primaryState },
    fallback: { ...fallbackState },
  };
}

export function resetProviderState() {
  primaryState = {
    name: 'openrouter',
    isAvailable: true,
    cooldownUntil: 0,
    failureCount: 0,
  };
  fallbackState = {
    name: 'liveness_fallback',
    isAvailable: true,
    cooldownUntil: 0,
    failureCount: 0,
  };
  inFlightSessions.clear();
}

export function setProviderStateForTesting(partial: {
  primary?: Partial<ProviderStatus>;
  fallback?: Partial<ProviderStatus>;
}) {
  if (partial.primary) {
    primaryState = { ...primaryState, ...partial.primary };
  }
  if (partial.fallback) {
    fallbackState = { ...fallbackState, ...partial.fallback };
  }
}

export function extractJsonFromText(rawText: string): Record<string, unknown> {
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
    const matchFlag = clean.match(/"match"\s*:\s*(true|false)/i);

    if (statusMatch || matchFlag) {
      return {
        match: matchFlag ? matchFlag[1].toLowerCase() === 'true' : true,
        status: statusMatch ? statusMatch[1].toLowerCase() : 'verified',
        confidence: scoreMatch ? parseInt(scoreMatch[1], 10) : 85,
        summary: summaryMatch ? summaryMatch[1] : 'Facial verification completed.',
        flags: [],
      };
    }
    return {};
  }
}

export function normalizeSelfieReview(raw: Record<string, unknown>, livenessScore: number): AiReview {
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

  let status: VerificationStatus = 'needs_review';
  if (hasSevereSafetyFlags || raw?.status === 'rejected' || raw?.match === false || score < 35) {
    status = 'rejected';
  } else if (match && score >= 45) {
    status = 'verified';
  } else {
    status = 'needs_review';
  }

  return {
    status,
    score: status === 'verified' ? Math.max(score, livenessScore, 85) : score,
    photo_origin: 'camera_likely',
    summary: String(raw?.summary || (status === 'verified' ? 'Face matched successfully with live interactive verification.' : status === 'rejected' ? 'Facial verification rejected.' : 'Facial verification pending review.')),
    flags,
  };
}

// Independent validation for Liveness Fallback Provider response
export function validateFallbackProviderResponse(raw: Record<string, unknown>, livenessScore: number): AiReview {
  if (!raw || typeof raw !== 'object' || Object.keys(raw).length === 0) {
    return {
      status: 'needs_review',
      score: 50,
      photo_origin: 'camera_likely',
      summary: 'Fallback provider returned an empty or unparseable response. Queued for review.',
      flags: ['incomplete_fallback_response'],
    };
  }

  // Parse standard biometric fields
  // 1. Live presence
  const isLive = raw.is_live === true ||
    raw.live === true ||
    String(raw.liveness).toLowerCase() === 'passed' ||
    Number(raw.liveness_score ?? 0) >= 80;

  // 2. 1-to-1 Face Match against reference image
  const isMatch = raw.is_same_face === true ||
    raw.match === true ||
    raw.is_match === true ||
    String(raw.decision).toUpperCase() === 'APPROVED' ||
    String(raw.status).toLowerCase() === 'verified';

  const confidence = Math.max(0, Math.min(100, Number(raw.confidence ?? raw.same_face_confidence ?? raw.score ?? 85)));
  const flags = Array.isArray(raw.flags) ? raw.flags.map(String).slice(0, 10) : [];

  // Evaluate decisions strictly:
  if (!isLive) {
    return {
      status: 'rejected',
      score: 20,
      photo_origin: 'camera_likely',
      summary: 'Live presence check failed. Presentation attack or non-live face detected.',
      flags: [...flags, 'liveness_failed'],
    };
  }

  if (raw.is_same_face === false || raw.match === false || String(raw.decision).toUpperCase() === 'REJECTED') {
    return {
      status: 'rejected',
      score: 25,
      photo_origin: 'camera_likely',
      summary: 'The selfie does not match the person in the profile photo.',
      flags: [...flags, 'face_mismatch'],
    };
  }

  if (isLive && isMatch && confidence >= 45) {
    return {
      status: 'verified',
      score: Math.max(confidence, livenessScore, 85),
      photo_origin: 'camera_likely',
      summary: 'Face matched and live presence confirmed via verified biometric provider.',
      flags,
    };
  }

  return {
    status: 'needs_review',
    score: Math.max(50, confidence),
    photo_origin: 'camera_likely',
    summary: 'Biometric verification inconclusive. Queued for secondary review.',
    flags: [...flags, 'inconclusive_confidence'],
  };
}

/**
 * 1. Primary Provider: OpenRouter Multimodal Vision
 */
async function callPrimaryProvider(
  selfieBase64: string,
  profilePhotoUrl?: string | null,
  livenessScore = 85
): Promise<{ success: boolean; result?: VerificationRoutingResult; errorType?: 'quota' | 'auth' | 'transient' | 'unconfigured'; errorMessage?: string }> {
  const apiKey = getEnv('OPENROUTER_API_KEY');
  const enabled = getEnv('AI_PROFILE_REVIEW_ENABLED') !== 'false';
  let model = getEnv('OPENROUTER_PROFILE_REVIEW_MODEL') || 'openai/gpt-4o-mini';

  if (!apiKey || !enabled) {
    return { success: false, errorType: 'unconfigured', errorMessage: 'OpenRouter API key missing or disabled' };
  }

  const textPrompt = [
    'You are a biometric identity verification reviewer for a campus dating app (The College Date) used by university students across Africa.',
    'Compare the attached images to verify student identity:',
    'Image 1: Live camera capture from the student user during interactive liveness movements.',
    profilePhotoUrl && (profilePhotoUrl.startsWith('http') || profilePhotoUrl.startsWith('data:image/'))
      ? 'Image 2: The student\'s uploaded profile photo.'
      : 'Note: Live camera capture only. Verify that Image 1 contains a genuine live human face.',
    '',
    'Biometric Evaluation Rules:',
    '1. Live Human Presence: Verify that Image 1 is a real, living human face, not a printed photo, mask, or inanimate object.',
    '2. Identity Matching: If Image 2 is provided, carefully compare facial features (eyes, nose, jawline, smile, facial bone structure). IMPORTANT: Allow for normal variations in lighting, hostel vs studio settings, phone camera quality, casual vs formal dress, makeup, or hairstyles.',
    '3. Decision Rules:',
    '   - If Image 1 reasonably resembles Image 2: approve with match: true, status: "verified", confidence: 85-98, summary: "Face verified. Selfie matches profile photo."',
    '   - If Image 1 and Image 2 are clearly two completely DIFFERENT individuals: set match: false, status: "rejected", confidence: 20, summary: "The live selfie does not match the person in the profile photo."',
    '   - If no human face is detected in Image 1: set match: false, status: "rejected", confidence: 10, summary: "No clear human face detected in live selfie."',
    '',
    'Output strictly a JSON object (no markdown, no backticks):',
    '{"match": boolean, "confidence": number, "status": "verified" | "rejected", "photo_origin": "camera_likely", "summary": "Short explanation", "flags": []}'
  ].filter(Boolean).join('\n');

  const content: unknown[] = [
    { type: 'text', text: textPrompt },
    { type: 'image_url', image_url: { url: selfieBase64 } },
  ];

  if (profilePhotoUrl && (profilePhotoUrl.startsWith('http') || profilePhotoUrl.startsWith('data:image/'))) {
    content.push({ type: 'image_url', image_url: { url: profilePhotoUrl } });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const raw = await response.json().catch(() => null);

    // Quota exhaustion check
    if (response.status === 402 || raw?.error?.code === 402 || /credit|quota|balance/i.test(raw?.error?.message || '')) {
      return { success: false, errorType: 'quota', errorMessage: raw?.error?.message || 'Primary credit exhausted (HTTP 402)' };
    }

    // Auth error check
    if (response.status === 401 || response.status === 403) {
      return { success: false, errorType: 'auth', errorMessage: `Primary authentication error (HTTP ${response.status})` };
    }

    // Transient failure check
    if (!response.ok) {
      return { success: false, errorType: 'transient', errorMessage: `Primary provider error (HTTP ${response.status})` };
    }

    const text = raw?.choices?.[0]?.message?.content || '{}';
    const parsed = extractJsonFromText(text);

    return {
      success: true,
      result: {
        provider: 'openrouter',
        model,
        review: normalizeSelfieReview(parsed, livenessScore),
        raw,
        providerUsed: 'primary',
      },
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err?.name === 'AbortError') {
      return { success: false, errorType: 'transient', errorMessage: 'Primary provider timed out (>8000ms)' };
    }
    return { success: false, errorType: 'transient', errorMessage: err?.message || 'Primary network failure' };
  }
}

/**
 * 2. Secondary Provider: Dedicated Liveness & Biometric Fallback Provider
 */
async function callFallbackProvider(
  selfieBase64: string,
  profilePhotoUrl?: string | null,
  livenessScore = 85,
  userId = 'anonymous',
  sessionId = 'session'
): Promise<{ success: boolean; result?: VerificationRoutingResult; errorType?: 'quota' | 'auth' | 'transient' | 'unconfigured'; errorMessage?: string }> {
  const fallbackApiKey = getEnv('LIVENESS_FALLBACK_API_KEY');
  if (!fallbackApiKey) {
    return { success: false, errorType: 'unconfigured', errorMessage: 'LIVENESS_FALLBACK_API_KEY is not configured' };
  }

  const rawBaseUrl = getEnv('LIVENESS_FALLBACK_BASE_URL') || 'https://api.liveness-provider.com/v1';
  const baseUrl = rawBaseUrl.replace(/\/+$/, '');
  const verifyUrl = `${baseUrl}/face/verify`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${fallbackApiKey}`,
        'Content-Type': 'application/json',
        'X-Session-ID': sessionId,
        'X-User-ID': userId,
      },
      body: JSON.stringify({
        selfie_image: selfieBase64,
        reference_image: profilePhotoUrl || null,
        session_id: sessionId,
        user_id: userId,
        liveness_hint: livenessScore,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const raw = await response.json().catch(() => null);

    // Quota exhaustion
    if (response.status === 402 || raw?.error?.code === 402 || /credit|quota|balance/i.test(raw?.error?.message || '')) {
      return { success: false, errorType: 'quota', errorMessage: raw?.error?.message || 'Fallback quota exhausted (HTTP 402)' };
    }

    // Auth error
    if (response.status === 401 || response.status === 403) {
      return { success: false, errorType: 'auth', errorMessage: `Fallback authentication error (HTTP ${response.status})` };
    }

    // Transient failure
    if (!response.ok) {
      return { success: false, errorType: 'transient', errorMessage: `Fallback error (HTTP ${response.status})` };
    }

    // Validate provider response independently
    const review = validateFallbackProviderResponse(raw, livenessScore);

    return {
      success: true,
      result: {
        provider: 'liveness-fallback',
        model: 'liveness-v1',
        review,
        raw,
        providerUsed: 'fallback',
        sessionId,
      },
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err?.name === 'AbortError') {
      return { success: false, errorType: 'transient', errorMessage: 'Fallback provider timed out (>8000ms)' };
    }
    return { success: false, errorType: 'transient', errorMessage: err?.message || 'Fallback network failure' };
  }
}

/**
 * 3. Safe Terminal Fallback (Motion Queue)
 * When both primary and fallback providers are exhausted or unavailable,
 * we never grant a verified badge. The submission is queued safely as needs_review.
 */
function createFreeMotionQueueResult(livenessScore = 85, reason = 'all_providers_unavailable'): VerificationRoutingResult {
  return {
    provider: 'liveness-motion',
    model: 'motion-liveness-pending',
    review: {
      status: 'needs_review',
      score: Math.min(65, Math.max(50, livenessScore)),
      photo_origin: 'camera_likely',
      summary: 'Live presence recorded. Automated cloud verification is temporarily queued for review.',
      flags: ['ai_credits_exhausted_or_offline', reason],
    },
    raw: null,
    providerUsed: 'free_motion_queue',
    routeReason: reason,
  };
}

/**
 * Master Verification Router
 * Orchestrates provider selection, quota-aware fallback, and biometric integrity.
 */
export async function routeVerificationAttempt(params: VerificationAttemptParams): Promise<VerificationRoutingResult> {
  const {
    selfieBase64,
    profilePhotoUrl,
    livenessScore = 85,
    userId,
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    sessionTimestamp = Date.now(),
  } = params;

  // 1. Session Age & Anti-Replay Validation
  const now = Date.now();
  if (now - sessionTimestamp > MAX_SESSION_AGE_MS) {
    return {
      provider: 'security-guard',
      model: 'session-validator',
      review: {
        status: 'rejected',
        score: 0,
        photo_origin: 'camera_likely',
        summary: 'Verification session expired. Please capture a fresh live selfie.',
        flags: ['expired_session'],
      },
      raw: null,
      providerUsed: 'free_motion_queue',
      routeReason: 'expired_session',
      sessionId,
    };
  }

  // 2. Concurrency Lock: Prevent duplicate in-flight requests for the same user
  const activeTime = inFlightSessions.get(userId);
  if (activeTime && now - activeTime < 15000) {
    return {
      provider: 'concurrency-guard',
      model: 'duplicate-request-guard',
      review: {
        status: 'needs_review',
        score: 50,
        photo_origin: 'camera_likely',
        summary: 'A verification request is already being processed for this user.',
        flags: ['duplicate_request_throttled'],
      },
      raw: null,
      providerUsed: 'free_motion_queue',
      routeReason: 'concurrent_in_flight',
      sessionId,
    };
  }

  inFlightSessions.set(userId, now);

  try {
    const currentState = getProviderState();
    let primaryFailed = false;
    let fallbackEligible = false;

    // -------------------------------------------------------------------------
    // Phase 2 Rule A & B: Try Primary Provider if not in quota cooldown
    // -------------------------------------------------------------------------
    if (currentState.primary.isAvailable) {
      const primaryRes = await callPrimaryProvider(selfieBase64, profilePhotoUrl, livenessScore);

      if (primaryRes.success && primaryRes.result) {
        // Primary succeeded! Reset failure count
        primaryState.failureCount = 0;
        return { ...primaryRes.result, sessionId };
      }

      // Primary failed: inspect reason
      primaryFailed = true;
      if (primaryRes.errorType === 'quota') {
        const cooldownMs = Number(getEnv('LIVENESS_PRIMARY_COOLDOWN_MS')) || DEFAULT_PRIMARY_COOLDOWN_MS;
        primaryState.isAvailable = false;
        primaryState.cooldownUntil = Date.now() + cooldownMs;
        primaryState.lastFailureReason = 'quota_exhausted';
        fallbackEligible = true;
      } else if (primaryRes.errorType === 'transient' || primaryRes.errorType === 'auth' || primaryRes.errorType === 'unconfigured') {
        primaryState.failureCount += 1;
        fallbackEligible = true;
      }
    } else {
      // Primary in cooldown
      primaryFailed = true;
      fallbackEligible = true;
    }

    // -------------------------------------------------------------------------
    // Phase 2 Rule E & F: Fallback Provider
    // -------------------------------------------------------------------------
    if (fallbackEligible && currentState.fallback.isAvailable) {
      const fallbackRes = await callFallbackProvider(selfieBase64, profilePhotoUrl, livenessScore, userId, sessionId);

      if (fallbackRes.success && fallbackRes.result) {
        fallbackState.failureCount = 0;
        return {
          ...fallbackRes.result,
          routeReason: primaryFailed ? 'primary_quota_or_transient_fallback' : 'direct_fallback',
        };
      }

      if (fallbackRes.errorType === 'quota') {
        const cooldownMs = Number(getEnv('LIVENESS_FALLBACK_COOLDOWN_MS')) || DEFAULT_FALLBACK_COOLDOWN_MS;
        fallbackState.isAvailable = false;
        fallbackState.cooldownUntil = Date.now() + cooldownMs;
        fallbackState.lastFailureReason = 'quota_exhausted';
      }
    }

    // -------------------------------------------------------------------------
    // Phase 2 Rule F: Terminal Free Motion Queue
    // Both providers exhausted or unavailable. Withhold verified badge safely.
    // -------------------------------------------------------------------------
    return createFreeMotionQueueResult(
      livenessScore,
      primaryState.lastFailureReason === 'quota_exhausted' && fallbackState.lastFailureReason === 'quota_exhausted'
        ? 'both_providers_quota_exhausted'
        : 'providers_temporarily_unavailable'
    );
  } finally {
    inFlightSessions.delete(userId);
  }
}
