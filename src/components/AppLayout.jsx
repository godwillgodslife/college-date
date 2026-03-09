import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from './Navbar';
import BottomNav from './BottomNav';
import PwaInstallBanner from './PwaInstallBanner';
import { supabase } from '../lib/supabase';
import './AppLayout.css';

// Fetches the announcement banner from app_config
function AnnouncementBanner() {
    const [banner, setBanner] = useState('');

    useEffect(() => {
        async function fetchBanner() {
            try {
                const { data } = await supabase
                    .from('app_config')
                    .select('value')
                    .eq('key', 'banner_message')
                    .single();
                if (data?.value && String(data.value).trim()) {
                    setBanner(String(data.value));
                }
            } catch { }
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
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    const isFullScreenApp = ['/match', '/explore', '/snap'].includes(location.pathname);
    const isMiniprofileSetup = location.pathname === '/mini-profile-setup';
    const isAdmin = location.pathname.startsWith('/admin');
    const hideNav = isMiniprofileSetup || isAdmin;

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return (
        <div className={`app-layout ${isOffline ? 'is-offline' : ''}`}>
            {/* Offline Status */}
            {isOffline && (
                <div className="offline-status-bar">
                    📡 You are currently offline. Using cached data.
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
                    <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        className="page-transition-wrapper"
                    >
                        <Outlet />
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* Bottom Nav (mobile) */}
            {!hideNav && <BottomNav />}
        </div>
    );
}
