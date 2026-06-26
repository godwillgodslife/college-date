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
