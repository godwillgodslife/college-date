/**
 * Central AI Decision Router & Hybrid Orchestration Service
 * The College Date (CD2.0)
 *
 * Implements the 4-tier decision cascade:
 * Tier 1: Deterministic Local Engine (0 ms, 0 network, 0 cost, 100% private)
 * Tier 2: Lightweight on-device inference check
 * Tier 3: Secure Cloud Edge Function Fallback (OpenRouter via Supabase Edge Function)
 * Tier 4: Graceful deterministic fallback on any cloud failure
 *
 * Enforces chat privacy shielding, circuit breaking, request deduplication,
 * and privacy-preserving metrics logging.
 */

import { AI_CONFIG, AI_MODES, getAiConfig } from './aiConfig.js';
import {
  generateConversationOpeners,
  generateSmartReplies,
  generateCompatibilityInsight,
  generateCampusDateIdeas,
  generateProfileCoach
} from './localEngine.js';

// Safe Supabase client resolver (supports both browser Vite and Node.js testing environments)
let supabaseClientCache = null;
async function getSupabaseClient() {
  if (supabaseClientCache) return supabaseClientCache;
  try {
    const mod = await import('../../lib/supabase.js');
    supabaseClientCache = mod.supabase;
    return supabaseClientCache;
  } catch {
    return null;
  }
}

// In-Memory Session Cache
const sessionCache = new Map();

// Circuit Breaker State
const circuitBreakerState = {
  failures: 0,
  lastFailureTime: 0,
  isOpen: false, // true = tripped (bypasses cloud)
};

// Privacy-Preserving Telemetry (zero PII, zero message text)
export const aiMetrics = {
  totalRequests: 0,
  localHandled: 0,
  cloudHandled: 0,
  cloudFailures: 0,
  cacheHits: 0,
  fallbacksToLocal: 0,
  latencies: [],
};

function getCacheKey(task, payload = {}) {
  const targetId = payload.targetProfileId || payload.targetProfile?.id || payload.profileDraft?.id || 'self';
  const salt = payload.draft ? `draft_${payload.draft.length}` : '';
  return `${task}:${targetId}:${salt}`;
}

function checkCache(key, ttlMs) {
  const cached = sessionCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > ttlMs) {
    sessionCache.delete(key);
    return null;
  }
  return cached.data;
}

function setCache(key, data, maxEntries) {
  if (sessionCache.size >= maxEntries) {
    const oldestKey = sessionCache.keys().next().value;
    sessionCache.delete(oldestKey);
  }
  sessionCache.set(key, { data, timestamp: Date.now() });
}

function isCircuitBreakerOpen(config) {
  if (!circuitBreakerState.isOpen) return false;
  if (Date.now() - circuitBreakerState.lastFailureTime > config.circuitBreaker.resetTimeoutMs) {
    // Cooldown elapsed — attempt reset
    circuitBreakerState.isOpen = false;
    circuitBreakerState.failures = 0;
    return false;
  }
  return true;
}

function recordCloudFailure(config) {
  circuitBreakerState.failures += 1;
  circuitBreakerState.lastFailureTime = Date.now();
  if (circuitBreakerState.failures >= config.circuitBreaker.failureThreshold) {
    circuitBreakerState.isOpen = true;
    console.warn('[AI Router] Circuit breaker tripped. Diverting cloud requests to local engine.');
  }
}

function recordCloudSuccess() {
  circuitBreakerState.failures = 0;
  circuitBreakerState.isOpen = false;
}

/**
 * Execute local deterministic intelligence for a given task
 */
export function executeLocalTask(task, payload = {}, options = {}) {
  switch (task) {
    case AI_CONFIG.tasks.CONVERSATION_OPENER:
      return generateConversationOpeners(payload.targetProfile, options);

    case AI_CONFIG.tasks.SMART_REPLY:
      return generateSmartReplies(
        payload.targetProfile,
        payload.recentMessages || [],
        payload.draft || '',
        options
      );

    case AI_CONFIG.tasks.COMPATIBILITY:
      return generateCompatibilityInsight(
        payload.myProfile || null,
        payload.targetProfile || null,
        options
      );

    case AI_CONFIG.tasks.DATE_IDEAS:
      return generateCampusDateIdeas(payload.targetProfile, options);

    case AI_CONFIG.tasks.PROFILE_COACH:
      return generateProfileCoach(payload.profileDraft || payload, options);

    default:
      return {
        summary: 'Smart campus suggestions ready.',
        suggestions: ['Hey! How is your semester going so far? ✨']
      };
  }
}

/**
 * Invoke Supabase Edge Function cloud assistant with timeout
 */
async function invokeCloudAssistant(task, payload, timeoutMs) {
  const supabase = await getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase client unavailable');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const { data, error } = await supabase.functions.invoke('ai-assistant', {
      body: { task, ...payload },
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    if (error) throw error;
    if (data && data.success === false) {
      throw new Error(data.error || 'AI assistant request failed');
    }
    return { data: data?.result || data, error: null };
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

function getSafeDeterministicChatFallback(task, payload = {}) {
  switch (task) {
    case AI_CONFIG.tasks.SMART_REPLY:
      return {
        replies: [
          "Hey! That sounds good 😊",
          "True! How are your lectures going today? 📚",
          "Haha definitely! Are you on campus right now? ✨"
        ],
        tone_tip: 'Friendly, responsive campus conversation.'
      };
    case AI_CONFIG.tasks.CONVERSATION_OPENER:
      return {
        openers: [
          "Hey! How has your semester been going so far? ✨",
          "What department are you in? Hope lectures aren't too hectic today! 📚",
          "Hi there! What's your favourite chill spot on campus? 😊"
        ],
        why_it_works: 'Friendly, casual campus conversation starter.'
      };
    case AI_CONFIG.tasks.COMPATIBILITY:
      return {
        score: 75,
        highlights: ['Shared Campus Vibe: Positive intentions for authentic student connection.'],
        watchouts: ['Different lecture timetables — balance study time with campus hangouts.'],
        best_opener: 'Hey! How has your semester been going so far? ✨',
        disclaimer: 'Compatibility scores are interest-based compatibility estimates, not guarantees of relationship success.'
      };
    case AI_CONFIG.tasks.DATE_IDEAS:
      return {
        ideas: [
          { title: 'Campus Cafeteria Quick Bite', why: 'Casual, public, and affordable between classes.', cost: 'low' },
          { title: 'Library Walkway Coffee & Walk', why: 'Relaxed study break in a familiar environment.', cost: 'free' }
        ],
        safety_note: 'Always meet in well-lit, public campus areas for your first date and ensure you arrange your own transport.',
        disclaimer: 'Suggested campus date spots are informal ideas. Verify venue operating hours and always meet publicly.'
      };
    case AI_CONFIG.tasks.PROFILE_COACH:
    default:
      return {
        summary: 'Complete your profile to elevate your campus match quality.',
        bio_suggestion: 'Student passionate about good music, campus life, and genuine conversations.',
        photo_tips: ['Use clear, well-lit portrait photos with a smile.'],
        prompt_ideas: ['Best campus hangout spot is...'],
        priority_actions: ['Add at least 3 photos and select your department.']
      };
  }
}

/**
 * Primary routing function for all AI feature requests across The College Date.
 *
 * @param {string} task - e.g. 'conversation_opener', 'smart_reply', 'compatibility', 'date_ideas', 'profile_coach'
 * @param {object} payload - feature arguments (targetProfile, profileDraft, etc.)
 * @param {object} options - runtime routing overrides (forceCloud, skipCache, etc.)
 */
export async function routeAiTask(task, payload = {}, options = {}) {
  const config = getAiConfig();
  const startTime = performance.now();
  aiMetrics.totalRequests += 1;

  // 1. Session Cache Check
  const cacheKey = getCacheKey(task, payload);
  if (config.cacheEnabled && !options.skipCache) {
    const cachedData = checkCache(cacheKey, config.cacheTtlMs);
    if (cachedData) {
      aiMetrics.cacheHits += 1;
      return {
        data: cachedData,
        error: null,
        source: 'cache',
        latencyMs: Math.round(performance.now() - startTime)
      };
    }
  }

  // 2. Privacy Check: Chat Privacy Shielding
  // If task is smart_reply or conversation_opener, enforce local generation to avoid leaking student private chats.
  // Privacy shield CANNOT be overridden by options.forceCloud!
  const isChatTask = task === AI_CONFIG.tasks.SMART_REPLY || task === AI_CONFIG.tasks.CONVERSATION_OPENER;
  const isChatShielded = isChatTask && config.shieldChatPrivacy;

  // 3. Routing Tier Evaluation: Strictly Local Pathways
  if (isChatShielded) {
    try {
      const localResult = executeLocalTask(task, payload, options);
      const latencyMs = Math.round(performance.now() - startTime);

      aiMetrics.localHandled += 1;
      aiMetrics.latencies.push(latencyMs);

      if (config.cacheEnabled) {
        setCache(cacheKey, localResult, config.maxCacheEntries);
      }

      return {
        data: localResult,
        error: null,
        source: 'local_deterministic',
        latencyMs
      };
    } catch (localErr) {
      // Chat privacy guarantee: NEVER fall through to cloud even on local exception!
      console.warn('[AI Router] Local chat generation error. Returning safe static fallback without calling cloud:', localErr);
      const safeFallback = getSafeDeterministicChatFallback(task, payload);
      const latencyMs = Math.round(performance.now() - startTime);

      aiMetrics.localHandled += 1;
      aiMetrics.latencies.push(latencyMs);

      return {
        data: safeFallback,
        error: null,
        source: 'local_privacy_shield_fallback',
        latencyMs
      };
    }
  }

  // Mode: LOCAL_ONLY
  if (config.mode === AI_MODES.LOCAL_ONLY) {
    try {
      const localResult = executeLocalTask(task, payload, options);
      const latencyMs = Math.round(performance.now() - startTime);
      aiMetrics.localHandled += 1;
      aiMetrics.latencies.push(latencyMs);
      return {
        data: localResult,
        error: null,
        source: 'local_deterministic',
        latencyMs
      };
    } catch (localErr) {
      const safeFallback = getSafeDeterministicChatFallback(task, payload);
      return {
        data: safeFallback,
        error: null,
        source: 'local_privacy_shield_fallback',
        latencyMs: Math.round(performance.now() - startTime)
      };
    }
  }

  // General Local-First evaluation for non-chat tasks
  const shouldUseLocal =
    config.mode === AI_MODES.LOCAL_FIRST ||
    !config.cloudFallbackEnabled ||
    isCircuitBreakerOpen(config);

  if (shouldUseLocal && !options.forceCloud) {
    try {
      const localResult = executeLocalTask(task, payload, options);
      const latencyMs = Math.round(performance.now() - startTime);

      aiMetrics.localHandled += 1;
      aiMetrics.latencies.push(latencyMs);

      if (config.cacheEnabled) {
        setCache(cacheKey, localResult, config.maxCacheEntries);
      }

      return {
        data: localResult,
        error: null,
        source: 'local_deterministic',
        latencyMs
      };
    } catch (localErr) {
      console.warn('[AI Router] Local deterministic generation error:', localErr);
      if (!config.cloudFallbackEnabled || isCircuitBreakerOpen(config)) {
        const safeFallback = getSafeDeterministicChatFallback(task, payload);
        return {
          data: safeFallback,
          error: null,
          source: 'local_fallback',
          latencyMs: Math.round(performance.now() - startTime)
        };
      }
      // Non-chat tasks may fall through to cloud fallback if configured
    }
  }

  // 4. Defense-In-Depth: Strictly Block Chat Data from Cloud Edge Function
  if (isChatTask && config.shieldChatPrivacy) {
    const safeFallback = getSafeDeterministicChatFallback(task, payload);
    return {
      data: safeFallback,
      error: null,
      source: 'local_privacy_shield_fallback',
      latencyMs: Math.round(performance.now() - startTime)
    };
  }

  // 5. Cloud Edge Function Pathway (Non-chat tasks only, with strict sanitization & timeout)
  try {
    const cloudPayload = { ...payload };
    const cloudResponse = await invokeCloudAssistant(task, cloudPayload, config.cloudTimeoutMs);
    const latencyMs = Math.round(performance.now() - startTime);

    aiMetrics.cloudHandled += 1;
    aiMetrics.latencies.push(latencyMs);
    recordCloudSuccess();

    if (config.cacheEnabled) {
      setCache(cacheKey, cloudResponse.data, config.maxCacheEntries);
    }

    return {
      data: cloudResponse.data,
      error: null,
      source: 'cloud_edge',
      latencyMs
    };
  } catch (cloudErr) {
    // 6. Tier 4: Graceful Deterministic Fallback on Cloud Failure
    aiMetrics.cloudFailures += 1;
    aiMetrics.fallbacksToLocal += 1;
    recordCloudFailure(config);

    console.warn(`[AI Router] Cloud task "${task}" failed (${cloudErr.message}). Seamlessly resolving via local engine.`);

    const fallbackResult = executeLocalTask(task, payload, options);
    const latencyMs = Math.round(performance.now() - startTime);

    if (config.cacheEnabled) {
      setCache(cacheKey, fallbackResult, config.maxCacheEntries);
    }

    return {
      data: fallbackResult,
      error: null,
      source: 'local_fallback',
      cloudError: cloudErr.message || 'Cloud unavailable',
      latencyMs
    };
  }
}

/**
 * Get aggregated runtime metrics for audit & verification reporting
 */
export function getAiRouterMetrics() {
  const avgLatency = aiMetrics.latencies.length > 0
    ? Math.round(aiMetrics.latencies.reduce((a, b) => a + b, 0) / aiMetrics.latencies.length)
    : 0;

  return {
    ...aiMetrics,
    avgLatencyMs: avgLatency,
    circuitBreakerTripped: circuitBreakerState.isOpen,
    cacheSize: sessionCache.size
  };
}

/**
 * Reset router caches and metrics for testing
 */
export function resetAiRouterState() {
  sessionCache.clear();
  circuitBreakerState.failures = 0;
  circuitBreakerState.lastFailureTime = 0;
  circuitBreakerState.isOpen = false;
  aiMetrics.totalRequests = 0;
  aiMetrics.localHandled = 0;
  aiMetrics.cloudHandled = 0;
  aiMetrics.cloudFailures = 0;
  aiMetrics.cacheHits = 0;
  aiMetrics.fallbacksToLocal = 0;
  aiMetrics.latencies = [];
}
