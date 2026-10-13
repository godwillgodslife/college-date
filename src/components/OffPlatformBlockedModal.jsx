import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { triggerLightHaptic } from '../utils/haptics';
import { OFF_PLATFORM_COPY } from '../utils/offPlatformGuard';
import './OffPlatformBlockedModal.css';

const NOT_ALLOWED = [
    { icon: '📞', label: 'Phone numbers & WhatsApp digits' },
    { icon: '📸', label: 'Instagram, Snapchat, TikTok & X handles' },
    { icon: '✈️', label: 'Telegram & external messenger links' },
    { icon: '✉️', label: 'Personal email addresses' },
    { icon: '💳', label: 'OPay/PalmPay phone-linked accounts' }
];

const IN_APP_PERKS = [
    '🎙️ Voice Notes',
    '📹 HD Video Calls',
    '📍 Live Campus Location',
    '🎁 Virtual Gifts & Coins'
];

/**
 * OffPlatformBlockedModal
 * ----------------------------------------------------------------------------
 * Mini pop-up raised when a standard or premium user attempts to share or
 * collect phone numbers, social handles, or off-platform contacts.
 *
 * Clearly explains that contact exchange and asking questions without safeguards
 * is an exclusive benefit reserved for Elite Ultra VIP members (₦15,000/mo).
 */
export default function OffPlatformBlockedModal({
    violation,
    attemptCount = 1,
    onClose,
    onEdit,
    onUpgrade
}) {
    const navigate = useNavigate();

    useEffect(() => {
        if (!violation) return undefined;
        triggerLightHaptic();
        const onKey = (e) => {
            if (e.key === 'Escape') onClose?.();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [violation, onClose]);

    if (!violation) return null;

    const copy = OFF_PLATFORM_COPY[violation.category] || OFF_PLATFORM_COPY.off_app;
    const isRepeat = attemptCount >= 3;

    const handleUpgradeClick = () => {
        triggerLightHaptic();
        if (typeof onUpgrade === 'function') {
            onUpgrade();
        } else {
            onClose?.();
            navigate('/premium?tier=ultra&selected=ultra_monthly');
        }
    };

    const modalContent = (
        <div
            className="offplatform-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="offplatform-title"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose?.();
            }}
        >
            <div className="offplatform-sheet">
                <div className="offplatform-handle" />

                {/* Header Icon */}
                <div className="offplatform-icon-wrap" aria-hidden="true">
                    <span className="offplatform-icon-lock">🔒</span>
                    <span className="offplatform-icon-crown">👑</span>
                </div>

                <p className="offplatform-eyebrow">Message Protected • Safety Guard</p>
                <h2 id="offplatform-title" className="offplatform-title">
                    {copy.title}
                </h2>
                <p className="offplatform-body">
                    {copy.body}
                </p>

                {/* Elite Ultra 15k VIP Upgrade Banner */}
                <div className="offplatform-ultra-card">
                    <div className="ultra-card-header">
                        <span className="ultra-badge">👑 ELITE ULTRA VIP</span>
                        <span className="ultra-price">₦15,000 / mo</span>
                    </div>
                    <h3 className="ultra-card-headline">
                        Want to exchange contacts freely?
                    </h3>
                    <p className="ultra-card-desc">
                        Subscribe to <strong>Elite Ultra</strong> to ask matches any question you want and exchange numbers or handles <strong>completely without safeguards</strong>.
                    </p>
                    <ul className="ultra-perks-list">
                        <li>
                            <span className="ultra-check">✓</span>
                            <span>Direct phone & WhatsApp contact exchange</span>
                        </li>
                        <li>
                            <span className="ultra-check">✓</span>
                            <span>Share Instagram, TikTok & Snapchat handles</span>
                        </li>
                        <li>
                            <span className="ultra-check">✓</span>
                            <span>Zero chat filters or safeguards</span>
                        </li>
                        <li>
                            <span className="ultra-check">✓</span>
                            <span>Includes 30 Super Swipes & 10 Campus Boosts</span>
                        </li>
                    </ul>
                    <button
                        type="button"
                        className="offplatform-btn ultra-upgrade-btn"
                        onClick={handleUpgradeClick}
                    >
                        <span>Unlock with Elite Ultra (₦15k)</span>
                        <span className="btn-arrow">→</span>
                    </button>
                </div>

                {/* What's Restricted List */}
                <div className="offplatform-list-card">
                    <p className="offplatform-list-heading">Restricted on Standard Plans</p>
                    <ul className="offplatform-list">
                        {NOT_ALLOWED.map((item) => (
                            <li key={item.label}>
                                <span className="list-icon" aria-hidden="true">{item.icon}</span>
                                <span>{item.label}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* In-App Features Reminder */}
                <div className="offplatform-inapp-section">
                    <p className="offplatform-alt-heading">Keep it in-app with all built-in features:</p>
                    <div className="offplatform-alt-pills">
                        {IN_APP_PERKS.map((perk) => (
                            <span key={perk} className="offplatform-pill">{perk}</span>
                        ))}
                    </div>
                </div>

                {isRepeat && (
                    <p className="offplatform-warning" role="alert">
                        ⚠️ You’ve attempted to share off-platform contacts {attemptCount} times today. Repeated filter evasion may restrict your chat privileges.
                    </p>
                )}

                {/* Secondary Actions */}
                <div className="offplatform-actions">
                    <button
                        type="button"
                        className="offplatform-btn secondary"
                        onClick={() => {
                            triggerLightHaptic();
                            onEdit?.();
                        }}
                    >
                        ✏️ Edit Message
                    </button>
                    <button
                        type="button"
                        className="offplatform-btn tertiary"
                        onClick={() => {
                            triggerLightHaptic();
                            onClose?.();
                        }}
                    >
                        Stay on TheCollegeDate
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
