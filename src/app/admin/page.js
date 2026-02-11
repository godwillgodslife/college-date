'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AdminOverviewPage() {
    const supabase = createClient();
    const [stats, setStats] = useState({
        totalUsers: 0,
        maleUsers: 0,
        femaleUsers: 0,
        totalSwipes: 0,
        paidSwipes: 0,
        totalRevenue: 0,
        platformEarnings: 0,
        pendingWithdrawals: 0,
    });
    const [recentSwipes, setRecentSwipes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            // User stats
            const { count: totalUsers } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true });

            const { count: maleUsers } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('gender', 'male');

            const { count: femaleUsers } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('gender', 'female');

            // Swipe stats
            const { count: totalSwipes } = await supabase
                .from('swipes')
                .select('*', { count: 'exact', head: true });

            const { count: paidSwipes } = await supabase
                .from('swipes')
                .select('*', { count: 'exact', head: true })
                .eq('is_paid', true);

            // Transaction stats
            const { data: txns } = await supabase
                .from('transactions')
                .select('amount, platform_fee')
                .eq('status', 'completed')
                .eq('type', 'swipe_payment');

            const totalRevenue = (txns || []).reduce((sum, t) => sum + Number(t.amount), 0);
            const platformEarnings = (txns || []).reduce((sum, t) => sum + Number(t.platform_fee), 0);

            // Pending withdrawals
            const { count: pendingWithdrawals } = await supabase
                .from('withdrawal_requests')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending');

            setStats({
                totalUsers: totalUsers || 0,
                maleUsers: maleUsers || 0,
                femaleUsers: femaleUsers || 0,
                totalSwipes: totalSwipes || 0,
                paidSwipes: paidSwipes || 0,
                totalRevenue,
                platformEarnings,
                pendingWithdrawals: pendingWithdrawals || 0,
            });

            // Recent swipes
            const { data: recent } = await supabase
                .from('swipes')
                .select('*, swiper:profiles!swipes_swiper_id_fkey(full_name), swiped:profiles!swipes_swiped_id_fkey(full_name)')
                .order('created_at', { ascending: false })
                .limit(10);

            setRecentSwipes(recent || []);
        } catch (err) {
            console.error('Stats error:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) =>
        new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div>
            <h1 className="page-title" style={{ marginBottom: 24 }}>📊 Dashboard Overview</h1>

            <div className="stat-grid">
                <div className="stat-card">
                    <div className="stat-card-label">Total Users</div>
                    <div className="stat-card-value">{stats.totalUsers}</div>
                    <div className="stat-card-change positive">
                        👨 {stats.maleUsers} male · 👩 {stats.femaleUsers} female
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-label">Total Swipes</div>
                    <div className="stat-card-value">{stats.totalSwipes}</div>
                    <div className="stat-card-change positive">
                        💳 {stats.paidSwipes} paid
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-label">Total Revenue</div>
                    <div className="stat-card-value" style={{ color: 'var(--success)' }}>
                        {formatCurrency(stats.totalRevenue)}
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-label">Platform Earnings</div>
                    <div className="stat-card-value" style={{ color: 'var(--accent)' }}>
                        {formatCurrency(stats.platformEarnings)}
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-label">Pending Withdrawals</div>
                    <div className="stat-card-value" style={{ color: stats.pendingWithdrawals > 0 ? 'var(--warning)' : 'var(--text-secondary)' }}>
                        {stats.pendingWithdrawals}
                    </div>
                </div>
            </div>

            {/* Recent Swipes */}
            <div className="card" style={{ marginTop: 8 }}>
                <h3 style={{ marginBottom: 16, fontWeight: 600 }}>Recent Swipe Activity</h3>
                {recentSwipes.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>No swipe activity yet</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Swiper</th>
                                    <th>Swiped</th>
                                    <th>Direction</th>
                                    <th>Type</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentSwipes.map((s) => (
                                    <tr key={s.id}>
                                        <td>{s.swiper?.full_name || 'Unknown'}</td>
                                        <td>{s.swiped?.full_name || 'Unknown'}</td>
                                        <td>
                                            <span className={`badge ${s.direction === 'right' ? 'badge-success' : 'badge-danger'}`}>
                                                {s.direction === 'right' ? '❤️ Like' : '✕ Pass'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${s.is_paid ? 'badge-info' : 'badge-warning'}`}>
                                                {s.is_paid ? '💳 Paid' : '⚡ Free'}
                                            </span>
                                        </td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                            {new Date(s.created_at).toLocaleDateString('en-NG')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
