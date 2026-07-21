import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getDiscoverProfiles, trackProfileView, checkSwipeLimit, resetDiscovery, recordSwipe } from '../services/swipeService';
import { useDiscoveryProfiles } from '../hooks/useSWRData';
import { updatePresence } from '../services/profileService';
import { supabase } from '../lib/supabase';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToast } from '../components/Toast';
import ProfileDrawer from '../components/ProfileDrawer'; // NEW
import HiddenProfileBanner from '../components/HiddenProfileBanner';
import { isRecentlyLive, isRecentlyActive } from '../utils/presence';
import { recordFeedImpressions } from '../services/feedImpressionService';
import { getProfilePhotos, normalizeProfile, safeArray } from '../utils/profileData';
import './Explore.css';

export default function Explore() {
    const { currentUser, userProfile } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [freeSwipes, setFreeSwipes] = useState(20);
    const [category, setCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const categories = ['All', '🔴 Live', 'Newest', 'Near Me', 'Serious', 'Casual', 'Trending'];

    const [filters, setFilters] = useState({
        gender: 'All',
        university: 'All',
        ageRange: [18, 50]
    });

    const [selectedProfile, setSelectedProfile] = useState(null);
    const [showFilters, setShowFilters] = useState(false);

    const { data: swrProfiles, mutate: mutateProfiles, isLoading: profilesLoading } = useDiscoveryProfiles(
        currentUser?.id,
        { ...filters, category: category === '🔴 Live' ? 'Live' : category },
        userProfile
    );
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);

    // Use a stable filters object for the effect
    const stableFilters = JSON.stringify(filters);

    useEffect(() => {
        if (swrProfiles) {
            const processedProfiles = (swrProfiles || []).map(profile => {
                const normalizedProfile = normalizeProfile(profile);
                return { ...normalizedProfile, profile_photos: getProfilePhotos(normalizedProfile) };
            });

            // STRICT CLIENT-SIDE GATEKEEPING: Filter out anyone who still has 0 photos
            const validProfiles = processedProfiles.filter(p => p.profile_photos && p.profile_photos.length > 0);

            setProfiles(validProfiles);
            setLoading(false);
        }
    }, [swrProfiles]);

    useEffect(() => {
        if (userProfile) setFreeSwipes(userProfile.free_swipes);
    }, [userProfile?.id]);


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
                setProfiles(prev => prev.map(p => p.id === updatedProfile.id ? { ...p, ...updatedProfile } : p));
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [currentUser?.id]);

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

    if (loading) return <LoadingSpinner fullScreen text="Exploring campus..." />;

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

    const handleQuickLike = async (e, profile) => {
        e.stopPropagation();
        if (!currentUser) return;

        // Optimistically remove
        setProfiles(prev => prev.filter(p => p.id !== profile.id));
        addToast(`You liked ${profile.full_name || 'them'}!`, 'success');

        const { data, error } = await recordSwipe(currentUser.id, profile.id, 'right');
        if (error) {
            console.error('[Explore] recordSwipe error:', error);
            mutateProfiles();
        } else if (data && data.is_match) {
            addToast(`🎉 Match with ${profile.full_name || 'them'}! Chat is now open.`, 'success');
        }
    };

    const handleQuickChat = (e, profile) => {
        e.stopPropagation();
        navigate('/chat', { state: { openChatWith: profile.id } });
    };

    if (userHasNoPhotos) return <HiddenProfileBanner />;

    const isLocal = window.location.hostname === 'localhost';

    return (
        <div className="explore-page">
            {/* Search and Filter Row */}
            <div className="explore-search-row">
                <div className="explore-search-container">
                    <span className="search-icon-glass">🔍</span>
                    <input
                        type="text"
                        placeholder="Search name, school, dept..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="explore-search-input"
                    />
                    {searchQuery && (
                        <button className="search-clear-btn" onClick={() => setSearchQuery('')}>×</button>
                    )}
                </div>
                <button className="explore-filter-btn" onClick={() => setShowFilters(true)}>
                    ⚙️ Filter
                </button>
            </div>

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

            <div className="explore-grid-container">
                {filteredProfiles.length === 0 ? (
                    <div className="empty-discovery">
                        <span className="empty-emoji">🧊</span>
                        <h2>It's quiet here...</h2>
                        <p>Be the first to start the vibe!</p>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
                            <button onClick={handleViewAll} className="btn btn-secondary">
                                View All Profiles
                            </button>
                            {isLocal && (
                                <button onClick={handleResetDiscovery} className="btn btn-danger" style={{ background: 'transparent', border: '1px solid #ff4444', color: '#ff4444' }}>
                                    Reset (Dev Only)
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="explore-grid masonry-layout">
                        {filteredProfiles.map((profile, idx) => {
                            const isLive = isRecentlyLive(profile);
                            const isOnline = isRecentlyActive(profile);
                            const isNew = (Date.now() - new Date(profile.created_at).getTime()) < 3 * 24 * 60 * 60 * 1000;
                            const isTall = idx % 3 === 0;

                            return (
                                <div
                                    key={profile.id}
                                    className={`explore-card animate-scale-in ${isTall ? 'tall' : ''}`}
                                    onClick={() => setSelectedProfile(profile)}
                                >
                                    <div className="card-image-wrapper">
                                        <img
                                            src={profile.profile_photos?.[0] || profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`}
                                            alt={profile.full_name}
                                            loading="lazy"
                                        />

                                        {/* Status overlay badges */}
                                        <div className="status-badges-overlay">
                                            {isLive && <span className="explore-live-tag">🔴 LIVE</span>}
                                            {isOnline && !isLive && <span className="explore-online-tag">● Online</span>}
                                            {isNew && <span className="explore-new-tag">✨ New</span>}
                                        </div>

                                        {profile.attraction_goal && (
                                            <div className="intent-badge">
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
                                        <h3>{profile.full_name}, {profile.age}</h3>
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
        </div>
    );
}

