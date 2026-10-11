import { useState, useEffect } from 'react';
import './ContextualGuide.css';

const GUIDE_STORAGE_KEY_PREFIX = 'tcd_guide_seen_';
const GUIDE_VIEWS_KEY_PREFIX = 'tcd_guide_views_';
const GUIDE_LAST_SEEN_KEY_PREFIX = 'tcd_guide_last_seen_';

export const GUIDE_FEATURES = {
    match_swipe: {
        id: 'match_swipe',
        number: 1,
        title: 'Match & Swipe',
        icon: '🃏',
        badge: 'Discovery',
        shortText: 'Swipe right to like, left to pass. When both students like each other, it’s an instant match!',
        details: [
            'Swipe Right (or ❤️) when you find someone who catches your eye.',
            'Swipe Left (or ✕) to pass to the next student.',
            'Tap Star (⭐) for Super Like to make your profile stand out instantly.',
            'When both students like each other, it’s an instant match with direct chat!'
        ]
    },
    accept_request: {
        id: 'accept_request',
        number: 2,
        title: 'Accepting Requests',
        icon: '🤝',
        badge: 'Connections',
        shortText: 'Accept requests from admirers to instantly unlock private messaging and voice/video calls.',
        details: [
            'When someone likes you, their request appears in your Requests tab.',
            'Free students get 3 free accepts every day.',
            'Accepting creates an instant mutual match ready for private chat.',
            'Premium members get unlimited accepts and clear unblurred photos.'
        ]
    },
    who_liked_me: {
        id: 'who_liked_me',
        number: 3,
        title: 'Who Liked Me',
        icon: '👀',
        badge: 'Admirers',
        shortText: 'See verified campus students who liked your profile before you even swipe.',
        details: [
            'Located in your Requests tab under "Admirers".',
            'Free members can see student count and blurred mystery previews.',
            'Upgrade to Premium to instantly unblur all photos and accept in 1 tap.',
            'Turn on notifications so you never miss a new admirer!'
        ]
    },
    who_viewed_me: {
        id: 'who_viewed_me',
        number: 4,
        title: 'Who Viewed Me',
        icon: '👁️',
        badge: 'Campus Radar',
        shortText: 'Real-time radar of fellow students who visited your profile.',
        details: [
            'Track real-time visits to your profile across campus.',
            'Curious students viewing your page can be visited back.',
            'Update your profile pictures, voice note, and bio to increase views.',
            'Premium members see crystal clear visitor details and timestamps.'
        ]
    },
    messages_chat: {
        id: 'messages_chat',
        number: 5,
        title: 'Direct Messages & Calls',
        icon: '💬',
        badge: 'Conversations',
        shortText: 'Chat privately with text, voice notes, stickers, 10s video moments, and Agora calls.',
        details: [
            'Text messaging with instant read receipts (blue double ticks).',
            'High-fidelity voice notes with live audio waveform player.',
            'Send 10-second chat video moments directly inside any chat.',
            'HD voice & video calling powered by Agora.'
        ]
    },
    explore_filters: {
        id: 'explore_filters',
        number: 6,
        title: 'Explore & Chat Vibe',
        icon: '✨',
        badge: 'Search & Vibes',
        shortText: 'Filter by university, faculty, department, and chat vibe to find your ideal student.',
        details: [
            'Filter candidates by campus university, faculty, or department.',
            'Pick your active Chat Vibe (Study Partner, Night Owl, Foodie, Gym Buddy).',
            'Instant search by student nickname, hobbies, or faculty.',
            'Strict opposite-gender discovery ensures high relevance.'
        ]
    },
    premium_benefits: {
        id: 'premium_benefits',
        number: 7,
        title: 'College Date Premium',
        icon: '👑',
        badge: 'VIP Membership',
        shortText: 'Unlock unlimited swipes, reveal all admirers & viewers, 5 daily Super Likes, and VIP standing.',
        details: [
            'Unlimited Swipes & Unlimited Request Accepts.',
            'Unblur & Reveal Who Liked Me and Who Viewed Me.',
            '5 Free Super Likes every single day.',
            'Share 10-second chat videos and get a Verified Golden Crown.',
            'Priority delivery for messages and discovery cards.'
        ]
    }
};

export function isGuideSeen(featureId) {
    if (typeof window === 'undefined' || !window.localStorage) return true;
    try {
        if (window.localStorage.getItem(`${GUIDE_STORAGE_KEY_PREFIX}${featureId}`) === 'true') {
            return true;
        }

        // Auto-retire if user has seen this tip >= 2 times total
        const views = parseInt(window.localStorage.getItem(`${GUIDE_VIEWS_KEY_PREFIX}${featureId}`) || '0', 10);
        if (views >= 2) {
            markGuideSeen(featureId);
            return true;
        }

        // If viewed once in a past session (> 30 minutes ago), auto-retire so it doesn't reappear on app reopen
        const lastSeen = parseInt(window.localStorage.getItem(`${GUIDE_LAST_SEEN_KEY_PREFIX}${featureId}`) || '0', 10);
        if (views >= 1 && lastSeen > 0 && (Date.now() - lastSeen) > 30 * 60 * 1000) {
            markGuideSeen(featureId);
            return true;
        }

        return false;
    } catch {
        return true;
    }
}

export function markGuideSeen(featureId) {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
        window.localStorage.setItem(`${GUIDE_STORAGE_KEY_PREFIX}${featureId}`, 'true');
    } catch (e) {
        console.warn('[ContextualGuide] Could not save guide state:', e);
    }
}

export function recordGuideImpression(featureId) {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
        const viewKey = `${GUIDE_VIEWS_KEY_PREFIX}${featureId}`;
        const timeKey = `${GUIDE_LAST_SEEN_KEY_PREFIX}${featureId}`;
        const currentViews = parseInt(window.localStorage.getItem(viewKey) || '0', 10);
        const newViews = currentViews + 1;
        window.localStorage.setItem(viewKey, newViews.toString());
        window.localStorage.setItem(timeKey, Date.now().toString());

        if (newViews >= 2) {
            markGuideSeen(featureId);
        }
    } catch (e) {
        console.warn('[ContextualGuide] Could not record guide impression:', e);
    }
}

/**
 * Intuitive Action Hook:
 * Whenever a user actually uses a feature (e.g. swipes a card, submits a search,
 * accepts a connection request, opens a chat message), call markFeatureUsed.
 * The system intuitively knows the user understands the feature, so the introductory tip goes off!
 */
export function markFeatureUsed(featureId) {
    markGuideSeen(featureId);
}

export function resetAllGuides() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
        Object.keys(GUIDE_FEATURES).forEach(featureId => {
            window.localStorage.removeItem(`${GUIDE_STORAGE_KEY_PREFIX}${featureId}`);
            window.localStorage.removeItem(`${GUIDE_VIEWS_KEY_PREFIX}${featureId}`);
            window.localStorage.removeItem(`${GUIDE_LAST_SEEN_KEY_PREFIX}${featureId}`);
        });
        window.localStorage.removeItem('hasSeenAppTour');
        window.localStorage.removeItem('tcd_nudge_dismissed_profile_completion');
        window.localStorage.removeItem('tcd_dismissed_profile_completion');
        window.localStorage.removeItem('tcd_dismissed_face_verify_card');
    } catch (e) {
        console.warn('[ContextualGuide] Could not reset guides:', e);
    }
}

/**
 * ContextualTip
 * Modern compact pill banner that teaches a specific feature on first visit.
 * Collapsed by default (<= 38px height) to avoid obscuring discovery cards / student faces.
 * Automatically goes off after 8s of inactivity, on user scroll, on feature usage, or on ✕.
 */
export function ContextualTip({ featureId, className = '', onLearnMore, autoHideSeconds = 8 }) {
    const [visible, setVisible] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isDismissing, setIsDismissing] = useState(false);
    const feature = GUIDE_FEATURES[featureId];

    useEffect(() => {
        if (!feature) return;
        if (!isGuideSeen(featureId)) {
            recordGuideImpression(featureId);
            setVisible(true);
        }
    }, [featureId, feature]);

    // WhatsApp-Style Intuitive Dismissal:
    // Auto-dismiss after 8s of display if user doesn't expand,
    // or when the user scrolls the page to read/view content
    useEffect(() => {
        if (!visible || isExpanded) return;

        let timer = null;
        if (autoHideSeconds > 0) {
            timer = setTimeout(() => {
                handleAutoDismiss();
            }, autoHideSeconds * 1000);
        }

        const handleScroll = () => {
            if (window.scrollY > 40 || document.documentElement.scrollTop > 40) {
                handleAutoDismiss();
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            if (timer) clearTimeout(timer);
            window.removeEventListener('scroll', handleScroll);
        };
    }, [visible, isExpanded, autoHideSeconds]);

    const handleAutoDismiss = () => {
        setIsDismissing(true);
        setTimeout(() => {
            markGuideSeen(featureId);
            setVisible(false);
            setIsDismissing(false);
        }, 350);
    };

    const handleDismiss = (e) => {
        e?.stopPropagation?.();
        setIsDismissing(true);
        setTimeout(() => {
            markGuideSeen(featureId);
            setVisible(false);
            setIsDismissing(false);
        }, 300);
    };

    const handleAction = (e) => {
        e?.stopPropagation?.();
        markGuideSeen(featureId);
        setVisible(false);
        if (onLearnMore) {
            onLearnMore(featureId);
        }
    };

    if (!visible || !feature) return null;

    return (
        <div 
            className={`contextual-tip-card contextual-tip-pill ${isExpanded ? 'is-expanded' : 'is-collapsed'} ${isDismissing ? 'is-dismissing' : ''} ${className} animate-fade-in`}
            role="region"
            aria-label={`Tip for ${feature.title}`}
        >
            {!isExpanded ? (
                <div 
                    className="contextual-tip-collapsed" 
                    onClick={() => setIsExpanded(true)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsExpanded(true); } }}
                    title="Tap to learn more"
                >
                    <div className="tip-collapsed-content">
                        <span className="tip-collapsed-icon">{feature.icon || '💡'}</span>
                        <span className="tip-collapsed-prefix">Tip:</span>
                        <span className="tip-collapsed-text">{feature.shortText}</span>
                    </div>
                    <div className="tip-collapsed-actions">
                        <button
                            type="button"
                            className="tip-collapsed-expand-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsExpanded(true);
                            }}
                            aria-label="Expand tip details"
                        >
                            Learn More
                        </button>
                        <button
                            type="button"
                            className="tip-close-btn tip-collapsed-close"
                            onClick={handleDismiss}
                            aria-label="Dismiss tip permanently"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            ) : (
                <div className="contextual-tip-expanded-content">
                    <div className="contextual-tip-header">
                        <div className="tip-badge-row">
                            <span className="tip-icon">{feature.icon}</span>
                            <span className="tip-badge">{feature.badge}</span>
                        </div>
                        <div className="tip-header-actions">
                            <button
                                type="button"
                                className="tip-collapse-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsExpanded(false);
                                }}
                                aria-label="Collapse tip"
                                title="Collapse"
                            >
                                ▴
                            </button>
                            <button
                                type="button"
                                className="tip-close-btn"
                                onClick={handleDismiss}
                                aria-label="Dismiss tip"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                    <div className="contextual-tip-body">
                        <h4 className="tip-title">{feature.title}</h4>
                        <p className="tip-text">{feature.shortText}</p>
                    </div>
                    <div className="contextual-tip-actions">
                        {onLearnMore && (
                            <button
                                type="button"
                                className="tip-action-btn secondary"
                                onClick={handleAction}
                            >
                                Full Guide
                            </button>
                        )}
                        <button
                            type="button"
                            className="tip-action-btn primary"
                            onClick={handleDismiss}
                        >
                            Got It 👍
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * AppGuideModal
 * Full 7-action interactive guide modal accessible anytime from Settings or via "Learn More".
 */
export function AppGuideModal({ isOpen, onClose, initialFeatureId = 'match_swipe' }) {
    const featureList = Object.values(GUIDE_FEATURES);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (!isOpen) return;
        const targetIdx = featureList.findIndex(f => f.id === initialFeatureId);
        if (targetIdx !== -1) {
            setCurrentIndex(targetIdx);
        }
    }, [isOpen, initialFeatureId]);

    if (!isOpen) return null;

    const currentFeature = featureList[currentIndex];

    const handlePrev = () => {
        setCurrentIndex(prev => (prev > 0 ? prev - 1 : featureList.length - 1));
    };

    const handleNext = () => {
        setCurrentIndex(prev => (prev < featureList.length - 1 ? prev + 1 : 0));
    };

    return (
        <div className="guide-modal-overlay animate-fade-in" onClick={onClose}>
            <div className="guide-modal-card glass" onClick={e => e.stopPropagation()}>
                <div className="guide-modal-header">
                    <div className="guide-modal-title">
                        <span className="guide-header-icon">📖</span>
                        <div>
                            <h3>How College Date Works</h3>
                            <span className="guide-step-counter">Step {currentIndex + 1} of {featureList.length}</span>
                        </div>
                    </div>
                    <button type="button" className="guide-close-btn" onClick={onClose} aria-label="Close guide">
                        ✕
                    </button>
                </div>

                {/* Feature Selector Chips */}
                <div className="guide-chips-scroll">
                    {featureList.map((feature, idx) => (
                        <button
                            key={feature.id}
                            type="button"
                            className={`guide-chip ${idx === currentIndex ? 'active' : ''}`}
                            onClick={() => setCurrentIndex(idx)}
                        >
                            <span>{feature.icon}</span>
                            <span className="chip-label">{feature.title}</span>
                        </button>
                    ))}
                </div>

                {/* Active Feature Detail Card */}
                <div className="guide-feature-view">
                    <div className="feature-icon-badge">
                        <span className="feature-main-icon">{currentFeature.icon}</span>
                        <span className="feature-badge-pill">{currentFeature.badge}</span>
                    </div>

                    <h2 className="feature-title">{currentFeature.title}</h2>
                    <p className="feature-short-desc">{currentFeature.shortText}</p>

                    <div className="feature-details-list">
                        {currentFeature.details.map((item, idx) => (
                            <div key={idx} className="feature-detail-item">
                                <span className="detail-bullet">✓</span>
                                <span className="detail-text">{item}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Modal Navigation Footer */}
                <div className="guide-modal-footer">
                    <button
                        type="button"
                        className="btn-guide-nav"
                        onClick={handlePrev}
                        disabled={currentIndex === 0}
                    >
                        ← Previous
                    </button>

                    <div className="guide-indicator-dots">
                        {featureList.map((_, idx) => (
                            <span
                                key={idx}
                                className={`indicator-dot ${idx === currentIndex ? 'active' : ''}`}
                                onClick={() => setCurrentIndex(idx)}
                            />
                        ))}
                    </div>

                    {currentIndex < featureList.length - 1 ? (
                        <button
                            type="button"
                            className="btn-guide-nav primary"
                            onClick={handleNext}
                        >
                            Next →
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="btn-guide-nav primary done"
                            onClick={onClose}
                        >
                            Ready to Vibe! 🚀
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
