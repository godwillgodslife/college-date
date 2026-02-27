import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getWallet } from '../services/paymentService';
import FeatureCard from '../components/FeatureCard';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import ViewerTeaser from '../components/ViewerTeaser'; // NEW
import AndroidInstallButton from '../components/AndroidInstallButton';
import './Dashboard.css';

export default function Dashboard() {
    const { currentUser, userProfile } = useAuth();

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

    useEffect(() => {
        if (!currentUser) return;

        fetchStats();

        // Subscribe to real-time updates for dashboard stats
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
            // 2. Listen for new matches
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'matches'
            }, (payload) => {
                if (payload.new.user1_id === currentUser.id || payload.new.user2_id === currentUser.id) {
                    console.log('💖 Dashboard: New match detected');
                    setStats(prev => ({ ...prev, matches: prev.matches + 1 }));
                }
            })
            // 3. Listen for new gifts/transactions
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
                // Also trigger a partial re-fetch to ensure sync
                fetchStats(false);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(dashboardChannel);
        };
    }, [currentUser]);

    async function fetchStats(showLoading = true) {
        try {
            // Count Matches
            const { count: matchCount } = await supabase
                .from('matches')
                .select('*', { count: 'exact', head: true })
                .or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`);

            // Count Messages (Sent by user)
            const { count: msgCount } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('sender_id', currentUser.id);

            // Get Wallet Detailed Info
            const { data: wallet } = await supabase
                .from('wallets')
                .select('*')
                .eq('user_id', currentUser.id)
                .single();

            // Count Gifts Received
            const { count: giftCount } = await supabase
                .from('wallet_transactions')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', currentUser.id)
                .eq('type', 'gift_received');

            // Count Profile Views (Last 24h)
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const { count: viewCount } = await supabase
                .from('profile_views')
                .select('*', { count: 'exact', head: true })
                .eq('profile_owner_id', currentUser.id)
                .gt('created_at', twentyFourHoursAgo);

            setStats({
                matches: matchCount || 0,
                messages: msgCount || 0,
                balance: wallet?.available_balance || 0,
                pendingBalance: wallet?.pending_balance || 0,
                totalEarned: wallet?.total_earned || 0,
                freeSwipes: userProfile?.free_swipes || 0,
                giftsReceived: giftCount || 0,
                viewerCount: viewCount || 0
            });
        } catch (err) {
            console.error('Error fetching dashboard stats:', err);
        }
    }

    const displayName = userProfile?.full_name
        || userProfile?.username
        || currentUser?.email?.split('@')[0]
        || 'there';

    const greeting = getGreeting();

    return (
        <div className="dashboard">
            {/* Hero Section */}
            <section className="dashboard-hero">
                <div className="dashboard-hero-content">
                    <h1 className="dashboard-greeting">
                        {greeting}, <span className="dashboard-name">{displayName}</span> 👋
                    </h1>
                    <p className="dashboard-tagline">Ready to find your campus match?</p>
                    <AndroidInstallButton />
                </div>

                {/* Who Viewed You Teaser (Social Proof/Curiosity) */}
                <ViewerTeaser count={stats.viewerCount} />

                <div className="dashboard-stats">
                    {userProfile?.role === 'Male' ? (
                        <>
                            <div className="stat-card clickable" onClick={() => window.location.href = '/wallet'}>
                                <span className="stat-value">₦{stats.balance.toLocaleString()}</span>
                                <span className="stat-label">Balance</span>
                            </div>
                            <div className="stat-card">
                                <span className="stat-value">{stats.freeSwipes}</span>
                                <span className="stat-label">Free Swipes</span>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="stat-card clickable" onClick={() => window.location.href = '/wallet'}>
                                <span className="stat-value">₦{stats.balance.toLocaleString()}</span>
                                <span className="stat-label">Earnings</span>
                            </div>
                            <div className="stat-card">
                                <span className="stat-value">₦{stats.pendingBalance.toLocaleString()}</span>
                                <span className="stat-label">Pending</span>
                            </div>
                            <div className="stat-card">
                                <span className="stat-value">{stats.giftsReceived}</span>
                                <span className="stat-label">Gifts</span>
                            </div>
                        </>
                    )}
                    <div className="stat-card">
                        <span className="stat-value">{stats.matches}</span>
                        <span className="stat-label">Matches</span>
                    </div>
                </div>
            </section>

            {/* Analytics for Ladies */}
            {userProfile?.role === 'Female' && (
                <AnalyticsDashboard userId={currentUser.id} />
            )}

            {/* Features Grid */}
            <section className="dashboard-features">
                <h2 className="section-title">Explore</h2>
                <div className="features-grid">
                    <FeatureCard
                        icon="💖"
                        title="Discover"
                        description="Swipe and find people you vibe with"
                        to="/discover"
                    />
                    <FeatureCard
                        icon="💬"
                        title="Chat"
                        description="Talk with your matches"
                        to="/chat"
                    />
                    <FeatureCard
                        icon="👤"
                        title="Profile"
                        description="Edit your profile and preferences"
                        to="/profile"
                    />
                </div>
            </section>
        </div>
    );
}

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
}
