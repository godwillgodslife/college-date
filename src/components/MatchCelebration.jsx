import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import OptimizedImage from './OptimizedImage';
import { playMatchSuccess } from '../lib/audioContext';
import { getAvatarUrl } from '../utils/profileData';
import './MatchCelebration.css';

export default function MatchCelebration({ isOpen, onClose, userProfile, matchedProfile, onMessage }) {


    useEffect(() => {
        if (isOpen) {
            let interval;
            let cancelled = false;
            playMatchSuccess();

            import('canvas-confetti').then(({ default: confetti }) => {
                if (cancelled) return;

                const duration = 3 * 1000;
                const animationEnd = Date.now() + duration;
                const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };
                const randomInRange = (min, max) => Math.random() * (max - min) + min;

                interval = setInterval(() => {
                    const timeLeft = animationEnd - Date.now();

                    if (timeLeft <= 0) {
                        return clearInterval(interval);
                    }

                    const particleCount = 50 * (timeLeft / duration);
                    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
                    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
                }, 250);
            }).catch((error) => {
                console.warn('[MatchCelebration] Confetti unavailable:', error);
            });

            // Haptic vibration (if supported)
            if ('vibrate' in navigator) {
                navigator.vibrate([100, 50, 100]);
            }

            return () => {
                cancelled = true;
                if (interval) clearInterval(interval);
            };
        }
    }, [isOpen]);

    const handleShareInvite = async () => {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.thecollegedate.com';
        const shareText = "I just matched on The College Date! 🔥 Join our campus community here: " + origin;
        if (typeof navigator !== 'undefined' && navigator.share) {
            try {
                await navigator.share({
                    title: 'The College Date',
                    text: shareText,
                    url: origin
                });
                return;
            } catch {
                // Ignore cancel
            }
        }
        if (typeof window !== 'undefined') {
            window.open("https://wa.me/?text=" + encodeURIComponent(shareText), '_blank');
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="match-celebration-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <div className="match-glass-panel">
                        <motion.div
                            className="match-title-container"
                            initial={{ y: -50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            <h1 className="match-title-text">It's a Match! 🔥</h1>
                            <p className="match-subtitle">You and {matchedProfile?.full_name} liked each other</p>
                        </motion.div>

                        <div className="match-avatars-merge">
                            <motion.div
                                className="celebration-avatar user-left"
                                initial={{ x: -100, opacity: 0, scale: 0.5 }}
                                animate={{ x: 20, opacity: 1, scale: 1 }}
                                transition={{ type: "spring", stiffness: 100, delay: 0.4 }}
                            >
                                <OptimizedImage src={getAvatarUrl(userProfile) || userProfile?.avatar_url} alt="You" width={120} />
                            </motion.div>

                            <motion.div
                                className="celebration-avatar user-right"
                                initial={{ x: 100, opacity: 0, scale: 0.5 }}
                                animate={{ x: -20, opacity: 1, scale: 1 }}
                                transition={{ type: "spring", stiffness: 100, delay: 0.4 }}
                            >
                                <OptimizedImage src={getAvatarUrl(matchedProfile) || matchedProfile?.avatar_url} alt="Match" width={120} />
                            </motion.div>

                            <motion.div
                                className="match-heart-pulse"
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1.5, opacity: [0, 1, 0] }}
                                transition={{ delay: 0.8, duration: 1, repeat: Infinity }}
                            >
                                ❤️
                            </motion.div>
                        </div>

                        <motion.div
                            className="match-actions-vertical"
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 1 }}
                        >
                            <button className="btn-match-message" onClick={onMessage}>
                                Send a Message
                            </button>
                            <button className="btn-match-continue" onClick={onClose}>
                                Keep Swiping
                            </button>
                            <button
                                type="button"
                                className="btn-match-invite"
                                onClick={handleShareInvite}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    color: '#ffffff',
                                    borderRadius: '16px',
                                    padding: '0.65rem 1.25rem',
                                    fontSize: '0.9rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    marginTop: '0.25rem'
                                }}
                            >
                                👥 Invite Friends to College Date
                            </button>
                        </motion.div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
