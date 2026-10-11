// Safe dynamic Supabase client loader
let supabaseClientCache = null;
async function getSupabase() {
  if (supabaseClientCache) return supabaseClientCache;
  try {
    const mod = await import('../lib/supabase.js');
    supabaseClientCache = mod.supabase;
    return supabaseClientCache;
  } catch {
    return null;
  }
}

let lastReviewRequestTimestamp = 0;
const REVIEW_DEBOUNCE_MS = 60 * 1000; // 1-minute debounce for background profile reviews

/**
 * Requests an AI Trust & Safety review of a student profile.
 * Incorporates client-side debouncing to prevent redundant cloud Vision AI calls
 * during rapid bio edits or profile tweaks.
 *
 * @param {string} reason - 'profile_update' | 'onboarding_complete'
 * @param {object} options - { force: boolean }
 */
export async function requestProfileAiReview(reason = 'profile_update', options = {}) {
  const now = Date.now();
  if (!options.force && (now - lastReviewRequestTimestamp < REVIEW_DEBOUNCE_MS)) {
    // Debounced — avoids hammering cloud Vision AI on quick consecutive saves
    return { data: { debounced: true, message: 'Review request throttled' }, error: null };
  }

  try {
    lastReviewRequestTimestamp = now;
    const supabase = await getSupabase();
    if (!supabase) {
      return { data: { debounced: true, message: 'Supabase client unavailable' }, error: null };
    }

    const { data, error } = await supabase.functions.invoke('ai-profile-review', {
      body: { reason }
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.warn('[AI Trust] Review request skipped:', error.message || error);
    return { data: null, error: error.message || 'AI review unavailable' };
  }
}

/**
 * 1-to-1 Biometric Selfie Face Match
 * Compares live interactive selfie capture against profile photos.
 * Server-authoritative: routes strictly via Supabase Edge Function with OpenRouter vision
 * and automated interactive motion fallback.
 */
export async function verifyLiveSelfie({ selfieBase64, profilePhotoUrl, livenessScore }) {
  try {
    const supabase = await getSupabase();
    if (!supabase) {
      throw new Error('Supabase client unavailable');
    }

    const { data, error } = await supabase.functions.invoke('ai-profile-review', {
      body: {
        action: 'verify_selfie',
        selfieBase64,
        profilePhotoUrl,
        livenessScore
      }
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.warn('[AI Trust] Selfie verification failed:', error.message || error);
    return { data: null, error: error.message || 'Selfie verification unavailable' };
  }
}
