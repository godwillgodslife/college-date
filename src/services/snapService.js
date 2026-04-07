import { supabase } from '../lib/supabase';
import { compressImage } from '../utils/imageCompressor';

/**
 * Get snaps received by the current user
 */
export async function getReceivedSnaps(userId) {
    const { data, error } = await supabase
        .from('direct_snaps')
        .select(`
            *,
            sender:sender_id (id, full_name, avatar_url)
        `)
        .eq('receiver_id', userId)
        .eq('status', 'sent') // Only fetched un-opened snaps
        .order('created_at', { ascending: false });

    return { data, error };
}

/**
 * Send a snap to a user
 */
export async function sendSnap(senderId, receiverId, file, mediaType = 'image') {
    try {
        // 1. Compress if image
        let uploadFile = file;
        let fileExt = file.name?.split('.')?.pop() || 'tmp';
        
        if (mediaType === 'image') {
            uploadFile = await compressImage(file, { maxWidth: 1000, targetSizeKB: 100 });
            fileExt = uploadFile.type === 'image/webp' ? 'webp' : fileExt;
        }

        // 2. Upload Media
        const fileName = `${senderId}/${Date.now()}.${fileExt}`;
        const filePath = `snaps/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('snap_media')
            .upload(filePath, uploadFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('snap_media')
            .getPublicUrl(filePath);

        // 2. Create Snap Record
        const { data, error } = await supabase
            .from('direct_snaps')
            .insert({
                sender_id: senderId,
                receiver_id: receiverId,
                media_url: publicUrl,
                media_type: mediaType,
                status: 'sent'
            })
            .select()
            .single();

        if (error) throw error;

        return { data, error: null };
    } catch (error) {
        console.error('Error sending snap:', error);
        return { data: null, error: error.message };
    }
}

/**
 * Mark snap as viewed (opened)
 */
export async function openSnap(snapId) {
    const { data, error } = await supabase
        .from('direct_snaps')
        .update({
            status: 'opened',
            viewed_at: new Date().toISOString()
        })
        .eq('id', snapId)
        .select()
        .single();

    return { data, error };
}
