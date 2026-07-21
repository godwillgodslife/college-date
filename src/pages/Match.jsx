import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { recordSwipe, trackProfileView, checkSwipeLimit, superSwipe } from '../services/swipeService';
import { getDiscoveryCacheKey, useDiscoveryProfiles } from '../hooks/useSWRData';
import { saveGenderPreference } from '../services/profileService';
import { supabase } from '../lib/supabase';
import { getActiveBoosts } from '../services/paymentService';
import SwipeCard from '../components/SwipeCard';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusBubbles from '../components/StatusBubbles';
import LeaderboardPreview from '../components/LeaderboardPreview';
import MatchCelebration from '../components/MatchCelebration'; // NEW
import StreakIndicator from '../components/StreakIndicator'; // NEW
import { playCardSwipe } from '../lib/audioContext';
import { useToast } from '../components/Toast';
import HiddenProfileBanner from '../components/HiddenProfileBanner';
import { getOptimizedUrl } from '../lib/imageUrl';
import { hasActivePremium } from '../utils/premium';
import { recordFeedImpression } from '../services/feedImpressionService';
import { getProfilePhotos, normalizeProfile, safeArray } from '../utils/profileData';
import { enqueueOfflineOperation, getQueuedOperations, removeOfflineOperation } from '../lib/offlineQueue';
import { setCachedData } from '../lib/persistentCache';
import './Match.css';

const OFFLINE_PAID_SWIPES_ENABLED = import.meta.env.VITE_ENABLE_OFFLINE_PAID_SWIPES === 'true';

export default function Match() {
    const { currentUser, userProfile } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();
    const currentUserId = currentUser?.id;

    const [matchData, setMatchData] = useState(null);
    const [liveOnly, setLiveOnly] = useState(false);
    const [filters, setFilters] = useState(() => {
        let initialGender = 'All';
        if (userProfile) {
            if (userProfile.interest_gender && userProfile.interest_gender !== 'All') {
                initialGender = userProfile.interest_gender;
            } else if (userProfile.gender) {
                initialGender = userProfile.gender.toLowerCase() === 'male' ? 'Female' : 'Male';
            }
        }
        return {
            gender: initialGender,
            university: 'All',
            ageRange: [18, 50]
        };
    });

    const { data: swrProfiles, mutate: mutateProfiles } = useDiscoveryProfiles(
        currentUserId,
        { ...filters, liveOnly },
        userProfile
    );
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [superSwipesAvailable, setSuperSwipesAvailable] = useState(0);
    const [userStreak, setUserStreak] = useState(0); // For Streak System
    const [freeSwipes, setFreeSwipes] = useState(20); // Default to 20, synced in loadProfiles
    const [, setSwipeCount] = useState(0); // For Nudge A
    const [showNudge, setShowNudge] = useState(false); // For popup
    const [, setSessionSwipes] = useState(0); // For Premium Nudge
    const [showPremiumNudge, setShowPremiumNudge] = useState(false); // Premium Nudge Modal
    const [showGenderMenu, setShowGenderMenu] = useState(false);
    const [pendingSwipeIds, setPendingSwipeIds] = useState([]);
    const isPremium = hasActivePremium(userProfile);

    // Limit Reached State
    const [limitReached, setLimitReached] = useState(null);
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        // Sync SWR data to local profiles stack
        if (swrProfiles) {
            const queuedSwipeIds = new Set(
                getQueuedOperations(currentUserId, 'record_swipe')
                    .map(operation => operation.payload?.swipedId)
                    .filter(Boolean)
            );
            const processedProfiles = (swrProfiles || []).map(profile => {
                const normalizedProfile = normalizeProfile(profile);
                return { ...normalizedProfile, profile_photos: getProfilePhotos(normalizedProfile) };
            });

            // STRICT CLIENT-SIDE GATEKEEPING
            const validProfiles = processedProfiles.filter(p =>
                p.profile_photos && p.profile_photos.length > 0 && !queuedSwipeIds.has(p.id)
            );

            setTimeout(() => {
                setProfiles(validProfiles);
                setLoading(false);
            }, 0);
        }
    }, [swrProfiles, currentUserId]);

    const loadBoosts = useCallback(async () => {
        if (!currentUserId) return;
        try {
            const { data } = await getActiveBoosts(currentUserId);
            setSuperSwipesAvailable(data.superSwipeCount);
        } catch (err) {
            console.error('Error loading boosts:', err);
        }
    }, [currentUserId]);

    useEffect(() => {
        const timer = setTimeout(loadBoosts, 0);
        return () => clearTimeout(timer);
    }, [loadBoosts]);

    // Realtime Subscription
    useEffect(() => {
        if (!currentUserId) return;
        const channel = supabase
            .channel('discovery-realtime')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'profiles'
            }, (payload) => {
                const updatedProfile = payload.new;

                // If the user went LIVE and matches current filters, prepend to stack?
                // For now, just update the existing profile in state if present
                setProfiles(prev => prev.map(p => p.id === updatedProfile.id ? { ...p, ...updatedProfile } : p));
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [currentUserId]);

    useEffect(() => {
        if (currentUserId && profiles.length > 0) {
            const topProfile = profiles[0];
            trackProfileView(currentUserId, topProfile.id);
            recordFeedImpression('profile', topProfile.id, 'match').catch(() => {});
        }
    }, [currentUserId, profiles]);

    // Countdown Timer for Swipe Reset
    useEffect(() => {
        if (!limitReached) return;

        const timer = setInterval(() => {
            const now = new Date();
            const tomorrow = new Date();
            tomorrow.setHours(24, 0, 0, 0);

            const diff = tomorrow - now;
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff / (1000 * 60)) % 60);
            const seconds = Math.floor((diff / 1000) % 60);

            setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        }, 1000);

        return () => clearInterval(timer);
    }, [limitReached]);

    // SWR for Boosts & Limits
    const { data: limitsRes } = useSWR(currentUserId ? ['limits', currentUserId] : null, () => checkSwipeLimit(currentUserId));

    useEffect(() => {
        if (limitsRes) {
            setTimeout(() => {
                if (isPremium) {
                    setFreeSwipes(0);
                    setLimitReached(null);
                    return;
                }
                setFreeSwipes(limitsRes.max - limitsRes.used);
                if (!limitsRes.canSwipe) {
                    setLimitReached({ used: limitsRes.used, max: limitsRes.max });
                }
            }, 0);
        }
    }, [limitsRes, isPremium]);

    useEffect(() => {
        const handleOfflineSyncComplete = () => {
            mutateProfiles();
            loadBoosts();
        };

        window.addEventListener('tcd:offline-sync-complete', handleOfflineSyncComplete);
        return () => window.removeEventListener('tcd:offline-sync-complete', handleOfflineSyncComplete);
    }, [mutateProfiles, currentUserId, loadBoosts]);

    const canStartSwipe = useCallback(async (direction, type = 'standard') => {
        if (!isPremium && direction === 'right' && type === 'standard') {
            const { canSwipe, used, max } = await checkSwipeLimit(currentUserId);

            if (!canSwipe) {
                setLimitReached({ used, max });
                addToast('Free swipes exhausted for today!', 'error');
                return false;
            }
        }
        return true;
    }, [currentUserId, isPremium, addToast]);

    const handleSwipe = useCallback(async (direction, swipedProfile, type = 'standard', teaser = null) => {
        if (!swipedProfile?.id) {
            console.warn('[Match] Ignoring swipe without a valid profile:', { direction, swipedProfile });
            addToast('Could not read this profile. Please try the next card.', 'error');
            return;
        }

        const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
        const canQueueSwipeOffline = direction === 'left'
            || (direction === 'right' && type === 'standard' && isPremium)
            || (direction === 'right' && OFFLINE_PAID_SWIPES_ENABLED);
        if (offline && !canQueueSwipeOffline) {
            addToast('Connect to the internet to send paid requests or Super Swipes.', 'info');
            return;
        }

        playCardSwipe();

        setPendingSwipeIds(prev => prev.includes(swipedProfile.id) ? prev : [...prev, swipedProfile.id]);

        // 2. Optimistic Update (Local State ONLY, delayed so exit animation can finish)
        setProfiles(prev => {
            const updated = prev.filter(p => p.id !== swipedProfile.id);
            const cacheKey = getDiscoveryCacheKey(currentUserId, { ...filters, liveOnly }, userProfile);
            setCachedData(cacheKey, updated, {
                userId: currentUserId,
                type: 'discovery'
            });
            // Defer SWR mutations & preloading to protect swipe animation FPS
            setTimeout(() => {
                mutateProfiles(updated, false);
                if (updated.length < 5) {
                    mutateProfiles();
                }
            }, 300); // 300ms allows standard CSS transitions to complete
            return updated;
        });

        setTimeout(() => {
            setPendingSwipeIds(prev => prev.filter(id => id !== swipedProfile.id));
        }, 40);
        
        // Optimistically update free swipes to make it feel instant
        if (!isPremium && direction === 'right' && type === 'standard') {
            setFreeSwipes(prev => Math.max(0, prev - 1));
        }

        const offlineOperationId = `record_swipe:${currentUserId}:${swipedProfile.id}:${direction}:${type}`;
        if (offline) {
            enqueueOfflineOperation(currentUserId, {
                id: offlineOperationId,
                type: 'record_swipe',
                payload: {
                    swiperId: currentUserId,
                    swipedId: swipedProfile.id,
                    direction,
                    swipeType: type,
                    messageTeaser: teaser,
                    isPremium,
                    clientOperationId: offlineOperationId
                }
            });
            addToast(direction === 'right'
                ? 'Request saved. We will send it when your connection returns.'
                : 'Pass saved. We will sync it when your connection returns.',
                'info');
            return;
        }

        // 4. Record Swipe and Check for Match/Streak
        const result = await recordSwipe(currentUserId, swipedProfile.id, direction, type, teaser, {
            isPremium,
            clientOperationId: offlineOperationId
        });

        if (result.error) {
            console.error('Swipe Error:', result.error);

            // Only show payment error if it was a RIGHT swipe
            if (direction === 'right') {
                const isInsufficient = result.error.includes('balance') || result.error.includes('funds') || result.error.includes('Insufficient');
                if (isInsufficient) {
                    addToast('Insufficient balance. Top up your wallet!', 'error');
                } else {
                    addToast(`Swipe failed: ${result.error}`, 'error');
                }
            } else {
                // For left swipes (passes), show a more generic error if it truly fails
                addToast('Could not record pass. Please try again.', 'error');
            }
            return;
        }

        removeOfflineOperation(currentUserId, offlineOperationId);

        // Update streak if returned
        if (result.streak) setUserStreak(result.streak);

        if (result.isMatch) {
            // Trigger the High-Fidelity Celebrity Overlay!
            // Attach the DB match_id so the "Send Message" button can route there directly
            setMatchData({ ...swipedProfile, match_id: result.match_id });
        } else if (direction === 'right') {
            // Free swipes counter was optimistically updated at the top

            if (result.type === 'premium_free') {
                addToast('Premium request sent with unlimited swipes!', 'success');
            } else if (result.type === 'free') {
                addToast('Standard request sent for free!', 'success');
            } else {
                const amount = type === 'premium' ? '₦5,000' : '₦500';
                addToast(`${type === 'premium' ? 'Premium' : 'Standard'} request sent for ${amount}!`, 'success');
            }
        }

        // 5. Touchpoint A: After 5 Swipes Nudge
        setSwipeCount(prev => {
            const next = prev + 1;
            if (next === 5 && (userProfile?.completion_score || 0) < 60) {
                setShowNudge(true);
            }
            return next;
        });

        // Premium Upgrade Nudge on 10th Swipe
        setSessionSwipes(prev => {
            const next = prev + 1;
            if (next === 10 && !isPremium) {
                setShowPremiumNudge(true);
            }
            return next;
        });
    }, [currentUserId, isPremium, userProfile, filters, liveOnly, mutateProfiles, addToast]);

    const handleSuperSwipe = useCallback(async (swipedProfile) => {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            addToast('Connect to the internet to send a Super Swipe.', 'info');
            return;
        }

        setProfiles((prev) => prev.filter(p => p.id !== swipedProfile.id));

        const { error } = await superSwipe(currentUserId, swipedProfile);

        if (error) {
            console.error('Super Swipe Error:', error);
            addToast(error, 'error');
            return;
        }

        setSuperSwipesAvailable(prev => Math.max(0, prev - 1));
        addToast(`⭐ Super Swipe sent! ${swipedProfile.full_name || 'They'} will get an instant notification!`, 'success');
    }, [currentUserId, addToast]);

    if (loading) return <LoadingSpinner fullScreen text="Finding matches..." />;

    // Quick Gender Menu (rendered inline)
    const quickGenderMenu = (
        <div className="gender-quick-menu" onClick={e => e.stopPropagation()}>
            {['Female', 'Male', 'All'].map(g => (
                <button
                    key={g}
                    className={`gender-opt-btn ${filters.gender === g ? 'active' : ''}`}
                        onClick={async () => {
                            setFilters(prev => ({ ...prev, gender: g }));
                            setShowGenderMenu(false);
                        if (currentUserId) {
                            const operationId = `save_gender_preference:${currentUserId}`;
                            if (typeof navigator !== 'undefined' && navigator.onLine === false) {
                                enqueueOfflineOperation(currentUserId, {
                                    id: operationId,
                                    type: 'save_gender_preference',
                                    payload: { userId: currentUserId, gender: g }
                                });
                            } else {
                                const result = await saveGenderPreference(currentUserId, g);
                                if (result?.error) {
                                    enqueueOfflineOperation(currentUserId, {
                                        id: operationId,
                                        type: 'save_gender_preference',
                                        payload: { userId: currentUserId, gender: g },
                                        lastError: result.error
                                    });
                                } else {
                                    removeOfflineOperation(currentUserId, operationId);
                                }
                            }
                        }
                    }}
                >
                    {g === 'Female' ? '👩 Women' : g === 'Male' ? '👨 Men' : '✨ All'}
                </button>
            ))}
        </div>
    );

    const handleLiveNearMe = () => {
        if (!liveOnly) {
            // Request geolocation permission when enabling
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    () => {
                        setLiveOnly(true);
                    },
                    () => {
                        // Permission denied or unavailable — fall back to university proximity silently
                        setLiveOnly(true); // Still enable "near me" via university matching
                    },
                    { timeout: 10000, enableHighAccuracy: false, maximumAge: 60000 }
                );
            } else {
                setLiveOnly(true);
            }
        } else {
            setLiveOnly(false);
        }
    };

    return (
        <div className="discover-page">
            {/* GATEKEEPING: Show 'invisible' state if user has no photos */}
            {(safeArray(userProfile?.profile_photos).length === 0 && !userProfile?.avatar_url) ? (
                <HiddenProfileBanner />
            ) : (
                <>
                    {/* Compact Top Rail */}
                    <div className="discover-top-rail">
                        <div className="discover-top-filters">
                            <button 
                                className={`discover-rail-btn ${liveOnly ? 'active' : ''}`} 
                                onClick={handleLiveNearMe}
                            >
                                🔴 Live Near Me
                            </button>
                            <button 
                                className={`discover-rail-btn ${filters.gender !== 'All' ? 'active' : ''}`} 
                                onClick={() => setShowGenderMenu(prev => !prev)}
                            >
                                {filters.gender === 'Female' ? '👩 Women' : filters.gender === 'Male' ? '👨 Men' : '✨ All'}
                            </button>
                            {showGenderMenu && quickGenderMenu}
                            {showGenderMenu && <div className="gender-menu-backdrop" onClick={() => setShowGenderMenu(false)} />}
                        </div>

                        <div className="discover-swipes-left-badge">
                            ⚡ <b>{isPremium ? '∞' : freeSwipes}</b> Swipes Left
                        </div>
                    </div>

                    <div className="swipe-container">
                        <StatusBubbles />

                        {/* Streak Indicator (rendered beneath top rail) */}
                        <div className="discovery-streak-overlay">
                            <StreakIndicator streak={userStreak} badge={userProfile?.current_badge} />
                        </div>

                        {profiles.length === 0 ? (
                            <div className="no-profiles">
                                <div className="pulse-icon">🔍</div>
                                <h2>No more profiles</h2>
                                <p>We couldn't find anyone new matching your filters right now.</p>

                                {(userProfile?.completion_score || 0) < 60 && (
                                    <div className="profile-nudge-mini">
                                        <p>💡 <strong>Tip:</strong> Profiles under 60% completion appear less often in discovery.</p>
                                        <button onClick={() => navigate('/profile/edit')} className="btn btn-link">
                                            Improve Profile
                                        </button>
                                    </div>
                                )}

                                <button
                                    onClick={() => setShowFilters(true)}
                                    className="btn btn-primary retry-btn"
                                >
                                    Adjust Filters
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="premium-info-container">
                                    <button className="info-trigger" onClick={() => setShowInfo(!showInfo)}>i</button>
                                    {showInfo && (
                                        <div className="swipe-tooltip animate-fade-in-up">
                                            <h4>💎 Swipe Types</h4>
                                            <p>Choosing the right swipe increases your matching chance.</p>
                                            <ul className="tooltip-features">
                                                <li>✅ <strong>Standard (₦500)</strong>: Normal request sent.</li>
                                                <li>⭐ <strong>Super Swipe</strong>: Instant notification to the person!</li>
                                                <li>👑 <strong>Monthly Subscription</strong>: Get 100 free standard swipes!</li>
                                            </ul>
                                        </div>
                                    )}
                                </div>
                                {profiles.slice(0, 2).reverse().map((profile, index, stack) => {
                                    const isTopCard = index === stack.length - 1;
                                    return (
                                    <SwipeCard
                                        key={profile.id}
                                        profile={profile}
                                        onSwipe={handleSwipe}
                                        onBeforeSwipe={canStartSwipe}
                                        superSwipesAvailable={superSwipesAvailable}
                                        onSuperSwipe={handleSuperSwipe}
                                        priority={isTopCard}
                                        isTop={isTopCard && !pendingSwipeIds.includes(profile.id)}
                                    />
                                    );
                                })}

                                {/* HIDDEN PRELOADER: Silently download the next 5 profiles in the background */}
                                <div style={{ display: 'none' }}>
                                    {profiles.slice(2, 7).map(profile => {
                                        const photos = getProfilePhotos(profile);
                                        if (!photos[0]) return null;
                                        // Use identical URL format so browser cache matches EXACTLY
                                        const preloadUrl = typeof getOptimizedUrl === 'function' ? getOptimizedUrl(photos[0], 800) : photos[0];
                                        return <img key={`preload-${profile.id}`} src={preloadUrl} alt="" />;
                                    })}
                                </div>
                            </>
                        )}
                    </div>

                    {showFilters && (
                        <div className="filter-overlay">
                            <div className="filter-box animate-fade-in-up">
                                <div className="filter-header">
                                    <h2>Discovery Settings</h2>
                                    <button className="close-filters" onClick={() => setShowFilters(false)}>×</button>
                                </div>
                                <div className="filter-body">
                                    <div className="filter-section">
                                        <label>I'm interested in</label>
                                        <div className="filter-options">
                                            {['All', 'Male', 'Female'].map(g => (
                                                <button
                                                    key={g}
                                                    className={`filter-opt ${filters.gender === g ? 'active' : ''}`}
                                                    onClick={() => {
                                                        setFilters(prev => ({ ...prev, gender: g }));
                                                        const operationId = `save_gender_preference:${currentUserId}`;
                                                        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
                                                            enqueueOfflineOperation(currentUserId, {
                                                                id: operationId,
                                                                type: 'save_gender_preference',
                                                                payload: { userId: currentUserId, gender: g }
                                                            });
                                                        } else {
                                                            saveGenderPreference(currentUserId, g).then((result) => {
                                                                if (result?.error) {
                                                                    enqueueOfflineOperation(currentUserId, {
                                                                        id: operationId,
                                                                        type: 'save_gender_preference',
                                                                        payload: { userId: currentUserId, gender: g },
                                                                        lastError: result.error
                                                                    });
                                                                } else {
                                                                    removeOfflineOperation(currentUserId, operationId);
                                                                }
                                                            });
                                                        }
                                                    }}
                                                >
                                                    {g}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <button className="btn btn-primary btn-apply" onClick={() => setShowFilters(false)}>Show Results</button>
                            </div>
                        </div>
                    )}

                    {/* High-Fidelity Match Celebration */}
                    <MatchCelebration
                        isOpen={!!matchData}
                        matchedProfile={matchData}
                        userProfile={userProfile}
                        onClose={() => {
                            console.log('[Match] Celebration closed manually');
                            setMatchData(null);
                        }}
                        onMessage={() => {
                            const cid = matchData?.match_id;
                            const uid = matchData?.id;
                            
                            console.log('[Match] Navigating to Chat. IDs:', { cid, uid });
                            
                            // Robust navigation: Pass everything so Chat.jsx can find the target
                            navigate(cid ? `/chat?chatId=${cid}` : '/chat', { 
                                state: { 
                                    openChatWith: uid, // Fallback profile ID
                                    matchData: matchData,
                                    chatId: cid
                                } 
                            });
                            setMatchData(null);
                        }}
                    />

                    {/* Limit Reached Overlay */}
                    {limitReached && (
                        <div className="limit-overlay">
                            <div className="limit-card animate-fade-in-up">
                                <div className="limit-header">
                                    <span className="limit-icon">⌛</span>
                                    <h2>Daily Limit Reached</h2>
                                </div>

                                <div className="limit-body">
                                    <strong>More people</strong> are waiting to be discovered 👀

                                    <div className="reset-timer">
                                        <span className="timer-label">Next reset in:</span>
                                        <span className="timer-value">{timeLeft || 'calculating...'}</span>
                                    </div>

                                    <div className="premium-upsell">
                                        <button className="btn btn-premium-unlock" onClick={() => navigate('/premium')}>
                                            🔓 Unlock Unlimited Swipes
                                        </button>
                                        <p className="premium-price">₦2,900 Premium</p>
                                    </div>
                                </div>

                                <button className="limit-close" onClick={() => setLimitReached(null)}>
                                    Maybe Later
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Touchpoint A: Session Nudge Overlay */}
                    {showNudge && (
                        <div className="limit-overlay">
                            <div className="limit-card animate-fade-in-up">
                                <div className="limit-header">
                                    <span className="limit-icon">🚀</span>
                                    <h2>Boost Your Visibility!</h2>
                                </div>
                                <div className="limit-body">
                                    <p className="limit-message">
                                        Complete your profile to increase your visibility by <strong>3x</strong>. People naturally want to reach 100%!
                                    </p>
                                    <div className="premium-upsell">
                                        <button className="btn btn-primary btn-block" onClick={() => navigate('/profile/edit')}>
                                            Complete Profile
                                        </button>
                                    </div>
                                </div>
                                <button className="limit-close" onClick={() => setShowNudge(false)}>
                                    Maybe Later
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Premium Nudge Overlay (10th swipe) */}
                    {showPremiumNudge && (
                        <div className="limit-overlay">
                            <div className="limit-card animate-fade-in-up">
                                <div className="limit-header">
                                    <span className="limit-icon">🔥</span>
                                    <h2>Get the Full Experience!</h2>
                                </div>
                                <div className="limit-body">
                                    <p className="limit-message">
                                        You are on a roll! Upgrade to <strong>Premium</strong> for infinite swipes,
                                        priority visibility, and direct messaging without matching.
                                    </p>
                                    <div className="premium-upsell">
                                        <button className="btn btn-premium-unlock" onClick={() => navigate('/premium')}>
                                            🔓 Upgrade to Premium
                                        </button>
                                        <p className="premium-price">₦2,900 / Month</p>
                                    </div>
                                </div>
                                <button className="limit-close" onClick={() => setShowPremiumNudge(false)}>
                                    Keep Swiping Free
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

