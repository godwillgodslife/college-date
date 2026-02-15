import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getWallet } from '../services/paymentService';
import FeatureCard from '../components/FeatureCard';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import './Dashboard.css';

export default function Dashboard() {
    const { currentUser, userProfile } = useAuth();

    const [stats, setStats] = useState({
        matches: 0,
        messages: 0,
        balance: 0,
        pendingBalance: 0,
        totalEarned: 0,
        freeSwipes: 0
    });

    useEffect(() => {
        if (currentUser) {
            fetchStats();
        }
    }, [currentUser]);

    async function fetchStats() {
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

            setStats({
                matches: matchCount || 0,
                messages: msgCount || 0,
                balance: wallet?.available_balance || 0,
                pendingBalance: wallet?.pending_balance || 0,
                totalEarned: wallet?.total_earned || 0,
                freeSwipes: userProfile?.free_swipes || 0
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
                </div>

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
                        icon="📸"
                        title="Status Updates"
                        description="Share moments that disappear in 24 hours"
                        to="/status"
                    />
                    <FeatureCard
                        icon="✨"
                        title="Snapshots"
                        description="Post ephemeral campus photos for 24 hours"
                        to="/snapshots"
                    />
                    <FeatureCard
                        icon="🎁"
                        title="Referrals"
                        description="Invite friends and earn rewards"
                        to="/referrals"
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
