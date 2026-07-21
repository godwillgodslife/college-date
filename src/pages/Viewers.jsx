import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import { hasActivePremium } from '../utils/premium';
import { CACHE_TTL } from '../lib/cachePolicy';
import { getCachedData, setCachedData } from '../lib/persistentCache';
import './Viewers.css';

export default function Viewers() {
    const { currentUser, userProfile } = useAuth();
    const [viewers, setViewers] = useState([]);
    const [viewerSummary, setViewerSummary] = useState({ total_count: 0, premium: false, upgrade_required: false });
    const [loading, setLoading] = useState(true);
    const isPremium = viewerSummary.premium || hasActivePremium(userProfile);
    const navigate = useNavigate();

    useEffect(() => {
        if (currentUser) {
            const cached = getCachedData(['viewers', currentUser.id], {
                ttlMs: CACHE_TTL.viewers,
                allowStale: true
            });
            if (cached) {
                if (Array.isArray(cached)) {
                    setViewers(cached);
                    setViewerSummary({ total_count: cached.length, premium: hasActivePremium(userProfile), upgrade_required: false });
                } else {
                    setViewers(cached.items || []);
                    setViewerSummary(cached.summary || { total_count: 0, premium: false, upgrade_required: false });
                }
                setLoading(false);
            }
            fetchViewers();
        }
    }, [currentUser, userProfile]);

    async function fetchViewers() {
        try {
            if (!viewers.length) setLoading(true);
            const { data, error } = await supabase
                .rpc('get_profile_viewers_secure', { p_limit: 20 });

            if (error) throw error;
            if (!data?.success) throw new Error(data?.error || 'Failed to load profile viewers');

            const nextSummary = {
                total_count: data.total_count || 0,
                premium: data.premium === true,
                upgrade_required: data.upgrade_required === true
            };
            const nextItems = data.items || [];

            setViewers(nextItems);
            setViewerSummary(nextSummary);
            setCachedData(['viewers', currentUser.id], { items: nextItems, summary: nextSummary }, {
                userId: currentUser.id,
                type: 'viewers'
            });
        } catch (err) {
            console.error('Error fetching viewers:', err);
        } finally {
            setLoading(false);
        }
    }

    if (loading) return <LoadingSpinner fullScreen />;

    return (
        <div className="viewers-page">
            <header className="viewers-header">
                <button className="back-btn" onClick={() => navigate(-1)}>←</button>
                <h1>Who Viewed You</h1>
            </header>

            <div className="viewers-list">
                {viewerSummary.total_count === 0 ? (
                    <div className="no-viewers">
                        <div className="no-viewers-icon">🕶️</div>
                        <h3>No views yet today</h3>
                        <p>Try boosting your profile to get more eyes!</p>
                        {!isPremium && (
                            <button className="btn-unlock-premium boost-btn" onClick={() => navigate('/premium')} style={{ marginTop: '1rem', background: 'var(--accent-color)' }}>
                                🚀 Boost Profile
                            </button>
                        )}
                    </div>
                ) : (
                    viewers.map((item, index) => (
                        <div key={item.id || `${item.created_at}-${index}`} className="viewer-card">
                            <div className={`viewer-avatar ${item.locked || !isPremium ? 'blurred' : ''}`}>
                                <img
                                    src={item.viewer?.avatar_url || '/default-avatar.png'}
                                    alt="Viewer"
                                />
                            </div>
                            <div className="viewer-info">
                                <h3 className={item.locked || !isPremium ? 'blurred-text' : ''}>
                                    {item.locked || !isPremium ? 'Hidden Viewer' : item.viewer?.full_name}
                                </h3>
                                <p>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                            {(item.locked || !isPremium) && <div className="lock-icon">🔒</div>}
                        </div>
                    ))
                )}
            </div>

            {!isPremium && viewerSummary.total_count > 0 && (
                <div className="premium-upsell-sticky">
                    <h3>Unlock {viewerSummary.total_count} Secret Admirers!</h3>
                    <p>See exactly who’s interested in you.</p>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                        <button className="btn-unlock-premium" onClick={() => navigate('/premium')} style={{ flex: 1 }}>
                            Get Premium
                        </button>
                        <button className="btn-unlock-premium" onClick={() => navigate('/premium')} style={{ flex: 1, background: 'var(--accent-color)' }}>
                            🚀 Boost
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
