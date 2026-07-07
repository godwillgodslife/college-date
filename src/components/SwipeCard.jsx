import { useState, memo } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import OptimizedImage from './OptimizedImage';
import { useAuth } from '../contexts/AuthContext';
import { isRecentlyActive, isRecentlyLive } from '../utils/presence';
import { requestAiAssistant } from '../services/aiAssistantService';
import './SwipeCard.css';

function SwipeCard({ profile, onSwipe, onBeforeSwipe, superSwipesAvailable = 0, onSuperSwipe, priority = false, isTop = true }) {
    const { userProfile: myProfile } = useAuth();
    const [exitX, setExitX] = useState(0);
    const [activePhotoIdx, setActivePhotoIdx] = useState(0);
    const [aiInsight, setAiInsight] = useState(null);
    const [aiInsightType, setAiInsightType] = useState('');
    const [aiLoading, setAiLoading] = useState(false);

    const mutualInterests = (myProfile?.interests || []).filter(interest => 
        (profile?.interests || []).includes(interest)
    );

    const getCompatibilityScore = () => {
        let score = 55; // base score
        if (profile?.intent && profile?.intent === myProfile?.intent) score += 20;
        if (profile?.university && profile?.university === myProfile?.university) score += 15;
        const mutualCount = mutualInterests.length;
        score += Math.min(15, mutualCount * 5);
        return Math.min(99, score);
    };

    const photos = profile.profile_photos && profile.profile_photos.length > 0
        ? profile.profile_photos
        : [profile.avatar_url].filter(Boolean);

    const x = useMotionValue(0);
    const rotate = useTransform(x, [-200, 200], [-15, 15]);
    const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0.5, 1, 1, 1, 0.5]);

    // Color overlays
    const likeOpacity = useTransform(x, [50, 150], [0, 1]);
    const nopeOpacity = useTransform(x, [-150, -50], [1, 0]);

    const handleDragEnd = async (event, info) => {
        const direction = info.offset.x > 100 ? 'right' : info.offset.x < -100 ? 'left' : null;
        if (!direction || !isTop) return;

        const allowed = await onBeforeSwipe?.(direction);
        if (allowed === false) {
            x.set(0);
            return;
        }

        setExitX(direction === 'right' ? 300 : -300);
        setTimeout(() => onSwipe(direction), 260);
    };

    const nextPhoto = (e) => {
        e.stopPropagation();
        if (activePhotoIdx < photos.length - 1) {
            setActivePhotoIdx(prev => prev + 1);
        }
    };

    const prevPhoto = (e) => {
        e.stopPropagation();
        if (activePhotoIdx > 0) {
            setActivePhotoIdx(prev => prev - 1);
        }
    };

    const isLive = isRecentlyLive(profile);
    const recentlyActive = isRecentlyActive(profile);

    const displayName = profile.full_name || profile.username || 'User';
    const age = profile.age || '';
    const university = profile.university || 'University Student';
    const bio = profile.bio || 'No bio yet';

    const [isExpanded, setIsExpanded] = useState(false);

    const toggleExpand = (e) => {
        // Only toggle if they aren't clicking a specific button
        if (e.target.closest('button') || e.target.closest('.photo-indicators') || e.target.closest('.carousel-nav') || e.target.closest('.premium-note-container')) {
            return;
        }
        setIsExpanded(prev => !prev);
    };

    const handleAiInsight = async (e, task = 'compatibility') => {
        e.stopPropagation();
        if (aiLoading) return;
        setAiInsightType(task);
        setAiLoading(true);
        const { data, error } = await requestAiAssistant(task, {
            targetProfileId: profile.id,
            targetProfile: profile
        });
        if (!error) setAiInsight(data);
        setAiLoading(false);
        setIsExpanded(true);
    };

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
        <motion.div
            className={`swipe-card ${isExpanded ? 'expanded-mode' : ''}`}
            style={{ x, rotate, opacity }}
            drag="x"
            dragListener={isTop}
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={handleDragEnd}
            animate={{
                x: exitX,
                opacity: exitX !== 0 ? 0 : 1,
                scale: exitX !== 0 ? 0.8 : 1
            }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            whileTap={isTop ? { cursor: 'grabbing', scale: 1.02 } : undefined}
            onClick={toggleExpand}
        >
            <div className="swipe-card-inner">
                {/* Profile Image */}
                <div className="swipe-card-image-container">
                    {/* Photo Carousel Indicators */}
                    {photos.length > 1 && (
                        <div className="photo-indicators">
                            {photos.map((_, i) => (
                                <div key={i} className={`indicator-bar ${i === activePhotoIdx ? 'active' : ''}`}>
                                    <div className="indicator-progress"></div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Navigation Areas */}
                    <div className="carousel-nav nav-left" onClick={prevPhoto}></div>
                    <div className="carousel-nav nav-right" onClick={nextPhoto}></div>

                    {photos.length > 0 && photos[activePhotoIdx] ? (
                        <OptimizedImage
                            src={photos[activePhotoIdx]}
                            alt={displayName}
                            className="swipe-card-image"
                            width={800}
                            priority={priority && activePhotoIdx === 0}
                        />
                    ) : (
                        <div className="swipe-card-placeholder flex">
                            {displayName.charAt(0).toUpperCase()}
                        </div>
                    )}

                    {/* Highly Visible Overlays (Stamps) */}
                    <motion.div
                        className="swipe-stamp stamp-like"
                        style={{
                            opacity: likeOpacity,
                            scale: useTransform(x, [0, 150], [0.5, 1.2]),
                            rotate: useTransform(x, [0, 150], [0, -15])
                        }}
                    >
                        LIKE
                    </motion.div>
                    <motion.div
                        className="swipe-stamp stamp-nope"
                        style={{
                            opacity: nopeOpacity,
                            scale: useTransform(x, [0, -150], [0.5, 1.2]),
                            rotate: useTransform(x, [0, -150], [0, 15])
                        }}
                    >
                        NOPE
                    </motion.div>

                    {/* Info Gradient */}
                    <div className="swipe-card-gradient" />

                    {/* Content */}
                    <div className="swipe-card-content">
                        <div className="swipe-card-tags">
                            {isLive && (
                                <div className="live-pulse-container">
                                    <span className="pulse-dot"></span>
                                    <span className="live-text">LIVE</span>
                                </div>
                            )}
                            <span className="swipe-tag uni-tag">🎓 {university}</span>
                            {/* Recently Active Badge */}
                            {recentlyActive && (
                                <span className="swipe-tag active-tag">🟢 Recently Active</span>
                            )}
                            {profile.is_top_seeker && (
                                <span className="swipe-tag top-seeker-tag">🔥 Top Seeker</span>
                            )}
                            {profile.role === 'Female' && (
                                <span className="swipe-tag premium-available">💎 Premium Unlock Available</span>
                            )}
                        </div>
                        <h2 className="swipe-card-name">
                            {displayName}
                            {age && <span className="swipe-card-age">, {age}</span>}
                        </h2>

                        <div className={`swipe-card-bio-wrapper ${isExpanded ? 'expanded' : ''}`}>
                            <p className="swipe-card-bio">{bio}</p>

                            {/* Extra Info only shown in expanded mode */}
                            {isExpanded && (
                                <div className="swipe-card-extra-info fade-in mt-4">
                                    {/* Direct Compatibility Highlight Banner */}
                                    <div className="compatibility-match-banner">
                                        <span className="banner-badge">✨ Compatibility: {getCompatibilityScore()}%</span>
                                        {mutualInterests.length > 0 ? (
                                            <p className="banner-desc">You both love <strong>{mutualInterests.join(', ')}</strong>!</p>
                                        ) : (
                                            <p className="banner-desc">Common student goals & shared vibe.</p>
                                        )}
                                    </div>
                                    {profile.department && <p><strong>Dept:</strong> {profile.department}</p>}
                                    {profile.level && <p><strong>Level:</strong> {profile.level}</p>}
                                    {profile.attraction_goal && <p><strong>Looking for:</strong> {profile.attraction_goal}</p>}
                                    {profile.interests && profile.interests.length > 0 && (
                                        <div className="mt-2">
                                            <strong>Interests:</strong>
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {profile.interests.map(i => <span key={i} className="swipe-tag text-xs">{i}</span>)}
                                            </div>
                                        </div>
                                    )}
                                    <div className="ai-detail-tools" aria-label="AI match tools">
                                        <span>AI wingmate</span>
                                        <div>
                                            <button className="ai-detail-btn" onClick={(e) => handleAiInsight(e, 'compatibility')} disabled={aiLoading}>
                                                {aiLoading && aiInsightType === 'compatibility' ? 'Reading...' : 'Insight'}
                                            </button>
                                            <button className="ai-detail-btn" onClick={(e) => handleAiInsight(e, 'conversation_opener')} disabled={aiLoading}>
                                                Openers
                                            </button>
                                            <button className="ai-detail-btn" onClick={(e) => handleAiInsight(e, 'date_ideas')} disabled={aiLoading}>
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
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        const allowed = await onBeforeSwipe?.('left');
                                        if (allowed !== false) {
                                            setExitX(-300);
                                            setTimeout(() => onSwipe('left'), 260);
                                        }
                                    }}
                                    aria-label="Pass Profile"
                                >
                                    ✕
                                </button>
                                
                                {onSuperSwipe && (
                                    <button
                                        className="swipe-action-btn action-super"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setExitX(300);
                                            onSuperSwipe(profile);
                                        }}
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
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        const allowed = await onBeforeSwipe?.('right');
                                        if (allowed !== false) {
                                            setExitX(300);
                                            setTimeout(() => onSwipe('right'), 260);
                                        }
                                    }}
                                    aria-label="Like Profile"
                                >
                                    ❤️
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

const MemoizedSwipeCard = memo(SwipeCard);
export default MemoizedSwipeCard;
