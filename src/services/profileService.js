import { supabase } from '../lib/supabase';
import { compressImage } from '../utils/imageCompressor';
import { normalizeProfile, safeArray } from '../utils/profileData';
import { clearAppCache } from '../lib/persistentCache';
import { clearMediaCache } from '../lib/mediaCache';
import { preValidatePhoto } from './ai/localEngine';

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
        return { data: normalizeProfile(data), error: null };
    } catch (err) {
        console.error('getProfile error:', err.message);
        return { data: null, error: err.message };
    }
}

/**
 * Get public profile by username or user ID (for public Ask page)
 */
export async function getProfileByUsername(usernameOrId) {
    try {
        if (!usernameOrId) return { data: null, error: 'Username or ID is required' };
        const clean = String(usernameOrId).replace(/^@/, '').trim();

        // 1. First try public RPC (Security Definer - works for unauthenticated visitors without RLS rejection)
        try {
            const { data: rpcData, error: rpcError } = await supabase
                .rpc('get_public_ask_profile', { p_username_or_id: clean });
            if (!rpcError && rpcData) {
                return { data: normalizeProfile(rpcData), error: null };
            }
        } catch (rpcErr) {
            console.warn('[profileService] get_public_ask_profile fallback to query:', rpcErr);
        }

        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean);

        let query = supabase
            .from('profiles')
            .select('id, full_name, username, avatar_url, university, is_verified, bio, video_url');

        if (isUuid) {
            query = query.eq('id', clean);
        } else {
            query = query.ilike('username', clean);
        }

        const { data, error } = await withTimeout(query.maybeSingle());
        if (error) throw error;
        return { data: data ? normalizeProfile(data) : null, error: null };
    } catch (err) {
        console.error('getProfileByUsername error:', err.message);
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
        return { data: normalizeProfile(data), error: null };
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
        return { data: normalizeProfile(data), error: null };
    } catch (err) {
        console.error('updateProfile error:', err.message);
        return { data: null, error: err.message };
    }
}

/**
 * Upsert a profile (create or update).
 */
export async function upsertProfile(userId, profileData) {
    try {
        const safeData = {
            ...profileData,
            interests: safeArray(profileData.interests),
            profile_photos: safeArray(profileData.profile_photos),
            updated_at: new Date().toISOString()
        };

        // 1. If completing onboarding, prioritize the resilient SECURITY DEFINER RPC
        if (safeData.is_onboarded === true) {
            try {
                const { data: rpcData, error: rpcError } = await supabase.rpc('complete_user_onboarding', {
                    p_full_name: safeData.full_name || null,
                    p_age: safeData.age ? parseInt(safeData.age, 10) : null,
                    p_university: safeData.university || null,
                    p_level: safeData.level || null,
                    p_interests: safeData.interests || [],
                    p_attraction_goal: safeData.attraction_goal || null,
                    p_profile_photos: safeData.profile_photos || [],
                    p_avatar_url: safeData.avatar_url || (safeData.profile_photos && safeData.profile_photos[0]) || null
                });

                if (!rpcError && rpcData) {
                    return { data: normalizeProfile(rpcData), error: null };
                }
                if (rpcError) {
                    console.warn('[profileService] complete_user_onboarding RPC warning, falling back to direct upsert:', rpcError);
                }
            } catch (rpcEx) {
                console.warn('[profileService] RPC exception, falling back to direct upsert:', rpcEx);
            }
        }

        // 2. Fallback to standard client-side upsert logic. RLS supports 'Users can update own profile'
        const { data, error } = await withTimeout(
            supabase.from('profiles').upsert({ id: userId, ...safeData }).select().single(),
            15000
        );

        if (error) {
            console.error('upsertProfile error details:', error);
            throw error;
        }

        return { data: normalizeProfile(data), error: null };
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
        const compressedFile = await compressImage(file, { maxWidth: 800, targetSizeKB: 80 });
        const fileExt = compressedFile.type === 'image/webp' ? 'webp' : file.name.split('.').pop();
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
                .upload(filePath, compressedFile, {
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
 * Upload and server-validate a candidate profile photo.
 * Enforces:
 * - Exactly 1 human face
 * - Rejection of cartoons, anime, animals, cars, memes, logos, and non-human objects
 * - Clarity, resolution, and lighting checks
 * - Two-stage promotion: active avatar remains untouched unless approved.
 */
export async function validateAndUploadProfilePhoto(file, userId, index = 0) {
    try {
        // Fast client-side pre-validation (filters out empty, corrupt, extreme size, or pitch black/white images)
        const preCheck = await preValidatePhoto(file);
        if (!preCheck.ok) {
            return {
                url: null,
                approved: false,
                reason: preCheck.reason,
                error: preCheck.reason
            };
        }

        const compressedFile = await compressImage(file, { maxWidth: 800, targetSizeKB: 90 });
        const fileExt = compressedFile.type === 'image/webp' ? 'webp' : (file.name.split('.').pop() || 'jpg');
        const pendingPath = `${userId}/${Date.now()}_pending_${index}.${fileExt}`;

        // Stage 1: Upload to temporary pending-avatars bucket (existing active profile is untouched)
        const { error: uploadError } = await withTimeout(
            supabase.storage
                .from('pending-avatars')
                .upload(pendingPath, compressedFile, {
                    contentType: compressedFile.type || file.type || 'image/jpeg',
                    upsert: true
                }),
            60000
        );

        if (uploadError) throw uploadError;

        // Stage 2: Call server-authoritative Edge Function for Vision AI validation
        const { data: validationResult, error: funcError } = await supabase.functions.invoke('validate-profile-photo', {
            body: {
                pendingPath,
                slotIndex: index
            }
        });

        if (funcError) {
            console.error('validate-profile-photo invoke error:', funcError);
            throw new Error(funcError.message || 'Profile photo validation failed');
        }

        if (!validationResult?.approved) {
            return {
                url: null,
                approved: false,
                reason: validationResult?.reason || 'Photo did not pass validation.',
                error: validationResult?.reason || 'Photo did not pass validation.'
            };
        }

        // Cache busting on client side so new photo propagates immediately
        clearAppCache({ userId });
        clearMediaCache().catch(() => {});

        return {
            url: validationResult.avatarUrl,
            approved: true,
            reason: validationResult.reason,
            error: null
        };
    } catch (err) {
        console.error('validateAndUploadProfilePhoto error:', err.message);
        return { url: null, approved: false, reason: err.message, error: err.message };
    }
}

/**
 * Upload a profile photo for a specific slot with authoritative validation.
 */
export async function uploadProfilePhoto(file, userId, index = 0) {
    return validateAndUploadProfilePhoto(file, userId, index);
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

/**
 * Save the user's gender interest preference to the database.
 * @param {string} userId
 * @param {'Male'|'Female'|'All'} gender
 */
export async function saveGenderPreference(userId, gender) {
    try {
        const { error } = await supabase
            .from('profiles')
            .update({ interest_gender: gender })
            .eq('id', userId);
        if (error) throw error;
        return { error: null };
    } catch (err) {
        console.error('saveGenderPreference error:', err.message);
        return { error: err.message };
    }
}

/**
 * Increments the call duration for a user and handles daily reset.
 */
export async function incrementCallMinutes(userId, minutes) {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        // 1. Get current stats
        const { data: profile, error: getError } = await supabase
            .from('profiles')
            .select('call_minutes_today, last_call_reset_at, is_premium')
            .eq('id', userId)
            .single();

        if (getError) throw getError;

        let currentMinutes = profile.call_minutes_today || 0;
        const lastReset = profile.last_call_reset_at ? new Date(profile.last_call_reset_at).toISOString().split('T')[0] : null;

        // 2. Handle Daily Reset
        if (lastReset !== today) {
            currentMinutes = 0;
        }

        // 3. Update
        const { data, error } = await supabase
            .from('profiles')
            .update({ 
                call_minutes_today: currentMinutes + minutes,
                last_call_reset_at: new Date().toISOString()
            })
            .eq('id', userId)
        if (error) throw error;
        return { data, error: null };
    } catch (err) {
        console.error('Error incrementing call minutes:', err);
        return { data: null, error: err.message };
    }
}

/**
 * Upload a 10-second profile showcase video to the 'profile-videos' bucket.
 */
export async function uploadProfileVideo(file, userId) {
    try {
        if (!file || !userId) {
            return { url: null, error: 'File and User ID required' };
        }
        const fileExt = file.name ? file.name.split('.').pop() : 'mp4';
        const filePath = `${userId}/${Date.now()}_showcase.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from('profile-videos')
            .upload(filePath, file, {
                contentType: file.type || 'video/mp4',
                upsert: true
            });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
            .from('profile-videos')
            .getPublicUrl(filePath);

        return { url: data.publicUrl, error: null };
    } catch (err) {
        console.error('uploadProfileVideo error:', err);
        return { url: null, error: err.message };
    }
}


