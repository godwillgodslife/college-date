import { supabase } from '../lib/supabase';
import { createNotification } from './notificationService';

// Upload media for snapshot
export async function uploadSnapshotMedia(file, userId) {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}_snapshot.${fileExt}`;
        const filePath = `${fileName}`;

        // Using 'snapshot-media' bucket as per migration script
        const { error: uploadError } = await supabase.storage
            .from('snapshot-media')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
            .from('snapshot-media')
            .getPublicUrl(filePath);

        return { url: data.publicUrl, error: null };
    } catch (error) {
        console.error('Error uploading snapshot media:', error);
        return { url: null, error: error.message };
    }
}

// Create a new snapshot
export async function createSnapshot(userId, mediaUrl, description) {
    try {
        const { data, error } = await supabase
            .from('snapshots')
            .insert({
                user_id: userId,
                media_url: mediaUrl,
                description: description
            })
            .select()
            .single();

        if (error) {
            console.error('Supabase SNAPSHOT INSERT Error:', JSON.stringify(error, null, 2));
            throw error;
        }
        return { data, error: null };
    } catch (error) {
        console.error('Error creating snapshot:', error);
        return { data: null, error: error };
    }
}

// Get snapshots (last 24 hours)
export async function getSnapshots() {
    try {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const { data, error } = await supabase
            .from('snapshots')
            .select(`
                *,
                profiles:user_id (
                    id,
                    full_name,
                    avatar_url
                )
            `)
            .gt('created_at', twentyFourHoursAgo)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error fetching snapshots:', error);
        return { data: [], error: error.message };
    }
}

// Like a snapshot (Atomic increment via RPC)
export async function likeSnapshot(snapshotId, likerId) {
    try {
        // 1. Get snapshot details to find the owner
        const { data: snapshot } = await supabase
            .from('snapshots')
            .select('user_id, description')
            .eq('id', snapshotId)
            .single();

        // 2. Increment like count
        const { error } = await supabase.rpc('increment_snapshot_likes', { row_id: snapshotId });
        if (error) throw error;

        // 3. Trigger Notification for owner (if it's not their own snapshot)
        if (snapshot && snapshot.user_id !== likerId) {
            await createNotification({
                userId: snapshot.user_id,
                actorId: likerId,
                type: 'like',
                title: 'Snapshot Liked!',
                content: `Someone liked your snapshot: "${snapshot.description || 'View it now'}"`,
                metadata: { snapshot_id: snapshotId }
            });
        }

        return { error: null };
    } catch (error) {
        console.error('Error liking snapshot:', error);
        return { error: error.message };
    }
}

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
