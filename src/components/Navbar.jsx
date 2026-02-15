import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useState } from 'react';
import NotificationTray from './NotificationTray';
import './Navbar.css';

export default function Navbar() {
    const { currentUser, userProfile, logout } = useAuth();
    const { unreadCount } = useNotifications();
    const [menuOpen, setMenuOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const location = useLocation();

    const handleLogout = async () => {
        setMenuOpen(false);
        await logout();
    };

    const displayName = userProfile?.full_name
        || userProfile?.username
        || currentUser?.email?.split('@')[0]
        || 'User';

    const avatarUrl = userProfile?.avatar_url || null;

    return (
        <nav className="navbar">
            <div className="navbar-inner">
                <Link to="/dashboard" className="navbar-brand">
                    <span className="navbar-logo">💕</span>
                    <span className="navbar-title">College Date</span>
                </Link>

                {/* Desktop Nav */}
                <div className="navbar-links">
                    <Link to="/dashboard" className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}>
                        Home
                    </Link>
                    <Link to="/discover" className={`nav-link ${location.pathname === '/discover' ? 'active' : ''}`}>
                        Discover
                    </Link>
                    <Link to="/chat" className={`nav-link ${location.pathname === '/chat' ? 'active' : ''}`}>
                        Chat
                    </Link>
                    <Link to="/leaderboard" className={`nav-link ${location.pathname === '/leaderboard' ? 'active' : ''}`}>
                        Leaderboard
                    </Link>
                    <Link to="/confessions" className={`nav-link ${location.pathname === '/confessions' ? 'active' : ''}`}>
                        Confessions
                    </Link>
                    {userProfile?.role === 'Female' && (
                        <Link to="/requests" className={`nav-link ${location.pathname === '/requests' ? 'active' : ''}`}>
                            Requests
                        </Link>
                    )}
                </div>

                {/* User Menu & Notifications */}
                <div className="navbar-user">
                    {/* Notification Bell */}
                    <div className="nav-notif-wrapper">
                        <button className="nav-icon-btn" onClick={() => { setNotifOpen(!notifOpen); setMenuOpen(false); }}>
                            <span className="nav-icon">🔔</span>
                            {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                        </button>
                        {notifOpen && <NotificationTray onClose={() => setNotifOpen(false)} />}
                    </div>

                    <button className="navbar-avatar-btn" onClick={() => { setMenuOpen(!menuOpen); setNotifOpen(false); }}>
                        {avatarUrl ? (
                            <img src={avatarUrl} alt={displayName} className="navbar-avatar" />
                        ) : (
                            <div className="navbar-avatar navbar-avatar-placeholder">
                                {displayName.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <svg className={`navbar-chevron ${menuOpen ? 'open' : ''}`} width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>

                    {menuOpen && (
                        <>
                            <div className="navbar-overlay" onClick={() => setMenuOpen(false)} />
                            <div className="navbar-dropdown">
                                <Link to="/profile" className="dropdown-item" onClick={() => setMenuOpen(false)}>
                                    <span>👤</span> Profile
                                </Link>
                                {userProfile?.role === 'Female' && (
                                    <Link to="/requests" className="dropdown-item" onClick={() => setMenuOpen(false)}>
                                        <span>💌</span> Requests
                                    </Link>
                                )}
                                <Link to="/referrals" className="dropdown-item" onClick={() => setMenuOpen(false)}>
                                    <span>🎁</span> Referrals
                                </Link>
                                <Link to="/wallet" className="dropdown-item" onClick={() => setMenuOpen(false)}>
                                    <span>💰</span> Wallet
                                </Link>
                                <Link to="/settings" className="dropdown-item" onClick={() => setMenuOpen(false)}>
                                    <span>⚙️</span> Settings
                                </Link>
                                <hr className="dropdown-divider" />
                                <button className="dropdown-item dropdown-logout" onClick={handleLogout}>
                                    <span>🚪</span> Logout
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* Mobile hamburger */}
                <button className="navbar-hamburger" onClick={() => setMenuOpen(!menuOpen)}>
                    <span className={`hamburger-line ${menuOpen ? 'open' : ''}`}></span>
                    <span className={`hamburger-line ${menuOpen ? 'open' : ''}`}></span>
                    <span className={`hamburger-line ${menuOpen ? 'open' : ''}`}></span>
                </button>
            </div>
        </nav>
    );
}
