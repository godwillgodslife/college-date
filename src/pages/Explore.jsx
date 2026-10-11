import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import { calculateActiveFilterCount, DEFAULT_EXPLORE_FILTERS, createDefaultExploreFilters } from '../utils/exploreFilters';
import OptimizedImage from '../components/OptimizedImage';
import { ContextualTip, AppGuideModal, markFeatureUsed } from '../components/ContextualGuide';
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
    const searchTimerRef = useRef(null);
    const categories = ['All', '🔴 Live', 'Newest', 'Near Me', 'Serious', 'Casual', 'Trending'];

    const [filters, setFilters] = useState(createDefaultExploreFilters);

    const [selectedProfile, setSelectedProfile] = useState(null);
    const [vibeTargetProfile, setVibeTargetProfile] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const activeFilterCount = useMemo(() => calculateActiveFilterCount(filters), [filters]);

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
        if (searchTimerRef.current) {
            clearTimeout(searchTimerRef.current);
            searchTimerRef.current = null;
        }
        const text = (queryText !== undefined ? queryText : searchQuery).trim();
        if (!text) {
            setDbSearchResults(null);
            setIsSearching(false);
            return;
        }
        setIsSearching(true);
        markFeatureUsed('explore_filters');
        try {
            const results = await searchProfilesByName(text, currentUser?.id, userProfile, filters);
            setDbSearchResults(results || []);
        } catch (err) {
            console.error('[Explore] search error:', err);
            setDbSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    }, [searchQuery, currentUser?.id, userProfile, filters]);

    useEffect(() => {
        if (!searchQuery.trim()) {
            if (searchTimerRef.current) {
                clearTimeout(searchTimerRef.current);
                searchTimerRef.current = null;
            }
            setDbSearchResults(null);
            setIsSearching(false);
            return;
        }
        if (searchTimerRef.current) {
            clearTimeout(searchTimerRef.current);
        }
        searchTimerRef.current = setTimeout(() => {
            handlePerformSearch(searchQuery);
        }, 350);
        return () => {
            if (searchTimerRef.current) {
                clearTimeout(searchTimerRef.current);
                searchTimerRef.current = null;
            }
        };
    }, [searchQuery, handlePerformSearch]);

    const handleClearSearch = () => {
        if (searchTimerRef.current) {
            clearTimeout(searchTimerRef.current);
            searchTimerRef.current = null;
        }
        setSearchQuery('');
        setDbSearchResults(null);
        setIsSearching(false);
    };

    const loadProfiles = async (reset = false) => {
        mutateProfiles();
    };

    const handleViewAll = () => {
        setCategory('All');
        setFilters(createDefaultExploreFilters());
        handleClearSearch();
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

    // GATEKEEPING: If the current user profile has loaded and truly has no photos or avatar
    const userHasNoPhotos = Boolean(userProfile) &&
        (safeArray(userProfile.profile_photos).length === 0) &&
        !userProfile.avatar_url;

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
        if (dbSearchResults === null && category === '🔴 Live') {
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

    const isLocal = Boolean(
        import.meta.env.DEV && (userProfile?.is_admin || userProfile?.is_staff || currentUser?.is_admin || currentUser?.is_staff)
    );

    return (
        <div className="explore-page">
            {/* Stationary Sticky Header: Search Row + Category Chips */}
            <div className="explore-sticky-header">
                {/* Search and Filter Row */}
                <div className="explore-search-row">
                    <form 
                        className="explore-search-form" 
                        onSubmit={(e) => {
                            e.preventDefault();
                            document.activeElement?.blur();
                            handlePerformSearch();
                        }}
                        action="#"
                    >
                        <div className="explore-search-container">
                            <span className="search-icon-glass">🔍</span>
                            <input
                                type="search"
                                enterKeyHint="search"
                                placeholder="Search name, school, dept..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        e.target.blur();
                                        handlePerformSearch(searchQuery);
                                    }
                                }}
                                className="explore-search-input"
                                autoComplete="off"
                                autoCapitalize="none"
                                spellCheck="false"
                            />
                            {isSearching && <span className="search-spinner-tiny">⏳</span>}
                            {searchQuery && !isSearching && (
                                <button type="button" className="search-clear-btn" onClick={handleClearSearch} title="Clear">×</button>
                            )}
                            <button 
                                className="search-submit-btn" 
                                type="submit"
                                disabled={isSearching}
                            >
                                {isSearching ? '...' : 'Search'}
                            </button>
                        </div>
                    </form>
                    <button 
                        type="button" 
                        className={`explore-filter-btn ${showFilters ? 'active' : ''} ${activeFilterCount > 0 ? 'has-active-filters' : ''}`} 
                        onClick={() => setShowFilters(prev => !prev)}
                        title={activeFilterCount > 0 ? `Filters (${activeFilterCount} active)` : 'Filter discovery'}
                        aria-label={activeFilterCount > 0 ? `Filters, ${activeFilterCount} active` : 'Filters'}
                        aria-expanded={showFilters}
                        aria-controls="explore-filter-panel"
                    >
                        <span>⚙️ Filter</span>
                        {activeFilterCount > 0 && (
                            <span className="filter-badge" aria-hidden="true">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                </div>

                {dbSearchResults !== null && (
                    <div className="search-results-feedback">
                        <span>Showing {displayedProfiles.length} student{displayedProfiles.length === 1 ? '' : 's'} across campus for "{searchQuery}"</span>
                        <button className="btn-clear-search-link" onClick={handleClearSearch}>Show Discovery</button>
                    </div>
                )}

                {showFilters && (
                    <div className="explore-filter-panel" id="explore-filter-panel" role="region" aria-label="Explore discovery filters">
                        <div className="explore-filter-panel-header">
                            <div className="explore-filter-panel-title-wrap">
                                <h3>Filters</h3>
                                {activeFilterCount > 0 && (
                                    <span className="filter-count-badge">{activeFilterCount} active</span>
                                )}
                            </div>
                            <div className="explore-filter-panel-actions">
                                {activeFilterCount > 0 && (
                                    <button 
                                        type="button" 
                                        className="btn-filter-reset"
                                        onClick={() => setFilters(createDefaultExploreFilters())}
                                    >
                                        Reset
                                    </button>
                                )}
                                <button type="button" onClick={() => setShowFilters(false)}>Close</button>
                            </div>
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
                            onClick={() => {
                                setCategory(cat);
                                markFeatureUsed('explore_filters');
                            }}
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
                {isSearching || (searchQuery.trim() !== '' && dbSearchResults === null && filteredProfiles.length === 0) ? (
                    <div className="empty-discovery">
                        <span className="empty-emoji">🔍</span>
                        <h2>Searching campus...</h2>
                        <p>Finding students matching "{searchQuery}"...</p>
                    </div>
                ) : displayedProfiles.length === 0 ? (
                    <div className="empty-discovery">
                        <span className="empty-emoji">{dbSearchResults !== null ? '🔍' : activeFilterCount > 0 ? '⚙️' : '🧊'}</span>
                        <h2>{dbSearchResults !== null ? 'No students found' : activeFilterCount > 0 ? 'No matching students' : "It's quiet here..."}</h2>
                        <p>{dbSearchResults !== null ? (activeFilterCount > 0 ? `No campus results matching "${searchQuery}" with your active filters. Try clearing filters or searching another name!` : `No campus results matching "${searchQuery}". Try searching another name or university!`) : activeFilterCount > 0 ? 'No students match your active filters. Try clearing filters to see everyone!' : 'Be the first to start the vibe!'}</p>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '1rem', justifyContent: 'center' }}>
                            {dbSearchResults !== null ? (
                                <button onClick={handleClearSearch} className="btn btn-primary">
                                    Show All Profiles
                                </button>
                            ) : (
                                <button onClick={handleViewAll} className={activeFilterCount > 0 ? 'btn btn-primary' : 'btn btn-secondary'}>
                                    {activeFilterCount > 0 ? 'Clear Filters & Show All' : 'View All Profiles'}
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

