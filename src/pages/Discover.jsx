import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getDiscoverProfiles, recordSwipe, trackProfileView } from '../services/swipeService';
import SwipeCard from '../components/SwipeCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToast } from '../components/Toast';
import './Discover.css';

export default function Discover() {
    const { currentUser, userProfile } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [matchAnimation, setMatchAnimation] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        gender: 'All',
        university: 'All',
        ageRange: [18, 50]
    });

    useEffect(() => {
        loadProfiles();
    }, [currentUser, filters]);

    useEffect(() => {
        if (currentUser && profiles.length > 0) {
            const topProfile = profiles[0];
            trackProfileView(currentUser.id, topProfile.id);
        }
    }, [currentUser, profiles[0]?.id]);

    async function loadProfiles() {
        if (!currentUser) return;
        setLoading(true);

        try {
            const { data, error } = await getDiscoverProfiles(currentUser.id, filters);

            if (error) {
                console.error('Detailed Load Error:', error);
                addToast('Could not load profiles. Please try again.', 'error');
            } else {
                setProfiles(data || []);
            }
        } catch (err) {
            console.error('Load Exception:', err);
            addToast('Network error. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    }

    const handleSwipe = async (direction, swipedProfile, type = 'standard', teaser = null) => {
        setProfiles((prev) => prev.filter(p => p.id !== swipedProfile.id));

        const { error } = await recordSwipe(currentUser.id, swipedProfile.id, direction, type, teaser);

        if (error) {
            console.error('Swipe Error:', error);
            addToast('Transaction failed. Check your wallet balance.', 'error');
            return;
        }

        if (direction === 'right') {
            const amount = type === 'premium' ? '₦5,000' : '₦500';
            addToast(`${type === 'premium' ? 'Premium' : 'Standard'} request sent for ${amount}!`, 'success');
        }
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
                {profiles.length === 0 ? (
                    <div className="no-profiles">
                        <div className="pulse-icon">🔍</div>
                        <h2>No more profiles</h2>
                        <p>Try adjusting your filters!</p>
                        <button onClick={() => setShowFilters(true)} className="btn btn-primary retry-btn">Adjust Filters</button>
                    </div>
                ) : (
                    profiles.slice(0, 2).reverse().map((profile) => (
                        <SwipeCard
                            key={profile.id}
                            profile={profile}
                            onSwipe={(dir, type, teaser) => handleSwipe(dir, profile, type, teaser)}
                        />
                    ))
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

            {matchAnimation && (
                <div className="match-overlay">
                    <div className="match-content animate-fade-in">
                        <h1 className="match-title">It's a Match!</h1>
                        <div className="match-actions">
                            <button className="btn btn-primary" onClick={() => navigate('/chat')}>Send a Message</button>
                            <button className="btn btn-secondary" onClick={() => setMatchAnimation(null)}>Keep Swiping</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
