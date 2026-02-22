import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getDiscoverProfiles, recordSwipe, trackProfileView, checkSwipeLimit, superSwipe } from '../services/swipeService';
import { updatePresence } from '../services/profileService';
import { supabase } from '../lib/supabase';
import { getActiveBoosts } from '../services/paymentService';
import SwipeCard from '../components/SwipeCard';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusBubbles from '../components/StatusBubbles';
import LeaderboardPreview from '../components/LeaderboardPreview';
import MatchCelebration from '../components/MatchCelebration'; // NEW
import StreakIndicator from '../components/StreakIndicator'; // NEW
import { useToast } from '../components/Toast';
import './Discover.css';

export default function Discover() {
    const { currentUser, userProfile } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [matchData, setMatchData] = useState(null); // Updated state for celebration
    const [showFilters, setShowFilters] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [superSwipesAvailable, setSuperSwipesAvailable] = useState(0);
    const [userStreak, setUserStreak] = useState(0); // For Streak System
    const [freeSwipes, setFreeSwipes] = useState(20); // Default to 20, synced in loadProfiles
    const [swipeCount, setSwipeCount] = useState(0); // For Nudge A
    const [showNudge, setShowNudge] = useState(false); // For popup
    const [liveOnly, setLiveOnly] = useState(false);
    const [filters, setFilters] = useState({
        gender: 'All',
        university: 'All',
        ageRange: [18, 50]
    });

    // Limit Reached State
    const [limitReached, setLimitReached] = useState(null);
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        loadProfiles(true); // Reset load on filter change
        loadBoosts();
        if (userProfile) setFreeSwipes(userProfile.free_swipes);
    }, [currentUser, filters, userProfile?.free_swipes, liveOnly]);

    // Heartbeat Presence
    useEffect(() => {
        if (!currentUser) return;
        const interval = setInterval(() => {
            updatePresence(currentUser.id);
        }, 60000 * 4); // Every 4 mins
        updatePresence(currentUser.id);
        return () => clearInterval(interval);
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

    const loadProfiles = async (reset = false) => {
        if (!currentUser) return;
        if (reset) setLoading(true);

        try {
            console.log('Fetching discovery profiles...');

            // Sync swipe limits first
            const limitCheck = await checkSwipeLimit(currentUser.id);
            setFreeSwipes(limitCheck.max - limitCheck.used);
            if (!limitCheck.canSwipe) {
                setLimitReached({ used: limitCheck.used, max: limitCheck.max });
            }

            const { data, error } = await getDiscoverProfiles(currentUser.id, { ...filters, liveOnly });

            if (error) {
                console.error('Detailed Load Error:', error);
                addToast('Could not load profiles.', 'error');
            } else {
                // Shuffle photos for each profile to show different "variants"
                const processedProfiles = (data || []).map(profile => {
                    const allPhotos = [...(profile.profile_photos || [])];
                    if (profile.avatar_url && !allPhotos.includes(profile.avatar_url)) {
                        allPhotos.unshift(profile.avatar_url);
                    }

                    // Fisher-Yates shuffle
                    for (let i = allPhotos.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [allPhotos[i], allPhotos[j]] = [allPhotos[j], allPhotos[i]];
                    }

                    return {
                        ...profile,
                        profile_photos: allPhotos
                    };
                });

                if (reset) {
                    setProfiles(processedProfiles);
                } else {
                    // Prepend/Append based on logic, here we just filter duplicates
                    setProfiles(prev => {
                        const existingIds = new Set(prev.map(p => p.id));
                        const newProfiles = processedProfiles.filter(p => !existingIds.has(p.id));
                        return [...prev, ...newProfiles];
                    });
                }
            }
        } catch (err) {
            console.error('Load Exception:', err);
        } finally {
            if (reset) setLoading(false);
        }
    };

    const handleSwipe = async (direction, swipedProfile, type = 'standard', teaser = null) => {
        // 1. Check Limits for Free Users (Only for RIGHT swipe)
        if (direction === 'right') {
            const { canSwipe, used, max } = await checkSwipeLimit(currentUser.id);
            // We no longer BLOCK the swipe here, because recordSwipe will handle the payment
            // if free swipes are exhausted. We just update the state for UI display.
            if (!canSwipe) {
                // Optional: You could show a small toast here like "Free swipes used. This will cost ₦500."
            }
        }

        // 2. Optimistically remove from list
        const updatedProfiles = profiles.filter(p => p.id !== swipedProfile.id);
        setProfiles(updatedProfiles);

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
            setMatchData(swipedProfile);
        } else if (direction === 'right') {
            // Update free swipes counter locally for real-time feel
            if (freeSwipes > 0 && type === 'standard') {
                setFreeSwipes(prev => Math.max(0, prev - 1));
            }

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

    return (
        <div className="discover-page">
            <button className="filter-toggle-btn" onClick={() => setShowFilters(true)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="4" y1="21" x2="4" y2="14"></line>
                    <line x1="4" y1="10" x2="4" y2="3"></line>
                    <line x1="12" y1="21" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12" y2="3"></line>
                    <line x1="20" y1="21" x2="20" y2="16"></line>
                    <line x1="20" y1="12" x2="20" y2="3"></line>
                    <line x1="1" y1="14" x2="7" y2="14"></line>
                    <line x1="9" y1="8" x2="15" y2="8"></line>
                    <line x1="17" y1="16" x2="23" y2="16"></line>
                </svg>
            </button>

            <div className="swipe-container">
                <div className="live-mode-bar">
                    <div className="live-toggle-pill" onClick={() => setLiveOnly(!liveOnly)}>
                        <div className="live-badge-glow"></div>
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
                        {profiles.slice(0, 2).reverse().map((profile) => (
                            <SwipeCard
                                key={profile.id}
                                profile={profile}
                                onSwipe={(dir, type, teaser) => handleSwipe(dir, profile, type, teaser)}
                                superSwipesAvailable={superSwipesAvailable}
                                onSuperSwipe={handleSuperSwipe}
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
                                            onClick={() => setFilters(prev => ({ ...prev, gender: g }))}
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
                onMessage={() => navigate('/chat')}
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
        </div>
    );
}

