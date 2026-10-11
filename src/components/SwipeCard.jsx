import { useState, memo, useMemo, useEffect, useRef, useCallback } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import OptimizedImage from './OptimizedImage';
import { useAuth } from '../contexts/AuthContext';
import { isRecentlyActive, isRecentlyLive } from '../utils/presence';
import { formatDisplayName, getProfilePhotos, normalizeProfile, safeArray } from '../utils/profileData';
import { hasActivePremium } from '../utils/premium';
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
import './SwipeCard.css';

const EXIT_TRANSITION = { type: 'tween', duration: 0.22, ease: 'easeOut' };
const RESET_TRANSITION = { type: 'spring', stiffness: 340, damping: 26, mass: 0.9 };
const MotionDiv = motion.div;

function SwipeCard({
    profile,
    onSwipe,
    onBeforeSwipe,
    onSwipeCancel,
    superSwipesAvailable = 0,
    onSuperSwipe,
    priority = false,
    isTop = true,
    stackPosition = 0
}) {
    const { userProfile: myProfile } = useAuth();
    const displayProfile = useMemo(() => normalizeProfile(profile) || {}, [profile]);
    const isProfilePremium = useMemo(() => hasActivePremium(displayProfile), [displayProfile]);
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

    const photos = useMemo(() => getProfilePhotos(displayProfile), [displayProfile]);

    const mutualInterests = useMemo(() => {
        return safeArray(myProfile?.interests).filter(interest =>
            safeArray(displayProfile?.interests).includes(interest)
        );
    }, [myProfile?.interests, displayProfile?.interests]);

    const compatibilityScore = useMemo(() => {
        let score = 55;
        if (displayProfile?.intent && displayProfile?.intent === myProfile?.intent) score += 20;
        if (displayProfile?.university && displayProfile?.university === myProfile?.university) score += 15;
        score += Math.min(15, mutualInterests.length * 5);
        return Math.min(99, score);
    }, [displayProfile, myProfile, mutualInterests]);

    const whyYouMatchBadge = useMemo(() => {
        return getWhyYouMatchBadge(displayProfile, myProfile);
    }, [displayProfile, myProfile]);

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
        if (!canInteract) return;
        stopAnimation();
        dragMoveCountRef.current = 0;
        dragStartTimeRef.current = performance.now();
        recordSwipeDebug('drag-start', { profileId: displayProfile.id });
    }, [canInteract, displayProfile.id, stopAnimation]);

    const handleDrag = useCallback(() => {
        if (!canInteract) return;
        dragMoveCountRef.current += 1;
    }, [canInteract]);

    const handleDragEnd = useCallback((_event, info) => {
        if (!canInteract || swipeInProgressRef.current) return;

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
    }, [canInteract, completeSwipe, displayProfile.id, resetCardPosition, x]);

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
        if (e.target.closest('button') || e.target.closest('.photo-indicators') || e.target.closest('.carousel-nav') || e.target.closest('.premium-note-container')) {
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
        setIsExpanded(true);
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
            if (document.querySelector('.filter-overlay, .match-overlay, .guide-modal-overlay, .premium-modal-overlay')) {
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
    const bio = displayProfile.bio || 'No bio yet';

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
            drag={canInteract ? 'x' : false}
            dragListener={canInteract}
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
                        <div className="card-premium-golden-badge" title="👑 Premium Member">
                            <span className="premium-crown-icon">👑</span>
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
                            {isProfilePremium && (
                                <span className="swipe-tag premium-tag-glow">👑 Premium</span>
                            )}
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
                            {displayProfile.role === 'Female' && (
                                <span className="swipe-tag premium-available">💎 Premium Unlock Available</span>
                            )}
                        </div>
                        <h2 className="swipe-card-name">
                            {displayName}
                            {age && <span className="swipe-card-age">, {age}</span>}
                            {isProfilePremium && <span className="premium-crown" title="Premium Member">👑</span>}
                            {(displayProfile.is_verified || displayProfile.photo_verified) && (
                                <span className="card-verified-tick" title="Photo Verified Student">✓</span>
                            )}
                        </h2>

                        <div className={`swipe-card-bio-wrapper ${isExpanded ? 'expanded' : ''}`}>
                            <p className="swipe-card-bio">{bio}</p>

                            {isExpanded && (
                                <div className="swipe-card-extra-info fade-in mt-4">
                                    <div className="compatibility-match-banner">
                                        <span className="banner-badge">✨ Compatibility: {compatibilityScore}%</span>
                                        {mutualInterests.length > 0 ? (
                                            <p className="banner-desc">You both love <strong>{mutualInterests.join(', ')}</strong>!</p>
                                        ) : (
                                            <p className="banner-desc">Common student goals & shared vibe.</p>
                                        )}
                                    </div>
                                    {displayProfile.department && <p><strong>Dept:</strong> {displayProfile.department}</p>}
                                    {displayProfile.level && <p><strong>Level:</strong> {displayProfile.level}</p>}
                                    {displayProfile.attraction_goal && <p><strong>Looking for:</strong> {displayProfile.attraction_goal}</p>}
                                    {safeArray(displayProfile.interests).length > 0 && (
                                        <div className="mt-2">
                                            <strong>Interests:</strong>
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {safeArray(displayProfile.interests).map(i => <span key={i} className="swipe-tag text-xs">{i}</span>)}
                                            </div>
                                        </div>
                                    )}
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
                            )}
                        </div>

                        {!isExpanded && (
                            <div className="swipe-card-actions-row mt-4">
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
                        )}
                    </div>
                </div>
            </div>
        </MotionDiv>
    );
}

const MemoizedSwipeCard = memo(SwipeCard);
export default MemoizedSwipeCard;
