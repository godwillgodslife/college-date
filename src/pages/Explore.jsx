import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getDiscoverProfiles, trackProfileView, checkSwipeLimit, resetDiscovery } from '../services/swipeService';
import { useDiscoveryProfiles } from '../hooks/useSWRData';
import { updatePresence } from '../services/profileService';
import { supabase } from '../lib/supabase';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToast } from '../components/Toast';
import ProfileDrawer from '../components/ProfileDrawer'; // NEW
import './Explore.css';

export default function Explore() {
    const { currentUser, userProfile } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [freeSwipes, setFreeSwipes] = useState(20);
    const [category, setCategory] = useState('All');
    const categories = ['All', 'Newest', 'Near Me', 'Serious', 'Casual', 'Trending'];

    const { data: swrProfiles, mutate: mutateProfiles, isLoading: profilesLoading } = useDiscoveryProfiles(
        currentUser?.id,
        { ...filters, category },
        userProfile
    );
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);

    const [filters, setFilters] = useState({
        gender: 'All',
        university: 'All',
        ageRange: [18, 50]
    });

    // Use a stable filters object for the effect
    const stableFilters = JSON.stringify(filters);

    useEffect(() => {
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

    const isLocal = window.location.hostname === 'localhost';

    return (
        <div className="explore-page">
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
                {profiles.length === 0 ? (
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
                    <div className="explore-grid">
                        {profiles.map((profile) => (
                            <div
                                key={profile.id}
                                className="explore-card animate-scale-in"
                                onClick={() => setSelectedProfile(profile)}
                            >
                                <div className="card-image-wrapper">
                                    <img
                                        src={profile.profile_photos?.[0] || profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`}
                                        alt={profile.full_name}
                                        loading="lazy"
                                    />
                                    {profile.attraction_goal && (
                                        <div className="intent-badge">
                                            {profile.attraction_goal === 'Casual' ? 'Casual 🔥' :
                                                profile.attraction_goal === 'Serious' ? 'Serious 💍' : 'Friends 🤝'}
                                        </div>
                                    )}
                                </div>
                                <div className="card-info">
                                    <h3>{profile.full_name}, {profile.age}</h3>
                                    <p>{profile.university}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Profile Drawer */}
            {selectedProfile && (
                <ProfileDrawer
                    isOpen={!!selectedProfile}
                    profile={selectedProfile}
                    onClose={() => setSelectedProfile(null)}
                />
            )}
        </div>
    );
}

