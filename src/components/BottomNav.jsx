import { Link, useLocation } from 'react-router-dom';
import './BottomNav.css';

const navItems = [
    { path: '/status', icon: '⭕', label: 'Status' },
    { path: '/snap', icon: '👻', label: 'Snap' },
    { path: '/discover', icon: '🌍', label: 'Explore' },
    { path: '/chat', icon: '💬', label: 'Chat' },
    { path: '/profile', icon: '👤', label: 'Profile' },
];

export default function BottomNav() {
    const location = useLocation();

    return (
        <nav className="bottom-nav">
            {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                    <Link
                        key={item.path}
                        to={item.path}
                        className={`bottom-nav-item ${isActive ? 'active' : ''}`}
                    >
                        <span className="bottom-nav-icon">{item.icon}</span>
                        <span className="bottom-nav-label">{item.label}</span>
                        {isActive && <span className="bottom-nav-indicator" />}
                    </Link>
                );
            })}
        </nav>
    );
}
