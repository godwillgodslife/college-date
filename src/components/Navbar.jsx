import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useState } from 'react';
import { usePrefetch } from '../hooks/usePrefetch';
import NotificationTray from './NotificationTray';
import './Navbar.css';

export default function Navbar() {
    const { currentUser, userProfile, walletBalance, logout } = useAuth();
    const { unreadCount } = useNotifications();
    const [menuOpen, setMenuOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const location = useLocation();
    const { prefetch } = usePrefetch();

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
                    <Link
                        to="/dashboard"
                        onMouseEnter={() => prefetch('/dashboard')}
                        className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
                    >
                        Home
                    </Link>
                    <Link
                        to="/match"
                        onMouseEnter={() => prefetch('/match')}
                        className={`nav-link ${location.pathname === '/match' ? 'active' : ''}`}
                    >
                        Match
                    </Link>
                    <Link
                        to="/chat"
                        onMouseEnter={() => prefetch('/chat')}
                        className={`nav-link ${location.pathname === '/chat' ? 'active' : ''}`}
                    >
                        Chat
                    </Link>
                    <Link
                        to="/leaderboard"
                        onMouseEnter={() => prefetch('/leaderboard')}
                        className={`nav-link ${location.pathname === '/leaderboard' ? 'active' : ''}`}
                    >
                        Leaderboard
                    </Link>
                    <Link
                        to="/confessions"
                        onMouseEnter={() => prefetch('/confessions')}
                        className={`nav-link ${location.pathname === '/confessions' ? 'active' : ''}`}
                    >
                        Confessions
                    </Link>
                    <Link to="/premium" className={`nav-link premium-nav-link ${location.pathname === '/premium' ? 'active' : ''}`}>
                        👑 Get Premium
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
                        {walletBalance > 0 && <span className="earning-dot-navbar" />}
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
                <button className="navbar-hamburger" onClick={() => { setMenuOpen(!menuOpen); setNotifOpen(false); }}>
                    <span className={`hamburger-line ${menuOpen ? 'open' : ''}`}></span>
                    <span className={`hamburger-line ${menuOpen ? 'open' : ''}`}></span>
                    <span className={`hamburger-line ${menuOpen ? 'open' : ''}`}></span>
                </button>
            </div>



            {/* Mobile Menu */}
            {menuOpen && (
                <>
                    <div className="mobile-menu-overlay" onClick={() => setMenuOpen(false)} />
                    <div className="mobile-menu">
                        <Link
                            to="/dashboard"
                            className={`mobile-menu-item ${location.pathname === '/dashboard' ? 'active' : ''}`}
                            onClick={() => setMenuOpen(false)}
                            onMouseEnter={() => prefetch('/dashboard')}
                            onTouchStart={() => prefetch('/dashboard')}
                        >
                            <span>🏠</span> Home
                        </Link>
                        <Link
                            to="/match"
                            className={`mobile-menu-item ${location.pathname === '/match' ? 'active' : ''}`}
                            onClick={() => setMenuOpen(false)}
                            onMouseEnter={() => prefetch('/match')}
                            onTouchStart={() => prefetch('/match')}
                        >
                            <span>🔍</span> Match
                        </Link>
                        <Link
                            to="/chat"
                            className={`mobile-menu-item ${location.pathname === '/chat' ? 'active' : ''}`}
                            onClick={() => setMenuOpen(false)}
                            onMouseEnter={() => prefetch('/chat')}
                            onTouchStart={() => prefetch('/chat')}
                        >
                            <span>💬</span> Chat
                        </Link>
                        <Link
                            to="/leaderboard"
                            className={`mobile-menu-item ${location.pathname === '/leaderboard' ? 'active' : ''}`}
                            onClick={() => setMenuOpen(false)}
                            onMouseEnter={() => prefetch('/leaderboard')}
                            onTouchStart={() => prefetch('/leaderboard')}
                        >
                            <span>🏆</span> Leaderboard
                        </Link>
                        <Link
                            to="/confessions"
                            className={`mobile-menu-item ${location.pathname === '/confessions' ? 'active' : ''}`}
                            onClick={() => setMenuOpen(false)}
                            onMouseEnter={() => prefetch('/confessions')}
                            onTouchStart={() => prefetch('/confessions')}
                        >
                            <span>🎭</span> Confessions
                        </Link>
                        <Link to="/premium" className="mobile-menu-item premium-menu-item" onClick={() => setMenuOpen(false)}>
                            <span>👑</span> Get Premium
                        </Link>
                        {userProfile?.role === 'Female' && (
                            <Link to="/requests" className={`mobile-menu-item ${location.pathname === '/requests' ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>
                                <span>💌</span> Requests
                            </Link>
                        )}
                        <hr className="mobile-menu-divider" />
                        <Link
                            to="/profile"
                            className="mobile-menu-item"
                            onClick={() => setMenuOpen(false)}
                            onMouseEnter={() => prefetch('/profile')}
                            onTouchStart={() => prefetch('/profile')}
                        >
                            <span>👤</span> Profile
                        </Link>
                        <Link to="/referrals" className="mobile-menu-item" onClick={() => setMenuOpen(false)}>
                            <span>🎁</span> Referrals
                        </Link>
                        <Link to="/wallet" className="mobile-menu-item" onClick={() => setMenuOpen(false)}>
                            <span>💰</span> Wallet
                        </Link>
                        <Link to="/settings" className="mobile-menu-item" onClick={() => setMenuOpen(false)}>
                            <span>⚙️</span> Settings
                        </Link>
                        <hr className="mobile-menu-divider" />
                        <button className="mobile-menu-item mobile-menu-logout" onClick={handleLogout}>
                            <span>🚪</span> Logout
                        </button>
                    </div>
                </>
            )}
        </nav>
    );
}
