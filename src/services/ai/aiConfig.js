/**
 * AI Infrastructure & Local-First Architecture Configuration
 * The College Date (CD2.0)
 *
 * Configures the hybrid routing tiers, privacy shields, circuit breaker parameters,
 * and deterministic intelligence presets for low-end Android & mobile web.
 */

export const AI_MODES = {
  LOCAL_FIRST: 'local_first',       // Default: fast local deterministic intelligence with cloud fallback
  LOCAL_ONLY: 'local_only',         // 100% offline & local; zero cloud calls (offline mode / low bandwidth)
  CLOUD_FALLBACK: 'cloud_fallback', // Attempts cloud first, falls back to local immediately on failure
};

export const AI_CONFIG = {
  // Operational Mode
  mode: AI_MODES.LOCAL_FIRST,

  // Feature Flags
  localEngineEnabled: true,
  cloudFallbackEnabled: true,
  
  // Privacy Shield: Strictly blocks uploading raw private chat messages to 3rd party AI models
  shieldChatPrivacy: true,

  // Anonymization: Strips PII (emails, phone numbers, exact addresses) from cloud payloads
  anonymizeCloudPayloads: true,

  // Network & Performance Timeouts
  cloudTimeoutMs: 6000,             // 6s timeout for fast UI fallback on slow 3G/4G
  localTimeoutMs: 500,              // Local deterministic response limit

  // Cache Configuration (In-Memory LRU/Map)
  cacheEnabled: true,
  cacheTtlMs: 10 * 60 * 1000,       // 10 minutes session cache for profile insights & openers
  maxCacheEntries: 80,

  // Circuit Breaker (Trips to local-only if cloud fails repeatedly)
  circuitBreaker: {
    failureThreshold: 3,            // 3 consecutive failures trips circuit
    resetTimeoutMs: 5 * 60 * 1000,  // 5 minutes cooldown before re-attempting cloud
  },

  // Supported AI Tasks
  tasks: {
    PROFILE_COACH: 'profile_coach',
    CONVERSATION_OPENER: 'conversation_opener',
    SMART_REPLY: 'smart_reply',
    COMPATIBILITY: 'compatibility',
    DATE_IDEAS: 'date_ideas',
  },
};

/**
 * Returns current dynamic AI configuration with runtime overrides.
 */
export function getAiConfig() {
  return { ...AI_CONFIG };
}
