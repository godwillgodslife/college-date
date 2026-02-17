import { supabase } from '../lib/supabase';

// Upload media for status
export async function uploadStatusMedia(file, userId) {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('status-media')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
            .from('status-media')
            .getPublicUrl(filePath);

        return { url: data.publicUrl, error: null };
    } catch (error) {
        console.error('Error uploading status media:', error);
        return { url: null, error: error.message };
    }
}

// ...
// Create a new status
export async function createStatus(userId, mediaUrl, caption) {
    console.log('createStatus args:', { userId, mediaUrl, caption });
    try {
        const { data, error } = await supabase
            .from('status_updates') // Updated table name
            .insert({
                user_id: userId,
                media_url: mediaUrl,
                caption: caption
                // expires_at is default 24h from db
            })
            .select()
            .single();

        if (error) {
            console.error('Supabase CREATE STATUS Error:', JSON.stringify(error, null, 2));
            throw error;
        }
        return { data, error: null };
    } catch (error) {
        console.error('Error creating status:', error);
        return { data: null, error: error };
    }
}

// Get recent statuses (active ones)
export async function getRecentStatuses() {
    try {
        const { data, error } = await supabase
            .from('status_updates') // Updated table name
            .select(`
                *,
                profiles:user_id (
                    id,
                    full_name,
                    avatar_url
                )
            `)
            .gt('expires_at', new Date().toISOString()) // Use expires_at
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error fetching statuses:', error);
        return { data: [], error: error.message };
    }
}
// ...

// Get counts of hidden content for connectivity FOMO
export async function getHiddenContentCounts(userId) {
    try {
        const { data, error } = await supabase.rpc('get_hidden_content_counts', { v_user_id: userId });
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error fetching hidden counts:', error);
        return { data: { hidden_statuses: 0, hidden_snapshots: 0 }, error: error.message };
    }
}

// Record a view for a status
export async function recordStatusView(statusId, viewerId) {
    try {
        // Prevent self-views from being recorded
        const { data: status } = await supabase
            .from('statuses')
            .select('user_id')
            .eq('id', statusId)
            .single();

        if (status && status.user_id === viewerId) return;

        const { error } = await supabase
            .from('status_views')
            .insert({ status_id: statusId, viewer_id: viewerId })
            .select()
            .single();

        // Ignore unique constraint violations (already viewed)
        // PostgREST returns 409 Conflict for unique violations, and error code 23505
        if (error && error.code !== '23505' && error.code !== '409') {
            console.error('Supabase RECORD VIEW Error:', JSON.stringify(error, null, 2));
            // Don't throw, just log, so we don't disrupt the user experience for a background analytics task
        }
    } catch (error) {
        // Double check against 409 string just in case
        if (error?.message?.includes('409') || error?.code === '409') return;
        console.error('Error recording status view:', error);
    }
}

// Get viewers for a specific status
export async function getStatusViewers(statusId) {
    try {
        const { data, error } = await supabase
            .from('status_views')
            .select(`
                viewed_at,
                viewer:viewer_id (
                    id,
                    full_name,
                    avatar_url
                )
            `)
            .eq('status_id', statusId)
            .order('viewed_at', { ascending: false });

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error fetching status viewers:', error);
        return { data: [], error: error.message };
    }
}
