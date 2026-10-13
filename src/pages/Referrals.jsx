import { useCallback, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import { useCachedAsync } from '../hooks/useCachedAsync';
import { applyReferralCode, getReferralMessage } from '../services/referralService';
import { getCampusBadgeText, TOP_CAMPUS_CONNECTORS, getReferralMilestone } from '../utils/ambassadorLeague';
import { getAvatarUrl } from '../utils/profileData';
import profileTunde from '../assets/landing-profile-tunde.webp';
import profileAmaka from '../assets/landing-profile-amaka.webp';
import profileZainab from '../assets/landing-profile-zainab.webp';
import './Referrals.css';

const AVATAR_MAP = {
    tunde: profileTunde,
    amaka: profileAmaka,
    zainab: profileZainab
};

export { getCampusBadgeText, TOP_CAMPUS_CONNECTORS, getReferralMilestone };

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

    const [searchParams] = useSearchParams();
    const isPreview = searchParams.get('preview') === 'true' || searchParams.get('demo') === 'true' || (typeof window !== 'undefined' && window.location.pathname.includes('preview'));

    const [copying, setCopying] = useState(false);
    const [checkingRewards, setCheckingRewards] = useState(false);
    const [referralCode, setReferralCode] = useState(userProfile?.referral_code || '');
    const [inputCode, setInputCode] = useState('');
    const [redeeming, setRedeeming] = useState(false);

    const handleRedeemCode = async (e) => {
        e?.preventDefault();
        const codeToApply = inputCode.trim();
        if (!codeToApply) return;
        setRedeeming(true);
        try {
            const result = await applyReferralCode(codeToApply);
            if (result.error) {
                addToast(result.error.message || 'Failed to apply referral code.', 'error');
            } else if (result.data?.success) {
                const msg = getReferralMessage(result.data) || 'Referral code applied successfully! 🎉';
                addToast(msg, 'success');
                setInputCode('');
                fetchProfile?.(currentUser.id);
                refreshWallet();
                refreshReferrals();
            } else {
                const msg = getReferralMessage(result.data) || 'Could not apply that referral code.';
                addToast(msg, 'error');
            }
        } catch (err) {
            console.error('Error redeeming referral code:', err);
            addToast('An error occurred while redeeming the code.', 'error');
        } finally {
            setRedeeming(false);
        }
    };

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
                    id,
                    full_name,
                    username,
                    avatar_url,
                    profile_photos,
                    photo_updated_at,
                    updated_at
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

    const fetchTopConnectors = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, username, avatar_url, profile_photos, photo_updated_at, updated_at, referral_count')
                .order('referral_count', { ascending: false })
                .limit(3);
            if (!error && data && data.length >= 3 && data[0]?.referral_count > 0) {
                return [
                    { id: data[1].id, rank: 2, name: data[1].full_name?.split(' ')[0] + ' ' + (data[1].full_name?.split(' ')[1]?.[0] || '') + '.', students: data[1].referral_count || 35, avatar: getAvatarUrl(data[1]) || profileAmaka, isLeader: false },
                    { id: data[0].id, rank: 1, name: data[0].full_name?.split(' ')[0] + ' ' + (data[0].full_name?.split(' ')[1]?.[0] || '') + '.', students: data[0].referral_count || 42, avatar: getAvatarUrl(data[0]) || profileTunde, isLeader: true },
                    { id: data[2].id, rank: 3, name: data[2].full_name?.split(' ')[0] + ' ' + (data[2].full_name?.split(' ')[1]?.[0] || '') + '.', students: data[2].referral_count || 28, avatar: getAvatarUrl(data[2]) || profileZainab, isLeader: false }
                ];
            }
        } catch {
            // fallback
        }
        return TOP_CAMPUS_CONNECTORS;
    }, []);

    const { data: connectors = TOP_CAMPUS_CONNECTORS } = useCachedAsync(
        ['campus-top-connectors', userProfile?.campus || 'unilag'],
        fetchTopConnectors,
        { ttlMs: 15 * 60 * 1000, initialData: TOP_CAMPUS_CONNECTORS }
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

    const handleShareWhatsApp = async () => {
        const code = referralCode || await ensureReferralCode();
        if (!code) return;
        const referralLink = `${PUBLIC_APP_URL}/signup?ref=${encodeURIComponent(code)}`;
        const campus = userProfile?.university || userProfile?.campus || '';
        const campusText = campus ? `at ${campus}` : 'across campus';
        const message = `Hey! 🎓 Check out The College Date — it's the verified student app for dating & networking ${campusText}.\n\nUse my invite code *${code}* to get 20 bonus free swipes! 🚀\n\nJoin here: ${referralLink}`;

        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
        if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()) {
            try {
                const { Browser } = await import('@capacitor/browser');
                await Browser.open({ url: whatsappUrl });
                return;
            } catch {
                // fall through to window.open
            }
        }
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    };

    const handleCopyLink = async () => {
        const code = referralCode || await ensureReferralCode();
        if (!code) return;
        const referralLink = `${PUBLIC_APP_URL}/signup?ref=${encodeURIComponent(code)}`;

        await copyToClipboard(referralLink);
        setCopying(true);
        addToast('Referral link copied to clipboard!', 'success');
        setTimeout(() => setCopying(false), 2000);
    };

    const handleNativeShare = async () => {
        const code = referralCode || await ensureReferralCode();
        if (!code) return;
        const referralLink = `${PUBLIC_APP_URL}/signup?ref=${encodeURIComponent(code)}`;
        const campus = userProfile?.university || userProfile?.campus || '';
        const campusText = campus ? `at ${campus}` : 'on campus';

        if (typeof navigator !== 'undefined' && navigator.share) {
            try {
                await navigator.share({
                    title: 'The College Date',
                    text: `Join me on The College Date ${campusText}! Use my code ${code} for 20 free swipes.`,
                    url: referralLink
                });
                return;
            } catch {
                // fall through
            }
        }
        await handleCopyLink();
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

    const baseReferralCount = referrals.length;
    const referralCount = isPreview ? 3 : baseReferralCount;
    const MILESTONE_GOAL = 5;
    const milestoneProgress = Math.min(referralCount, MILESTONE_GOAL);
    const milestonePercent = Math.min(100, Math.round((milestoneProgress / MILESTONE_GOAL) * 100));
    const remainingInvites = Math.max(0, MILESTONE_GOAL - referralCount);
    const isMilestoneUnlocked = referralCount >= MILESTONE_GOAL;
    const campusBadgeText = getCampusBadgeText(userProfile);

    return (
        <div className="referrals-page animated fadeIn">
            {/* Campus Ambassador League Header */}
            <div className="ambassador-header">
                <h1 className="ambassador-title">Campus Ambassador League 🏆</h1>
                <div className="campus-identity-pill">
                    <span className="campus-crest">🏛️</span>
                    <span className="campus-name-text">{campusBadgeText}</span>
                </div>
            </div>

            {/* Your Referral Milestone Card */}
            <div className="referral-milestone-card">
                <div className="milestone-card-top">
                    <div className="milestone-text-block">
                        <h3 className="milestone-card-title">Your Referral Milestone</h3>
                        <div className="milestone-progress-track">
                            <div 
                                className="milestone-progress-fill" 
                                style={{ width: `${Math.max(6, milestonePercent)}%` }} 
                            />
                        </div>
                        <div className="milestone-count-label">
                            {milestoneProgress} of {MILESTONE_GOAL} Friends Joined
                        </div>
                    </div>
                    <div className="milestone-crown-badge" title="Elite Rewards">
                        <span className="milestone-crown-symbol">👑</span>
                    </div>
                </div>
                <div className="milestone-card-subtitle">
                    {isMilestoneUnlocked 
                        ? '🎉 Milestone Unlocked: 3 Days Free Elite Active!' 
                        : `${remainingInvites} more ${remainingInvites === 1 ? 'invite' : 'invites'} to unlock 3 Days Free Elite!`}
                </div>
            </div>

            {/* Top Campus Connectors Section */}
            <section className="top-connectors-section">
                <h2 className="top-connectors-title">Top Campus Connectors</h2>
                <div className="connectors-podium-row">
                    {connectors.map(connector => (
                        <div 
                            key={connector.id} 
                            className={`connector-podium-card ${connector.isLeader ? 'is-leader' : ''}`}
                        >
                            {connector.isLeader && (
                                <div className="leader-floating-crown" aria-hidden="true">👑</div>
                            )}
                            <span className="connector-rank-num">{connector.rank}</span>
                            <div className="connector-avatar-wrapper">
                                <img 
                                    src={connector.avatar || AVATAR_MAP[connector.avatarKey] || profileTunde} 
                                    alt={connector.name} 
                                    className="connector-avatar" 
                                    onError={(e) => { e.currentTarget.src = profileZainab; }}
                                />
                            </div>
                            <div className="connector-name">{connector.name}</div>
                            <div className="connector-subtext">- Students -</div>
                            <div className="connector-metric">{connector.students} Students</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Primary WhatsApp Share CTA with Referral Code Pill */}
            <div className="ambassador-cta-container">
                <button
                    type="button"
                    className="btn btn-whatsapp share-btn-whatsapp ambassador-whatsapp-btn"
                    onClick={handleShareWhatsApp}
                >
                    <div className="whatsapp-btn-row">
                        <span className="share-icon">💬</span>
                        <span className="whatsapp-btn-text">Share on WhatsApp Status & Groups</span>
                    </div>
                    <span className="whatsapp-code-pill">{referralCode || 'CD-ALEX'}</span>
                </button>
            </div>

            {/* Referral Incentives */}
            <section className="referral-incentives" aria-label="Referral Rewards">
                <div className="incentive-card">
                    <div className="incentive-card-top">
                        <div className="incentive-icon-wrap">
                            <span className="incentive-icon" aria-hidden="true">⚡</span>
                        </div>
                        <span className="incentive-badge">Instant</span>
                    </div>
                    <div className="incentive-card-body">
                        <h3>3 Free Swipes</h3>
                        <p>Instant bonus for every friend who joins CD.</p>
                    </div>
                </div>
                <div className="incentive-card highlight">
                    <div className="incentive-card-top">
                        <div className="incentive-icon-wrap highlight-icon">
                            <span className="incentive-icon" aria-hidden="true">💰</span>
                        </div>
                        <span className="incentive-badge highlight-badge">Top Reward ⭐</span>
                    </div>
                    <div className="incentive-card-body">
                        <h3>₦3,000 Cash</h3>
                        <p>Milestone reward for every 10 successful referrals.</p>
                    </div>
                </div>
                <div className="incentive-card">
                    <div className="incentive-card-top">
                        <div className="incentive-icon-wrap">
                            <span className="incentive-icon" aria-hidden="true">🎁</span>
                        </div>
                        <span className="incentive-badge">For Friends</span>
                    </div>
                    <div className="incentive-card-body">
                        <h3>Friend's Gift</h3>
                        <p>Your friend gets 20 free swipes to start swiping.</p>
                    </div>
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
                        <button
                            type="button"
                            className="btn btn-whatsapp share-btn-whatsapp"
                            onClick={handleShareWhatsApp}
                        >
                            <span className="share-icon">💬</span> Share on WhatsApp
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary share-btn"
                            onClick={handleCopyLink}
                        >
                            <span className="share-icon">📋</span> {copying ? 'Copied!' : 'Copy Link'}
                        </button>
                        {typeof navigator !== 'undefined' && Boolean(navigator.share) && (
                            <button
                                type="button"
                                className="btn btn-secondary share-btn-more"
                                onClick={handleNativeShare}
                                title="More sharing options"
                            >
                                <span>↗</span> More...
                            </button>
                        )}
                    </div>
                </div>

                <div className="referral-stats-grid">
                    <div className="ref-stat">
                        <span className="stat-val">{referrals.length}</span>
                        <span className="stat-name">Invites</span>
                    </div>
                    <div className="ref-stat">
                        <span className="stat-val">
                            <span className="currency-symbol">₦</span> {Number(wallet?.pending_balance || 0).toLocaleString()}
                        </span>
                        <span className="stat-name">Pending</span>
                    </div>
                    <div className="ref-stat clickable" onClick={handleCheckRewards}>
                        <span className="stat-val">
                            {checkingRewards ? '...' : (
                                <>
                                    <span className="currency-symbol">₦</span> {Number(wallet?.available_balance || 0).toLocaleString()}
                                </>
                            )}
                        </span>
                        <span className="stat-name">Available</span>
                    </div>
                </div>

                {/* Redeem Referral Code Card */}
                <div className="redeem-code-card">
                    <div className="redeem-header">
                        <span className="redeem-icon">🎁</span>
                        <div>
                            <h4>Have a Friend's Invite Code?</h4>
                            <p>Enter their code to link accounts and get bonus free swipes!</p>
                        </div>
                    </div>
                    <form className="redeem-form" onSubmit={handleRedeemCode}>
                        <input
                            type="text"
                            className="redeem-input"
                            placeholder="e.g. CD-ABC12"
                            value={inputCode}
                            onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                            maxLength={20}
                            disabled={redeeming}
                        />
                        <button
                            type="submit"
                            className="btn btn-primary redeem-btn"
                            disabled={redeeming || !inputCode.trim()}
                        >
                            {redeeming ? 'Applying...' : 'Apply Code'}
                        </button>
                    </form>
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
                                    src={getAvatarUrl(ref.referred) || ref.referred?.avatar_url || 'https://via.placeholder.com/40'}
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
