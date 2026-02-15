import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import './Referrals.css';

export default function Referrals() {
    const { currentUser, userProfile } = useAuth();
    const { addToast } = useToast();

    const [referrals, setReferrals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [copying, setCopying] = useState(false);

    useEffect(() => {
        if (currentUser) {
            loadReferrals();
        }
    }, [currentUser]);

    async function loadReferrals() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('referrals')
                .select(`
                    *,
                    referred:referred_id (
                        full_name,
                        username,
                        avatar_url
                    )
                `)
                .eq('referrer_id', currentUser.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setReferrals(data || []);
        } catch (err) {
            console.error('Error loading referrals:', err);
        } finally {
            setLoading(false);
        }
    }

    const handleCopyLink = () => {
        const referralLink = `${window.location.origin}/signup?ref=${userProfile?.referral_code}`;
        navigator.clipboard.writeText(referralLink);
        setCopying(true);
        addToast('Referral link copied to clipboard!', 'success');
        setTimeout(() => setCopying(false), 2000);
    };

    const handleCopyCode = () => {
        navigator.clipboard.writeText(userProfile?.referral_code || '');
        addToast('Referral code copied!', 'success');
    };

    return (
        <div className="referrals-page animated fadeIn">
            <div className="referral-header">
                <h1>Invite & Earn</h1>
                <p>Grow the community and get exclusive rewards for every friend who joins.</p>
            </div>

            <div className="referral-card-container">
                <div className="referral-main-card">
                    <div className="referral-code-section">
                        <span className="label">Your Referral Code</span>
                        <div className="code-display" onClick={handleCopyCode}>
                            {userProfile?.referral_code || '---'}
                        </div>
                    </div>

                    <div className="share-actions">
                        <button className="btn btn-primary share-btn" onClick={handleCopyLink}>
                            {copying ? 'Copied!' : 'Copy Referral Link'}
                        </button>
                    </div>
                </div>

                <div className="referral-stats-grid">
                    <div className="ref-stat">
                        <span className="stat-val">{referrals.length}</span>
                        <span className="stat-name">Invites</span>
                    </div>
                    <div className="ref-stat">
                        <span className="stat-val">{referrals.filter(r => r.status === 'rewarded').length}</span>
                        <span className="stat-name">Rewards</span>
                    </div>
                </div>
            </div>

            <section className="referral-history">
                <h2 className="section-title">Your Friends</h2>
                {loading ? (
                    <div className="loading-container"><LoadingSpinner /></div>
                ) : referrals.length > 0 ? (
                    <div className="referral-list">
                        {referrals.map(ref => (
                            <div key={ref.id} className="referral-item">
                                <img
                                    src={ref.referred?.avatar_url || 'https://via.placeholder.com/40'}
                                    alt="User"
                                    className="ref-avatar"
                                />
                                <div className="ref-info">
                                    <span className="ref-name">{ref.referred?.full_name || 'New Member'}</span>
                                    <span className="ref-date">{new Date(ref.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className={`ref-status status-${ref.status}`}>
                                    {ref.status}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="no-referrals">
                        <div className="empty-icon">🤝</div>
                        <p>No referrals yet. Start inviting friends!</p>
                    </div>
                )}
            </section>
        </div>
    );
}
