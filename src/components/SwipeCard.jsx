import { useState, memo, useMemo, useEffect, useRef, useCallback } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import OptimizedImage from './OptimizedImage';
import { useAuth } from '../contexts/AuthContext';
import { isRecentlyActive, isRecentlyLive } from '../utils/presence';
import { formatDisplayName, getProfilePhotos, normalizeProfile, safeArray } from '../utils/profileData';
import { hasActivePremium, getMatchPhotoLimit, isEliteUltra } from '../utils/premium';
import { requestAiAssistant } from '../services/aiAssistantService';
import { cacheMediaSource } from '../lib/mediaCache';
import { getOptimizedUrl } from '../lib/imageUrl';
import { incrementSwipeDebugCounter, isSwipeDebugEnabled, recordSwipeDebug } from '../utils/swipePerformanceDebug';
import {
    MIN_EXIT_DISTANCE,
    completeVisualSwipe,
    resolveSwipeDirection
} from '../utils/swipeLifecycle';
import { getWhyYouMatchBadge } from '../utils/campusCommonGround';
import { sanitizeBioForDisplay } from '../utils/offPlatformGuard';
import './SwipeCard.css';

const EXIT_TRANSITION = { type: 'tween', duration: 0.22, ease: 'easeOut' };
const RESET_TRANSITION = { type: 'spring', stiffness: 340, damping: 26, mass: 0.9 };
const MotionDiv = motion.div;

function formatInterestWithEmoji(interest) {
    if (!interest) return '';
    const text = String(interest).trim();
    if (/[\p{Emoji}]/u.test(text)) return text;
    const lower = text.toLowerCase();
    if (lower.includes('afrobeat') || lower.includes('music')) return `🎶 ${text}`;
    if (lower.includes('food') || lower.includes('jollof') || lower.includes('eat')) return `🥘 ${text}`;
    if (lower.includes('photo')) return `📸 ${text}`;
    if (lower.includes('danc')) return `💃 ${text}`;
    if (lower.includes('law') || lower.includes('court')) return `⚖️ ${text}`;
    if (lower.includes('code') || lower.includes('tech') || lower.includes('program')) return `💻 ${text}`;
    if (lower.includes('gym') || lower.includes('fit') || lower.includes('workout')) return `💪 ${text}`;
    if (lower.includes('book') || lower.includes('read') || lower.includes('study')) return `📚 ${text}`;
    if (lower.includes('game') || lower.includes('gaming')) return `🎮 ${text}`;
    if (lower.includes('draw') || lower.includes('art')) return `🎨 ${text}`;
    if (lower.includes('coffee') || lower.includes('tea')) return `☕ ${text}`;
    if (lower.includes('wine') || lower.includes('cocktail')) return `🍷 ${text}`;
    return `✨ ${text}`;
}

function SwipeCard({
    profile,
    myProfile,
    onSwipe,
    onBeforeSwipe,
    onSwipeCancel,
    superSwipesAvailable = 0,
    onSuperSwipe,
    priority = false,
    isTop = true,
    stackPosition = 0,
    onOpenPromptReply,
    onShareProfile,
    onBlockProfile,
    onReportProfile
}) {
    const { userProfile: authProfile } = useAuth();
    const effectiveMyProfile = myProfile || authProfile;
    const displayProfile = useMemo(() => normalizeProfile(profile) || {}, [profile]);
    const isProfilePremium = useMemo(() => hasActivePremium(displayProfile), [displayProfile]);
    const isProfileUltra = useMemo(() => isEliteUltra(displayProfile), [displayProfile]);
    const photoLimit = useMemo(() => getMatchPhotoLimit(displayProfile, effectiveMyProfile), [displayProfile, effectiveMyProfile]);
    const [activePhotoIdx, setActivePhotoIdx] = useState(0);
    const [aiInsight, setAiInsight] = useState(null);
    const [aiInsightType, setAiInsightType] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const animationRef = useRef(null);
    const swipeInProgressRef = useRef(false);
    const dragMoveCountRef = useRef(0);
    const dragStartTimeRef = useRef(0);
    const renderCountRef = useRef(0);

    const allPhotos = useMemo(() => getProfilePhotos(displayProfile), [displayProfile]);
    const photos = useMemo(() => allPhotos.slice(0, photoLimit), [allPhotos, photoLimit]);

    const mutualInterests = useMemo(() => {
        return safeArray(effectiveMyProfile?.interests).filter(interest =>
            safeArray(displayProfile?.interests).includes(interest)
        );
    }, [effectiveMyProfile?.interests, displayProfile?.interests]);

    const compatibilityScore = useMemo(() => {
        let score = 55;
        if (displayProfile?.attraction_goal && displayProfile?.attraction_goal === effectiveMyProfile?.attraction_goal) score += 20;
        if (displayProfile?.university && displayProfile?.university === effectiveMyProfile?.university) score += 15;
        score += Math.min(15, mutualInterests.length * 5);
        return Math.min(99, score);
    }, [displayProfile, effectiveMyProfile, mutualInterests]);

    const whyYouMatchBadge = useMemo(() => {
        return getWhyYouMatchBadge(displayProfile, effectiveMyProfile);
    }, [displayProfile, effectiveMyProfile]);

    useEffect(() => {
        if (isSwipeDebugEnabled()) {
            renderCountRef.current += 1;
            incrementSwipeDebugCounter(`cardRender:${displayProfile?.id || 'unknown'}`);
            recordSwipeDebug('card-render', {
                profileId: displayProfile?.id,
                renderCount: renderCountRef.current,
                isTop,
                stackPosition,
                swipeInProgress: swipeInProgressRef.current
            });
        }
    }, [displayProfile?.id]);

    useEffect(() => {
        if (activePhotoIdx < photos.length - 1) {
            const nextUrl = getOptimizedUrl(photos[activePhotoIdx + 1], 800);
            cacheMediaSource(nextUrl).catch(() => {});
        }
    }, [activePhotoIdx, photos]);

    const x = useMotionValue(0);
    const rotate = useTransform(x, [-240, 240], [-13, 13]);
    const likeOpacity = useTransform(x, [28, 110], [0, 1]);
    const nopeOpacity = useTransform(x, [-110, -28], [1, 0]);
    const likeScale = useTransform(x, [28, 110], [0.75, 1.15]);
    const likeRotate = useTransform(x, [28, 110], [0, -15]);
    const nopeScale = useTransform(x, [-28, -110], [0.75, 1.15]);
    const nopeRotate = useTransform(x, [-28, -110], [0, 15]);

    const stopAnimation = useCallback(() => {
        animationRef.current?.stop();
        animationRef.current = null;
    }, []);

    const resetCardPosition = useCallback(async () => {
        stopAnimation();
        const controls = animate(x, 0, RESET_TRANSITION);
        animationRef.current = controls;
        try {
            await controls.finished;
        } catch {
            // Animation was superseded.
        } finally {
            if (animationRef.current === controls) animationRef.current = null;
        }
    }, [stopAnimation, x]);

    useEffect(() => {
        stopAnimation();
        x.set(0);
        setActivePhotoIdx(0);
        swipeInProgressRef.current = false;
        dragMoveCountRef.current = 0;
        setIsExpanded(false);

        recordSwipeDebug('card-mounted', { profileId: displayProfile.id });

        return () => {
            stopAnimation();
            recordSwipeDebug('card-unmounted', { profileId: displayProfile.id });
        };
    }, [displayProfile.id, stopAnimation, x]);

    const canInteract = isTop;
    const depth = Math.min(Math.max(stackPosition, 0), 2);
    const stackScale = canInteract ? 1 : 1 - depth * 0.035;
    const stackY = canInteract ? 0 : depth * 12;
    const stackOpacity = depth === 1 ? 0.9 : 0.72;
    const zIndex = canInteract ? 30 : 30 - depth * 10;
    const cardStyle = canInteract
        ? { x, rotate, zIndex, pointerEvents: 'auto' }
        : {
            zIndex,
            pointerEvents: 'none',
            opacity: stackOpacity,
            transform: `translate3d(0, ${stackY}px, 0) scale(${stackScale})`
        };

    const completeSwipe = useCallback(async (direction, type = 'standard', source = 'drag') => {
        if (!displayProfile?.id || !canInteract || swipeInProgressRef.current) return;

        recordSwipeDebug('swipe-threshold-accepted', {
            profileId: displayProfile.id,
            direction,
            type,
            source
        });

        const result = await completeVisualSwipe({
            profile: displayProfile,
            direction,
            type,
            source,
            swipeInProgressRef,
            canStartSwipe: onBeforeSwipe,
            onCancel: onSwipeCancel,
            getViewportWidth: () => (typeof window !== 'undefined' ? window.innerWidth : MIN_EXIT_DISTANCE),
            animateExit: async (targetX) => {
                stopAnimation();
                const start = performance.now();
                const controls = animate(x, targetX, EXIT_TRANSITION);
                animationRef.current = controls;
                recordSwipeDebug('exit-animation-start', {
                    profileId: displayProfile.id,
                    direction,
                    type,
                    source,
                    targetX
                });

                await controls.finished;
                if (animationRef.current === controls) animationRef.current = null;

                recordSwipeDebug('exit-animation-complete', {
                    profileId: displayProfile.id,
                    direction,
                    type,
                    duration: Math.round(performance.now() - start)
                });
            },
            onVisualComplete: (_direction, completedProfile, swipeType) => {
                if (swipeType === 'super') {
                    onSuperSwipe?.(completedProfile);
                } else {
                    onSwipe?.(_direction, completedProfile, swipeType);
                }
            }
        });

        if (result.status === 'denied' || result.status === 'cancelled') {
            await resetCardPosition();
            return;
        }

        recordSwipeDebug('swipe-visual-complete', {
            profileId: displayProfile.id,
            direction,
            type,
            source
        });
    }, [
        canInteract,
        displayProfile,
        onBeforeSwipe,
        onSuperSwipe,
        onSwipe,
        onSwipeCancel,
        resetCardPosition,
        stopAnimation,
        x
    ]);

    const handleDragStart = useCallback(() => {
        if (!canInteract || isExpanded) return;
        stopAnimation();
        dragMoveCountRef.current = 0;
        dragStartTimeRef.current = performance.now();
        recordSwipeDebug('drag-start', { profileId: displayProfile.id });
    }, [canInteract, isExpanded, displayProfile.id, stopAnimation]);

    const handleDrag = useCallback(() => {
        if (!canInteract || isExpanded) return;
        dragMoveCountRef.current += 1;
    }, [canInteract, isExpanded]);

    const handleDragEnd = useCallback((_event, info) => {
        if (!canInteract || isExpanded || swipeInProgressRef.current) return;

        const visualOffset = x.get();
        const horizontalVelocity = info.velocity.x;
        const direction = resolveSwipeDirection({
            offsetX: visualOffset,
            velocityX: horizontalVelocity
        });

        recordSwipeDebug('drag-end', {
            profileId: displayProfile.id,
            offsetX: Math.round(visualOffset),
            velocityX: Math.round(horizontalVelocity),
            moves: dragMoveCountRef.current,
            duration: Math.round(performance.now() - dragStartTimeRef.current),
            direction
        });

        if (!direction) {
            resetCardPosition();
            return;
        }

        completeSwipe(direction, 'standard', 'drag');
    }, [canInteract, isExpanded, completeSwipe, displayProfile.id, resetCardPosition, x]);

    const nextPhoto = useCallback((e) => {
        e.stopPropagation();
        if (!canInteract) return;
        if (activePhotoIdx < photos.length - 1) {
            setActivePhotoIdx(prev => prev + 1);
        }
    }, [activePhotoIdx, canInteract, photos.length]);

    const prevPhoto = useCallback((e) => {
        e.stopPropagation();
        if (!canInteract) return;
        if (activePhotoIdx > 0) {
            setActivePhotoIdx(prev => prev - 1);
        }
    }, [activePhotoIdx, canInteract]);

    const toggleExpand = useCallback((e) => {
        if (!canInteract) return;
        if (e.target.closest('button') || e.target.closest('.photo-indicators') || e.target.closest('.carousel-nav') || e.target.closest('.modular-profile-scroll')) {
            return;
        }
        setIsExpanded(prev => !prev);
    }, [canInteract]);

    const handleAiInsight = useCallback(async (e, task = 'compatibility') => {
        e.stopPropagation();
        if (aiLoading || !canInteract) return;
        setAiInsightType(task);
        setAiLoading(true);
        const { data, error } = await requestAiAssistant(task, {
            targetProfileId: displayProfile.id,
            targetProfile: displayProfile
        });
        if (!error) setAiInsight(data);
        setAiLoading(false);
    }, [aiLoading, canInteract, displayProfile]);

    const handleActionSwipe = useCallback((e, direction, type = 'standard') => {
        e.stopPropagation();
        completeSwipe(direction, type, 'button');
    }, [completeSwipe]);

    useEffect(() => {
        if (!canInteract) return;

        const handleKeyDown = (e) => {
            const tag = e.target?.tagName?.toLowerCase();
            if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable) {
                return;
            }
            if (document.querySelector('.discovery-pref-overlay, .prompt-reply-overlay, .report-modal-overlay, .filter-overlay, .match-overlay, .guide-modal-overlay, .premium-modal-overlay')) {
                return;
            }

            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                completeSwipe('left', 'standard', 'keyboard');
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                completeSwipe('right', 'standard', 'keyboard');
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (onSuperSwipe && superSwipesAvailable > 0) {
                    completeSwipe('right', 'super', 'keyboard');
                } else {
                    completeSwipe('right', 'standard', 'keyboard');
                }
            } else if (e.key === ' ' || e.key === 'Spacebar') {
                e.preventDefault();
                setIsExpanded(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [canInteract, completeSwipe, onSuperSwipe, superSwipesAvailable]);

    const stopInteractivePointer = useCallback((e) => {
        e.stopPropagation();
    }, []);

    const isLive = isRecentlyLive(displayProfile);
    const recentlyActive = isRecentlyActive(displayProfile);
    const displayName = formatDisplayName(displayProfile.full_name, displayProfile.username, 'Student');
    const age = displayProfile.age || '';
    const university = displayProfile.university || 'University Student';
    const bio = sanitizeBioForDisplay(displayProfile.bio || 'No bio yet', isEliteUltra(displayProfile));

    const renderAiInsight = () => {
        if (!aiInsight) return null;

        if (aiInsight.openers?.length) {
            return (
                <>
                    <strong>AI Opening Lines</strong>
                    {aiInsight.openers.slice(0, 3).map((item) => <p key={item}>+ {item}</p>)}
                    {aiInsight.why_it_works && <small>{aiInsight.why_it_works}</small>}
                </>
            );
        }

        if (aiInsight.ideas?.length) {
            return (
                <>
                    <strong>AI Campus Date Ideas</strong>
                    {aiInsight.ideas.slice(0, 3).map((idea) => (
                        <p key={idea.title || idea.why}>+ {idea.title || 'Campus idea'}{idea.why ? ` - ${idea.why}` : ''}</p>
                    ))}
                    {aiInsight.safety_note && <small>{aiInsight.safety_note}</small>}
                </>
            );
        }

        return (
            <>
                <strong>AI Match Insight</strong>
                {typeof aiInsight.score === 'number' && <p>{aiInsight.score}% compatibility signal</p>}
                {aiInsight.highlights?.slice(0, 2).map((item) => <p key={item}>+ {item}</p>)}
                {aiInsight.watchouts?.slice(0, 1).map((item) => <small key={item}>Watch: {item}</small>)}
                {aiInsight.best_opener && <p><em>{aiInsight.best_opener}</em></p>}
            </>
        );
    };

    return (
        <MotionDiv
            className={`swipe-card ${isExpanded ? 'expanded-mode' : ''} ${canInteract ? 'top-card' : 'stack-card'}`}
            style={cardStyle}
            drag={canInteract && !isExpanded ? 'x' : false}
            dragListener={canInteract && !isExpanded}
            dragConstraints={false}
            dragElastic={1}
            dragMomentum={false}
            onDragStart={handleDragStart}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            onClick={toggleExpand}
            data-profile-id={displayProfile.id}
            data-stack-position={stackPosition}
            aria-hidden={!canInteract}
            draggable={false}
        >
            <div className="swipe-card-inner">
                {/* ── EXPANDED MODULAR PROFILE DETAIL VIEW (Tinder Architecture) ── */}
                {isExpanded ? (
                    <div className="modular-profile-scroll" onClick={stopInteractivePointer}>
                        {/* Sticky Header with Collapse Chevron */}
                        <div className="modular-sticky-header">
                            <div className="modular-header-identity">
                                <h2 className="modular-header-name">
                                    {displayName}{age ? `, ${age}` : ''}
                                </h2>
                                {(displayProfile.is_verified || displayProfile.photo_verified) && (
                                    <span className="card-verified-tick" title="Photo Verified Student">✓</span>
                                )}
                                {isProfilePremium && (
                                    <span className="premium-crown" title={isProfileUltra ? "Elite Ultra VIP" : "Premium Member"}>
                                        {isProfileUltra ? "👑⭐" : "👑"}
                                    </span>
                                )}
                            </div>
                            <button
                                type="button"
                                className="modular-btn-collapse"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsExpanded(false);
                                }}
                                aria-label="Collapse profile"
                                title="Close Profile"
                            >
                                ⌵
                            </button>
                        </div>

                        {/* Photo Carousel Hero */}
                        <div className="modular-photo-hero">
                            {photos.length > 1 && (
                                <div className="photo-indicators">
                                    {photos.map((_, i) => (
                                        <div key={i} className={`indicator-bar ${i === activePhotoIdx ? 'active' : ''}`}>
                                            <div className="indicator-progress"></div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="carousel-nav nav-left" onClick={prevPhoto}></div>
                            <div className="carousel-nav nav-right" onClick={nextPhoto}></div>

                            {photos.length > 0 && photos[activePhotoIdx] ? (
                                <OptimizedImage
                                    src={photos[activePhotoIdx]}
                                    alt={displayName}
                                    className="swipe-card-image"
                                    width={800}
                                    priority={priority && activePhotoIdx === 0}
                                    draggable={false}
                                />
                            ) : (
                                <div className="swipe-card-placeholder flex">
                                    {displayName.charAt(0).toUpperCase()}
                                </div>
                            )}

                            {/* Photo Reply Button */}
                            <button
                                type="button"
                                className="modular-photo-reply-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenPromptReply?.(displayProfile, {
                                        category: 'Photo',
                                        content: `${displayName}'s photo`,
                                        photoUrl: photos[activePhotoIdx]
                                    });
                                }}
                            >
                                <span>✈</span> Reply
                            </button>
                        </div>

                        {/* Modular Cards Stack */}
                        <div className="modular-cards-stack">
                            {/* Card 1: Looking For */}
                            {displayProfile.attraction_goal && (
                                <div className="modular-card">
                                    <div className="modular-card-header">
                                        <span className="modular-card-title">🔍 Looking for</span>
                                    </div>
                                    <p className="modular-looking-for-text">{displayProfile.attraction_goal}</p>
                                    <button
                                        type="button"
                                        className="modular-card-reply-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onOpenPromptReply?.(displayProfile, {
                                                category: 'Looking for',
                                                content: displayProfile.attraction_goal
                                            });
                                        }}
                                    >
                                        <span>✈</span> Reply
                                    </button>
                                </div>
                            )}

                            {/* Card 2: About Me */}
                            <div className="modular-card">
                                <div className="modular-card-header">
                                    <span className="modular-card-title">“ About me</span>
                                </div>
                                <p className="modular-bio-text">{bio}</p>
                                <button
                                    type="button"
                                    className="modular-card-reply-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onOpenPromptReply?.(displayProfile, {
                                            category: 'About me',
                                            content: bio
                                        });
                                    }}
                                >
                                    <span>✈</span> Reply
                                </button>
                            </div>

                            {/* Card 3: Campus Essentials */}
                            <div className="modular-card">
                                <div className="modular-card-header">
                                    <span className="modular-card-title">📇 Essentials</span>
                                </div>
                                <div className="modular-essentials-list">
                                    <div className="modular-essential-item">
                                        <span className="modular-essential-icon">📍</span>
                                        <span>{displayProfile.isExpandedCampus ? 'Cross-Campus Network' : university}</span>
                                    </div>
                                    {displayProfile.department && (
                                        <div className="modular-essential-item">
                                            <span className="modular-essential-icon">🎓</span>
                                            <span>{displayProfile.department} {displayProfile.level ? `(${displayProfile.level}L)` : ''}</span>
                                        </div>
                                    )}
                                    {displayProfile.gender && (
                                        <div className="modular-essential-item">
                                            <span className="modular-essential-icon">👤</span>
                                            <span>{displayProfile.gender === 'Female' ? 'Woman' : displayProfile.gender === 'Male' ? 'Man' : displayProfile.gender}</span>
                                        </div>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    className="modular-card-reply-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onOpenPromptReply?.(displayProfile, {
                                            category: 'Campus Essentials',
                                            content: `${university} • ${displayProfile.department || 'Student'}`
                                        });
                                    }}
                                >
                                    <span>✈</span> Reply
                                </button>
                            </div>

                            {/* Card 4: Campus Prompts */}
                            <div className="modular-card">
                                <div className="modular-card-header">
                                    <span className="modular-card-title">💬 {displayProfile.intro_prompt_title || "I feel happiest when..."}</span>
                                </div>
                                <p className="modular-prompt-quote">
                                    {displayProfile.intro_prompt || "Late night laughter and discovering great campus vibes ✨"}
                                </p>
                                <button
                                    type="button"
                                    className="modular-card-reply-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onOpenPromptReply?.(displayProfile, {
                                            category: 'Campus Prompt',
                                            content: displayProfile.intro_prompt || "Late night laughter and discovering great campus vibes ✨"
                                        });
                                    }}
                                >
                                    <span>✈</span> Reply
                                </button>
                            </div>

                            {/* Card 5: Basics & Lifestyle */}
                            {(displayProfile.mbti || displayProfile.zodiac || displayProfile.communication_style) && (
                                <div className="modular-card">
                                    <div className="modular-card-header">
                                        <span className="modular-card-title">📁 Basics</span>
                                    </div>
                                    <div className="modular-essentials-list">
                                        {displayProfile.communication_style && (
                                            <div className="modular-essential-item">
                                                <span className="modular-essential-icon">💬</span>
                                                <span>Communication: {displayProfile.communication_style}</span>
                                            </div>
                                        )}
                                        {displayProfile.zodiac && (
                                            <div className="modular-essential-item">
                                                <span className="modular-essential-icon">⭐</span>
                                                <span>Zodiac: {displayProfile.zodiac}</span>
                                            </div>
                                        )}
                                        {displayProfile.mbti && (
                                            <div className="modular-essential-item">
                                                <span className="modular-essential-icon">🧠</span>
                                                <span>MBTI: {displayProfile.mbti}</span>
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        className="modular-card-reply-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onOpenPromptReply?.(displayProfile, {
                                                category: 'Basics',
                                                content: `Zodiac: ${displayProfile.zodiac || ''} • MBTI: ${displayProfile.mbti || ''}`
                                            });
                                        }}
                                    >
                                        <span>✈</span> Reply
                                    </button>
                                </div>
                            )}

                            {/* Card 6: Interests */}
                            {safeArray(displayProfile.interests).length > 0 && (
                                <div className="modular-card">
                                    <div className="modular-card-header">
                                        <span className="modular-card-title">🧩 Interests</span>
                                    </div>
                                    <div className="modular-interests-wrap">
                                        {safeArray(displayProfile.interests).map(item => (
                                            <span key={item} className="modular-interest-chip">
                                                {formatInterestWithEmoji(item)}
                                            </span>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        className="modular-card-reply-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onOpenPromptReply?.(displayProfile, {
                                                category: 'Interests',
                                                content: safeArray(displayProfile.interests).slice(0, 4).join(', ')
                                            });
                                        }}
                                    >
                                        <span>✈</span> Reply
                                    </button>
                                </div>
                            )}

                            {/* Card 7: AI Match Wingmate & Compatibility */}
                            <div className="modular-card">
                                <div className="modular-card-header">
                                    <span className="modular-card-title">🤖 AI Wingmate & Compatibility</span>
                                </div>
                                <div className="compatibility-match-banner" style={{ margin: 0 }}>
                                    <span className="banner-badge">✨ Compatibility: {compatibilityScore}%</span>
                                    {mutualInterests.length > 0 ? (
                                        <p className="banner-desc">You both love <strong>{mutualInterests.join(', ')}</strong>!</p>
                                    ) : (
                                        <p className="banner-desc">Common student goals & shared campus vibe.</p>
                                    )}
                                </div>
                                <div className="ai-detail-tools" aria-label="AI match tools">
                                    <span>AI wingmate</span>
                                    <div>
                                        <button className="ai-detail-btn" onPointerDown={stopInteractivePointer} onClick={(e) => handleAiInsight(e, 'compatibility')} disabled={aiLoading || !canInteract}>
                                            {aiLoading && aiInsightType === 'compatibility' ? 'Reading...' : 'Insight'}
                                        </button>
                                        <button className="ai-detail-btn" onPointerDown={stopInteractivePointer} onClick={(e) => handleAiInsight(e, 'conversation_opener')} disabled={aiLoading || !canInteract}>
                                            Openers
                                        </button>
                                        <button className="ai-detail-btn" onPointerDown={stopInteractivePointer} onClick={(e) => handleAiInsight(e, 'date_ideas')} disabled={aiLoading || !canInteract}>
                                            Date
                                        </button>
                                    </div>
                                </div>
                                {aiInsight && (
                                    <div className={`ai-card-insight ${aiInsightType ? `ai-${aiInsightType}` : ''}`}>
                                        {renderAiInsight()}
                                    </div>
                                )}
                            </div>

                            {/* Card 8: Profile Action Rows */}
                            <div className="modular-actions-section">
                                <button
                                    type="button"
                                    className="modular-action-btn btn-modular-share"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onShareProfile?.(displayProfile);
                                    }}
                                >
                                    🔗 Share {displayName}
                                </button>
                                <button
                                    type="button"
                                    className="modular-action-btn btn-modular-block"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onBlockProfile?.(displayProfile);
                                    }}
                                >
                                    🚫 Block {displayName}
                                </button>
                                <button
                                    type="button"
                                    className="btn-modular-report"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onReportProfile?.(displayProfile);
                                    }}
                                >
                                    🚩 Report {displayName}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* ── STANDARD COLLAPSED SWIPE VIEW ── */
                    <div className="swipe-card-image-container">
                        {photos.length > 1 && (
                            <div className="photo-indicators">
                                {photos.map((_, i) => (
                                    <div key={i} className={`indicator-bar ${i === activePhotoIdx ? 'active' : ''}`}>
                                        <div className="indicator-progress"></div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="carousel-nav nav-left" onClick={prevPhoto}></div>
                        <div className="carousel-nav nav-right" onClick={nextPhoto}></div>

                        {photos.length > 0 && photos[activePhotoIdx] ? (
                            <OptimizedImage
                                src={photos[activePhotoIdx]}
                                alt={displayName}
                                className="swipe-card-image"
                                width={800}
                                priority={priority && activePhotoIdx === 0}
                                draggable={false}
                            />
                        ) : (
                            <div className="swipe-card-placeholder flex">
                                {displayName.charAt(0).toUpperCase()}
                            </div>
                        )}

                        {isProfilePremium && (
                            <div className="card-premium-golden-badge" title={isProfileUltra ? "👑 Elite Ultra VIP" : "👑 Premium Member"}>
                                <span className="premium-crown-icon">{isProfileUltra ? "👑⭐" : "👑"}</span>
                            </div>
                        )}

                        <MotionDiv
                            className="swipe-stamp stamp-like"
                            style={{ opacity: likeOpacity, scale: likeScale, rotate: likeRotate }}
                        >
                            LIKE
                        </MotionDiv>
                        <MotionDiv
                            className="swipe-stamp stamp-nope"
                            style={{ opacity: nopeOpacity, scale: nopeScale, rotate: nopeRotate }}
                        >
                            NOPE
                        </MotionDiv>

                        <div className="swipe-card-gradient" />

                        <div className="swipe-card-content">
                            <div className="swipe-card-tags">
                                {isProfileUltra ? (
                                    <span className="swipe-tag ultra-tag-glow">👑 Ultra VIP</span>
                                ) : isProfilePremium ? (
                                    <span className="swipe-tag premium-tag-glow">👑 Premium</span>
                                ) : null}
                                {(displayProfile.is_verified || displayProfile.photo_verified) && (
                                    <span className="swipe-tag verified-tag-glow">✓ Verified</span>
                                )}
                                {whyYouMatchBadge && (
                                    <span className="swipe-tag why-you-match-tag">{whyYouMatchBadge}</span>
                                )}
                                {isLive && (
                                    <div className="live-pulse-container">
                                        <span className="pulse-dot"></span>
                                        <span className="live-text">LIVE</span>
                                    </div>
                                )}
                                <span className="swipe-tag uni-tag">🎓 {university}</span>
                                {(displayProfile.isExpandedCampus || displayProfile.is_expanded_campus) && (
                                    <span className="swipe-tag expanded-campus-tag">📍 All Campuses</span>
                                )}
                                {recentlyActive && (
                                    <span className="swipe-tag active-tag">🟢 Recently Active</span>
                                )}
                                {displayProfile.is_top_seeker && (
                                    <span className="swipe-tag top-seeker-tag">🔥 Top Seeker</span>
                                )}
                            </div>

                            <h2 className="swipe-card-name">
                                {displayName}
                                {age && <span className="swipe-card-age">, {age}</span>}
                                {isProfilePremium && <span className="premium-crown" title={isProfileUltra ? "Elite Ultra VIP" : "Premium Member"}>{isProfileUltra ? "👑⭐" : "👑"}</span>}
                                {(displayProfile.is_verified || displayProfile.photo_verified) && (
                                    <span className="card-verified-tick" title="Photo Verified Student">✓</span>
                                )}
                            </h2>

                            <div className="swipe-card-bio-wrapper">
                                <p className="swipe-card-bio">{bio}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── PERSISTENT FLOATING ACTION DOCK (Always visible in both modes) ── */}
                <div className="persistent-floating-dock" onClick={stopInteractivePointer}>
                    <button
                        className="swipe-action-btn action-nope"
                        onPointerDown={stopInteractivePointer}
                        onClick={(e) => handleActionSwipe(e, 'left')}
                        disabled={!canInteract}
                        aria-label="Pass Profile"
                    >
                        ✕
                    </button>

                    {onSuperSwipe && (
                        <button
                            className="swipe-action-btn action-super"
                            onPointerDown={stopInteractivePointer}
                            onClick={(e) => handleActionSwipe(e, 'right', 'super')}
                            disabled={!canInteract}
                            aria-label="Super Swipe"
                        >
                            ⭐
                            {superSwipesAvailable > 0 && (
                                <span className="super-badge">{superSwipesAvailable}</span>
                            )}
                        </button>
                    )}

                    <button
                        className="swipe-action-btn action-like"
                        onPointerDown={stopInteractivePointer}
                        onClick={(e) => handleActionSwipe(e, 'right')}
                        disabled={!canInteract}
                        aria-label="Like Profile"
                    >
                        ❤️
                    </button>
                </div>
            </div>
        </MotionDiv>
    );
}

const MemoizedSwipeCard = memo(SwipeCard);
export default MemoizedSwipeCard;
