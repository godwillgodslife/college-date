import { useState, memo } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import OptimizedImage from './OptimizedImage';
import './SwipeCard.css';

function SwipeCard({ profile, onSwipe, superSwipesAvailable = 0, onSuperSwipe, priority = false }) {
    const [exitX, setExitX] = useState(0);
    const [showPremiumNote, setShowPremiumNote] = useState(false);
    const [premiumNote, setPremiumNote] = useState('');
    const [activePhotoIdx, setActivePhotoIdx] = useState(0);

    const photos = profile.profile_photos && profile.profile_photos.length > 0
        ? profile.profile_photos
        : [profile.avatar_url].filter(Boolean);

    const x = useMotionValue(0);
    const rotate = useTransform(x, [-200, 200], [-15, 15]);
    const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0.5, 1, 1, 1, 0.5]);

    // Color overlays
    const likeOpacity = useTransform(x, [50, 150], [0, 1]);
    const nopeOpacity = useTransform(x, [-150, -50], [1, 0]);

    const handleDragEnd = (event, info) => {
        if (info.offset.x > 100) {
            setExitX(300);
            onSwipe('right');
        } else if (info.offset.x < -100) {
            setExitX(-300);
            onSwipe('left');
        }
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

    const isLive = profile.is_live || (profile.last_seen_at && new Date(profile.last_seen_at) > new Date(Date.now() - 90 * 1000));

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

    return (
        <motion.div
            className={`swipe-card ${isExpanded ? 'expanded-mode' : ''}`}
            style={{ x, rotate, opacity }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={handleDragEnd}
            animate={{
                x: exitX,
                opacity: exitX !== 0 ? 0 : 1,
                scale: exitX !== 0 ? 0.8 : 1
            }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            whileTap={{ cursor: 'grabbing', scale: 1.02 }}
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
                            {(profile.last_active || profile.last_seen_at) && (
                                new Date(profile.last_active || profile.last_seen_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
                            ) && (
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
                                </div>
                            )}
                        </div>

                        {!isExpanded && (
                            <div className="swipe-card-actions mt-3">
                                {/* Super Swipe Button */}
                                {superSwipesAvailable > 0 && onSuperSwipe && (
                                    <button
                                        className="super-swipe-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setExitX(300);
                                            onSuperSwipe(profile);
                                        }}
                                    >
                                        <span>⭐ Super Swipe</span>
                                        <span className="badge">{superSwipesAvailable}</span>
                                    </button>
                                )}

                                {!showPremiumNote ? (
                                    <button
                                        className="action-btn premium-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowPremiumNote(true);
                                        }}
                                    >
                                        <span className="btn-icon">⭐</span>
                                        <div className="btn-label">
                                            <span className="main-text">Premium Swipe</span>
                                            <span className="price-text">₦5,000</span>
                                        </div>
                                    </button>
                                ) : (
                                    <div className="premium-note-container" onClick={e => e.stopPropagation()}>
                                        <textarea
                                            className="premium-note-input"
                                            placeholder="Add a personal note... (max 160 chars)"
                                            maxLength={160}
                                            value={premiumNote}
                                            onChange={(e) => setPremiumNote(e.target.value)}
                                            autoFocus
                                        />
                                        <div className="premium-note-actions">
                                            <button className="btn-cancel-note" onClick={() => setShowPremiumNote(false)}>Cancel</button>
                                            <button
                                                className="btn-send-premium"
                                                onClick={() => {
                                                    setExitX(300);
                                                    onSwipe('right', 'premium', premiumNote);
                                                }}
                                            >
                                                Send Note + Swipe
                                            </button>
                                        </div>
                                    </div>
                                )}
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
