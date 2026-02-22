import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import './Viewers.css';

export default function Viewers() {
    const { currentUser, userProfile } = useAuth();
    const [viewers, setViewers] = useState([]);
    const [loading, setLoading] = useState(true);
    const isPremium = userProfile?.plan_type === 'Premium';
    const navigate = useNavigate();

    useEffect(() => {
        if (currentUser) {
            fetchViewers();
        }
    }, [currentUser]);

    async function fetchViewers() {
        try {
            setLoading(true);
            // Fetch profile views with viewer profile info
            const { data, error } = await supabase
                .from('profile_views')
                .select(`
                    id,
                    created_at,
                    viewer:profiles!viewer_id (
                        id,
                        full_name,
                        avatar_url,
                        university,
                        last_active
                    )
                `)
                .eq('profile_owner_id', currentUser.id)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            setViewers(data || []);
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
                {viewers.length === 0 ? (
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
                    viewers.map((item) => (
                        <div key={item.id} className="viewer-card">
                            <div className={`viewer-avatar ${!isPremium ? 'blurred' : ''}`}>
                                <img
                                    src={item.viewer?.avatar_url || '/default-avatar.png'}
                                    alt="Viewer"
                                />
                            </div>
                            <div className="viewer-info">
                                <h3 className={!isPremium ? 'blurred-text' : ''}>
                                    {isPremium ? item.viewer?.full_name : '•••••••• •••••'}
                                </h3>
                                <p>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                            {!isPremium && <div className="lock-icon">🔒</div>}
                        </div>
                    ))
                )}
            </div>

            {!isPremium && viewers.length > 0 && (
                <div className="premium-upsell-sticky">
                    <h3>Unlock {viewers.length} Secret Admirers!</h3>
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
