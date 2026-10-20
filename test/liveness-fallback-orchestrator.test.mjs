import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

import {
  routeVerificationAttempt,
  getProviderState,
  resetProviderState,
  setProviderStateForTesting,
  normalizeSelfieReview,
  validateFallbackProviderResponse,
  extractJsonFromText,
} from '../supabase/functions/ai-profile-review/verificationRouter.ts';

// Test Fixtures
const SAMPLE_SELFIE_BASE64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...';
const SAMPLE_PROFILE_PHOTO = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400';

// Global Fetch Mock Utility
let originalFetch = globalThis.fetch;
function mockFetch(handler) {
  globalThis.fetch = async (...args) => {
    return handler(...args);
  };
}
function restoreFetch() {
  globalThis.fetch = originalFetch;
}

// ---------------------------------------------------------------------------
// Scenario 1: Primary provider succeeds
// ---------------------------------------------------------------------------
test('Scenario 1: Primary provider succeeds -> Validates result and issues verified badge', async () => {
  resetProviderState();
  process.env.OPENROUTER_API_KEY = 'sk-or-test-mock-key';
  process.env.AI_PROFILE_REVIEW_ENABLED = 'true';
  process.env.LIVENESS_FALLBACK_API_KEY = 'lv_mock_fallback_key';

  mockFetch(async (url, options) => {
    if (String(url).includes('openrouter.ai')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  match: true,
                  confidence: 94,
                  status: 'verified',
                  summary: 'Face verified. Selfie matches profile photo.',
                  flags: [],
                }),
              },
            },
          ],
        }),
      };
    }
    throw new Error('Unexpected fallback call');
  });

  try {
    const result = await routeVerificationAttempt({
      selfieBase64: SAMPLE_SELFIE_BASE64,
      profilePhotoUrl: SAMPLE_PROFILE_PHOTO,
      livenessScore: 92,
      userId: 'user-001',
      sessionId: 'sess-001',
    });

    assert.strictEqual(result.providerUsed, 'primary');
    assert.strictEqual(result.provider, 'openrouter');
    assert.strictEqual(result.review.status, 'verified');
    assert.ok(result.review.score >= 85);
    assert.strictEqual(result.sessionId, 'sess-001');

    const state = getProviderState();
    assert.strictEqual(state.primary.isAvailable, true);
    assert.strictEqual(state.primary.failureCount, 0);
  } finally {
    restoreFetch();
  }
});

// ---------------------------------------------------------------------------
// Scenario 2: Primary provider has exhausted its quota (HTTP 402)
// ---------------------------------------------------------------------------
test('Scenario 2: Primary provider quota exhausted (402) -> Enters cooldown and routes to Liveness Fallback', async () => {
  resetProviderState();
  process.env.OPENROUTER_API_KEY = 'sk-or-test-mock-key';
  process.env.LIVENESS_FALLBACK_API_KEY = 'lv_mock_fallback_key';
  process.env.LIVENESS_FALLBACK_BASE_URL = 'https://mock.liveness-provider.com/v1';

  let openRouterCalled = false;
  let fallbackCalled = false;

  mockFetch(async (url, options) => {
    if (String(url).includes('openrouter.ai')) {
      openRouterCalled = true;
      return {
        ok: false,
        status: 402,
        json: async () => ({
          error: { code: 402, message: 'Provider returned error: Insufficient credits' },
        }),
      };
    }
    if (String(url).includes('mock.liveness-provider.com')) {
      fallbackCalled = true;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          is_live: true,
          is_same_face: true,
          confidence: 91,
          status: 'verified',
          decision: 'APPROVED',
        }),
      };
    }
    throw new Error(`Unexpected URL: ${url}`);
  });

  try {
    const result = await routeVerificationAttempt({
      selfieBase64: SAMPLE_SELFIE_BASE64,
      profilePhotoUrl: SAMPLE_PROFILE_PHOTO,
      livenessScore: 90,
      userId: 'user-002',
      sessionId: 'sess-002',
    });

    assert.ok(openRouterCalled, 'OpenRouter should have been attempted');
    assert.ok(fallbackCalled, 'Fallback provider should have been called on 402');
    assert.strictEqual(result.providerUsed, 'fallback');
    assert.strictEqual(result.provider, 'liveness-fallback');
    assert.strictEqual(result.review.status, 'verified');
    assert.strictEqual(result.routeReason, 'primary_quota_or_transient_fallback');

    const state = getProviderState();
    assert.strictEqual(state.primary.isAvailable, false, 'Primary should be in cooldown');
    assert.strictEqual(state.primary.lastFailureReason, 'quota_exhausted');
  } finally {
    restoreFetch();
  }
});

// ---------------------------------------------------------------------------
// Scenario 3: Primary provider experiences a transient timeout
// ---------------------------------------------------------------------------
test('Scenario 3: Primary provider experiences transient timeout (>8s) -> Routes to Liveness Fallback', async () => {
  resetProviderState();
  process.env.OPENROUTER_API_KEY = 'sk-or-test-mock-key';
  process.env.LIVENESS_FALLBACK_API_KEY = 'lv_mock_fallback_key';
  process.env.LIVENESS_FALLBACK_BASE_URL = 'https://mock.liveness-provider.com/v1';

  mockFetch(async (url) => {
    if (String(url).includes('openrouter.ai')) {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      throw abortError;
    }
    if (String(url).includes('mock.liveness-provider.com')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          is_live: true,
          is_same_face: true,
          confidence: 88,
          status: 'verified',
        }),
      };
    }
    throw new Error(`Unexpected URL: ${url}`);
  });

  try {
    const result = await routeVerificationAttempt({
      selfieBase64: SAMPLE_SELFIE_BASE64,
      profilePhotoUrl: SAMPLE_PROFILE_PHOTO,
      livenessScore: 88,
      userId: 'user-003',
      sessionId: 'sess-003',
    });

    assert.strictEqual(result.providerUsed, 'fallback');
    assert.strictEqual(result.review.status, 'verified');
    assert.strictEqual(result.routeReason, 'primary_quota_or_transient_fallback');

    const state = getProviderState();
    assert.strictEqual(state.primary.failureCount, 1);
  } finally {
    restoreFetch();
  }
});

// ---------------------------------------------------------------------------
// Scenario 4: Primary provider has invalid credentials (HTTP 401)
// ---------------------------------------------------------------------------
test('Scenario 4: Primary provider has invalid credentials (401) -> Routes to fallback without infinite loops', async () => {
  resetProviderState();
  process.env.OPENROUTER_API_KEY = 'sk-or-invalid-key';
  process.env.LIVENESS_FALLBACK_API_KEY = 'lv_mock_fallback_key';
  process.env.LIVENESS_FALLBACK_BASE_URL = 'https://mock.liveness-provider.com/v1';

  let primaryCalls = 0;

  mockFetch(async (url) => {
    if (String(url).includes('openrouter.ai')) {
      primaryCalls++;
      return {
        ok: false,
        status: 401,
        json: async () => ({ error: { message: 'Invalid API key provided' } }),
      };
    }
    if (String(url).includes('mock.liveness-provider.com')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          is_live: true,
          is_same_face: true,
          confidence: 90,
          status: 'verified',
        }),
      };
    }
    throw new Error(`Unexpected URL: ${url}`);
  });

  try {
    const result = await routeVerificationAttempt({
      selfieBase64: SAMPLE_SELFIE_BASE64,
      profilePhotoUrl: SAMPLE_PROFILE_PHOTO,
      livenessScore: 85,
      userId: 'user-004',
      sessionId: 'sess-004',
    });

    assert.strictEqual(primaryCalls, 1, 'Must not retry primary endlessly on auth failure');
    assert.strictEqual(result.providerUsed, 'fallback');
    assert.strictEqual(result.review.status, 'verified');
  } finally {
    restoreFetch();
  }
});

// ---------------------------------------------------------------------------
// Scenario 5: Primary provider returns an incomplete verification result
// ---------------------------------------------------------------------------
test('Scenario 5: Primary provider returns incomplete result -> Safely normalizes to needs_review with withheld badge', async () => {
  resetProviderState();
  process.env.OPENROUTER_API_KEY = 'sk-or-test-mock-key';

  mockFetch(async (url) => {
    if (String(url).includes('openrouter.ai')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [
            {
              message: {
                content: '', // Empty unparseable response
              },
            },
          ],
        }),
      };
    }
    throw new Error('Unexpected fallback call');
  });

  try {
    const result = await routeVerificationAttempt({
      selfieBase64: SAMPLE_SELFIE_BASE64,
      profilePhotoUrl: SAMPLE_PROFILE_PHOTO,
      livenessScore: 85,
      userId: 'user-005',
      sessionId: 'sess-005',
    });

    assert.strictEqual(result.providerUsed, 'primary');
    assert.strictEqual(result.review.status, 'needs_review');
    assert.ok(result.review.flags.includes('incomplete_model_response'));
  } finally {
    restoreFetch();
  }
});

// ---------------------------------------------------------------------------
// Scenario 6: Liveness fallback succeeds
// ---------------------------------------------------------------------------
test('Scenario 6: Liveness fallback succeeds -> Validates liveness + face match and grants verified badge', async () => {
  resetProviderState();
  // Simulate primary already in cooldown
  setProviderStateForTesting({
    primary: { isAvailable: false, cooldownUntil: Date.now() + 600000, lastFailureReason: 'quota_exhausted' },
  });

  process.env.LIVENESS_FALLBACK_API_KEY = 'lv_8e783048c42503ae7396d3ac22e4f47dfafc3046a3a91c29f111bf1dc927e4d4';
  process.env.LIVENESS_FALLBACK_BASE_URL = 'https://mock.liveness-provider.com/v1';

  mockFetch(async (url, options) => {
    if (String(url).includes('mock.liveness-provider.com')) {
      assert.ok(options.headers.Authorization.startsWith('Bearer lv_8e783048'));
      assert.strictEqual(options.headers['X-Session-ID'], 'sess-006');
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          is_live: true,
          liveness_score: 99.4,
          is_same_face: true,
          confidence: 92.5,
          decision: 'APPROVED',
          status: 'verified',
        }),
      };
    }
    throw new Error('Primary must not be called while in cooldown');
  });

  try {
    const result = await routeVerificationAttempt({
      selfieBase64: SAMPLE_SELFIE_BASE64,
      profilePhotoUrl: SAMPLE_PROFILE_PHOTO,
      livenessScore: 92,
      userId: 'user-006',
      sessionId: 'sess-006',
    });

    assert.strictEqual(result.providerUsed, 'fallback');
    assert.strictEqual(result.review.status, 'verified');
    assert.ok(result.review.score >= 85);
  } finally {
    restoreFetch();
  }
});

// ---------------------------------------------------------------------------
// Scenario 7: Liveness fallback has exhausted its quota
// ---------------------------------------------------------------------------
test('Scenario 7: Liveness fallback has exhausted quota (402) -> Marks cooldown and transitions to free motion queue', async () => {
  resetProviderState();
  // Primary already in cooldown
  setProviderStateForTesting({
    primary: { isAvailable: false, cooldownUntil: Date.now() + 600000, lastFailureReason: 'quota_exhausted' },
  });

  process.env.LIVENESS_FALLBACK_API_KEY = 'lv_mock_key';
  process.env.LIVENESS_FALLBACK_BASE_URL = 'https://mock.liveness-provider.com/v1';

  mockFetch(async (url) => {
    if (String(url).includes('mock.liveness-provider.com')) {
      return {
        ok: false,
        status: 402,
        json: async () => ({ error: { code: 402, message: 'Fallback quota exceeded' } }),
      };
    }
    throw new Error('Unexpected URL');
  });

  try {
    const result = await routeVerificationAttempt({
      selfieBase64: SAMPLE_SELFIE_BASE64,
      profilePhotoUrl: SAMPLE_PROFILE_PHOTO,
      livenessScore: 85,
      userId: 'user-007',
      sessionId: 'sess-007',
    });

    assert.strictEqual(result.providerUsed, 'free_motion_queue');
    assert.strictEqual(result.review.status, 'needs_review');
    assert.strictEqual(result.routeReason, 'both_providers_quota_exhausted');

    const updatedState = getProviderState();
    assert.strictEqual(updatedState.fallback.isAvailable, false);
    assert.strictEqual(updatedState.fallback.lastFailureReason, 'quota_exhausted');
  } finally {
    restoreFetch();
  }
});

// ---------------------------------------------------------------------------
// Scenario 8: Both providers are unavailable
// ---------------------------------------------------------------------------
test('Scenario 8: Both providers unavailable -> Returns safe queue state and never awards verified badge', async () => {
  resetProviderState();
  // Set both in cooldown
  setProviderStateForTesting({
    primary: { isAvailable: false, cooldownUntil: Date.now() + 600000, lastFailureReason: 'quota_exhausted' },
    fallback: { isAvailable: false, cooldownUntil: Date.now() + 600000, lastFailureReason: 'quota_exhausted' },
  });

  mockFetch(async () => {
    throw new Error('No network should be attempted when both are in cooldown');
  });

  try {
    const result = await routeVerificationAttempt({
      selfieBase64: SAMPLE_SELFIE_BASE64,
      profilePhotoUrl: SAMPLE_PROFILE_PHOTO,
      livenessScore: 85,
      userId: 'user-008',
      sessionId: 'sess-008',
    });

    assert.strictEqual(result.providerUsed, 'free_motion_queue');
    assert.strictEqual(result.review.status, 'needs_review');
    assert.strictEqual(result.model, 'motion-liveness-pending');
    assert.ok(result.review.flags.includes('ai_credits_exhausted_or_offline'));
  } finally {
    restoreFetch();
  }
});

// ---------------------------------------------------------------------------
// Scenario 9: Free implementation succeeds in presence logging but withholds badge
// ---------------------------------------------------------------------------
test('Scenario 9: Existing free implementation records motion but strictly withholds verified badge', async () => {
  resetProviderState();
  // When providers are bypassed or unconfigured:
  delete process.env.OPENROUTER_API_KEY;
  delete process.env.LIVENESS_FALLBACK_API_KEY;

  const result = await routeVerificationAttempt({
    selfieBase64: SAMPLE_SELFIE_BASE64,
    profilePhotoUrl: SAMPLE_PROFILE_PHOTO,
    livenessScore: 92,
    userId: 'user-009',
    sessionId: 'sess-009',
  });

  assert.strictEqual(result.providerUsed, 'free_motion_queue');
  assert.strictEqual(result.review.status, 'needs_review');
  assert.notStrictEqual(result.review.status, 'verified', 'Free implementation must NEVER issue status: verified');
});

// ---------------------------------------------------------------------------
// Scenario 10: Free implementation detects face but cannot establish reliable match
// ---------------------------------------------------------------------------
test('Scenario 10: Fallback detects face but fails face match or liveness -> Fails safely with status: rejected', () => {
  // Case A: Liveness failed (photo of photo / screen spoof)
  const spoofResult = validateFallbackProviderResponse(
    { is_live: false, is_same_face: true, confidence: 95 },
    90
  );
  assert.strictEqual(spoofResult.status, 'rejected');
  assert.ok(spoofResult.flags.includes('liveness_failed'));

  // Case B: Liveness passed, but face match failed (different person)
  const mismatchResult = validateFallbackProviderResponse(
    { is_live: true, is_same_face: false, confidence: 20 },
    90
  );
  assert.strictEqual(mismatchResult.status, 'rejected');
  assert.ok(mismatchResult.flags.includes('face_mismatch'));

  // Case C: Incomplete response
  const incompleteResult = validateFallbackProviderResponse({}, 85);
  assert.strictEqual(incompleteResult.status, 'needs_review');
  assert.ok(incompleteResult.flags.includes('incomplete_fallback_response'));
});

// ---------------------------------------------------------------------------
// Scenario 11: The same verification request is submitted twice (concurrency guard)
// ---------------------------------------------------------------------------
test('Scenario 11: Duplicate concurrent submission is throttled -> Returns safe in-flight notification', async () => {
  resetProviderState();
  process.env.OPENROUTER_API_KEY = 'sk-or-test-mock-key';

  let resolvePrimary;
  const primaryPromise = new Promise((resolve) => {
    resolvePrimary = resolve;
  });

  mockFetch(async () => {
    await primaryPromise;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ match: true, confidence: 90, status: 'verified' }) } }],
      }),
    };
  });

  try {
    // Fire request 1 (will pause inside mock)
    const call1 = routeVerificationAttempt({
      selfieBase64: SAMPLE_SELFIE_BASE64,
      profilePhotoUrl: SAMPLE_PROFILE_PHOTO,
      livenessScore: 90,
      userId: 'user-concurrent-01',
      sessionId: 'sess-first',
    });

    // Fire request 2 concurrently for same user
    const call2 = routeVerificationAttempt({
      selfieBase64: SAMPLE_SELFIE_BASE64,
      profilePhotoUrl: SAMPLE_PROFILE_PHOTO,
      livenessScore: 90,
      userId: 'user-concurrent-01',
      sessionId: 'sess-second',
    });

    const result2 = await call2;
    assert.strictEqual(result2.routeReason, 'concurrent_in_flight', 'Second call must be caught by concurrency guard');
    assert.strictEqual(result2.review.status, 'needs_review');
    assert.ok(result2.review.flags.includes('duplicate_request_throttled'));

    // Release call 1
    resolvePrimary();
    const result1 = await call1;
    assert.strictEqual(result1.providerUsed, 'primary');
  } finally {
    restoreFetch();
  }
});

// ---------------------------------------------------------------------------
// Scenario 12: A response belongs to an expired session (>5 minutes)
// ---------------------------------------------------------------------------
test('Scenario 12: Expired verification session (>5 minutes) -> Immediately rejected', async () => {
  resetProviderState();
  const sixMinutesAgo = Date.now() - (6 * 60 * 1000);

  const result = await routeVerificationAttempt({
    selfieBase64: SAMPLE_SELFIE_BASE64,
    profilePhotoUrl: SAMPLE_PROFILE_PHOTO,
    livenessScore: 90,
    userId: 'user-expired',
    sessionId: 'sess-expired-123',
    sessionTimestamp: sixMinutesAgo,
  });

  assert.strictEqual(result.review.status, 'rejected');
  assert.strictEqual(result.routeReason, 'expired_session');
  assert.ok(result.review.flags.includes('expired_session'));
});

// ---------------------------------------------------------------------------
// Scenario 13: User cancels or backgrounds the verification flow
// ---------------------------------------------------------------------------
test('Scenario 13: User cancels/backgrounds verification flow -> Camera and speech cleanup contracts', () => {
  const modalPath = path.join(rootDir, 'src', 'components', 'FaceVerificationModal.jsx');
  const code = fs.readFileSync(modalPath, 'utf8');

  // Verify speech cancel
  assert.ok(code.includes('window.speechSynthesis.cancel()'), 'Must cancel speech synthesis on stopCamera');

  // Verify stream tracks stopped
  assert.ok(code.includes('streamRef.current.getTracks().forEach((track) => track.stop())'), 'Must stop all camera tracks');

  // Verify animation frame cancelled
  assert.ok(code.includes('cancelAnimationFrame(animationFrameRef.current)'), 'Must cancel animation frame');

  // Verify isSubmitting ref reset
  assert.ok(code.includes('isSubmittingRef.current = false'), 'Must reset submission lock on cleanup');
});

// ---------------------------------------------------------------------------
// Scenario 14: Primary provider becomes available again after quota recovery
// ---------------------------------------------------------------------------
test('Scenario 14: Primary provider automatically recovers after cooldown expires', async () => {
  resetProviderState();
  process.env.OPENROUTER_API_KEY = 'sk-or-test-mock-key';
  process.env.LIVENESS_PRIMARY_COOLDOWN_MS = '60'; // 60ms for fast test

  mockFetch(async (url) => {
    if (String(url).includes('openrouter.ai')) {
      return {
        ok: false,
        status: 402,
        json: async () => ({ error: { code: 402, message: 'Quota exceeded' } }),
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ is_live: true, is_same_face: true, confidence: 90, status: 'verified' }),
    };
  });

  try {
    // 1. Initial attempt fails with 402, sets 60ms cooldown
    await routeVerificationAttempt({
      selfieBase64: SAMPLE_SELFIE_BASE64,
      profilePhotoUrl: SAMPLE_PROFILE_PHOTO,
      userId: 'user-cooldown-recovery',
    });

    let state = getProviderState();
    assert.strictEqual(state.primary.isAvailable, false, 'Primary should be in cooldown');

    // 2. Wait 80ms for cooldown to expire
    await new Promise((r) => setTimeout(r, 80));

    state = getProviderState();
    assert.strictEqual(state.primary.isAvailable, true, 'Primary should automatically recover after cooldown');

    // 3. Update mock to simulate credit renewal
    mockFetch(async (url) => {
      if (String(url).includes('openrouter.ai')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            choices: [{ message: { content: JSON.stringify({ match: true, confidence: 95, status: 'verified' }) } }],
          }),
        };
      }
      throw new Error('Fallback should not be called when primary has recovered');
    });

    // 4. Next verification call immediately uses Primary provider as first choice
    const recoveredResult = await routeVerificationAttempt({
      selfieBase64: SAMPLE_SELFIE_BASE64,
      profilePhotoUrl: SAMPLE_PROFILE_PHOTO,
      userId: 'user-recovered-01',
    });

    assert.strictEqual(recoveredResult.providerUsed, 'primary');
    assert.strictEqual(recoveredResult.review.status, 'verified');
  } finally {
    delete process.env.LIVENESS_PRIMARY_COOLDOWN_MS;
    restoreFetch();
  }
});

// ---------------------------------------------------------------------------
// Scenario 15: Secret isolation & credential security
// ---------------------------------------------------------------------------
test('Scenario 15: Secret isolation -> LIVENESS_FALLBACK_API_KEY is not exposed to client or public assets', () => {
  const secretKey = 'lv_8e783048c42503ae7396d3ac22e4f47dfafc3046a3a91c29f111bf1dc927e4d4';
  const openRouterKey = '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';

  const checkNoSecret = (filePath) => {
    const text = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      !text.includes(secretKey),
      `File ${filePath} must not leak LIVENESS_FALLBACK_API_KEY secret value`
    );
    assert.ok(
      !text.includes(openRouterKey),
      `File ${filePath} must not leak OPENROUTER_API_KEY secret value`
    );
  };

  const scanDir = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (/\.(js|jsx|html|json|css)$/i.test(entry.name)) {
        checkNoSecret(fullPath);
      }
    }
  };

  // Scan src/ client code
  scanDir(path.join(rootDir, 'src'));

  // Scan public/ assets
  scanDir(path.join(rootDir, 'public'));

  // Confirm client environment config does not declare VITE_LIVENESS_FALLBACK_API_KEY
  const envContent = fs.readFileSync(path.join(rootDir, '.env'), 'utf8');
  assert.ok(
    !envContent.includes('VITE_LIVENESS_FALLBACK_API_KEY'),
    '.env must not prefix fallback key with VITE_ to prevent bundling into client'
  );
  assert.ok(
    envContent.includes('LIVENESS_FALLBACK_API_KEY='),
    '.env must define LIVENESS_FALLBACK_API_KEY server-side'
  );
});

// ---------------------------------------------------------------------------
// Scenario 16: LivFace (https://api.livface.com/v1) 3-step session workflow
// ---------------------------------------------------------------------------
test('Scenario 16: LivFace 3-step session workflow creates session, submits compact frames with x-api-key, and normalizes 0..1 float confidence', async () => {
  resetProviderState();
  process.env.OPENROUTER_API_KEY = 'sk-or-test-mock-key';
  process.env.LIVENESS_FALLBACK_API_KEY = 'lv_test_livface_key';
  delete process.env.LIVENESS_FALLBACK_BASE_URL; // Should default to https://api.livface.com/v1

  const livfaceCalls = [];

  mockFetch(async (url, options = {}) => {
    const u = String(url);
    if (u.includes('openrouter.ai')) {
      return {
        ok: false,
        status: 402,
        json: async () => ({ error: { code: 402, message: 'Quota exceeded' } }),
      };
    }

    if (u === 'https://api.livface.com/v1/sessions') {
      livfaceCalls.push({ step: 'create_session', headers: options.headers });
      return {
        ok: true,
        status: 201,
        json: async () => ({
          session_id: 'sess-livface-001',
          challenge_type: 'TURN_LEFT',
          status: 'pending',
        }),
      };
    }

    if (u === 'https://api.livface.com/v1/sessions/sess-livface-001/verify-public') {
      const parsedBody = JSON.parse(options.body || '{}');
      livfaceCalls.push({ step: 'verify_public', frameLength: (parsedBody.frame_b64 || '').length });
      return {
        ok: true,
        status: 200,
        json: async () => ({
          challenge_passed: true,
          face_detected: true,
          session_status: 'passed',
          confidence: 0.96,
        }),
      };
    }

    if (u === 'https://api.livface.com/v1/sessions/sess-livface-001') {
      livfaceCalls.push({ step: 'get_session', headers: options.headers });
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: 'sess-livface-001',
          status: 'passed',
          liveness_verified: true,
          confidence_score: 0.96,
          is_same_face: true,
        }),
      };
    }

    throw new Error(`Unexpected URL in Scenario 16: ${u}`);
  });

  try {
    const result = await routeVerificationAttempt({
      selfieBase64: SAMPLE_SELFIE_BASE64,
      compactFrameBase64: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/',
      profilePhotoUrl: SAMPLE_PROFILE_PHOTO,
      userId: 'user-livface-16',
    });

    assert.strictEqual(result.providerUsed, 'fallback');
    assert.strictEqual(result.provider, 'liveness-fallback');
    assert.strictEqual(result.review.status, 'verified');
    assert.strictEqual(result.review.score, 96);
    assert.ok(livfaceCalls.some((c) => c.step === 'create_session' && c.headers?.['x-api-key'] === 'lv_test_livface_key'));
    assert.ok(livfaceCalls.some((c) => c.step === 'verify_public' && c.frameLength > 0 && c.frameLength < 9500));
  } finally {
    restoreFetch();
  }
});

// ---------------------------------------------------------------------------
// Scenario 17: Read-only comparison (Campus Finder) & Exclusive Badge Authority
// ---------------------------------------------------------------------------
test('Scenario 17: Campus Finder uses readOnly: true and Edge Function enforces exclusive badge authority', () => {
  const campusFinderCode = fs.readFileSync(path.join(rootDir, 'src/services/campusFinderService.js'), 'utf8');
  const edgeIndexCode = fs.readFileSync(path.join(rootDir, 'supabase/functions/ai-profile-review/index.ts'), 'utf8');
  const modalCode = fs.readFileSync(path.join(rootDir, 'src/components/FaceVerificationModal.jsx'), 'utf8');

  assert.ok(
    campusFinderCode.includes('readOnly: true'),
    'campusFinderService.js must pass readOnly: true so Campus Finder never mutates the searcher profile'
  );

  assert.ok(
    edgeIndexCode.includes("const isReadOnly = Boolean(readOnly || body.action === 'compare_faces_readonly');"),
    'ai-profile-review/index.ts must handle readOnly comparisons without writing to public.profiles'
  );

  assert.ok(
    edgeIndexCode.includes('if (avatarChanged)'),
    'ai-profile-review/index.ts must reset is_verified and photo_verified when avatarChanged is true'
  );

  // Verify FaceVerificationModal captures frame BEFORE stopCamera() and setStep("analyzing")
  const captureFnStart = modalCode.indexOf('const captureAndVerify = async () =>');
  const drawImagePos = modalCode.indexOf('ctx.drawImage(video, 0, 0', captureFnStart);
  const stopCameraPos = modalCode.indexOf('stopCamera();', captureFnStart);
  const setStepAnalyzingPos = modalCode.indexOf("setStep('analyzing');", captureFnStart);

  assert.ok(
    drawImagePos > captureFnStart && drawImagePos < stopCameraPos && drawImagePos < setStepAnalyzingPos,
    'FaceVerificationModal must draw video frame onto canvas BEFORE stopCamera() and setStep("analyzing")'
  );
});

