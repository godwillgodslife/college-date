import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import './AdminDashboard.css';

// ── Helpers ───────────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString();
const fmtCurrency = (n) => `₦${fmt(n)}`;
const fmtK = (n) => n >= 1000 ? `₦${(n / 1000).toFixed(1)}k` : fmtCurrency(n);

// ── Mini Bar Chart ────────────────────────────────────────────
function BarChart({ data = [], labelKey = 'date', valueKey = 'count', color = '#38bdf8', prefix = '' }) {
    const max = Math.max(...data.map(d => d[valueKey] || 0), 1);
    return (
        <div className="bar-chart">
            {data.map((d, i) => (
                <div key={i} className="bar-item">
                    <div className="bar-track">
                        <div
                            className="bar-fill"
                            style={{ height: `${Math.max(4, (d[valueKey] / max) * 100)}%`, background: color }}
                            title={`${prefix}${fmt(d[valueKey])}`}
                        />
                    </div>
                    <span className="bar-label">{String(d[labelKey] || '').slice(5)}</span>
                </div>
            ))}
        </div>
    );
}

// ── User Profile Drawer ───────────────────────────────────────
function UserDrawer({ user, onClose }) {
    const [wallet, setWallet] = useState(null);
    const [txns, setTxns] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            setLoading(true);
            const [{ data: w }, { data: t }] = await Promise.all([
                supabase.from('wallets').select('*').eq('user_id', user.id).single(),
                supabase.from('wallet_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
            ]);
            setWallet(w);
            setTxns(t || []);
            setLoading(false);
        }
        load();
    }, [user.id]);

    return (
        <div className="user-drawer-overlay" onClick={onClose}>
            <div className="user-drawer" onClick={e => e.stopPropagation()}>
                <button className="drawer-close" onClick={onClose}>✕</button>
                <div className="drawer-avatar-row">
                    <img src={user.avatar_url || '/default-avatar.png'} alt="" className="drawer-avatar" />
                    <div>
                        <h2>{user.full_name} {user.is_verified && '✓'}</h2>
                        <p>{user.university}</p>
                        <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{user.email}</p>
                    </div>
                </div>
                <div className="drawer-stats">
                    <div className="drawer-stat">
                        <span className="dstat-label">Earned</span>
                        <span className="dstat-value" style={{ color: '#4ade80' }}>{fmtCurrency(wallet?.total_earned)}</span>
                    </div>
                    <div className="drawer-stat">
                        <span className="dstat-label">Spent</span>
                        <span className="dstat-value" style={{ color: '#f87171' }}>{fmtCurrency(wallet?.total_spent)}</span>
                    </div>
                    <div className="drawer-stat">
                        <span className="dstat-label">Gender</span>
                        <span className="dstat-value" style={{ textTransform: 'capitalize' }}>{user.gender || '—'}</span>
                    </div>
                    <div className="drawer-stat">
                        <span className="dstat-label">University</span>
                        <span className="dstat-value" style={{ fontSize: '0.85rem' }}>{user.university || '—'}</span>
                    </div>
                </div>
                <h4 style={{ margin: '16px 0 8px', color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase' }}>Recent Transactions</h4>
                {loading ? <div className="admin-loading" style={{ height: '80px' }}>Loading...</div> : (
                    <div className="drawer-txn-list">
                        {txns.length === 0 ? <p style={{ color: '#475569', textAlign: 'center' }}>No transactions</p> : txns.map(t => (
                            <div key={t.id} className="drawer-txn">
                                <span className="txn-desc">{t.description || t.type}</span>
                                <span className={`txn-amount ${t.type === 'credit' ? 'credit' : 'debit'}`}>
                                    {t.type === 'credit' ? '+' : '-'}{fmtCurrency(t.amount)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Main Dashboard ────────────────────────────────────────────
export default function AdminDashboard() {
    const { currentUser } = useAuth();
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState('overview');

    // ── Overview State
    const [stats, setStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(false);

    // ── Analytics State
    const [analytics, setAnalytics] = useState(null);
    const [loadingAnalytics, setLoadingAnalytics] = useState(false);

    // ── User Management State
    const [searchQuery, setSearchQuery] = useState('');
    const [usersList, setUsersList] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState(new Set());
    const [viewUser, setViewUser] = useState(null);

    // ── Content Moderation State
    const [confessions, setConfessions] = useState([]);
    const [reports, setReports] = useState([]);
    const [loadingConfessions, setLoadingConfessions] = useState(false);
    const [contentSubTab, setContentSubTab] = useState('all');
    const [keywords, setKeywords] = useState([]);
    const [newKeyword, setNewKeyword] = useState('');

    // ── Finance State
    const [wallets, setWallets] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loadingFinance, setLoadingFinance] = useState(false);
    const [financeSubTab, setFinanceSubTab] = useState('payouts');
    const [promoCode, setPromoCode] = useState('');
    const [promoDiscount, setPromoDiscount] = useState(10);
    const [promoMaxUses, setPromoMaxUses] = useState(100);
    const [promoCodes, setPromoCodes] = useState([]);
    const [txnFilter, setTxnFilter] = useState({ university: '', gender: '' });

    // ── App Controls State
    const [appConfig, setAppConfig] = useState({});
    const [loadingConfig, setLoadingConfig] = useState(false);
    const [pushTitle, setPushTitle] = useState('');
    const [pushBody, setPushBody] = useState('');
    const [pushSegment, setPushSegment] = useState('Total Subscriptions');
    const [isPushing, setIsPushing] = useState(false);
    const [bannerText, setBannerText] = useState('');
    const [swipeLimit, setSwipeLimit] = useState(10);

    useEffect(() => {
        if (activeTab === 'overview') loadStats();
        else if (activeTab === 'analytics') loadAnalytics();
        else if (activeTab === 'users') searchUsers('');
        else if (activeTab === 'content') loadConfessions();
        else if (activeTab === 'finance') loadFinance();
        else if (activeTab === 'controls') loadConfig();
    }, [activeTab]);

    // ── Data Loaders ──────────────────────────────────────────

    const loadStats = async () => {
        setLoadingStats(true);
        try {
            const { data, error } = await supabase.rpc('admin_get_dashboard_stats');
            if (error) throw error;
            setStats(data);
        } catch (err) {
            console.error('Failed to load stats:', err);
        } finally { setLoadingStats(false); }
    };

    const loadAnalytics = async () => {
        setLoadingAnalytics(true);
        try {
            const { data, error } = await supabase.rpc('admin_get_analytics');
            if (error) throw error;
            setAnalytics(data);
        } catch (err) {
            console.error('Analytics error:', err);
            addToast('Could not load analytics', 'error');
        } finally { setLoadingAnalytics(false); }
    };

    const searchUsers = async (q = searchQuery) => {
        setLoadingUsers(true);
        try {
            let query = supabase
                .from('profiles')
                .select('id, full_name, email, gender, university, avatar_url, is_banned, is_shadow_banned, is_verified')
                .order('created_at', { ascending: false })
                .limit(50);
            if (q.trim()) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
            const { data, error } = await query;
            if (error) throw error;
            setUsersList(data || []);
            setSelectedUsers(new Set());
        } catch (err) {
            console.error('Failed to load users:', err);
        } finally { setLoadingUsers(false); }
    };

    const loadConfessions = async () => {
        setLoadingConfessions(true);
        try {
            const [{ data: c }, { data: r }] = await Promise.all([
                supabase.from('confessions').select('id, content, university, user_id, created_at').order('created_at', { ascending: false }).limit(50),
                supabase.from('confession_reports').select('*, confessions(content, university)').eq('status', 'pending').order('created_at', { ascending: false }),
            ]);
            setConfessions(c || []);
            setReports(r || []);
            // Load keywords from app_config
            const { data: kw } = await supabase.from('app_config').select('value').eq('key', 'banned_keywords').single();
            setKeywords(Array.isArray(kw?.value) ? kw.value : []);
        } catch (err) {
            console.error('Content error:', err);
        } finally { setLoadingConfessions(false); }
    };

    const loadFinance = async () => {
        setLoadingFinance(true);
        try {
            const [{ data: w, error: we }, { data: t, error: te }, { data: promo }] = await Promise.all([
                supabase.rpc('admin_get_wallets'),
                supabase.rpc('admin_get_transactions', { p_limit: 100, p_offset: 0 }),
                supabase.from('promo_codes').select('*').order('created_at', { ascending: false }),
            ]);
            if (we) throw we;
            if (te) throw te;
            setWallets(w || []);
            setTransactions(t || []);
            setPromoCodes(promo || []);
        } catch (err) {
            console.error('Finance error:', err);
            addToast('Could not load finance data', 'error');
        } finally { setLoadingFinance(false); }
    };

    const loadConfig = async () => {
        setLoadingConfig(true);
        try {
            const { data, error } = await supabase.from('app_config').select('*');
            if (error) throw error;
            const map = {};
            data.forEach(item => { map[item.key] = item.value; });
            setAppConfig(map);
            setBannerText(map['banner_message'] || '');
            setSwipeLimit(Number(map['free_daily_swipes']) || 10);
        } catch (err) {
            console.error('Config error:', err);
        } finally { setLoadingConfig(false); }
    };

    // ── Actions ───────────────────────────────────────────────

    const handleConfigToggle = async (key, newValue) => {
        try {
            const { error } = await supabase.from('app_config').update({ value: newValue }).eq('key', key);
            if (error) throw error;
            setAppConfig(prev => ({ ...prev, [key]: newValue }));
            addToast('Configuration updated', 'success');
        } catch (err) { addToast('Config update failed', 'error'); }
    };

    const toggleUserStatus = async (userId, actionType, newStatus) => {
        try {
            const rpcMap = { ban: 'admin_toggle_ban', shadow: 'admin_toggle_shadow_ban', verify: 'admin_toggle_verify' };
            const paramMap = { ban: { p_user_id: userId, p_ban_status: newStatus }, shadow: { p_user_id: userId, p_shadow_status: newStatus }, verify: { p_user_id: userId, p_verify_status: newStatus } };
            const { error } = await supabase.rpc(rpcMap[actionType], paramMap[actionType]);
            if (error) throw error;
            addToast('User status updated', 'success');
            setUsersList(prev => prev.map(u => {
                if (u.id !== userId) return u;
                const patch = { ban: 'is_banned', shadow: 'is_shadow_banned', verify: 'is_verified' };
                return { ...u, [patch[actionType]]: newStatus };
            }));
        } catch (err) { addToast(`Action failed: ${err.message}`, 'error'); }
    };

    const bulkAction = async (actionType) => {
        if (selectedUsers.size === 0) return addToast('No users selected', 'error');
        if (!window.confirm(`Apply "${actionType}" to ${selectedUsers.size} users?`)) return;
        let success = 0;
        for (const uid of selectedUsers) {
            const user = usersList.find(u => u.id === uid);
            if (!user) continue;
            try {
                const status = actionType === 'ban' ? !user.is_banned : actionType === 'shadow' ? !user.is_shadow_banned : !user.is_verified;
                await toggleUserStatus(uid, actionType, status);
                success++;
            } catch { }
        }
        addToast(`Updated ${success} users`, 'success');
        setSelectedUsers(new Set());
    };

    const handleDeleteConfession = async (id) => {
        if (!window.confirm('Delete this confession?')) return;
        try {
            const { error } = await supabase.rpc('admin_moderate_confession', { p_confession_id: id, p_action: 'delete' });
            if (error) throw error;
            setConfessions(prev => prev.filter(c => c.id !== id));
            addToast('Confession deleted', 'success');
        } catch (err) { addToast('Delete failed', 'error'); }
    };

    const handleDismissReport = async (reportId, confessionId) => {
        try {
            await supabase.from('confession_reports').update({ status: 'dismissed' }).eq('id', reportId);
            setReports(prev => prev.filter(r => r.id !== reportId));
            addToast('Report dismissed', 'success');
        } catch (err) { addToast('Error', 'error'); }
    };

    const handleDeleteReported = async (reportId, confessionId) => {
        await handleDeleteConfession(confessionId);
        await supabase.from('confession_reports').update({ status: 'reviewed' }).eq('id', reportId);
        setReports(prev => prev.filter(r => r.id !== reportId));
    };

    const addKeyword = async () => {
        if (!newKeyword.trim()) return;
        const updated = [...keywords, newKeyword.trim().toLowerCase()];
        try {
            await supabase.from('app_config').upsert({ key: 'banned_keywords', value: updated });
            setKeywords(updated);
            setNewKeyword('');
            addToast('Keyword added', 'success');
        } catch { addToast('Error', 'error'); }
    };

    const removeKeyword = async (kw) => {
        const updated = keywords.filter(k => k !== kw);
        try {
            await supabase.from('app_config').upsert({ key: 'banned_keywords', value: updated });
            setKeywords(updated);
        } catch { addToast('Error', 'error'); }
    };

    const createPromoCode = async () => {
        if (!promoCode.trim()) return addToast('Enter a promo code', 'error');
        try {
            const { error } = await supabase.from('promo_codes').insert({ code: promoCode.toUpperCase().trim(), discount_percent: promoDiscount, max_uses: promoMaxUses, created_by: currentUser.id });
            if (error) throw error;
            addToast('Promo code created!', 'success');
            setPromoCode('');
            const { data } = await supabase.from('promo_codes').select('*').order('created_at', { ascending: false }).limit(20);
            setPromoCodes(data || []);
        } catch (err) { addToast(`Error: ${err.message}`, 'error'); }
    };

    const deactivatePromo = async (id) => {
        await supabase.from('promo_codes').update({ is_active: false }).eq('id', id);
        setPromoCodes(prev => prev.map(p => p.id === id ? { ...p, is_active: false } : p));
    };

    const saveBanner = async () => {
        await handleConfigToggle('banner_message', bannerText);
        await handleConfigToggle('banner_active', bannerText.trim().length > 0);
    };

    const saveSwipeLimit = async () => {
        await handleConfigToggle('free_daily_swipes', Number(swipeLimit));
    };

    const filteredTransactions = transactions.filter(t =>
        (!txnFilter.university || t.university?.toLowerCase().includes(txnFilter.university.toLowerCase())) &&
        (!txnFilter.gender || t.gender?.toLowerCase() === txnFilter.gender.toLowerCase())
    );

    const toggleSelectUser = (id) => {
        setSelectedUsers(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const selectAll = () => setSelectedUsers(new Set(usersList.map(u => u.id)));
    const clearSelection = () => setSelectedUsers(new Set());

    // ── Render ────────────────────────────────────────────────
    return (
        <div className="admin-dashboard">
            <header className="admin-header">
                <div className="admin-logo-area">
                    <span className="admin-icon">🛡️</span>
                    <h1>Control Tower</h1>
                </div>
                <div className="admin-user">Admin: {currentUser?.email}</div>
            </header>

            <div className="admin-content">
                <nav className="admin-sidebar">
                    {[
                        ['overview', '📊', 'Overview'],
                        ['analytics', '📈', 'Analytics'],
                        ['users', '👥', 'Users'],
                        ['content', '🛡️', 'Content'],
                        ['finance', '💰', 'Finance'],
                        ['controls', '⚙️', 'Controls'],
                    ].map(([tab, icon, label]) => (
                        <button key={tab} className={`admin-nav-item ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                            {icon} {label}
                        </button>
                    ))}
                </nav>

                <main className="admin-main">

                    {/* ── OVERVIEW ─────────────────────────── */}
                    {activeTab === 'overview' && (
                        <div className="admin-panel animate-fade-in-up">
                            <div className="panel-header-row">
                                <h2>Executive Overview</h2>
                                <button className="btn-refresh" onClick={loadStats}>↻ Refresh</button>
                            </div>
                            {loadingStats ? <div className="admin-loading">Loading metrics...</div> : (
                                <>
                                    <div className="metric-cards-grid">
                                        <div className="metric-card"><h3>Total Revenue</h3><div className="metric-value">{fmtCurrency(stats?.totalRevenue)}</div></div>
                                        <div className="metric-card"><h3>Today's Earnings</h3><div className="metric-value">{fmtCurrency(stats?.todayRevenue)}</div></div>
                                        <div className="metric-card highlight-metric"><h3>Pending Payouts</h3><div className="metric-value">{fmtCurrency(stats?.pendingPayouts)}</div><div className="metric-subtext">Female Earnings</div></div>
                                        <div className="metric-card"><h3>DAU</h3><div className="metric-value">{fmt(stats?.dau)}</div><div className="metric-subtext">Active last 24h</div></div>
                                    </div>
                                    <div className="admin-charts-section">
                                        <div className="leaderboard-card">
                                            <h3>Campus Leaderboard</h3>
                                            <div className="campus-list">
                                                {stats?.universityStats?.map((u, i) => (
                                                    <div key={i} className="campus-row">
                                                        <span className="campus-name">{u.university}</span>
                                                        <span className="campus-count">{u.count} users</span>
                                                    </div>
                                                )) || <div className="no-data">No data</div>}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* ── ANALYTICS ────────────────────────── */}
                    {activeTab === 'analytics' && (
                        <div className="admin-panel animate-fade-in-up">
                            <div className="panel-header-row">
                                <h2>Analytics & Reporting</h2>
                                <button className="btn-refresh" onClick={loadAnalytics}>↻ Refresh</button>
                            </div>
                            {loadingAnalytics ? <div className="admin-loading">Loading analytics...</div> : !analytics ? <div className="no-data">No data yet</div> : (
                                <div className="analytics-grid">
                                    {/* Signups Chart */}
                                    <div className="admin-card">
                                        <h3>📅 New Signups (Last 7 Days)</h3>
                                        <BarChart data={analytics?.dailySignups || []} labelKey="date" valueKey="count" color="#38bdf8" />
                                    </div>
                                    {/* Revenue Chart */}
                                    <div className="admin-card">
                                        <h3>💸 Daily Revenue (Last 7 Days)</h3>
                                        <BarChart data={analytics?.dailyRevenue || []} labelKey="date" valueKey="total" color="#4ade80" prefix="₦" />
                                    </div>
                                    {/* Gender Split */}
                                    <div className="admin-card">
                                        <h3>⚧ Gender Split</h3>
                                        <div className="gender-split">
                                            <div className="gender-bar-row">
                                                <span>Male</span>
                                                <div className="gender-bar-bg">
                                                    <div className="gender-bar male" style={{ width: `${(analytics?.genderSplit?.male / Math.max(analytics?.genderSplit?.male + analytics?.genderSplit?.female, 1)) * 100}%` }} />
                                                </div>
                                                <span>{fmt(analytics?.genderSplit?.male)}</span>
                                            </div>
                                            <div className="gender-bar-row">
                                                <span>Female</span>
                                                <div className="gender-bar-bg">
                                                    <div className="gender-bar female" style={{ width: `${(analytics?.genderSplit?.female / Math.max(analytics?.genderSplit?.male + analytics?.genderSplit?.female, 1)) * 100}%` }} />
                                                </div>
                                                <span>{fmt(analytics?.genderSplit?.female)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Top Spenders */}
                                    <div className="admin-card">
                                        <h3>🏆 Top Spenders</h3>
                                        <div className="top-spenders-list">
                                            {(analytics?.topSpenders || []).map((s, i) => (
                                                <div key={i} className="top-spender-row">
                                                    <span className="ts-rank">#{i + 1}</span>
                                                    <span className="ts-name">{s.full_name}</span>
                                                    <span className="ts-uni">{s.university}</span>
                                                    <span className="ts-amount">{fmtK(s.total_spent)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    {/* University Stats */}
                                    <div className="admin-card full-width">
                                        <h3>🎓 University Breakdown</h3>
                                        <div className="admin-table-container" style={{ marginTop: 0 }}>
                                            <table className="admin-table">
                                                <thead><tr><th>University</th><th>Total Users</th><th>Males</th><th>Females</th></tr></thead>
                                                <tbody>
                                                    {(analytics?.universityStats || []).map((u, i) => (
                                                        <tr key={i}>
                                                            <td>{u.university}</td>
                                                            <td>{fmt(u.user_count)}</td>
                                                            <td>{fmt(u.males)}</td>
                                                            <td>{fmt(u.females)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── USER MANAGEMENT ──────────────────── */}
                    {activeTab === 'users' && (
                        <div className="admin-panel animate-fade-in-up">
                            <h2>User Management</h2>
                            <div className="user-search-bar">
                                <input type="text" placeholder="Search by Name or Email..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchUsers()} className="admin-search-input" />
                                <button className="btn-search" onClick={() => searchUsers()}>Search</button>
                            </div>

                            {selectedUsers.size > 0 && (
                                <div className="bulk-action-bar">
                                    <span>{selectedUsers.size} selected</span>
                                    <button className="btn-action btn-verify" onClick={() => bulkAction('verify')}>✓ Bulk Verify</button>
                                    <button className="btn-action btn-ban" onClick={() => bulkAction('ban')}>⛔ Bulk Ban</button>
                                    <button className="btn-action btn-shadow" onClick={() => bulkAction('shadow')}>👻 Bulk Shadow</button>
                                    <button className="btn-action" style={{ borderColor: '#475569', color: '#94a3b8' }} onClick={clearSelection}>Clear</button>
                                </div>
                            )}

                            {loadingUsers ? <div className="admin-loading">Loading users...</div> : (
                                <div className="admin-table-container">
                                    <table className="admin-table">
                                        <thead>
                                            <tr>
                                                <th><input type="checkbox" onChange={e => e.target.checked ? selectAll() : clearSelection()} /></th>
                                                <th>User</th><th>Gender</th><th>University</th><th>Status</th><th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {usersList.length === 0 ? (
                                                <tr><td colSpan="6" className="text-center">No users found</td></tr>
                                            ) : (
                                                usersList.map(user => (
                                                    <tr key={user.id} className={user.is_banned ? 'row-banned' : ''}>
                                                        <td><input type="checkbox" checked={selectedUsers.has(user.id)} onChange={() => toggleSelectUser(user.id)} /></td>
                                                        <td>
                                                            <div className="user-cell-info" style={{ cursor: 'pointer' }} onClick={() => setViewUser(user)}>
                                                                <img src={user.avatar_url || '/default-avatar.png'} alt="" className="admin-avatar" />
                                                                <div>
                                                                    <strong>{user.full_name} {user.is_verified && '✓'}</strong>
                                                                    <div className="user-email">{user.email}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="capitalize">{user.gender}</td>
                                                        <td>{user.university}</td>
                                                        <td>
                                                            {user.is_banned && <span className="status-badge banned">Banned</span>}
                                                            {user.is_shadow_banned && <span className="status-badge shadow">Shadow</span>}
                                                            {!user.is_banned && !user.is_shadow_banned && <span className="status-badge active">Active</span>}
                                                        </td>
                                                        <td className="actions-cell">
                                                            <button className={`btn-action ${user.is_verified ? 'btn-unverify' : 'btn-verify'}`} onClick={() => toggleUserStatus(user.id, 'verify', !user.is_verified)}>{user.is_verified ? 'Unverify' : 'Verify'}</button>
                                                            <button className={`btn-action ${user.is_banned ? 'btn-unban' : 'btn-ban'}`} onClick={() => toggleUserStatus(user.id, 'ban', !user.is_banned)}>{user.is_banned ? 'Unban' : 'Ban'}</button>
                                                            <button className={`btn-action ${user.is_shadow_banned ? 'btn-unshadow' : 'btn-shadow'}`} onClick={() => toggleUserStatus(user.id, 'shadow', !user.is_shadow_banned)}>{user.is_shadow_banned ? 'Unshadow' : 'Shadow'}</button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── CONTENT MODERATION ───────────────── */}
                    {activeTab === 'content' && (
                        <div className="admin-panel animate-fade-in-up">
                            <h2>Content Moderation</h2>
                            <div className="sub-tab-bar">
                                <button className={`sub-tab-btn ${contentSubTab === 'all' ? 'active' : ''}`} onClick={() => setContentSubTab('all')}>All Confessions ({confessions.length})</button>
                                <button className={`sub-tab-btn ${contentSubTab === 'reports' ? 'active' : ''}`} onClick={() => setContentSubTab('reports')}>
                                    Reports {reports.length > 0 && <span className="badge-red">{reports.length}</span>}
                                </button>
                                <button className={`sub-tab-btn ${contentSubTab === 'keywords' ? 'active' : ''}`} onClick={() => setContentSubTab('keywords')}>Keyword Filters</button>
                            </div>

                            {loadingConfessions ? <div className="admin-loading">Loading...</div> : (
                                <>
                                    {contentSubTab === 'all' && (
                                        <div className="admin-confession-list">
                                            {confessions.length === 0 ? <div className="no-data">No confessions found.</div> : confessions.map(c => (
                                                <div key={c.id} className="admin-confession-card">
                                                    <div className="confession-header">
                                                        <div className="confession-author">
                                                            <span>Anonymous • {new Date(c.created_at).toLocaleString()}</span>
                                                            {c.university && <span style={{ opacity: 0.6, fontSize: '11px' }}>🎓 {c.university}</span>}
                                                        </div>
                                                        <button className="btn-action btn-ban" onClick={() => handleDeleteConfession(c.id)}>Delete</button>
                                                    </div>
                                                    <div className="confession-body">{c.content}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {contentSubTab === 'reports' && (
                                        <div className="admin-confession-list">
                                            {reports.length === 0 ? <div className="no-data">No pending reports 🎉</div> : reports.map(r => (
                                                <div key={r.id} className="admin-confession-card" style={{ borderColor: '#ef4444' }}>
                                                    <div className="confession-header">
                                                        <span style={{ color: '#f87171', fontSize: '0.8rem' }}>⚠️ Reported: {r.reason}</span>
                                                        <div className="confession-actions">
                                                            <button className="btn-action btn-verify" onClick={() => handleDismissReport(r.id, r.confession_id)}>Dismiss</button>
                                                            <button className="btn-action btn-ban" onClick={() => handleDeleteReported(r.id, r.confession_id)}>Delete Post</button>
                                                        </div>
                                                    </div>
                                                    <div className="confession-body">{r.confessions?.content || 'Content unavailable'}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>🎓 {r.confessions?.university}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {contentSubTab === 'keywords' && (
                                        <div className="admin-card" style={{ maxWidth: '600px' }}>
                                            <h3>Banned Keywords</h3>
                                            <p className="admin-subtitle">Posts containing these words will be auto-flagged.</p>
                                            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                                                <input className="admin-search-input" placeholder="Add keyword..." value={newKeyword} onChange={e => setNewKeyword(e.target.value)} onKeyDown={e => e.key === 'Enter' && addKeyword()} />
                                                <button className="btn-search" onClick={addKeyword}>Add</button>
                                            </div>
                                            <div className="keyword-list">
                                                {keywords.length === 0 ? <p style={{ color: '#475569' }}>No keywords added.</p> : keywords.map(kw => (
                                                    <span key={kw} className="keyword-chip">
                                                        {kw}
                                                        <button onClick={() => removeKeyword(kw)}>✕</button>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* ── FINANCE ──────────────────────────── */}
                    {activeTab === 'finance' && (
                        <div className="admin-panel animate-fade-in-up">
                            <div className="panel-header-row">
                                <h2>Financial Controls</h2>
                                <button className="btn-refresh" onClick={loadFinance}>↻ Refresh</button>
                            </div>
                            <div className="sub-tab-bar">
                                <button className={`sub-tab-btn ${financeSubTab === 'payouts' ? 'active' : ''}`} onClick={() => setFinanceSubTab('payouts')}>Payout Manager</button>
                                <button className={`sub-tab-btn ${financeSubTab === 'ledger' ? 'active' : ''}`} onClick={() => setFinanceSubTab('ledger')}>Transaction Ledger</button>
                                <button className={`sub-tab-btn ${financeSubTab === 'promo' ? 'active' : ''}`} onClick={() => setFinanceSubTab('promo')}>Promo Codes</button>
                            </div>

                            {loadingFinance ? <div className="admin-loading">Loading finance data...</div> : (
                                <>
                                    {financeSubTab === 'payouts' && (
                                        <div className="admin-table-container">
                                            <table className="admin-table">
                                                <thead><tr><th>Name</th><th>University</th><th>Gender</th><th>Balance</th><th>Earned</th><th>Spent</th></tr></thead>
                                                <tbody>
                                                    {wallets.length === 0 ? (
                                                        <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#475569' }}>No wallet data</td></tr>
                                                    ) : wallets.map(w => (
                                                        <tr key={w.user_id}>
                                                            <td><strong>{w.full_name}</strong></td>
                                                            <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{w.university}</td>
                                                            <td className="capitalize">{w.gender}</td>
                                                            <td>{fmtCurrency(w.balance)}</td>
                                                            <td style={{ color: '#4ade80' }}>{fmtCurrency(w.total_earned)}</td>
                                                            <td style={{ color: '#f87171' }}>{fmtCurrency(w.total_spent)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                    {financeSubTab === 'ledger' && (
                                        <>
                                            <div className="user-search-bar" style={{ marginBottom: '16px' }}>
                                                <input className="admin-search-input" placeholder="Filter by university..." value={txnFilter.university} onChange={e => setTxnFilter(p => ({ ...p, university: e.target.value }))} />
                                                <select className="admin-input" value={txnFilter.gender} onChange={e => setTxnFilter(p => ({ ...p, gender: e.target.value }))}>
                                                    <option value="">All Genders</option>
                                                    <option value="male">Male</option>
                                                    <option value="female">Female</option>
                                                </select>
                                            </div>
                                            <div className="admin-table-container">
                                                <table className="admin-table">
                                                    <thead><tr><th>User</th><th>University</th><th>Type</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
                                                    <tbody>
                                                        {filteredTransactions.length === 0 ? (
                                                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#475569' }}>No transactions found</td></tr>
                                                        ) : filteredTransactions.map(t => (
                                                            <tr key={t.id}>
                                                                <td><strong>{t.full_name || 'Unknown'}</strong></td>
                                                                <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{t.university}</td>
                                                                <td><span className={`status-badge ${t.type === 'credit' ? 'active' : 'banned'}`}>{t.type}</span></td>
                                                                <td style={{ color: t.type === 'credit' ? '#4ade80' : '#f87171' }}>{fmtCurrency(t.amount)}</td>
                                                                <td><span className="status-badge active">{t.status}</span></td>
                                                                <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{new Date(t.created_at).toLocaleDateString()}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </>
                                    )}
                                    {financeSubTab === 'promo' && (
                                        <div className="admin-controls-grid">
                                            <div className="admin-card">
                                                <h3>Create Promo Code</h3>
                                                <div className="push-form">
                                                    <div className="form-group">
                                                        <label>Code</label>
                                                        <input className="admin-input" placeholder="e.g. CAMPUS50" value={promoCode} onChange={e => setPromoCode(e.target.value.toUpperCase())} />
                                                    </div>
                                                    <div className="form-group">
                                                        <label>Discount % ({promoDiscount}%)</label>
                                                        <input type="range" min="1" max="100" value={promoDiscount} onChange={e => setPromoDiscount(e.target.value)} style={{ accentColor: '#38bdf8' }} />
                                                    </div>
                                                    <div className="form-group">
                                                        <label>Max Uses</label>
                                                        <input type="number" className="admin-input" value={promoMaxUses} onChange={e => setPromoMaxUses(Number(e.target.value))} />
                                                    </div>
                                                    <button className="btn-blast" onClick={createPromoCode}>🎟️ Create Code</button>
                                                </div>
                                            </div>
                                            <div className="admin-card">
                                                <h3>Active Promo Codes</h3>
                                                <div className="admin-table-container" style={{ marginTop: 0 }}>
                                                    <table className="admin-table">
                                                        <thead><tr><th>Code</th><th>Discount</th><th>Uses</th><th>Status</th><th></th></tr></thead>
                                                        <tbody>
                                                            {promoCodes.length === 0 ? (
                                                                <tr><td colSpan="5" style={{ textAlign: 'center', color: '#475569', padding: '1rem' }}>No promo codes yet</td></tr>
                                                            ) : promoCodes.map(p => (
                                                                <tr key={p.id}>
                                                                    <td><strong style={{ fontFamily: 'monospace', color: '#38bdf8' }}>{p.code}</strong></td>
                                                                    <td>{p.discount_percent}%</td>
                                                                    <td>{p.uses_count}/{p.max_uses}</td>
                                                                    <td><span className={`status-badge ${p.is_active ? 'active' : 'banned'}`}>{p.is_active ? 'Active' : 'Inactive'}</span></td>
                                                                    <td>{p.is_active && <button className="btn-action btn-ban" onClick={() => deactivatePromo(p.id)}>Deactivate</button>}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* ── APP CONTROLS ─────────────────────── */}
                    {activeTab === 'controls' && (
                        <div className="admin-panel animate-fade-in-up">
                            <h2>Global App Controls</h2>
                            <p className="admin-subtitle">Manage features, push notifications, and app settings</p>

                            {loadingConfig ? <div className="admin-loading">Loading config...</div> : (
                                <div className="admin-controls-grid">
                                    {/* Feature Flags */}
                                    <div className="admin-card">
                                        <h3>⚡ Feature Flags</h3>
                                        <div className="config-list">
                                            {[['leaderboard_enabled', 'Leaderboard', 'Show/hide the Hall of Fame'],
                                            ['confessions_enabled', 'Campus Secrets', 'Enable or disable confessions'],
                                            ['premium_swipes_enabled', 'Premium Swipes', 'Allow paid swipe purchases'],
                                            ['maintenance_mode', 'Maintenance Mode', 'Lock the app for all non-admins'],
                                            ].map(([key, label, desc]) => (
                                                <div key={key} className="config-item">
                                                    <div className="config-info">
                                                        <strong>{label}</strong>
                                                        <p>{desc}</p>
                                                    </div>
                                                    <label className="toggle-switch">
                                                        <input type="checkbox" checked={appConfig[key] === true || appConfig[key] === 'true'} onChange={e => handleConfigToggle(key, e.target.checked)} />
                                                        <span className="slider" />
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Swipe Limit & Banner */}
                                    <div className="admin-card">
                                        <h3>🎛️ App Settings</h3>
                                        <div className="config-list">
                                            <div className="config-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '12px' }}>
                                                <div className="config-info"><strong>Free Daily Swipes ({swipeLimit})</strong><p>Swipe limit before paying</p></div>
                                                <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                                                    <input type="range" min="1" max="50" value={swipeLimit} onChange={e => setSwipeLimit(Number(e.target.value))} style={{ flex: 1, accentColor: '#38bdf8' }} />
                                                    <button className="btn-search" onClick={saveSwipeLimit}>Save</button>
                                                </div>
                                            </div>
                                            <div className="config-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '12px' }}>
                                                <div className="config-info"><strong>📢 Announcement Banner</strong><p>Shows on top of the app for all users</p></div>
                                                <textarea className="admin-input admin-textarea" placeholder="e.g. 🎉 New feature launched!" value={bannerText} onChange={e => setBannerText(e.target.value)} rows="3" style={{ width: '100%' }} />
                                                <div style={{ display: 'flex', gap: '10px' }}>
                                                    <button className="btn-search" onClick={saveBanner}>{bannerText ? 'Publish Banner' : 'Clear Banner'}</button>
                                                    {appConfig['banner_active'] && <button className="btn-action btn-ban" onClick={() => { setBannerText(''); handleConfigToggle('banner_active', false); handleConfigToggle('banner_message', ''); }}>Remove</button>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Push Notifications */}
                                    <div className="admin-card">
                                        <h3>🚀 Push Notification Blast</h3>
                                        <div className="push-form">
                                            <div className="form-group">
                                                <label>Target Segment</label>
                                                <select value={pushSegment} onChange={e => setPushSegment(e.target.value)} className="admin-input">
                                                    <option value="Total Subscriptions">All Users</option>
                                                    <option value="Active Users">Active (Last 7 Days)</option>
                                                    <option value="Inactive Users">Inactive Users</option>
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label>Title</label>
                                                <input className="admin-input" placeholder="e.g. Happy Sunday Campus!" value={pushTitle} onChange={e => setPushTitle(e.target.value)} />
                                            </div>
                                            <div className="form-group">
                                                <label>Message</label>
                                                <textarea className="admin-input admin-textarea" placeholder="e.g. Check out the new matches waiting for you." value={pushBody} onChange={e => setPushBody(e.target.value)} rows="3" />
                                            </div>
                                            <button className="btn-blast" disabled={isPushing} onClick={() => {
                                                if (!pushTitle.trim() || !pushBody.trim()) return addToast('Title and body required', 'error');
                                                addToast('Push Blast Initiated! ⚡', 'success');
                                                setPushTitle(''); setPushBody('');
                                            }}>
                                                {isPushing ? 'Sending...' : '⚡ Send Blast'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                </main>
            </div>

            {/* User Profile Drawer */}
            {viewUser && <UserDrawer user={viewUser} onClose={() => setViewUser(null)} />}
        </div>
    );
}
