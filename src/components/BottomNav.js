'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav({ gender }) {
    const pathname = usePathname();

    const maleLinks = [
        { href: '/discover', icon: '🔥', label: 'Discover' },
        { href: '/chat', icon: '💬', label: 'Chat' },
        { href: '/profile', icon: '👤', label: 'Profile' },
    ];

    const femaleLinks = [
        { href: '/discover', icon: '🔥', label: 'Discover' },
        { href: '/chat', icon: '💬', label: 'Chat' },
        { href: '/wallet', icon: '💰', label: 'Wallet' },
        { href: '/profile', icon: '👤', label: 'Profile' },
    ];

    const links = gender === 'female' ? femaleLinks : maleLinks;

    return (
        <nav className="bottom-nav">
            {links.map((link) => (
                <Link
                    key={link.href}
                    href={link.href}
                    className={`nav-item ${pathname === link.href || pathname.startsWith(link.href + '/') ? 'active' : ''}`}
                >
                    <span className="nav-icon">{link.icon}</span>
                    <span>{link.label}</span>
                </Link>
            ))}
        </nav>
    );
}
