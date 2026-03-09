import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getDiscoverProfiles, recordSwipe, trackProfileView, checkSwipeLimit, superSwipe } from '../services/swipeService';
import { useDiscoveryProfiles } from '../hooks/useSWRData';
import { updatePresence, saveGenderPreference } from '../services/profileService';
import { supabase } from '../lib/supabase';
import { getActiveBoosts } from '../services/paymentService';
import SwipeCard from '../components/SwipeCard';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusBubbles from '../components/StatusBubbles';
import LeaderboardPreview from '../components/LeaderboardPreview';
import MatchCelebration from '../components/MatchCelebration'; // NEW
import StreakIndicator from '../components/StreakIndicator'; // NEW
import { useToast } from '../components/Toast';
import './Match.css';

export default function Match() {
    const { currentUser, userProfile } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [matchData, setMatchData] = useState(null);
    const [liveOnly, setLiveOnly] = useState(false);
    const [filters, setFilters] = useState({
        gender: 'All',
        university: 'All',
        ageRange: [18, 50]
    });

    const { data: swrProfiles, mutate: mutateProfiles, isValidating: profilesValidating } = useDiscoveryProfiles(
        currentUser?.id,
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
    const [swipeCount, setSwipeCount] = useState(0); // For Nudge A
    const [showNudge, setShowNudge] = useState(false); // For popup
    const [sessionSwipes, setSessionSwipes] = useState(0); // For Premium Nudge
    const [showPremiumNudge, setShowPremiumNudge] = useState(false); // Premium Nudge Modal
    const [showGenderMenu, setShowGenderMenu] = useState(false);

    // Limit Reached State
    const [limitReached, setLimitReached] = useState(null);
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        if (userProfile) {
            // Auto-filter to opposite gender on load
            const savedGender = userProfile.interest_gender;
            if (savedGender && savedGender !== 'All') {
                setFilters(prev => ({ ...prev, gender: savedGender }));
            } else if (userProfile.gender) {
                const defaultOpposite = userProfile.gender.toLowerCase() === 'male' ? 'Female' : 'Male';
                setFilters(prev => ({ ...prev, gender: defaultOpposite }));
            }
        }
    }, [userProfile?.id]);

    useEffect(() => {
        // Sync SWR data to local profiles stack
        if (swrProfiles) {
            const processedProfiles = (swrProfiles || []).map(profile => {
                const allPhotos = [...(profile.profile_photos || [])];
                if (profile.avatar_url && !allPhotos.includes(profile.avatar_url)) {
                    allPhotos.unshift(profile.avatar_url);
                }
                return { ...profile, profile_photos: allPhotos };
            });
            setProfiles(processedProfiles);
            setLoading(false);
        }
    }, [swrProfiles]);

    useEffect(() => {
        loadBoosts();
    }, [currentUser]);


    // Realtime Subscription
    useEffect(() => {
        if (!currentUser) return;
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
    }, [currentUser]);

    useEffect(() => {
        if (currentUser && profiles.length > 0) {
            const topProfile = profiles[0];
            trackProfileView(currentUser.id, topProfile.id);
        }
    }, [currentUser, profiles[0]?.id]);

    async function loadBoosts() {
        if (!currentUser) return;
        try {
            const { data } = await getActiveBoosts(currentUser.id);
            setSuperSwipesAvailable(data.superSwipeCount);
        } catch (err) {
            console.error('Error loading boosts:', err);
        }
    }

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
    const { data: boostsRes } = useSWR(currentUser ? ['boosts', currentUser.id] : null, () => getActiveBoosts(currentUser.id));
    const { data: limitsRes } = useSWR(currentUser ? ['limits', currentUser.id] : null, () => checkSwipeLimit(currentUser.id));

    useEffect(() => {
        if (limitsRes) {
            setFreeSwipes(limitsRes.max - limitsRes.used);
            if (!limitsRes.canSwipe) {
                setLimitReached({ used: limitsRes.used, max: limitsRes.max });
            }
        }
    }, [limitsRes]);

    const loadProfiles = async (reset = false) => {
        // SWR handles this automatically now, but we keep the name for 
        // backwards compatibility with the "threshold" reload logic.
        mutateProfiles();
    };

    const handleSwipe = async (direction, swipedProfile, type = 'standard', teaser = null) => {
        // 1. Check Limits for Free Users (Only for RIGHT swipe)
        if (direction === 'right' && type === 'standard') {
            const { canSwipe, used, max } = await checkSwipeLimit(currentUser.id);

            if (!canSwipe) {
                // Block the swipe completely, show the limit overlay, and return early
                setLimitReached({ used, max });
                addToast('Free swipes exhausted for today!', 'error');
                return; // DO NOT remove profile from screen or record swipe
            }
        }

        // 2. Optimistic Update (Local State & SWR Cache)
        const updatedProfiles = profiles.filter(p => p.id !== swipedProfile.id);
        setProfiles(updatedProfiles);
        mutateProfiles(updatedProfiles, false); // Update SWR cache without re-fetching yet

        // Optimistically update free swipes to make it feel instant
        if (direction === 'right' && freeSwipes > 0 && type === 'standard') {
            setFreeSwipes(prev => Math.max(0, prev - 1));
        }

        // 3. Trigger preloading if running low (Phase 1 Fix)
        if (updatedProfiles.length < 5) {
            loadProfiles(false);
        }

        // 4. Record Swipe and Check for Match/Streak
        const result = await recordSwipe(currentUser.id, swipedProfile.id, direction, type, teaser);

        if (result.error) {
            console.error('Swipe Error:', result.error);

            // Only show payment error if it was a RIGHT swipe
            if (direction === 'right') {
                const isInsufficient = result.error.includes('balance') || result.error.includes('funds') || result.error.includes('Insufficient');
                addToast(isInsufficient ? 'Insufficient balance. Top up your wallet!' : 'Transaction failed. Please try again.', 'error');
            } else {
                // For left swipes (passes), show a more generic error if it truly fails
                addToast('Could not record pass. Please try again.', 'error');
            }
            return;
        }

        // Update streak if returned
        if (result.streak) setUserStreak(result.streak);

        if (result.isMatch) {
            // Trigger the High-Fidelity Celebrity Overlay!
            // Attach the DB match_id so the "Send Message" button can route there directly
            setMatchData({ ...swipedProfile, match_id: result.match_id });
        } else if (direction === 'right') {
            // Free swipes counter was optimistically updated at the top

            if (result.type === 'free') {
                addToast('Standard request sent for free!', 'success');
            } else {
                const amount = type === 'premium' ? '₦5,000' : '₦500';
                addToast(`${type === 'premium' ? 'Premium' : 'Standard'} request sent for ${amount}!`, 'success');
            }
        }

        // 5. Touchpoint A: After 5 Swipes Nudge
        const newCount = swipeCount + 1;
        setSwipeCount(newCount);
        if (newCount === 5 && (userProfile?.completion_score || 0) < 60) {
            setShowNudge(true);
        }

        // Premium Upgrade Nudge on 10th Swipe
        const newSessionCount = sessionSwipes + 1;
        setSessionSwipes(newSessionCount);
        if (newSessionCount === 10 && userProfile?.role !== 'premium') {
            setShowPremiumNudge(true);
        }
    };

    const handleSuperSwipe = async (swipedProfile) => {
        setProfiles((prev) => prev.filter(p => p.id !== swipedProfile.id));

        const { data, error } = await superSwipe(currentUser.id, swipedProfile);

        if (error) {
            console.error('Super Swipe Error:', error);
            addToast(error, 'error');
            return;
        }

        setSuperSwipesAvailable(prev => Math.max(0, prev - 1));
        addToast(`⭐ Super Swipe sent! ${swipedProfile.full_name || 'They'} will get an instant notification!`, 'success');
    };

    if (loading) return <LoadingSpinner fullScreen text="Finding matches..." />;

    // Quick Gender Menu (rendered inline)
    const QuickGenderMenu = () => (
        <div className="gender-quick-menu" onClick={e => e.stopPropagation()}>
            {['Female', 'Male', 'All'].map(g => (
                <button
                    key={g}
                    className={`gender-opt-btn ${filters.gender === g ? 'active' : ''}`}
                    onClick={async () => {
                        setFilters(prev => ({ ...prev, gender: g }));
                        setShowGenderMenu(false);
                        if (currentUser) await saveGenderPreference(currentUser.id, g);
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
                    (pos) => {
                        const { latitude, longitude } = pos.coords;

                        setLiveOnly(true);
                    },
                    (_err) => {
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
            {/* Top Right Floating Filter Toggle */}
            <button className="floating-filter-btn" onClick={() => setShowGenderMenu(prev => !prev)} title="Filter by gender">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="7" r="4" />
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                </svg>
                {filters.gender !== 'All' && <span className="gender-active-dot" />}
            </button>
            {showGenderMenu && <QuickGenderMenu />}
            {showGenderMenu && <div className="gender-menu-backdrop" onClick={() => setShowGenderMenu(false)} />}

            <div className="swipe-container">
                <div className="live-mode-bar">
                    <div className={`live-toggle-pill ${liveOnly ? 'live-active' : ''}`} onClick={handleLiveNearMe}>
                        <div className={`live-badge-glow ${liveOnly ? 'glow-active' : ''}`}></div>
                        <span className="live-label">Live Near Me</span>
                        <div className={`live-toggle-switch ${liveOnly ? 'active' : ''}`}>
                            <div className="toggle-circle"></div>
                        </div>
                    </div>
                </div>

                <StatusBubbles />

                {/* Floating Stats Area */}
                <div className="discovery-floating-stats">
                    <StreakIndicator streak={userStreak} badge={userProfile?.current_badge} />
                    <div className="swipes-counter-pill animate-fade-in-right">
                        <span className="pill-icon">⚡</span>
                        <div className="pill-content">
                            <span className="pill-number">{freeSwipes}</span>
                            <span className="pill-label">Swipes Left</span>
                        </div>
                    </div>
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
                                        <li>🚀 <strong>Premium (₦5,000)</strong>: Direct notification, higher visibility.</li>
                                        <li>⭐ <strong>Super Swipe</strong>: Instant notification to the person!</li>
                                        <li>👑 <strong>Monthly Subscription</strong>: Get 100 free standard swipes!</li>
                                    </ul>
                                </div>
                            )}
                        </div>
                        {profiles.slice(0, 2).reverse().map((profile, index) => (
                            <SwipeCard
                                key={profile.id}
                                profile={profile}
                                onSwipe={(dir, type, teaser) => handleSwipe(dir, profile, type, teaser)}
                                superSwipesAvailable={superSwipesAvailable}
                                onSuperSwipe={handleSuperSwipe}
                                priority={index === 1}
                            />
                        ))}

                        <LeaderboardPreview />
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
                                                saveGenderPreference(currentUser.id, g);
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
                onClose={() => setMatchData(null)}
                // Use the match_id that we now store in matchData
                onMessage={() => navigate(`/chat/${matchData.match_id}`)}
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
                            <p className="limit-message">
                                You’ve reached today’s limit.<br />
                                <strong>7 people</strong> are still waiting to be discovered 👀
                            </p>

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
        </div>
    );
}

