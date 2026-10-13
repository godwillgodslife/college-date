import { supabase } from '../lib/supabase';
import { getAvatarUrl } from '../utils/profileData';

let activeWatchId = null;
let lastSentCoords = null;
let lastSentTime = 0;

/**
 * Send coordinate update to backend.
 */
export async function updateLiveLocation(matchId, latitude, longitude, accuracy = null, durationMinutes = 30) {
    try {
        const { data, error } = await supabase.rpc('update_live_location', {
            p_match_id: matchId,
            p_latitude: latitude,
            p_longitude: longitude,
            p_accuracy: accuracy,
            p_duration_minutes: durationMinutes
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Failed to update live location');

        return { success: true, sessionId: data.session_id, expiresAt: data.expires_at, error: null };
    } catch (err) {
        console.error('updateLiveLocation error:', err);
        return { success: false, error: err.message || 'Error updating location' };
    }
}

/**
 * Stop live location sharing session.
 */
export async function stopLiveLocation(matchId) {
    try {
        if (activeWatchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
            navigator.geolocation.clearWatch(activeWatchId);
            activeWatchId = null;
        }
        lastSentCoords = null;
        lastSentTime = 0;

        const { data, error } = await supabase.rpc('stop_live_location', {
            p_match_id: matchId
        });

        if (error) throw error;
        return { success: data?.success ?? true, error: null };
    } catch (err) {
        console.error('stopLiveLocation error:', err);
        return { success: false, error: err.message || 'Error stopping live location' };
    }
}

/**
 * Fetch current active live location for a match.
 */
export async function getActiveLiveLocation(matchId) {
    try {
        const { data, error } = await supabase
            .from('live_location_shares')
            .select(`
                id,
                sender_id,
                recipient_id,
                latitude,
                longitude,
                accuracy,
                expires_at,
                is_active,
                updated_at,
                sender:profiles!sender_id(id, full_name, avatar_url, profile_photos, photo_updated_at, updated_at)
            `)
            .eq('match_id', matchId)
            .eq('is_active', true)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw error;
        if (data?.sender) {
            data.sender.avatar_url = getAvatarUrl(data.sender) || data.sender.avatar_url;
        }
        return { data: data || null, error: null };
    } catch (err) {
        console.error('getActiveLiveLocation error:', err);
        return { data: null, error: err.message };
    }
}

/**
 * Start watching GPS coordinates with battery-saving throttling.
 * Throttles to at most once per 12 seconds or if moved > 15 meters.
 */
export function startWatchingPosition(matchId, durationMinutes, onUpdate, onError) {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
        if (onError) onError(new Error('Geolocation is not supported by your device'));
        return null;
    }

    if (activeWatchId !== null) {
        navigator.geolocation.clearWatch(activeWatchId);
        activeWatchId = null;
    }

    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371e3; // Earth radius in meters
        const φ1 = (lat1 * Math.PI) / 180;
        const φ2 = (lat2 * Math.PI) / 180;
        const Δφ = ((lat2 - lat1) * Math.PI) / 180;
        const Δλ = ((lon2 - lon1) * Math.PI) / 180;
        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    activeWatchId = navigator.geolocation.watchPosition(
        async (position) => {
            const { latitude, longitude, accuracy } = position.coords;
            const now = Date.now();

            let shouldSend = false;
            if (!lastSentCoords) {
                shouldSend = true;
            } else {
                const elapsedMs = now - lastSentTime;
                const distanceMeters = calculateDistance(
                    lastSentCoords.latitude,
                    lastSentCoords.longitude,
                    latitude,
                    longitude
                );

                // Throttle: send at most every 12s, or when moved >= 15 meters
                if (elapsedMs >= 12000 || distanceMeters >= 15) {
                    shouldSend = true;
                }
            }

            if (shouldSend) {
                lastSentCoords = { latitude, longitude };
                lastSentTime = now;
                const res = await updateLiveLocation(matchId, latitude, longitude, accuracy, durationMinutes);
                if (onUpdate) onUpdate({ latitude, longitude, accuracy, res });
            }
        },
        (err) => {
            console.warn('Geolocation watch error:', err);
            if (onError) onError(err);
        },
        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 10000
        }
    );

    return activeWatchId;
}
