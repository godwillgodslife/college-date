import { supabase } from '../lib/supabase';

export async function requestProfileAiReview(reason = 'profile_update') {
  try {
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

export async function verifyLiveSelfie({ selfieBase64, profilePhotoUrl, livenessScore }) {
  try {
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
