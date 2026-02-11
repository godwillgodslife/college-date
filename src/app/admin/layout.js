'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

const adminLinks = [
    { href: '/admin', icon: '📊', label: 'Overview' },
    { href: '/admin/users', icon: '👥', label: 'Users' },
    { href: '/admin/transactions', icon: '💳', label: 'Transactions' },
    { href: '/admin/withdrawals', icon: '💸', label: 'Withdrawals' },
    { href: '/admin/reports', icon: '🚨', label: 'Reports' },
];

export default function AdminLayout({ children }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [mobileNav, setMobileNav] = useState(false);

    useEffect(() => {
        checkAdmin();
    }, []);

    const checkAdmin = async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/auth/login'); return; }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            router.push('/discover');
            return;
        }

        setIsAdmin(true);
        setLoading(false);
    };

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/');
    };

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="spinner" />
                <p className="loading-text">Verifying admin access...</p>
            </div>
        );
    }

    if (!isAdmin) return null;

    return (
        <div className="admin-layout">
            {/* Mobile nav toggle */}
            <button
                onClick={() => setMobileNav(!mobileNav)}
                style={{
                    display: 'none',
                    position: 'fixed',
                    top: 16,
                    left: 16,
                    zIndex: 60,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    fontSize: '1.2rem',
                }}
                className="admin-mobile-toggle"
            >
                ☰
            </button>

            <aside className="admin-sidebar" style={{ display: mobileNav ? 'block' : undefined }}>
                <div className="admin-sidebar-logo">
                    💕 College Date
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400, marginTop: 2 }}>
                        Admin Panel
                    </div>
                </div>

                <nav className="admin-nav">
                    {adminLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`admin-nav-item ${pathname === link.href ? 'active' : ''}`}
                            onClick={() => setMobileNav(false)}
                        >
                            <span>{link.icon}</span>
                            <span>{link.label}</span>
                        </Link>
                    ))}
                </nav>

                <div style={{ marginTop: 'auto', paddingTop: 24, borderTop: '1px solid var(--border)', marginTop: 32 }}>
                    <Link href="/discover" className="admin-nav-item">
                        <span>🔙</span>
                        <span>Back to App</span>
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="admin-nav-item"
                        style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                    >
                        <span>🚪</span>
                        <span>Log Out</span>
                    </button>
                </div>
            </aside>

            <main className="admin-content">
                {children}
            </main>

            <style jsx>{`
        @media (max-width: 768px) {
          .admin-mobile-toggle {
            display: block !important;
          }
        }
      `}</style>
        </div>
    );
}
