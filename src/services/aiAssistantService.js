import { supabase } from '../lib/supabase';

export async function requestAiAssistant(task, payload = {}) {
  try {
    const { data, error } = await supabase.functions.invoke('ai-assistant', {
      body: { task, ...payload }
    });

    if (error) throw error;
    if (data && data.success === false) {
      throw new Error(data.error || 'AI assistant request failed');
    }
    return { data: data?.result || data, error: null };
  } catch (error) {
    console.warn('[AI Assistant] Request failed:', error.message || error);
    return { data: null, error: error.message || 'AI assistant unavailable' };
  }
}
