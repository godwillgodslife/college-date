import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePrefetch } from '../hooks/usePrefetch';
import './BottomNav.css';

const navItems = [
    {
        path: '/match',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c-2.28 0-3-1.89-3-3-2.5 1-2.5 4.5-2.5 4.5C4 11 6 7 10 3c.33 3.67 4 3 6 7 1 2 1.5 3 1.5 4.5 0 3-2.5 5.5-5.5 5.5a5.5 5.5 0 0 1-3.5-1.5z" /></svg>,
        label: 'Match'
    },
    {
        path: '/explore',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" /></svg>,
        label: 'Explore'
    },
    {
        path: '/chat',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
        label: 'Chat'
    },
    {
        path: '/confessions',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>,
        label: 'Confess'
    },
    {
        path: '/profile',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
        label: 'Profile'
    },
];

export default function BottomNav() {
    const location = useLocation();
    const { walletBalance } = useAuth();
    const { prefetch } = usePrefetch();

    return (
        <nav className="bottom-nav">
            {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const hasEarning = item.path === '/profile' && walletBalance > 0;

                return (
                    <Link
                        key={item.path}
                        to={item.path}
                        className={`bottom-nav-item ${isActive ? 'active' : ''}`}
                        onMouseEnter={() => prefetch(item.path)}
                        onTouchStart={() => prefetch(item.path)}
                    >
                        <span className="bottom-nav-icon">
                            {item.icon}
                            {hasEarning && <span className="earning-dot" />}
                        </span>
                        <span className="bottom-nav-label">{item.label}</span>
                        {isActive && <span className="bottom-nav-indicator" />}
                    </Link>
                );
            })}
        </nav>
    );
}
