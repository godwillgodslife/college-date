import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import FeatureCard from '../components/FeatureCard';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import ViewerTeaser from '../components/ViewerTeaser'; // NEW
import AndroidInstallButton from '../components/AndroidInstallButton';
import { hasActivePremium } from '../utils/premium';
import { CACHE_TTL } from '../lib/cachePolicy';
import { getCachedData, setCachedData } from '../lib/persistentCache';
import { useScoreStreak } from '../hooks/useScoreStreak';
import ScoreStreakModal from '../components/ScoreStreakModal';
import { useActiveProgram } from '../hooks/useActiveProgram';
import CollegeDateActiveModal from '../components/CollegeDateActiveModal';
import { formatDisplayName } from '../utils/profileData';
import './Dashboard.css';

export default function Dashboard() {
    const { currentUser, userProfile } = useAuth();
    const navigate = useNavigate();
    const [streakModalOpen, setStreakModalOpen] = useState(false);
    const [activeModalOpen, setActiveModalOpen] = useState(false);
    const {
        streak: scoreStreak,
        longestStreak,
        activeToday: streakActiveToday,
        nextMilestone: streakNextMilestone,
        progressToMilestone: streakProgress
    } = useScoreStreak(currentUser?.id);
    const {
        enrolled: activeEnrolled,
        accruedEarnings: activeEarnings,
        qualifyingDaysCount,
        minQualifyingDays,
        dailyReward,
        todayQualified
    } = useActiveProgram(currentUser?.id);
    const isNative = (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()) ||
                     (typeof document !== 'undefined' && document.documentElement.classList.contains('is-native-app'));

    const [stats, setStats] = useState({
        matches: 0,
        messages: 0,
        balance: 0,
        pendingBalance: 0,
        totalEarned: 0,
        freeSwipes: 0,
        giftsReceived: 0,
        viewerCount: 0 // Track viewers
    });
    const [isLoadingStats, setIsLoadingStats] = useState(true);
    const [statsError, setStatsError] = useState('');

    useEffect(() => {
        if (!currentUser) return;

        const cachedStats = getCachedData(['dashboard-stats', currentUser.id], {
            ttlMs: CACHE_TTL.dashboard,
            allowStale: true
        });
        const hasCache = Boolean(cachedStats);
        if (hasCache) {
            setStats(cachedStats);
            setIsLoadingStats(false);
        }

        fetchStats(!hasCache);

        // Subscribe to real-time updates for dashboard stats (strictly user-scoped)
        const dashboardChannel = supabase
            .channel(`dashboard_updates:${currentUser.id}`)
            // 1. Listen for wallet updates (Balance/Earnings)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'wallets',
                filter: `user_id=eq.${currentUser.id}`
            }, (payload) => {
                console.log('💳 Dashboard: Wallet updated', payload.new);
                setStats(prev => ({
                    ...prev,
                    balance: payload.new.available_balance || 0,
                    pendingBalance: payload.new.pending_balance || 0,
                    totalEarned: payload.new.total_earned || 0
                }));
            })
            // 2. Listen for new gifts/transactions
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'wallet_transactions',
                filter: `user_id=eq.${currentUser.id}`
            }, (payload) => {
                if (payload.new.type === 'gift_received') {
                    console.log('🎁 Dashboard: New gift received');
                    setStats(prev => ({ ...prev, giftsReceived: prev.giftsReceived + 1 }));
                }
                // Also trigger a silent re-fetch to ensure sync
                fetchStats(false);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(dashboardChannel);
        };
    }, [currentUser]);

    async function fetchStats(showLoading = true) {
        try {
            if (showLoading) {
                setIsLoadingStats(true);
                setStatsError('');
            }

            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const [
                matchResult,
                messageResult,
                walletResult,
                giftResult,
                viewResult
            ] = await Promise.all([
                supabase
                    .from('matches')
                    .select('*', { count: 'exact', head: true })
                    .or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`),
                supabase
                    .from('messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('sender_id', currentUser.id),
                supabase
                    .from('wallets')
                    .select('*')
                    .eq('user_id', currentUser.id)
                    .maybeSingle(),
                supabase
                    .from('wallet_transactions')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', currentUser.id)
                    .eq('type', 'gift_received'),
                supabase
                    .from('profile_views')
                    .select('*', { count: 'exact', head: true })
                    .eq('profile_owner_id', currentUser.id)
                    .gt('created_at', twentyFourHoursAgo)
            ]);

            const wallet = walletResult.data;

            const nextStats = {
                matches: matchResult.count || 0,
                messages: messageResult.count || 0,
                balance: wallet?.available_balance || 0,
                pendingBalance: wallet?.pending_balance || 0,
                totalEarned: wallet?.total_earned || 0,
                freeSwipes: userProfile?.free_swipes ?? 20,
                giftsReceived: giftResult.count || 0,
                viewerCount: viewResult.count || 0
            };
            setStats(nextStats);
            setCachedData(['dashboard-stats', currentUser.id], nextStats, {
                userId: currentUser.id,
                type: 'dashboard'
            });

            if (matchResult.error && messageResult.error && walletResult.error) {
                setStatsError('Some dashboard numbers could not refresh. Your main app is still available.');
            }
        } catch (err) {
            console.error('Error fetching dashboard stats:', err);
            setStatsError('Some dashboard numbers could not refresh. Your main app is still available.');
        } finally {
            if (showLoading) setIsLoadingStats(false);
        }
    }

    const displayName = formatDisplayName(
        userProfile?.full_name,
        userProfile?.username || currentUser?.email?.split('@')[0],
        'there'
    );

    const greeting = getGreeting();
    const isPremium = hasActivePremium(userProfile);
    const role = String(userProfile?.role || userProfile?.gender || '').toLowerCase();
    const isFemale = role === 'female';
    const isMale = role === 'male';
    const primaryStats = isFemale
        ? [
            { label: 'Earnings', value: `₦${stats.balance.toLocaleString()}`, to: '/wallet' },
            { label: 'Pending', value: `₦${stats.pendingBalance.toLocaleString()}` },
            { label: 'Gifts', value: stats.giftsReceived }
        ]
        : [
            { label: 'Balance', value: `₦${stats.balance.toLocaleString()}`, to: '/wallet' },
            { label: isPremium ? 'Premium Swipes' : 'Free Swipes', value: isPremium ? '∞' : stats.freeSwipes },
            { label: 'Messages', value: stats.messages, to: '/chat' }
        ];

    if (!isMale && !isFemale) {
        primaryStats[0] = { label: 'Wallet', value: `₦${stats.balance.toLocaleString()}`, to: '/wallet' };
    }

    const actionCards = [
        {
            icon: '💕',
            title: 'Start Matching',
            description: 'Swipe through verified campus profiles',
            to: '/match',
            featured: true
        },
        {
            icon: '💬',
            title: 'Messages',
            description: 'Continue conversations with your matches',
            to: '/chat'
        },
        {
            icon: '🧭',
            title: 'Explore',
            description: 'Browse campus people, activity, and discovery',
            to: '/explore'
        },
        {
            icon: '👑',
            title: isPremium ? 'Premium Active' : 'Upgrade Premium',
            description: isPremium ? 'Your premium benefits are active' : 'Unlock unlimited swipes and priority features',
            to: '/premium'
        },
        {
            icon: '💳',
            title: 'Wallet',
            description: 'Manage balance, gifts, boosts, and payouts',
            to: '/wallet'
        },
        {
            icon: '💌',
            title: 'Requests',
            description: 'Review attention and match requests',
            to: '/requests'
        }
    ];

    return (
        <div className="dashboard">
            {/* Hero Section */}
            <section className="dashboard-hero">
                <div className="dashboard-hero-content">
                    <div className="dashboard-eyebrow">Campus command center</div>
                    <h1 className="dashboard-greeting">
                        {greeting}, <span className="dashboard-name">{displayName}</span> 👋
                    </h1>
                    <p className="dashboard-tagline">Check your activity, continue chats, and jump back into campus discovery.</p>
                    <div className="dashboard-hero-actions">
                        <Link to="/match" className="dashboard-primary-action">Start matching</Link>
                        <Link to="/chat" className="dashboard-secondary-action">Open chats</Link>
                    </div>
                </div>

                {/* Who Viewed You Teaser (Social Proof/Curiosity) */}
                <ViewerTeaser count={stats.viewerCount} />

                {/* Score Streak Card */}
                <div 
                    className="dashboard-streak-card" 
                    onClick={() => setStreakModalOpen(true)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Score Streak: ${scoreStreak} days`}
                >
                    <div className="dashboard-card-left" style={{ minWidth: 0, flex: 1 }}>
                        <span className="dashboard-card-icon">🔥</span>
                        <div className="dashboard-card-info">
                            <div className="dashboard-card-title" style={{ color: 'var(--text-primary)' }}>
                                Score Streak: {scoreStreak} {scoreStreak === 1 ? 'Day' : 'Days'}
                            </div>
                            <div className={`dashboard-card-subtitle ${streakActiveToday ? 'streak-active' : 'streak-pending'}`}>
                                {streakActiveToday ? '✓ Streak active today' : '⏳ Action needed today to keep alive'}
                            </div>
                        </div>
                    </div>
                    <span className="dashboard-card-action" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
                        View →
                    </span>
                </div>

                {/* College Date Active Program Card (Strictly Female Ambassador Cohort) */}
                {isFemale && (
                    <div 
                        className="dashboard-active-program-card" 
                        onClick={() => setActiveModalOpen(true)}
                        role="button"
                        tabIndex={0}
                        aria-label="College Date Active Program"
                    >
                        <div className="dashboard-card-left">
                            <span className="dashboard-card-icon">⚡</span>
                            <div className="dashboard-card-info">
                                <div className="dashboard-card-title" style={{ color: 'var(--text-primary)' }}>
                                    College Date Active: <span style={{ color: '#d97706' }}>₦{activeEarnings?.toLocaleString()}</span>
                                </div>
                                <div className={`dashboard-card-subtitle ${todayQualified ? 'streak-active' : ''}`} style={{ color: todayQualified ? '#16a34a' : 'var(--text-secondary)' }}>
                                    {todayQualified ? `✓ Today's +₦${dailyReward || 625} Qualified` : `${qualifyingDaysCount || 0}/${minQualifyingDays || 24} qualifying days`}
                                </div>
                            </div>
                        </div>
                        <span className="dashboard-card-action">
                            View →
                        </span>
                    </div>
                )}

                {statsError && (
                    <button className="dashboard-alert" type="button" onClick={() => fetchStats(true)}>
                        {statsError} Tap to retry.
                    </button>
                )}

                <div className={`dashboard-stats ${isLoadingStats ? 'is-loading' : ''}`}>
                    {primaryStats.map((item) => (
                        <button
                            key={item.label}
                            type="button"
                            className={`stat-card ${item.to ? 'clickable' : ''}`}
                            onClick={() => item.to && navigate(item.to)}
                            disabled={!item.to}
                        >
                            <span className="stat-value">{isLoadingStats ? '...' : item.value}</span>
                            <span className="stat-label">{item.label}</span>
                        </button>
                    ))}
                    <button type="button" className="stat-card" disabled>
                        <span className="stat-value">{isLoadingStats ? '...' : stats.matches}</span>
                        <span className="stat-label">Matches</span>
                    </button>
                </div>
            </section>

            {/* Analytics for Ladies */}
            {isFemale && (
                <AnalyticsDashboard userId={currentUser.id} />
            )}

            {!isNative && (
                <section className="dashboard-install-panel">
                    <div>
                        <span className="dashboard-panel-kicker">Mobile first</span>
                        <h2>Use The College Date like a real campus app</h2>
                        <p>Install it on Android for faster access, cleaner navigation, native payments, and a more app-like experience.</p>
                    </div>
                    <AndroidInstallButton />
                </section>
            )}

            {/* Features Grid */}
            <section className="dashboard-features">
                <div className="dashboard-section-header">
                    <div>
                        <span className="dashboard-panel-kicker">What next?</span>
                        <h2 className="section-title">Your main actions</h2>
                    </div>
                    <Link to="/settings" className="dashboard-text-link">Account settings</Link>
                </div>
                <div className="features-grid">
                    {actionCards.map((card) => (
                        <FeatureCard
                            key={card.title}
                            icon={card.icon}
                            title={card.title}
                            description={card.description}
                            to={card.to}
                        />
                    ))}
                </div>
            </section>

            <ScoreStreakModal
                isOpen={streakModalOpen}
                onClose={() => setStreakModalOpen(false)}
                streak={scoreStreak}
                longestStreak={longestStreak}
                activeToday={streakActiveToday}
                nextMilestone={streakNextMilestone}
                progressToMilestone={streakProgress}
                onStartActivity={() => {
                    setStreakModalOpen(false);
                    navigate('/match');
                }}
            />

            <CollegeDateActiveModal
                isOpen={activeModalOpen}
                onClose={() => setActiveModalOpen(false)}
                userId={currentUser?.id}
            />
        </div>
    );
}

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
}
