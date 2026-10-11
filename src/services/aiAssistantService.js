import { routeAiTask, getAiRouterMetrics } from './ai/aiRouter.js';

/**
 * Universal client entry point for user-facing AI features.
 * Routes dynamically through the local-first AI decision router.
 * Preserves full backwards-compatibility with existing callers.
 *
 * @param {string} task - e.g. 'conversation_opener', 'smart_reply', 'compatibility', 'date_ideas', 'profile_coach'
 * @param {object} payload - feature arguments
 * @param {object} options - runtime options (e.g. forceCloud, skipCache)
 */
export async function requestAiAssistant(task, payload = {}, options = {}) {
  try {
    const result = await routeAiTask(task, payload, options);
    if (result.error && !result.data) {
      throw new Error(result.error);
    }
    return {
      data: result.data,
      error: null,
      source: result.source,
      latencyMs: result.latencyMs
    };
  } catch (error) {
    console.warn('[AI Assistant] Request failed:', error.message || error);
    return { data: null, error: error.message || 'AI assistant unavailable' };
  }
}

export { getAiRouterMetrics };
