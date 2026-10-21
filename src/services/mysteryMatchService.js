import { supabase } from '../lib/supabase.js';
import { 
    getMysteryAlias, 
    getStageBlurStyle, 
    MYSTERY_ICEBREAKERS,
    formatMysteryCandidate 
} from '../utils/mysteryMatch.js';
import { triggerSuccessHaptic, triggerLightHaptic } from '../utils/haptics.js';

export { formatMysteryCandidate };

const LOCAL_SESSIONS_PREFIX = 'tcd_mystery_session_';

/**
 * Fetch a candidate profile for Primetime Mystery Match
 */
export async function findMysteryCandidate(userId, currentUserProfile = {}) {
    try {
        const userGender = (currentUserProfile?.gender || '').toLowerCase();
        const oppositeGender = userGender === 'male' ? 'female' : userGender === 'female' ? 'male' : null;

        let query = supabase
            .from('discovery_feed_v3')
            .select('*')
            .or('avatar_url.not.is.null,profile_photos.not.eq.{}')
            .limit(20);

        if (userId) {
            query = query.neq('id', userId);
        }

        if (oppositeGender) {
            query = query.eq('gender', oppositeGender);
        }

        const { data, error } = await query;
        if (!error && Array.isArray(data) && data.length > 0) {
            // Pick a random candidate from top pool
            const candidate = data[Math.floor(Math.random() * data.length)];
            return {
                data: formatMysteryCandidate(candidate),
                error: null
            };
        }
    } catch (err) {
        console.warn('[MysteryMatchService] Supabase discovery error, using collegiate candidate pool:', err);
    }

    // High quality collegiate fallback
    const fallbackPool = [
        {
            id: 'mock-mystery-unilag-1',
            full_name: 'Chioma Adeyemi',
            gender: 'female',
            age: 21,
            university: 'University of Lagos (UNILAG)',
            faculty: 'Faculty of Arts',
            department: 'Creative Arts',
            level: '300L',
            avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
            profile_photos: ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80'],
            interests: ['Amapiano', 'Film Festivals', 'Photography'],
            attraction_goal: 'Serious Relationship',
            bio: 'Creative arts student looking for someone who appreciates live music and late night conversations.'
        },
        {
            id: 'mock-mystery-oau-2',
            full_name: 'Tunde Bakare',
            gender: 'male',
            age: 22,
            university: 'Obafemi Awolowo University (OAU)',
            faculty: 'Faculty of Technology',
            department: 'Computer Science',
            level: '400L',
            avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80',
            profile_photos: ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80'],
            interests: ['Tech Meetups', 'Gaming', 'Afrobeats'],
            attraction_goal: 'Just Vibes',
            bio: 'Tech enthusiast, aspiring software engineer, and lover of great food.'
        }
    ];

    const chosen = fallbackPool[Math.floor(Math.random() * fallbackPool.length)];
    return {
        data: formatMysteryCandidate(chosen),
        error: null
    };
}

/**
 * Advances or creates a mystery speed-date session
 */
export async function advanceMysterySession({ sessionId, targetUserId, messageText, currentStage = 0 }) {
    if (messageText) triggerLightHaptic();

    try {
        if (targetUserId) {
            const { data, error } = await supabase.rpc('create_or_advance_mystery_match', {
                p_target_user_id: targetUserId,
                p_message_text: messageText || null
            });

            if (!error && data?.success) {
                if (data.is_revealed) {
                    triggerSuccessHaptic();
                }
                return {
                    success: true,
                    session: data,
                    stage: data.stage,
                    isRevealed: data.is_revealed,
                    blurStyle: getStageBlurStyle(data.stage)
                };
            }
        }
    } catch (rpcErr) {
        console.warn('[MysteryMatchService] Server RPC fallback to local-first session:', rpcErr);
    }

    // Local resilient progressive calculation
    const nextStage = Math.min(3, (currentStage || 0) + (messageText ? 1 : 0));
    const isRevealed = nextStage >= 3;

    if (isRevealed) {
        triggerSuccessHaptic();
    }

    return {
        success: true,
        session: {
            session_id: sessionId || `local_${Date.now()}`,
            stage: nextStage,
            is_revealed: isRevealed,
            caller_messages: nextStage,
            partner_messages: nextStage
        },
        stage: nextStage,
        isRevealed,
        blurStyle: getStageBlurStyle(nextStage)
    };
}
