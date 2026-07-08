import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useState, useEffect, useRef } from 'react';
import { usePrefetch } from '../hooks/usePrefetch';
import NotificationTray from './NotificationTray';
import { partnerWhatsAppUrl } from '../config/contactLinks';
import './Navbar.css';

export default function Navbar() {
    const { currentUser, userProfile, walletBalance, logout } = useAuth();
    const { unreadCount } = useNotifications();
    const [notifOpen, setNotifOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { prefetch } = usePrefetch();

    const prevUnreadCountRef = useRef(unreadCount);
    const [animateBell, setAnimateBell] = useState(false);
    const [showIndicator, setShowIndicator] = useState(false);

    useEffect(() => {
        const prev = prevUnreadCountRef.current;
        prevUnreadCountRef.current = unreadCount;

        if (prev !== undefined && unreadCount > prev) {
            setAnimateBell(true);
            const timer = setTimeout(() => setAnimateBell(false), 800);
            
            const hasSeen = sessionStorage.getItem('cd_has_seen_notif_indicator');
            if (!hasSeen) {
                setShowIndicator(true);
                sessionStorage.setItem('cd_has_seen_notif_indicator', 'true');
            }
            return () => clearTimeout(timer);
        } else if (prev === undefined && unreadCount > 0) {
            const hasSeen = sessionStorage.getItem('cd_has_seen_notif_indicator');
            if (!hasSeen) {
                setShowIndicator(true);
                sessionStorage.setItem('cd_has_seen_notif_indicator', 'true');
            }
        }
    }, [unreadCount]);

    useEffect(() => {
        if (showIndicator) {
            const timer = setTimeout(() => {
                setShowIndicator(false);
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [showIndicator]);

    const handleLogout = async () => {
        setNotifOpen(false);
        await logout();
        navigate('/login', { replace: true });
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
                    <img src="/logo.png" alt="The College Date" className="navbar-logo" />
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
                        <button 
                            className={`nav-icon-btn ${animateBell ? 'bell-animate' : ''}`} 
                            onClick={() => { 
                                setNotifOpen(!notifOpen); 
                                setShowIndicator(false);
                                sessionStorage.setItem('cd_has_seen_notif_indicator', 'true');
                            }}
                        >
                            <span className="nav-icon">🔔</span>
                            {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                        </button>
                        {showIndicator && (
                            <div className="notif-indicator-tooltip">
                                <div className="notif-indicator-arrow"></div>
                                <div className="notif-indicator-content">
                                    <span className="notif-indicator-dot"></span>
                                    New notifications!
                                </div>
                            </div>
                        )}
                        {notifOpen && <NotificationTray onClose={() => setNotifOpen(false)} />}
                    </div>

                    <button
                        className="navbar-avatar-btn"
                        onClick={() => {
                            setNotifOpen(false);
                            navigate('/profile');
                        }}
                    >
                        {avatarUrl ? (
                            <img src={avatarUrl} alt={displayName} className="navbar-avatar" />
                        ) : (
                            <div className="navbar-avatar navbar-avatar-placeholder">
                                {displayName.charAt(0).toUpperCase()}
                            </div>
                        )}
                        {walletBalance > 0 && <span className="earning-dot-navbar" />}
                    </button>
                </div>
            </div>
        </nav>
    );
}
