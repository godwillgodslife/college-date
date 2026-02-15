import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import LoadingSpinner from './LoadingSpinner';
import './AnalyticsDashboard.css';

export default function AnalyticsDashboard({ userId }) {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userId) fetchAnalytics();
    }, [userId]);

    async function fetchAnalytics() {
        setLoading(true);
        try {
            // 1. Get Profile Views (Last 7 days)
            const { count: viewCount } = await supabase
                .from('profile_views')
                .select('*', { count: 'exact', head: true })
                .eq('profile_owner_id', userId);

            // 2. Get Swipe Stats
            const { data: swipeData } = await supabase
                .from('swipes')
                .select('status, type')
                .eq('swiped_id', userId);

            const totalRequests = swipeData?.length || 0;
            const acceptedRequests = swipeData?.filter(s => s.status === 'accepted').length || 0;
            const premiumRequests = swipeData?.filter(s => s.type === 'premium').length || 0;

            const acceptanceRate = totalRequests > 0
                ? Math.round((acceptedRequests / totalRequests) * 100)
                : 0;

            setStats({
                views: viewCount || 0,
                totalRequests,
                acceptanceRate,
                premiumRequests
            });
        } catch (err) {
            console.error('Analytics Fetch Error:', err);
        } finally {
            setLoading(false);
        }
    }

    if (loading) return <div className="analytics-loading"><LoadingSpinner /></div>;
    if (!stats) return null;

    return (
        <div className="analytics-dashboard animated fadeIn">
            <h2 className="analytics-title">Engagement Insights</h2>
            <div className="analytics-grid">
                <div className="analytics-card">
                    <span className="card-label">Profile Views</span>
                    <span className="card-value">{stats.views.toLocaleString()}</span>
                    <div className="card-trend positive">↑ High reach</div>
                </div>

                <div className="analytics-card">
                    <span className="card-label">Swipe Requests</span>
                    <span className="card-value">{stats.totalRequests}</span>
                    <div className="card-trend">{stats.premiumRequests} Premium</div>
                </div>

                <div className="analytics-card">
                    <span className="card-label">Acceptance Rate</span>
                    <span className="card-value">{stats.acceptanceRate}%</span>
                    <div className="card-progress">
                        <div className="progress-bar" style={{ width: `${stats.acceptanceRate}%` }} />
                    </div>
                </div>
            </div>
        </div>
    );
}
