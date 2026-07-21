import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import { recordSwipe, trackProfileView } from '../services/swipeService';
import { supabase } from '../lib/supabase';
import StatusViewer from './StatusViewer';
import { getUserStatuses } from '../services/statusService';
import { hasActivePremium } from '../utils/premium';
import { isRecentlyLive } from '../utils/presence';
import { getProfilePhotos, normalizeProfile, safeArray } from '../utils/profileData';
import { CACHE_TTL } from '../lib/cachePolicy';
import { getCachedData, setCachedData } from '../lib/persistentCache';
import './ProfileDrawer.css';

export default function ProfileDrawer({ isOpen, profile, onClose }) {
    const navigate = useNavigate();
    const { currentUser, userProfile, walletBalance } = useAuth();
    const { addToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [activeProfile, setActiveProfile] = useState(profile);
    const [userStatuses, setUserStatuses] = useState([]);
    const [showStatusViewer, setShowStatusViewer] = useState(false);

    // Prevent body scroll when drawer is open + fire profile view tracking
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            if (profile) {
                setActiveProfile(profile);
                // Fire-and-forget: record the profile view so the owner gets notified
                if (currentUser?.id && profile.id && currentUser.id !== profile.id) {
                    trackProfileView(currentUser.id, profile.id, 'explore');
                }
            }
        } else {
            document.body.style.overflow = 'unset';
            // Do not clear activeProfile immediately so it can animate out
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, profile, currentUser]);

    // Check for active statuses when profile changes
    useEffect(() => {
        const fetchStatuses = async (pId) => {
            const cached = getCachedData(['profile-statuses', pId], {
                ttlMs: CACHE_TTL.statuses,
                allowStale: true
            });
            if (cached) setUserStatuses(cached);

            const { data } = await getUserStatuses(pId);
            setUserStatuses(data || []);
            setCachedData(['profile-statuses', pId], data || [], {
                type: 'statuses'
            });
        };

        if (profile?.id) {
            fetchStatuses(profile.id);
        } else if (activeProfile?.id && isOpen) {
            fetchStatuses(activeProfile.id);
        }
    }, [profile, activeProfile, isOpen]);

    const displayProfile = normalizeProfile(profile || activeProfile);

    if (!displayProfile) return null;

    const isPremium = hasActivePremium(userProfile);
    const isLive = isRecentlyLive(displayProfile);
    const displayPhotos = getProfilePhotos(displayProfile);
    const displayInterests = safeArray(displayProfile.interests);

    const handleVibe = async () => {
        // 1. Check wallet balance
        if (!isPremium && walletBalance < 500) {
            addToast('Insufficient funds. Please top up your wallet.', 'error');
            setTimeout(() => navigate('/wallet'), 1500);
            return;
        }

        setLoading(true);
        try {
            const result = await recordSwipe(
                currentUser.id,
                displayProfile.id,
                'right',
                'standard',
                'Started a vibe from Explore',
                { isPremium }
            );

            if (result.error) {
                addToast(result.error, 'error');
            } else {
                addToast(
                    isPremium
                        ? `Vibe started with ${displayProfile.full_name}!`
                        : `Vibe started with ${displayProfile.full_name}!`,
                    'success'
                );
                onClose(); // Close drawer on success

                // Fetch the auto-created match string
                const { data: matchData } = await supabase
                    .from('matches')
                    .select('id')
                    .contains('user_ids', [currentUser.id, displayProfile.id])
                    .single();

                if (matchData) {
                    navigate(`/chat/${matchData.id}`);
                }
            }
        } catch (err) {
            addToast('Failed to start vibe. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const portalContent = (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    key="backdrop"
                    className="drawer-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                />
            )}

            {isOpen && (
                <motion.div
                    key="drawer"
                    className="profile-drawer"
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    drag="y"
                    dragConstraints={{ top: 0 }}
                    dragElastic={0.2}
                    onDragEnd={(e, { offset, velocity }) => {
                        if (offset.y > 150 || velocity.y > 500) {
                            onClose();
                        }
                    }}
                >
                    <div className="drawer-handle" />

                    <div className="drawer-scroll-content">
                        {/* Photo Carousel */}
                        <div className="drawer-photos">
                            {displayPhotos.length > 0 ? (
                                displayPhotos.map((photo, idx) => (
                                    <div
                                        key={idx}
                                        className={`drawer-photo-wrapper ${userStatuses.length > 0 ? 'has-status' : ''}`}
                                        onClick={() => userStatuses.length > 0 && setShowStatusViewer(true)}
                                        style={{ cursor: userStatuses.length > 0 ? 'pointer' : 'default' }}
                                    >
                                        <img src={photo} alt={`${displayProfile.full_name} ${idx + 1}`} />
                                    </div>
                                ))
                            ) : (
                                <div
                                    className={`drawer-photo-wrapper ${userStatuses.length > 0 ? 'has-status' : ''}`}
                                    onClick={() => userStatuses.length > 0 && setShowStatusViewer(true)}
                                    style={{ cursor: userStatuses.length > 0 ? 'pointer' : 'default' }}
                                >
                                    <img src={displayProfile.avatar_url || '/placeholder-avatar.png'} alt={displayProfile.full_name} />
                                </div>
                            )}
                        </div>

                        <div className="drawer-details">
                            <div className="drawer-header">
                                <h2 className="drawer-name">
                                    {displayProfile.full_name}, <span className="drawer-age">{displayProfile.age}</span>
                                </h2>
                                {isLive && <span className="live-badge">LIVE</span>}
                            </div>

                            <p className="drawer-university">
                                🎓 {displayProfile.level} - {displayProfile.faculty} <br />
                                {displayProfile.university}
                            </p>

                            {displayProfile.attraction_goal && (
                                <div className="drawer-intent-box">
                                    <span className="intent-icon">
                                        {displayProfile.attraction_goal === 'Casual' ? '🔥' :
                                            displayProfile.attraction_goal === 'Serious' ? '💍' : '🤝'}
                                    </span>
                                    <div>
                                        <strong>Looking for</strong>
                                        <p>{displayProfile.attraction_goal}</p>
                                    </div>
                                </div>
                            )}

                            {displayProfile.bio && (
                                <div className="drawer-bio">
                                    <h3>About me</h3>
                                    <p>{displayProfile.bio}</p>
                                </div>
                            )}

                            {/* Vibe Tags */}
                            {displayInterests.length > 0 && (
                                <div className="drawer-vibes">
                                    <h3>The Vibe</h3>
                                    <div className="vibe-tags">
                                        {displayInterests.map((tag, idx) => (
                                            <span key={idx} className="vibe-tag">{tag}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sticky Action Footer */}
                    <div className="drawer-footer">
                        <button
                            className="btn-vibe-pay"
                            onClick={handleVibe}
                            disabled={loading}
                        >
                            {loading ? 'Processing...' : isPremium ? 'Start Vibe ✨' : 'Start Vibe ✨'}
                        </button>
                        {!isPremium && (
                            <p className="wallet-balance-note">
                                Wallet Balance: ₦{walletBalance?.toLocaleString() || 0}
                            </p>
                        )}
                    </div>
                </motion.div>
            )}

            {/* Status Viewer Overlay */}
            {isOpen && showStatusViewer && userStatuses.length > 0 && (
                <StatusViewer
                    key="status-viewer"
                    statuses={userStatuses}
                    profile={displayProfile}
                    onClose={() => setShowStatusViewer(false)}
                />
            )}

        </AnimatePresence>
    );

    return createPortal(portalContent, document.body);
}
