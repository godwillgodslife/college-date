import { useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import './SwipeCard.css';

export default function SwipeCard({ profile, onSwipe, superSwipesAvailable = 0, onSuperSwipe }) {
    const [exitX, setExitX] = useState(0);
    const [showPremiumNote, setShowPremiumNote] = useState(false);
    const [premiumNote, setPremiumNote] = useState('');

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

    const displayName = profile.full_name || profile.username || 'User';
    const age = profile.age || '';
    const university = profile.university || 'University Student';
    const bio = profile.bio || 'No bio yet';

    return (
        <motion.div
            className="swipe-card"
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
            whileTap={{ cursor: 'grabbing', scale: 1.05 }}
            whileHover={{ scale: 1.02 }}
        >
            <div className="swipe-card-inner">
                {/* Profile Image */}
                <div className="swipe-card-image-container">
                    {profile.avatar_url ? (
                        <img
                            src={profile.avatar_url}
                            alt={displayName}
                            className="swipe-card-image"
                            draggable="false"
                            onError={(e) => {
                                console.warn(`Image failed to load for ${displayName}: ${profile.avatar_url}`);
                                e.target.style.display = 'none';
                                const placeholder = e.target.parentElement.querySelector('.swipe-card-placeholder');
                                if (placeholder) placeholder.style.display = 'flex';
                            }}
                        />
                    ) : null}

                    <div
                        className="swipe-card-placeholder"
                        style={{ display: profile.avatar_url ? 'none' : 'flex' }}
                    >
                        {displayName.charAt(0).toUpperCase()}
                    </div>

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
                            <span className="swipe-tag uni-tag">🎓 {university}</span>
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
                        <p className="swipe-card-bio">{bio}</p>

                        <div className="swipe-card-actions">
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
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
