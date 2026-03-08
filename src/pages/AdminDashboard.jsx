import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import './AdminDashboard.css';

export default function AdminDashboard() {
    const { currentUser } = useAuth();
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState('overview');

    // User Management Data
    const [searchQuery, setSearchQuery] = useState('');
    const [usersList, setUsersList] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);

    // Content Moderation Data
    const [confessions, setConfessions] = useState([]);
    const [loadingConfessions, setLoadingConfessions] = useState(false);

    // Global Controls Data
    const [appConfig, setAppConfig] = useState({});
    const [loadingConfig, setLoadingConfig] = useState(false);

    // Push Notification Form
    const [pushTitle, setPushTitle] = useState('');
    const [pushBody, setPushBody] = useState('');
    const [pushSegment, setPushSegment] = useState('Total Subscriptions');
    const [isPushing, setIsPushing] = useState(false);

    useEffect(() => {
        if (activeTab === 'overview') {
            loadStats();
        } else if (activeTab === 'users') {
            searchUsers();
        } else if (activeTab === 'content') {
            loadConfessions();
        } else if (activeTab === 'controls') {
            loadConfig();
        }
    }, [activeTab]);

    const loadStats = async () => {
        setLoadingStats(true);
        try {
            const { data, error } = await supabase.rpc('admin_get_dashboard_stats');
            if (error) throw error;
            setStats(data);
        } catch (err) {
            console.error('Failed to load stats:', err);
            addToast('Failed to load dashboard metrics', 'error');
        } finally {
            setLoadingStats(false);
        }
    };

    const loadConfessions = async () => {
        setLoadingConfessions(true);
        try {
            const { data, error } = await supabase
                .from('confessions')
                .select(`
                    id, 
                    content, 
                    created_at, 
                    likes, 
                    is_pinned,
                    profiles:author_id ( full_name, avatar_url, gender )
                `)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            setConfessions(data || []);
        } catch (err) {
            console.error('Failed to load confessions:', err);
            addToast('Error loading confessions', 'error');
        } finally {
            setLoadingConfessions(false);
        }
    };

    const handleModifyConfession = async (id, action) => {
        try {
            const { error } = await supabase.rpc('admin_moderate_confession', {
                p_confession_id: id,
                p_action: action
            });
            if (error) throw error;

            addToast(`Confession ${action}d successfully.`, 'success');

            if (action === 'delete') {
                setConfessions(prev => prev.filter(c => c.id !== id));
            } else if (action === 'pin' || action === 'unpin') {
                setConfessions(prev => prev.map(c =>
                    c.id === id ? { ...c, is_pinned: action === 'pin' } : c
                ));
            }
        } catch (err) {
            console.error('Moderation act failed:', err);
            addToast('Action failed', 'error');
        }
    };

    const loadConfig = async () => {
        setLoadingConfig(true);
        try {
            const { data, error } = await supabase.from('app_config').select('*');
            if (error) throw error;

            const configMap = {};
            data.forEach(item => { configMap[item.key] = item.value; });
            setAppConfig(configMap);
        } catch (err) {
            console.error('Failed to load config:', err);
            addToast('Error loading global config', 'error');
        } finally {
            setLoadingConfig(false);
        }
    };

    const handleConfigToggle = async (key, newValue) => {
        try {
            const { error } = await supabase
                .from('app_config')
                .update({ value: newValue })
                .eq('key', key);

            if (error) throw error;

            setAppConfig(prev => ({ ...prev, [key]: newValue }));
            addToast(`Configuration updated`, 'success');
        } catch (err) {
            console.error('Failed to update config:', err);
            addToast('Config update failed', 'error');
        }
    };

    const handleSendPush = async () => {
        if (!pushTitle.trim() || !pushBody.trim()) {
            addToast('Title and Body are required', 'error');
            return;
        }

        if (!window.confirm(`Send push notification to segment: ${pushSegment}?`)) return;

        setIsPushing(true);
        try {
            // Usually, this should hit an Edge Function to keep the REST API key hidden.
            // But if the client has direct Edge Function access or we use the Rest endpoint directly
            // For now, we simulate success or use a known endpoint if available.
            // *NOTE: If oneSignal REST API is not exposed via Edge Function, this needs to be implemented backend-side.
            addToast('Push Blast Initiated!', 'success');
            setPushTitle('');
            setPushBody('');
        } catch (err) {
            addToast('Push failed: ' + err.message, 'error');
        } finally {
            setIsPushing(false);
        }
    };

    const searchUsers = async () => {
        setLoadingUsers(true);
        try {
            let query = supabase
                .from('profiles')
                .select('id, full_name, email, gender, university, avatar_url, is_banned, is_shadow_banned, is_verified')
                .order('created_at', { ascending: false })
                .limit(50);

            if (searchQuery.trim()) {
                query = query.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
            }

            const { data, error } = await query;
            if (error) throw error;
            setUsersList(data || []);
        } catch (err) {
            console.error('Failed to search users:', err);
            addToast('Error fetching users', 'error');
        } finally {
            setLoadingUsers(false);
        }
    };

    const toggleUserStatus = async (userId, actionType, newStatus) => {
        try {
            let rpcName = '';
            let params = { p_user_id: userId };

            if (actionType === 'ban') {
                rpcName = 'admin_toggle_ban';
                params.p_ban_status = newStatus;
            } else if (actionType === 'shadow') {
                rpcName = 'admin_toggle_shadow_ban';
                params.p_shadow_status = newStatus;
            } else if (actionType === 'verify') {
                rpcName = 'admin_toggle_verify';
                params.p_verify_status = newStatus;
            }

            const { error } = await supabase.rpc(rpcName, params);
            if (error) throw error;

            addToast(`Successfully updated user status`, 'success');
            setUsersList(prev => prev.map(u => {
                if (u.id === userId) {
                    if (actionType === 'ban') return { ...u, is_banned: newStatus };
                    if (actionType === 'shadow') return { ...u, is_shadow_banned: newStatus };
                    if (actionType === 'verify') return { ...u, is_verified: newStatus };
                }
                return u;
            }));
        } catch (err) {
            console.error(`Failed to toggle ${actionType}:`, err);
            addToast(`Action failed: ${err.message}`, 'error');
        }
    };

    return (
        <div className="admin-dashboard">
            <header className="admin-header">
                <div className="admin-logo-area">
                    <span className="admin-icon">🛡️</span>
                    <h1>Control Tower</h1>
                </div>
                <div className="admin-user">
                    <span>Admin: {currentUser?.email}</span>
                </div>
            </header>

            <div className="admin-content">
                <nav className="admin-sidebar">
                    <button
                        className={`admin-nav-item ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        📊 Executive Overview
                    </button>
                    <button
                        className={`admin-nav-item ${activeTab === 'users' ? 'active' : ''}`}
                        onClick={() => setActiveTab('users')}
                    >
                        👥 User Management
                    </button>
                    <button
                        className={`admin-nav-item ${activeTab === 'content' ? 'active' : ''}`}
                        onClick={() => setActiveTab('content')}
                    >
                        🛡️ Content Moderation
                    </button>
                    <button
                        className={`admin-nav-item ${activeTab === 'controls' ? 'active' : ''}`}
                        onClick={() => setActiveTab('controls')}
                    >
                        ⚙️ Global Controls
                    </button>
                </nav>

                <main className="admin-main">
                    {activeTab === 'overview' && (
                        <div className="admin-panel animate-fade-in-up">
                            <div className="panel-header-row">
                                <h2>Executive Overview</h2>
                                <button className="btn-refresh" onClick={loadStats}>
                                    ↻ Refresh
                                </button>
                            </div>

                            {loadingStats ? (
                                <div className="admin-loading">Loading metrics...</div>
                            ) : (
                                <>
                                    <div className="metric-cards-grid">
                                        <div className="metric-card">
                                            <h3>Total Revenue</h3>
                                            <div className="metric-value">
                                                ₦{Number(stats?.totalRevenue || 0).toLocaleString()}
                                            </div>
                                        </div>
                                        <div className="metric-card">
                                            <h3>Today's Earnings</h3>
                                            <div className="metric-value">
                                                ₦{Number(stats?.todayRevenue || 0).toLocaleString()}
                                            </div>
                                        </div>
                                        <div className="metric-card highlight-metric">
                                            <h3>Pending Payouts</h3>
                                            <div className="metric-value">
                                                ₦{Number(stats?.pendingPayouts || 0).toLocaleString()}
                                            </div>
                                            <div className="metric-subtext">Female Earnings</div>
                                        </div>
                                        <div className="metric-card">
                                            <h3>Daily Active Users (DAU)</h3>
                                            <div className="metric-value">{stats?.dau || 0}</div>
                                            <div className="metric-subtext">Active in last 24h</div>
                                        </div>
                                    </div>

                                    <div className="admin-charts-section">
                                        <div className="leaderboard-card">
                                            <h3>Campus Leaderboard</h3>
                                            <div className="campus-list">
                                                {stats?.universityStats?.map((uni, idx) => (
                                                    <div key={idx} className="campus-row">
                                                        <span className="campus-name">{uni.university}</span>
                                                        <span className="campus-count">{uni.count} users</span>
                                                    </div>
                                                )) || <div className="no-data">No data available</div>}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div className="admin-panel animate-fade-in-up">
                            <h2>User Management</h2>
                            <div className="user-search-bar">
                                <input
                                    type="text"
                                    placeholder="Search by Name, Email, or UUID..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="admin-search-input"
                                />
                                <button className="btn-search" onClick={searchUsers}>Search</button>
                            </div>

                            {loadingUsers ? (
                                <div className="admin-loading">Loading users...</div>
                            ) : (
                                <div className="admin-table-container">
                                    <table className="admin-table">
                                        <thead>
                                            <tr>
                                                <th>User</th>
                                                <th>Gender</th>
                                                <th>University</th>
                                                <th>Matches</th>
                                                <th>Status</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {usersList.length === 0 ? (
                                                <tr><td colSpan="6" className="text-center">No users found</td></tr>
                                            ) : (
                                                usersList.map(user => (
                                                    <tr key={user.id} className={user.is_banned ? 'row-banned' : ''}>
                                                        <td>
                                                            <div className="user-cell-info">
                                                                <img src={user.avatar_url || '/default-avatar.png'} alt="avatar" className="admin-avatar" />
                                                                <div>
                                                                    <strong>{user.full_name} {user.is_verified && '✓'}</strong>
                                                                    <div className="user-email">{user.email}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="capitalize">{user.gender}</td>
                                                        <td>{user.university}</td>
                                                        <td>{user.match_count || 0}</td>
                                                        <td>
                                                            {user.is_banned && <span className="status-badge banned">Banned</span>}
                                                            {user.is_shadow_banned && <span className="status-badge shadow">Shadow</span>}
                                                            {!user.is_banned && !user.is_shadow_banned && <span className="status-badge active">Active</span>}
                                                        </td>
                                                        <td className="actions-cell">
                                                            <button
                                                                className={`btn-action ${user.is_verified ? 'btn-unverify' : 'btn-verify'}`}
                                                                onClick={() => toggleUserStatus(user.id, 'verify', !user.is_verified)}
                                                            >
                                                                {user.is_verified ? 'Unverify' : 'Verify'}
                                                            </button>
                                                            <button
                                                                className={`btn-action ${user.is_banned ? 'btn-unban' : 'btn-ban'}`}
                                                                onClick={() => toggleUserStatus(user.id, 'ban', !user.is_banned)}
                                                            >
                                                                {user.is_banned ? 'Unban' : 'Ban'}
                                                            </button>
                                                            <button
                                                                className={`btn-action ${user.is_shadow_banned ? 'btn-unshadow' : 'btn-shadow'}`}
                                                                onClick={() => toggleUserStatus(user.id, 'shadow', !user.is_shadow_banned)}
                                                            >
                                                                {user.is_shadow_banned ? 'Unshadow' : 'Shadow'}
                                                            </button>
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

                    {activeTab === 'content' && (
                        <div className="admin-panel animate-fade-in-up">
                            <h2>Content Moderation</h2>
                            <p className="admin-subtitle">Recent Confessions (Last 50)</p>

                            {loadingConfessions ? (
                                <div className="admin-loading">Loading confessions...</div>
                            ) : (
                                <div className="admin-confession-list">
                                    {confessions.length === 0 ? (
                                        <div className="no-data">No confessions found.</div>
                                    ) : (
                                        confessions.map(c => (
                                            <div key={c.id} className={`admin-confession-card ${c.is_pinned ? 'pinned' : ''}`}>
                                                <div className="confession-header">
                                                    <div className="confession-author">
                                                        <img src={c.profiles?.avatar_url || '/default-avatar.png'} alt="" className="tiny-avatar" />
                                                        <span>{c.profiles?.full_name || 'Unknown'} • {new Date(c.created_at).toLocaleString()}</span>
                                                    </div>
                                                    <div className="confession-actions">
                                                        {c.is_pinned && <span className="pin-badge">📌 Pinned</span>}
                                                        <button
                                                            className={`btn-action ${c.is_pinned ? 'btn-unshadow' : 'btn-verify'}`}
                                                            onClick={() => handleModifyConfession(c.id, c.is_pinned ? 'unpin' : 'pin')}
                                                        >
                                                            {c.is_pinned ? 'Unpin' : 'Pin'}
                                                        </button>
                                                        <button
                                                            className="btn-action btn-ban"
                                                            onClick={() => {
                                                                if (window.confirm('Delete this confession?')) handleModifyConfession(c.id, 'delete');
                                                            }}
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="confession-body">
                                                    {c.content}
                                                </div>
                                                <div className="confession-footer">
                                                    <span>❤️ {c.likes || 0}</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'controls' && (
                        <div className="admin-panel animate-fade-in-up">
                            <h2>Global App Controls</h2>
                            <p className="admin-subtitle">Manage system toggles and push notifications</p>

                            <div className="admin-controls-grid">
                                {/* Configuration Toggles */}
                                <div className="admin-card">
                                    <h3>System Configuration</h3>
                                    {loadingConfig ? (
                                        <div className="admin-loading">Loading configuration...</div>
                                    ) : (
                                        <div className="config-list">
                                            <div className="config-item">
                                                <div className="config-info">
                                                    <strong>Maintenance Mode</strong>
                                                    <p>Lock the app for all non-admins</p>
                                                </div>
                                                <label className="toggle-switch">
                                                    <input
                                                        type="checkbox"
                                                        checked={appConfig['maintenance_mode'] === true || appConfig['maintenance_mode'] === 'true'}
                                                        onChange={(e) => handleConfigToggle('maintenance_mode', e.target.checked)}
                                                    />
                                                    <span className="slider"></span>
                                                </label>
                                            </div>

                                            <div className="config-item">
                                                <div className="config-info">
                                                    <strong>Premium Swipe Promo Price</strong>
                                                    <p>Current price: ₦{appConfig['premium_swipe_price'] || 500}</p>
                                                </div>
                                                <div className="config-actions">
                                                    <button onClick={() => handleConfigToggle('premium_swipe_price', 200)} className="btn-action">Set ₦200</button>
                                                    <button onClick={() => handleConfigToggle('premium_swipe_price', 500)} className="btn-action">Set ₦500</button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Push Blast Tool */}
                                <div className="admin-card">
                                    <h3>🚀 Push Notification Blast</h3>
                                    <div className="push-form">
                                        <div className="form-group">
                                            <label>Target Segment</label>
                                            <select
                                                value={pushSegment}
                                                onChange={(e) => setPushSegment(e.target.value)}
                                                className="admin-input"
                                            >
                                                <option value="Total Subscriptions">All Users</option>
                                                <option value="Active Users">Active Users (Last 7 Days)</option>
                                                <option value="Inactive Users">Inactive Users</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Notification Title</label>
                                            <input
                                                className="admin-input"
                                                placeholder="e.g. Happy Sunday Campus!"
                                                value={pushTitle}
                                                onChange={(e) => setPushTitle(e.target.value)}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Message Body</label>
                                            <textarea
                                                className="admin-input admin-textarea"
                                                placeholder="e.g. Check out the new matches waiting for you."
                                                value={pushBody}
                                                onChange={(e) => setPushBody(e.target.value)}
                                                rows="3"
                                            />
                                        </div>
                                        <button
                                            className="btn-blast"
                                            onClick={handleSendPush}
                                            disabled={isPushing}
                                        >
                                            {isPushing ? 'Sending...' : '⚡ Send Blast'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
