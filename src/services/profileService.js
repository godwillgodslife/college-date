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
 * Upsert a profile using Server-Side RPC (Robust).
 * Bypasses client-side RLS locks by running as security definer.
 */
export async function upsertProfile(userId, profileData) {
    try {
        console.log('Calling RPC update_profile_data for:', userId);

        const { data, error } = await withTimeout(
            supabase.rpc('update_profile_data', {
                p_full_name: profileData.full_name,
                p_age: profileData.age,
                p_gender: profileData.gender,
                p_university: profileData.university,
                p_bio: profileData.bio,
                p_avatar_url: profileData.avatar_url,
                p_email: profileData.email
            })
            , 30000); // 30s timeout

        if (error) {
            console.error('RPC failed:', error);
            // Fallback to old method just in case user didn't run SQL
            if (error.code === '42883') { // Function not found
                console.warn('RPC function not found, falling back to client-side upsert...');
                return clientSideUpsertFallback(userId, profileData);
            }
            throw error;
        }

        // Check the logical result from the RPC function
        if (data && data.success === false) {
            throw new Error(data.error || 'RPC reported failure');
        }

        return { data, error: null };
    } catch (err) {
        console.error('upsertProfile RPC error:', err.message);

        // Fallback to client-side for ANY error (Database constraint, Timeout, Function missing, etc.)
        console.warn('RPC failed or timed out, attempting client-side fallback...');
        console.log('Fallback data check (email):', profileData?.email ? 'Present' : 'MISSING');

        return clientSideUpsertFallback(userId, profileData);
    }
}

async function clientSideUpsertFallback(userId, profileData) {
    // ... (The previous Update/Insert logic as fallback)
    try {
        const safeData = { ...profileData, updated_at: new Date().toISOString() };
        // Attempt update first
        const { data: updateData, error: updateError } = await withTimeout(
            supabase.from('profiles').update(safeData).eq('id', userId).select().single()
            , 30000);

        if (!updateError && updateData) {
            console.log('Fallback: Update successful');
            return { data: updateData, error: null };
        }

        // If update failed or no row found, attempt insert
        console.warn('Fallback: Update failed, trying INSERT...', updateError?.message);
        const { data: insertData, error: insertError } = await withTimeout(
            supabase.from('profiles').insert({ id: userId, ...safeData }).select().single()
            , 30000);

        if (insertError) throw insertError;

        console.log('Fallback: Insert successful');
        return { data: insertData, error: null };
    } catch (e) {
        console.error('clientSideUpsertFallback error:', e.message);
        return { data: null, error: e.message };
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
