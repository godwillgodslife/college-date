import { supabase } from '../lib/supabase';

// Helper for timeout
const withTimeout = (promise, ms = 10000) => {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), ms))
    ]);
};

/**
 * Get a user's profile by ID.
 */
export async function getProfile(userId) {
    try {
        const { data, error } = await withTimeout(
            supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single()
        );

        if (error) throw error;
        return { data, error: null };
    } catch (err) {
        console.error('getProfile error:', err.message);
        return { data: null, error: err.message };
    }
}

/**
 * Create a new profile.
 */
export async function createProfile(userId, profileData) {
    try {
        const { data, error } = await withTimeout(
            supabase
                .from('profiles')
                .insert({ id: userId, ...profileData })
                .select()
                .single()
        );

        if (error) throw error;
        return { data, error: null };
    } catch (err) {
        console.error('createProfile error:', err.message);
        return { data: null, error: err.message };
    }
}

/**
 * Update an existing profile.
 */
export async function updateProfile(userId, updates) {
    try {
        const { data, error } = await withTimeout(
            supabase
                .from('profiles')
                .update(updates)
                .eq('id', userId)
                .select()
                .single()
        );

        if (error) throw error;
        return { data, error: null };
    } catch (err) {
        console.error('updateProfile error:', err.message);
        return { data: null, error: err.message };
    }
}

/**
 * Upsert a profile (create or update).
 */
/**
 * Upsert a profile (create or update).
 */
export async function upsertProfile(userId, profileData) {
    try {
        const safeData = { ...profileData, updated_at: new Date().toISOString() };

        // Use standard client-side upsert logic. RLS supports 'Users can update own profile'
        const { data, error } = await withTimeout(
            supabase.from('profiles').upsert({ id: userId, ...safeData }).select().single(),
            15000
        );

        if (error) {
            console.error('upsertProfile error details:', error);
            throw error;
        }

        return { data, error: null };
    } catch (err) {
        console.error('upsertProfile error:', err.message);
        return { data: null, error: err.message };
    }
}

/**
 * Upload an avatar image.
 */
export async function uploadAvatar(file, userId) {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}_avatar.${fileExt}`;
        const filePath = `${fileName}`;

        // 0. Check if bucket exists (connectivity check)
        const { error: bucketError } = await withTimeout(
            supabase.storage.getBucket('avatars'),
            5000
        );
        if (bucketError) {
            console.warn('Bucket check failed (might be RLS or connection):', bucketError.message);
        }

        // 1. Upload to 'avatars' bucket
        console.log(`Uploading to avatars: ${filePath}`);

        const { data, error: uploadError } = await withTimeout(
            supabase.storage
                .from('avatars')
                .upload(filePath, file, {
                    code: 'upsert',
                    upsert: true
                })
            , 60000); // Increased to 60s for slow connections

        if (uploadError) {
            console.error('Supabase Storage Upload Error:', uploadError);
            throw uploadError;
        }

        console.log('Upload success:', data);

        // 2. Get Public URL
        const { data: publicUrlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

        return { url: publicUrlData.publicUrl, error: null };
    } catch (err) {
        console.error('uploadAvatar error:', err.message);
        return { url: null, error: err.message };
    }
}

/**
 * Upload a voice intro.
 */
export async function uploadVoiceIntro(blob, userId) {
    try {
        const fileName = `${userId}/${Date.now()}_intro.webm`;
        const filePath = `${fileName}`;

        // 0. Check Bucket
        const { error: bucketError } = await withTimeout(
            supabase.storage.getBucket('voice-intros'),
            5000
        );
        if (bucketError) console.warn('Bucket check warning:', bucketError.message);

        // 1. Upload
        const { data, error: uploadError } = await withTimeout(
            supabase.storage
                .from('voice-intros')
                .upload(filePath, blob, {
                    contentType: 'audio/webm',
                    upsert: true
                })
            , 60000);

        if (uploadError) throw uploadError;

        // 2. Get URL
        const { data: publicUrlData } = supabase.storage
            .from('voice-intros')
            .getPublicUrl(filePath);

        return { url: publicUrlData.publicUrl, error: null };
    } catch (err) {
        console.error('uploadVoiceIntro error:', err.message);
        return { url: null, error: err.message };
    }
}
/**
 * Upload a profile photo for a specific slot.
 */
export async function uploadProfilePhoto(file, userId, index) {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}_photo_${index}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await withTimeout(
            supabase.storage
                .from('profile-photos')
                .upload(filePath, file, { upsert: true })
            , 60000);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
            .from('profile-photos')
            .getPublicUrl(filePath);

        return { url: publicUrlData.publicUrl, error: null };
    } catch (err) {
        console.error('uploadProfilePhoto error:', err.message);
        return { url: null, error: err.message };
    }
}

/**
 * Heartbeat function to update presence and stay "Live"
 */
export async function updatePresence(userId) {
    try {
        const { error } = await supabase.rpc('update_user_presence');
        if (error) throw error;
        return { error: null };
    } catch (err) {
        console.error('updatePresence error:', err.message);
        return { error: err.message };
    }
}
