import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getDiscoverProfiles, trackProfileView, checkSwipeLimit, resetDiscovery, recordSwipe, searchProfilesByName, getExistingMatchWithUser } from '../services/swipeService';
import { useDiscoveryProfiles } from '../hooks/useSWRData';
import { updatePresence } from '../services/profileService';
import { supabase } from '../lib/supabase';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToast } from '../components/Toast';
import ProfileDrawer from '../components/ProfileDrawer'; // NEW
import ChatVibeModal from '../components/ChatVibeModal';
import HiddenProfileBanner from '../components/HiddenProfileBanner';
import { isRecentlyLive, isRecentlyActive } from '../utils/presence';
import { recordFeedImpressions } from '../services/feedImpressionService';
import { getProfilePhotos, normalizeProfile, safeArray, formatDisplayName } from '../utils/profileData';
import { hasActivePremium } from '../utils/premium';
import OptimizedImage from '../components/OptimizedImage';
import { ContextualTip, AppGuideModal } from '../components/ContextualGuide';
import CampusFinderModal from '../components/CampusFinderModal';
import MatchCelebration from '../components/MatchCelebration';
import './Explore.css';


export default function Explore() {
    const { currentUser, userProfile, onlineUserIds } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [matchData, setMatchData] = useState(null);
    const [freeSwipes, setFreeSwipes] = useState(20);
    const [guideModalOpen, setGuideModalOpen] = useState(false);
    const [showCampusFinder, setShowCampusFinder] = useState(false);
    const [category, setCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [dbSearchResults, setDbSearchResults] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const categories = ['All', '🔴 Live', 'Newest', 'Near Me', 'Serious', 'Casual', 'Trending'];

    const [filters, setFilters] = useState({
        gender: 'All',
        university: 'All',
        ageRange: [18, 50]
    });

    const [selectedProfile, setSelectedProfile] = useState(null);
    const [vibeTargetProfile, setVibeTargetProfile] = useState(null);
    const [showFilters, setShowFilters] = useState(false);

    const { data: swrProfiles, mutate: mutateProfiles, isLoading: profilesLoading } = useDiscoveryProfiles(
        currentUser?.id,
        { ...filters, category: category === '🔴 Live' ? 'Live' : category, includeSwiped: true },
        userProfile
    );
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);

    // Use a stable filters object for the effect
    const stableFilters = JSON.stringify(filters);

    useEffect(() => {
        if (swrProfiles !== undefined || !profilesLoading) {
            const processedProfiles = (swrProfiles || []).map(profile => {
                const normalizedProfile = normalizeProfile(profile);
                return { ...normalizedProfile, profile_photos: getProfilePhotos(normalizedProfile) };
            });

            // STRICT CLIENT-SIDE GATEKEEPING: Filter out anyone who has 0 photos, is shadow-banned, or banned
            const validProfiles = processedProfiles.filter(p =>
                p.profile_photos &&
                p.profile_photos.length > 0 &&
                !p.is_shadow_banned &&
                !p.is_banned
            );

            setProfiles(validProfiles);
            setLoading(false);
        }
    }, [swrProfiles, profilesLoading]);

    useEffect(() => {
        if (userProfile) setFreeSwipes(userProfile.free_swipes);
    }, [userProfile?.id]);

    useEffect(() => {
        if (currentUser && profiles.length > 0) {
            const topProfile = profiles[0];
            trackProfileView(currentUser.id, topProfile.id);
        }
    }, [currentUser?.id, profiles[0]?.id]);

    const visibleProfileImpressionIds = profiles.slice(0, 16).map(profile => profile.id).join(',');

    useEffect(() => {
        if (!currentUser?.id || !visibleProfileImpressionIds) return;
        recordFeedImpressions('profile', visibleProfileImpressionIds.split(','), 'explore');
    }, [currentUser?.id, visibleProfileImpressionIds]);

    const handlePerformSearch = useCallback(async (queryText) => {
        const text = (queryText !== undefined ? queryText : searchQuery).trim();
        if (!text) {
            setDbSearchResults(null);
            setIsSearching(false);
            return;
        }
        setIsSearching(true);
        try {
            const results = await searchProfilesByName(text, currentUser?.id, userProfile);
            setDbSearchResults(results);
        } catch (err) {
            console.error('[Explore] search error:', err);
        } finally {
            setIsSearching(false);
        }
    }, [searchQuery, currentUser?.id, userProfile]);

    useEffect(() => {
        if (!searchQuery.trim()) {
            setDbSearchResults(null);
            setIsSearching(false);
            return;
        }
        const timer = setTimeout(() => {
            handlePerformSearch(searchQuery);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchQuery, handlePerformSearch]);

    const handleClearSearch = () => {
        setSearchQuery('');
        setDbSearchResults(null);
        setIsSearching(false);
    };

    const loadProfiles = async (reset = false) => {
        mutateProfiles();
    };

    const handleViewAll = () => {
        setCategory('All');
        setFilters({
            gender: 'All',
            university: 'All',
            ageRange: [18, 50]
        });
    };

    const handleResetDiscovery = async () => {
        if (!window.confirm('Reset all your swipes for testing?')) return;
        const { success } = await resetDiscovery(currentUser.id);
        if (success) {
            addToast('Discovery reset! Refreshing...', 'success');
            loadProfiles(true);
        } else {
            addToast('Failed to reset discovery', 'error');
        }
    };

    // GATEKEEPING: If the current user has no photos, they can't appear in discovery.
    // Show them the 'hidden profile' state instead of the grid.
    const userHasNoPhotos =
        (safeArray(userProfile?.profile_photos).length === 0) &&
        !userProfile?.avatar_url;

    // Filter profiles based on Search and Live category client-side
    const filteredProfiles = profiles.filter(profile => {
        const matchesSearch = searchQuery.trim() === '' ||
            (profile.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (profile.university || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (profile.department || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (profile.faculty || '').toLowerCase().includes(searchQuery.toLowerCase());
            
        if (category === '🔴 Live') {
            return matchesSearch && isRecentlyLive(profile);
        }
        return matchesSearch;
    });

    const displayedProfiles = (dbSearchResults !== null ? dbSearchResults : filteredProfiles).filter(profile => {
        if (profile.is_shadow_banned || profile.is_banned) return false;
        if (category === '🔴 Live') {
            return isRecentlyLive(profile);
        }
        return true;
    });

    const handleQuickLike = async (e, profile) => {
        e.stopPropagation();
        if (!currentUser) return;

        // Optimistically remove
        setProfiles(prev => prev.filter(p => p.id !== profile.id));
        if (dbSearchResults) {
            setDbSearchResults(prev => prev ? prev.filter(p => p.id !== profile.id) : null);
        }
        addToast(`You liked ${profile.full_name || 'them'}!`, 'success');

        const result = await recordSwipe(currentUser.id, profile.id, 'right');
        if (result.error) {
            console.error('[Explore] recordSwipe error:', result.error);
            mutateProfiles();
        } else if (result.isMatch) {
            setMatchData({ ...profile, match_id: result.match_id });
        }
    };

    const handleQuickChat = async (e, profile) => {
        e.stopPropagation();
        if (!currentUser?.id) {
            addToast('Please sign in to message campus students.', 'info');
            return;
        }
        if (currentUser.id === profile.id) {
            addToast('You cannot chat with yourself.', 'info');
            return;
        }

        // If already matched, route directly to chat
        try {
            const existingMatch = await getExistingMatchWithUser(currentUser.id, profile.id);
            if (existingMatch?.id) {
                navigate(`/chat?chatId=${existingMatch.id}`);
                return;
            }
        } catch (err) {
            console.warn('[Explore] check match error:', err);
        }

        // Not yet matched: Open ₦500 Paid Chat Vibe flow
        setVibeTargetProfile(profile);
    };


    if (loading && profilesLoading && !swrProfiles) return <LoadingSpinner fullScreen text="Exploring campus..." />;

    if (userHasNoPhotos) return <HiddenProfileBanner />;

    const isLocal = window.location.hostname === 'localhost';

    return (
        <div className="explore-page">
            {/* Stationary Sticky Header: Search Row + Category Chips */}
            <div className="explore-sticky-header">
                {/* Search and Filter Row */}
                <div className="explore-search-row">
                    <div className="explore-search-container">
                        <span className="search-icon-glass">🔍</span>
                        <input
                            type="text"
                            placeholder="Search name, username, school..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handlePerformSearch();
                                }
                            }}
                            className="explore-search-input"
                        />
                        {isSearching && <span className="search-spinner-tiny">⏳</span>}
                        {searchQuery && !isSearching && (
                            <button className="search-clear-btn" onClick={handleClearSearch} title="Clear">×</button>
                        )}
                        <button 
                            type="button" 
                            className="search-camera-btn" 
                            onClick={() => setShowCampusFinder(true)} 
                            title="Find campus students with camera"
                            aria-label="Scan campus with camera"
                        >
                            📸
                        </button>
                        <button 
                            className="search-submit-btn" 
                            onClick={() => handlePerformSearch()} 
                            disabled={isSearching}
                            type="button"
                        >
                            {isSearching ? '...' : 'Search'}
                        </button>
                    </div>
                    <button 
                        type="button" 
                        className="explore-finder-btn" 
                        onClick={() => setShowCampusFinder(true)}
                        title="Find students on campus with camera"
                    >
                        📸 Find
                    </button>
                    <button className="explore-filter-btn" onClick={() => setShowFilters(true)}>
                        ⚙️ Filter
                    </button>
                </div>

                {dbSearchResults !== null && (
                    <div className="search-results-feedback">
                        <span>Showing {displayedProfiles.length} student{displayedProfiles.length === 1 ? '' : 's'} across campus for "{searchQuery}"</span>
                        <button className="btn-clear-search-link" onClick={handleClearSearch}>Show Discovery</button>
                    </div>
                )}

                {showFilters && (
                    <div className="explore-filter-panel">
                        <div className="explore-filter-panel-header">
                            <h3>Filters</h3>
                            <button type="button" onClick={() => setShowFilters(false)}>Close</button>
                        </div>
                        <div className="explore-filter-options">
                            {['All', 'Men', 'Women'].map((gender) => (
                                <button
                                    key={gender}
                                    type="button"
                                    className={filters.gender === gender ? 'active' : ''}
                                    onClick={() => setFilters(prev => ({ ...prev, gender }))}
                                >
                                    {gender}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Category Chips */}
                <div className="explore-categories">
                    <button
                        type="button"
                        className="category-chip category-chip-finder"
                        onClick={() => setShowCampusFinder(true)}
                        title="Scan campus with camera"
                    >
                        📸 Find by Camera
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            className={`category-chip ${category === cat ? 'active' : ''}`}
                            onClick={() => setCategory(cat)}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            <ContextualTip
                featureId="explore_filters"
                onLearnMore={() => setGuideModalOpen(true)}
            />

            <div className="explore-grid-container">
                {displayedProfiles.length === 0 ? (
                    <div className="empty-discovery">
                        <span className="empty-emoji">🧊</span>
                        <h2>{dbSearchResults !== null ? 'No students found' : "It's quiet here..."}</h2>
                        <p>{dbSearchResults !== null ? `No campus results matching "${searchQuery}". Try searching another name or university!` : 'Be the first to start the vibe!'}</p>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '1rem', justifyContent: 'center' }}>
                            {dbSearchResults !== null ? (
                                <button onClick={handleClearSearch} className="btn btn-primary">
                                    Show All Profiles
                                </button>
                            ) : (
                                <button onClick={handleViewAll} className="btn btn-secondary">
                                    View All Profiles
                                </button>
                            )}
                            {isLocal && (
                                <button onClick={handleResetDiscovery} className="btn btn-danger" style={{ background: 'transparent', border: '1px solid #ff4444', color: '#ff4444' }}>
                                    Reset (Dev Only)
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="explore-grid masonry-layout">
                        {displayedProfiles.map((profile, idx) => {
                            const isLive = isRecentlyLive(profile);
                            const isOnline = Boolean(onlineUserIds?.has?.(profile.id));
                            const isNew = (Date.now() - new Date(profile.created_at).getTime()) < 3 * 24 * 60 * 60 * 1000;
                            const isPremiumUser = hasActivePremium(profile);
                            const isVerified = Boolean(profile.is_verified || profile.photo_verified);
                            const isTall = idx % 3 === 0;

                            return (
                                <div
                                    key={profile.id}
                                    className={`explore-card animate-scale-in ${isTall ? 'tall' : ''} ${isPremiumUser ? 'premium-card' : ''}`}
                                    onClick={() => setSelectedProfile(profile)}
                                >
                                    <div className="card-image-wrapper">
                                        <OptimizedImage
                                            src={profile.profile_photos?.[0] || profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`}
                                            alt={profile.full_name}
                                            className="explore-card-img"
                                            width={360}
                                            priority={idx < 4}
                                        />

                                        {/* Status overlay badges */}
                                        <div className="status-badges-overlay">
                                            {isPremiumUser && <span className="explore-premium-tag">👑 Premium</span>}
                                            {isVerified && <span className="explore-verified-tag">✓ Verified</span>}
                                            {isLive && <span className="explore-live-tag">🔴 LIVE</span>}
                                            {isOnline && !isLive && <span className="explore-online-tag">● Online</span>}
                                            {isNew && <span className="explore-new-tag">✨ New</span>}
                                        </div>

                                        {/* Golden Round Logo Badge for Premium Members */}
                                        {isPremiumUser && (
                                            <div className="card-golden-round-badge" title="👑 Premium Member">
                                                <span>👑</span>
                                            </div>
                                        )}

                                        {profile.attraction_goal && (
                                            <div className={`intent-badge ${isPremiumUser ? 'with-premium' : ''}`}>
                                                {profile.attraction_goal === 'Casual' ? 'Casual 🔥' :
                                                    profile.attraction_goal === 'Serious' ? 'Serious 💍' : 'Friends 🤝'}
                                            </div>
                                        )}

                                        {/* Quick Actions Tray */}
                                        <div className="explore-quick-tray">
                                            <button className="quick-tray-btn like" onClick={(e) => handleQuickLike(e, profile)} title="Like">
                                                ❤️
                                            </button>
                                            <button className="quick-tray-btn chat" onClick={(e) => handleQuickChat(e, profile)} title="Message">
                                                💬
                                            </button>
                                        </div>
                                    </div>
                                    <div className="card-info">
                                        <h3>
                                            {formatDisplayName(profile.full_name, profile.username)}, {profile.age}
                                            {isPremiumUser && <span className="premium-crown" title="Premium Member">👑</span>}
                                            {isVerified && <span className="card-verified-tick" title="Verified Student">✓</span>}
                                        </h3>
                                        <p>{profile.university}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Profile Drawer */}
            <ProfileDrawer
                isOpen={!!selectedProfile}
                profile={selectedProfile}
                onClose={() => setSelectedProfile(null)}
            />

            {/* Paid Chat Vibe (₦500) Modal */}
            <ChatVibeModal
                isOpen={Boolean(vibeTargetProfile)}
                targetProfile={vibeTargetProfile}
                onClose={() => setVibeTargetProfile(null)}
            />

            {/* Campus Finder Optical Discovery Modal */}
            <CampusFinderModal
                isOpen={showCampusFinder}
                onClose={() => setShowCampusFinder(false)}
                onSelectProfile={(profile) => {
                    setShowCampusFinder(false);
                    setSelectedProfile(profile);
                }}
            />

            <AppGuideModal
                isOpen={guideModalOpen}
                onClose={() => setGuideModalOpen(false)}
                initialFeatureId="explore_filters"
            />

            {/* High-Fidelity Match Celebration */}
            <MatchCelebration
                isOpen={!!matchData}
                matchedProfile={matchData}
                userProfile={userProfile}
                onClose={() => setMatchData(null)}
                onMessage={() => {
                    const cid = matchData?.match_id;
                    const uid = matchData?.id;
                    navigate(cid ? `/chat?chatId=${cid}` : '/chat', { 
                        state: { 
                            openChatWith: uid,
                            matchData: matchData,
                            chatId: cid
                        } 
                    });
                    setMatchData(null);
                }}
            />
        </div>
    );
}

