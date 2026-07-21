import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from './Navbar';
import BottomNav from './BottomNav';
import PwaInstallBanner from './PwaInstallBanner';
import { supabase } from '../lib/supabase';
import PerformanceOverlay from './PerformanceOverlay';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { useAuth } from '../contexts/AuthContext';
import './AppLayout.css';

const MotionDiv = motion.div;

// Fetches the announcement banner from app_config
function AnnouncementBanner() {
    const [banner, setBanner] = useState('');

    useEffect(() => {
        async function fetchBanner() {
            try {
                const { data } = await supabase
                    .from('app_config')
                    .select('key, value')
                    .in('key', ['banner_message', 'banner_active']);
                const config = Object.fromEntries((data || []).map(item => [item.key, item.value]));
                if (config.banner_active === true && config.banner_message && String(config.banner_message).trim()) {
                    setBanner(String(config.banner_message));
                }
            } catch (err) {
                console.warn('Failed to load announcement banner:', err);
            }
        }
        fetchBanner();
    }, []);

    if (!banner) return null;

    return (
        <div className="announcement-banner">
            <span className="announcement-icon">📢</span>
            <span className="announcement-text">{banner}</span>
        </div>
    );
}

export default function AppLayout() {
    const location = useLocation();
    const { currentUser } = useAuth();
    const networkStatus = useNetworkStatus();
    const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
    useOfflineSync(currentUser?.id);

    const isFullScreenApp = ['/explore', '/snap'].includes(location.pathname) || (location.pathname === '/match' && isMobile);
    const isMiniprofileSetup = location.pathname === '/mini-profile-setup';
    const isAdmin = location.pathname.startsWith('/admin');
    const hideNav = isMiniprofileSetup || isAdmin;

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className={`app-layout ${!networkStatus.online ? 'is-offline' : ''} ${networkStatus.slow ? 'is-slow-network' : ''}`}>
            {/* Offline Status */}
            {networkStatus.label && (
                <div className="offline-status-bar">
                    {networkStatus.label}
                </div>
            )}

            {/* Announcement Banner (from admin) */}
            {!isAdmin && <AnnouncementBanner />}

            {/* PWA Install Prompt */}
            <PwaInstallBanner />

            {/* Desktop Navbar (hidden on fullscreen + admin) */}
            {!hideNav && !isFullScreenApp && <Navbar />}

            {/* Page Content */}
            <main className={`app-main ${isFullScreenApp ? 'full-screen' : ''} ${isAdmin ? 'admin-layout' : ''}`}>
                <AnimatePresence mode="wait">
                    <MotionDiv
                        key={location.pathname}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        className="page-transition-wrapper"
                    >
                        <Outlet />
                    </MotionDiv>
                </AnimatePresence>
            </main>

            {/* Bottom Nav (mobile) */}
            {!hideNav && <BottomNav />}

            {/* Performance Profiler Dashboard Overlay */}
            <PerformanceOverlay />
        </div>
    );
}
