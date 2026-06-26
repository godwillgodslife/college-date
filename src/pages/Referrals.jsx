import { useCallback, useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import { useCachedAsync } from '../hooks/useCachedAsync';
import './Referrals.css';

const PUBLIC_APP_URL = (import.meta.env.VITE_PUBLIC_APP_URL || 'https://www.thecollegedate.com').replace(/\/$/, '');

function createReferralCode(user, profile) {
    const rawBase = profile?.username || profile?.full_name || user?.email || 'TCD';
    const base = rawBase.replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase() || 'TCD';
    const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
    return `${base}${suffix}`;
}

async function copyToClipboard(text) {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
}

export default function Referrals() {
    const { currentUser, userProfile, fetchProfile } = useAuth();
    const { addToast } = useToast();

    const [copying, setCopying] = useState(false);
    const [checkingRewards, setCheckingRewards] = useState(false);
    const [referralCode, setReferralCode] = useState(userProfile?.referral_code || '');

    useEffect(() => {
        if (currentUser) {
            ensureReferralCode();
        }
    }, [currentUser, userProfile?.referral_code]);

    const fetchWalletData = useCallback(async () => {
        if (!currentUser) return null;
        const { data, error } = await supabase
            .from('wallets')
            .select('*')
            .eq('user_id', currentUser.id)
            .maybeSingle();
        if (error) throw error;
        return data;
    }, [currentUser]);

    const fetchReferrals = useCallback(async () => {
        if (!currentUser) return [];
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
        return data || [];
    }, [currentUser]);

    const {
        data: referrals = [],
        loading,
        refresh: refreshReferrals
    } = useCachedAsync(
        currentUser ? ['referrals', currentUser.id] : null,
        fetchReferrals,
        { enabled: Boolean(currentUser), ttlMs: 10 * 60 * 1000, initialData: [] }
    );

    const {
        data: wallet,
        refresh: refreshWallet
    } = useCachedAsync(
        currentUser ? ['wallet-referral-summary', currentUser.id] : null,
        fetchWalletData,
        { enabled: Boolean(currentUser), ttlMs: 5 * 60 * 1000, initialData: null }
    );

    async function ensureReferralCode() {
        if (!currentUser) return null;
        if (userProfile?.referral_code) {
            setReferralCode(userProfile.referral_code);
            return userProfile.referral_code;
        }

        for (let attempt = 0; attempt < 3; attempt += 1) {
            const nextCode = createReferralCode(currentUser, userProfile);
            const { data, error } = await supabase
                .from('profiles')
                .update({ referral_code: nextCode })
                .eq('id', currentUser.id)
                .is('referral_code', null)
                .select('referral_code')
                .maybeSingle();

            if (!error && data?.referral_code) {
                setReferralCode(data.referral_code);
                fetchProfile?.(currentUser.id);
                return data.referral_code;
            }

            if (error && error.code !== '23505') {
                console.error('Error creating referral code:', error);
                break;
            }
        }

        addToast('Could not prepare your referral code yet. Please try again.', 'error');
        return null;
    }

    const handleCopyLink = async () => {
        const code = referralCode || await ensureReferralCode();
        if (!code) return;
        const referralLink = `${PUBLIC_APP_URL}/signup?ref=${encodeURIComponent(code)}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Join me on The College Date',
                    text: 'Join The College Date and start meeting students around your campus.',
                    url: referralLink
                });
                return;
            } catch {
                // Fall back to copying if the native share sheet is cancelled or unavailable.
            }
        }

        await copyToClipboard(referralLink);
        setCopying(true);
        addToast('Referral link copied to clipboard!', 'success');
        setTimeout(() => setCopying(false), 2000);
    };

    const handleCopyCode = async () => {
        const code = referralCode || await ensureReferralCode();
        if (!code) return;
        await copyToClipboard(code);
        addToast('Referral code copied!', 'success');
    };

    const handleCheckRewards = async () => {
        setCheckingRewards(true);
        try {
            const { data, error } = await supabase.rpc('unlock_matured_rewards', {
                p_user_id: currentUser.id
            });

            if (error) throw error;

            if (data?.unlocked_amount > 0) {
                addToast(`₦${data.unlocked_amount} moved to your wallet! 💰`, 'success');
                refreshWallet();
                refreshReferrals();
            } else {
                addToast('No new rewards to unlock yet.', 'info');
            }
        } catch (err) {
            console.error('Error unlocking rewards:', err);
            addToast('Failed to check for rewards.', 'error');
        } finally {
            setCheckingRewards(false);
        }
    };

    return (
        <div className="referrals-page animated fadeIn">
            <div className="referral-header">
                <h1>Invite & Earn</h1>
                <p>Grow the community and get exclusive rewards for every friend who joins.</p>
            </div>

            <section className="referral-incentives">
                <div className="incentive-card">
                    <div className="incentive-icon">⚡</div>
                    <h3>3 Free Swipes</h3>
                    <p>Instant bonus for every friend who joins CD.</p>
                </div>
                <div className="incentive-card highlight">
                    <div className="incentive-icon">💰</div>
                    <h3>₦3,000 Cash</h3>
                    <p>Milestone reward for every 10 successful referrals.</p>
                </div>
                <div className="incentive-card">
                    <div className="incentive-icon">🎁</div>
                    <h3>Friend's Gift</h3>
                    <p>Your friend gets 20 free swipes to start swiping.</p>
                </div>
            </section>

            <div className="referral-card-container">
                <div className="referral-main-card">
                    <div className="referral-code-section">
                        <span className="label">Your Referral Code</span>
                        <div className="code-display" onClick={handleCopyCode}>
                            {referralCode || 'Preparing...'}
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
                        <span className="stat-val">₦{wallet?.pending_balance || 0}</span>
                        <span className="stat-name">Pending</span>
                    </div>
                    <div className="ref-stat clickable" onClick={handleCheckRewards}>
                        <span className="stat-val">
                            {checkingRewards ? '...' : `₦${wallet?.available_balance || 0}`}
                        </span>
                        <span className="stat-name">Available</span>
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
