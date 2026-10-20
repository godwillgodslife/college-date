import { useEffect, useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { VIRTUAL_GIFTS } from '../services/coinService';
import { playGiftCelebrationSound } from '../lib/audioContext';
import { triggerSuccessHaptic, triggerMediumHaptic } from '../utils/haptics';
import OptimizedImage from './OptimizedImage';
import './GiftCelebrationOverlay.css';

const THEMED_PARTICLES = {
    rose: ['🌹', '🥀', '🌸', '💖', '✨', '🌹', '💕'],
    zobo: ['🍷', '🧊', '🫧', '✨', '🍇', '🍷', '🫧'],
    suya: ['🍢', '🔥', '🌶️', '✨', '🍖', '🍢', '🔥'],
    airtime: ['📱', '⚡', '🪙', '📶', '💬', '⚡', '✨'],
    bouquet: ['💐', '🌸', '🌺', '🌷', '🌼', '🌿', '✨'],
    crown: ['👑', '💎', '✨', '⭐', '🪙', '👑', '💎'],
    lion: ['🦁', '🪙', '💰', '👑', '✨', '⚡', '💎', '🪙']
};

export default function GiftCelebrationOverlay({
    gift = {},
    sender = {},
    onClose,
    onSayThanks,
    autoDismissMs
}) {
    const [isClosing, setIsClosing] = useState(false);
    const [progress, setProgress] = useState(100);
    const [isPaused, setIsPaused] = useState(false);
    const timerRef = useRef(null);
    const progressIntervalRef = useRef(null);

    // Resolve gift data from VIRTUAL_GIFTS fallback if needed
    const resolvedGift = useMemo(() => {
        const found = VIRTUAL_GIFTS.find(g => g.id === gift?.id) ||
            VIRTUAL_GIFTS.find(g => g.name?.toLowerCase() === gift?.name?.toLowerCase()) ||
            VIRTUAL_GIFTS[0];

        return {
            id: gift?.id || found.id,
            name: gift?.name || found.name,
            emoji: gift?.emoji || found.emoji,
            coins: gift?.coins ?? found.coins ?? 20,
            color: gift?.color || found.color || '#f43f5e',
            desc: gift?.desc || found.desc,
            earningCreditNgn: gift?.earningCreditNgn ?? found.earningCreditNgn ?? ((gift?.coins ?? found.coins ?? 20) * 8)
        };
    }, [gift]);

    const isLion = resolvedGift.id === 'lion';
    const duration = autoDismissMs || (isLion ? 7000 : 5000);

    const senderName = sender?.full_name || sender?.name || 'Someone Special';
    const senderAvatar = sender?.avatar_url || sender?.avatar;

    // Generate static array of particle elements with random physics
    const particles = useMemo(() => {
        const pool = THEMED_PARTICLES[resolvedGift.id] || THEMED_PARTICLES.rose;
        const count = isLion ? 40 : 26;
        return Array.from({ length: count }, (_, i) => {
            const emoji = pool[i % pool.length];
            const left = 4 + Math.random() * 92;
            const delay = Math.random() * (isLion ? 2.5 : 1.8);
            const animDuration = 2.4 + Math.random() * 2.2;
            const size = 1.3 + Math.random() * (isLion ? 1.6 : 1.1);
            const drift = (Math.random() - 0.5) * 80;
            const rotation = (Math.random() - 0.5) * 360;

            return {
                id: i,
                emoji,
                left: `${left}%`,
                delay: `${delay}s`,
                animDuration: `${animDuration}s`,
                size: `${size}rem`,
                drift: `${drift}px`,
                rotation: `${rotation}deg`
            };
        });
    }, [resolvedGift.id, isLion]);

    // Handle audio sound & haptic feedback on launch
    useEffect(() => {
        playGiftCelebrationSound(resolvedGift.id);
        triggerSuccessHaptic();

        if (isLion) {
            const hapticTimer1 = setTimeout(() => triggerMediumHaptic(), 350);
            const hapticTimer2 = setTimeout(() => triggerSuccessHaptic(), 700);
            return () => {
                clearTimeout(hapticTimer1);
                clearTimeout(hapticTimer2);
            };
        }
    }, [resolvedGift.id, isLion]);

    // Keyboard dismiss on Escape
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                handleDismiss();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Auto-dismiss countdown with progress indicator
    useEffect(() => {
        if (isPaused) return;

        const startTime = Date.now();
        const endTime = startTime + duration;

        progressIntervalRef.current = setInterval(() => {
            const remaining = Math.max(0, endTime - Date.now());
            const pct = (remaining / duration) * 100;
            setProgress(pct);
            if (remaining <= 0) {
                clearInterval(progressIntervalRef.current);
                handleDismiss();
            }
        }, 50);

        return () => {
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        };
    }, [duration, isPaused]);

    const handleDismiss = () => {
        if (isClosing) return;
        setIsClosing(true);
        setTimeout(() => {
            onClose?.();
        }, 320);
    };

    const handleSayThanks = () => {
        onSayThanks?.(resolvedGift, sender);
        handleDismiss();
    };

    if (typeof document === 'undefined') return null;

    const modalContent = (
        <div
            className={`gift-celebration-backdrop ${isLion ? 'is-lion-whale' : ''} ${isClosing ? 'is-closing' : ''}`}
            onClick={handleDismiss}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
            role="dialog"
            aria-modal="true"
            aria-label={`${senderName} sent you ${resolvedGift.name}`}
            style={{ '--gift-theme-color': resolvedGift.color }}
        >
            {/* Ambient Lighting & Screen Shake Container */}
            <div className={`gift-celebration-stage ${isLion ? 'lion-screen-shake' : ''}`} onClick={(e) => e.stopPropagation()}>
                {/* Rotating Radial Sunburst & Energy Rings */}
                <div className="gift-sunburst" />
                <div className="gift-energy-ring ring-1" />
                <div className="gift-energy-ring ring-2" />
                {isLion && <div className="gift-energy-ring ring-3 lion-gold-ring" />}

                {/* Particle Shower Field */}
                <div className="gift-particles-field" aria-hidden="true">
                    {particles.map((p) => (
                        <span
                            key={p.id}
                            className="gift-particle"
                            style={{
                                left: p.left,
                                animationDelay: p.delay,
                                animationDuration: p.animDuration,
                                fontSize: p.size,
                                '--drift': p.drift,
                                '--rotation': p.rotation
                            }}
                        >
                            {p.emoji}
                        </span>
                    ))}
                </div>

                {/* Top TikTok-Style Sender Glass Pill */}
                <div className="gift-sender-pill-container animate-fade-in-down">
                    <div className="gift-sender-pill">
                        <div className="gift-sender-avatar-wrap">
                            {senderAvatar ? (
                                <OptimizedImage
                                    src={senderAvatar}
                                    alt={senderName}
                                    className="gift-sender-avatar"
                                    width={48}
                                    height={48}
                                />
                            ) : (
                                <div className="gift-sender-avatar-fallback">
                                    {senderName.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <span className="gift-sender-glow-dot" />
                        </div>
                        <div className="gift-sender-info">
                            <div className="gift-sender-name-row">
                                <span className="gift-sender-name">{senderName}</span>
                                <span className="gift-sent-action-tag">sent a gift!</span>
                            </div>
                            <div className="gift-sender-subtext">
                                <span className="gift-coin-pill">
                                    🪙 {resolvedGift.coins.toLocaleString()} Coins
                                </span>
                                {resolvedGift.earningCreditNgn > 0 && (
                                    <span className="gift-earning-pill">
                                        +₦{resolvedGift.earningCreditNgn.toLocaleString()}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Hero 3D Celebration Stage */}
                <div className="gift-hero-showcase animate-pop-in">
                    {isLion && (
                        <div className="gift-vip-marquee">
                            👑 LEGENDARY CAMPUS WHALE ALERT 👑
                        </div>
                    )}

                    <div className="gift-hero-emoji-wrap">
                        <span className="gift-hero-emoji" role="img" aria-label={resolvedGift.name}>
                            {resolvedGift.emoji}
                        </span>
                        <div className="gift-hero-glow" />
                    </div>

                    <h2 className="gift-hero-title">
                        {resolvedGift.name}
                    </h2>

                    <p className="gift-hero-tagline">
                        {resolvedGift.desc || 'A special campus celebration'}
                    </p>

                    {resolvedGift.earningCreditNgn > 0 && (
                        <div className="gift-wallet-credit-badge">
                            <span className="credit-icon">💰</span>
                            <span>
                                <strong>₦{resolvedGift.earningCreditNgn.toLocaleString()}</strong> added to your earnings
                            </span>
                        </div>
                    )}
                </div>

                {/* Bottom Action Tray */}
                <div className="gift-bottom-tray">
                    <button
                        type="button"
                        className="btn-gift-say-thanks"
                        onClick={handleSayThanks}
                        aria-label={`Say thanks to ${senderName}`}
                    >
                        <span>💬 Say Thanks</span>
                    </button>

                    <button
                        type="button"
                        className="btn-gift-dismiss"
                        onClick={handleDismiss}
                        aria-label="Close celebration"
                    >
                        <span>Awesome! 🎉</span>
                    </button>
                </div>

                {/* Auto-Dismiss Progress Bar Indicator */}
                <div className="gift-timer-bar-wrap">
                    <div className="gift-timer-bar-fill" style={{ width: `${progress}%` }} />
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
