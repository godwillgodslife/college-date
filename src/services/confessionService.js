import { supabase } from '../lib/supabase';

export async function getConfessions(university = null) {
    try {
        let query = supabase
            .from('confessions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50); // Get last 50

        if (university) {
            query = query.eq('university', university);
        }

        const { data, error } = await query;
        if (error) throw error;

        return { data, error: null };
    } catch (error) {
        console.error('Error fetching confessions:', error);
        return { data: [], error: error.message };
    }
}

export async function postConfession(content, university, userId) {
    try {
        const { data, error } = await supabase
            .from('confessions')
            .insert({
                content,
                university,
                user_id: userId // RLS ensures this matches auth.uid()
            })
            .select()
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error posting confession:', error);
        return { data: null, error: error.message };
    }
}

// TODO: Implement Like functionality if needed (requires a separate favorites table to prevent spam likes)
