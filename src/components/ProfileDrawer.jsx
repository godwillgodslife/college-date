import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import { recordSwipe, trackProfileView, checkSwipeLimit, getExistingMatchWithUser } from '../services/swipeService';
import { supabase } from '../lib/supabase';
import StatusViewer from './StatusViewer';
import ChatVibeModal from './ChatVibeModal';
import { getUserStatuses } from '../services/statusService';
import { hasActivePremium } from '../utils/premium';
import { triggerLightHaptic } from '../utils/haptics';
import { isRecentlyLive } from '../utils/presence';
import { getProfilePhotos, getAvatarUrl, normalizeProfile, safeArray, sanitizeProfileForDisplay } from '../utils/profileData';
import { sanitizeBioForDisplay } from '../utils/offPlatformGuard';
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
    const [vibeSent, setVibeSent] = useState(false);
    const [showChatVibeModal, setShowChatVibeModal] = useState(false);

    const handleOpenChatVibe = async () => {
        if (!currentUser?.id) {
            addToast('Please sign in to send a Chat Vibe.', 'info');
            return;
        }
        if (currentUser.id === displayProfile.id) {
            addToast('You cannot chat with yourself.', 'info');
            return;
        }
        try {
            const match = await getExistingMatchWithUser(currentUser.id, displayProfile.id);
            if (match?.id) {
                onClose();
                navigate(`/chat?chatId=${match.id}`);
                return;
            }
        } catch (err) {
            console.warn('[ProfileDrawer] check match error:', err);
        }
        setShowChatVibeModal(true);
    };

    // Prevent body scroll when drawer is open + fire profile view tracking
    useEffect(() => {
        if (isOpen) {
            setVibeSent(false);
            document.body.style.overflow = 'hidden';
            if (profile) {
                setActiveProfile(profile);
                // Fast background check for fresh profile data (avatar, photos, bio)
                if (profile.id) {
                    supabase
                        .from('profiles')
                        .select('id, full_name, avatar_url, profile_photos, photo_updated_at, updated_at, is_verified, photo_verified, university, bio, interests')
                        .eq('id', profile.id)
                        .maybeSingle()
                        .then(({ data }) => {
                            if (data) {
                                const ts = data.photo_updated_at || data.updated_at;
                                if (ts) registerProfilePhotoTimestamp(data.id, ts);
                                setActiveProfile(prev => ({
                                    ...(prev || {}),
                                    ...normalizeProfile(data)
                                }));
                            }
                        }).catch(() => {});
                }
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
                ttlMs: CACHE_TTL.discovery,
            });
            if (cached) {
                setUserStatuses(cached);
                return;
            }

            try {
                const statuses = await getUserStatuses(pId);
                setUserStatuses(statuses || []);
                setCachedData(['profile-statuses', pId], statuses || []);
            } catch (err) {
                console.warn('Could not fetch user statuses:', err);
                setUserStatuses([]);
            }
        };

        if (profile?.id && isOpen) {
            fetchStatuses(profile.id);
        } else if (activeProfile?.id && isOpen) {
            fetchStatuses(activeProfile.id);
        }
    }, [profile, activeProfile, isOpen]);

    // Live update when photo updated event is dispatched for the displayed profile
    useEffect(() => {
        const handlePhotoUpdated = (e) => {
            const updatedUserId = e?.detail?.userId;
            const targetId = profile?.id || activeProfile?.id;
            if (isOpen && targetId && (!updatedUserId || updatedUserId === targetId)) {
                supabase
                    .from('profiles')
                    .select('id, full_name, avatar_url, profile_photos, photo_updated_at, updated_at, is_verified, photo_verified, university, bio, interests')
                    .eq('id', targetId)
                    .maybeSingle()
                    .then(({ data }) => {
                        if (data) {
                            setActiveProfile(prev => ({
                                ...(prev || {}),
                                ...normalizeProfile(data)
                            }));
                        }
                    }).catch(() => {});
            }
        };
        window.addEventListener('cd:profile-photo-updated', handlePhotoUpdated);
        return () => window.removeEventListener('cd:profile-photo-updated', handlePhotoUpdated);
    }, [isOpen, profile?.id, activeProfile?.id]);

    const displayProfile = sanitizeProfileForDisplay(profile || activeProfile, currentUser?.id === (profile?.id || activeProfile?.id));

    if (!displayProfile) return null;

    const isPremium = hasActivePremium(userProfile);
    const isLive = isRecentlyLive(displayProfile);
    const displayPhotos = getProfilePhotos(displayProfile);
    const displayInterests = safeArray(displayProfile.interests);

    const profileIsPremium = hasActivePremium(displayProfile);

    const hasFreeSwipes = (userProfile?.free_swipes ?? 0) > 0;
    const canSwipe = isPremium || hasFreeSwipes || (walletBalance >= 500);

    const handleVibe = async () => {
        if (!currentUser?.id) {
            addToast('Please sign in to connect.', 'info');
            return;
        }

        if (vibeSent) {
            addToast('Vibe request already sent!', 'info');
            return;
        }

        let canProceed = isPremium;
        if (!canProceed) {
            const limits = await checkSwipeLimit(currentUser.id);
            const hasDailyLimitRemaining = limits.canSwipe;
            const hasBonusSwipes = (userProfile?.free_swipes ?? 0) > 0;
            const balance = walletBalance ?? 0;
            canProceed = hasDailyLimitRemaining || hasBonusSwipes || balance >= 500;
        }

        if (!canProceed) {
            addToast('Out of free swipes! Top up your wallet or upgrade to Premium.', 'warning');
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
                setVibeSent(true);

                triggerLightHaptic?.();
                if (result.isMatch && (result.match_id || result.data?.match_id)) {
                    const matchId = result.match_id || result.data?.match_id;
                    addToast(`It's a Match! Connected with ${displayProfile.full_name}! 🔥`, 'success');
                    onClose();
                    navigate(`/chat?chatId=${matchId}`);
                } else {
                    addToast(`✨ Vibe request sent to ${displayProfile.full_name}! They'll see you in Requests.`, 'success');
                    setTimeout(() => {
                        onClose();
                    }, 1000);
                }
            }
        } catch (err) {
            console.error('handleVibe error:', err);
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
                                        {profileIsPremium && idx === 0 && (
                                            <div className="drawer-premium-golden-badge" title="👑 Premium Member">
                                                <span>👑</span>
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div
                                    className={`drawer-photo-wrapper ${userStatuses.length > 0 ? 'has-status' : ''}`}
                                    onClick={() => userStatuses.length > 0 && setShowStatusViewer(true)}
                                    style={{ cursor: userStatuses.length > 0 ? 'pointer' : 'default' }}
                                >
                                    <img src={getAvatarUrl(displayProfile) || displayProfile.avatar_url || '/placeholder-avatar.png'} alt={displayProfile.full_name} />
                                    {profileIsPremium && (
                                        <div className="drawer-premium-golden-badge" title="👑 Premium Member">
                                            <span>👑</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="drawer-details">
                            <div className="drawer-header">
                                <h2 className="drawer-name">
                                    {(displayProfile.full_name || '').trim()}{displayProfile.age ? <>, <span className="drawer-age">{displayProfile.age}</span></> : null}
                                    {profileIsPremium && <span className="premium-crown" title="Premium Member">👑</span>}
                                    {(displayProfile.is_verified || displayProfile.photo_verified) && (
                                        <span className="card-verified-tick" title="Photo Verified Student">✓</span>
                                    )}
                                </h2>
                                <div className="drawer-header-badges">
                                    {profileIsPremium && <span className="drawer-premium-badge">👑 Premium</span>}
                                    {(displayProfile.is_verified || displayProfile.photo_verified) && (
                                        <span className="verified-badge-pill">✓ Verified</span>
                                    )}
                                    {isLive && <span className="live-badge">LIVE</span>}
                                </div>
                            </div>

                            <p className="drawer-university">
                                🎓 {[displayProfile.level, displayProfile.faculty].filter(Boolean).join(' - ') || 'Student'} <br />
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
                                    <p>{sanitizeBioForDisplay(displayProfile.bio, currentUser?.id === displayProfile.id)}</p>
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
                        <div className="drawer-actions-row">
                            <button
                                type="button"
                                className={`btn-vibe-pay ${vibeSent ? 'sent' : ''}`}
                                onClick={handleVibe}
                                disabled={loading || vibeSent}
                            >
                                {loading ? 'Starting Vibe...' : vibeSent ? 'Vibe Sent ✓' : 'Start Vibe ✨'}
                            </button>
                            <button
                                type="button"
                                className="btn-drawer-chat-vibe"
                                onClick={handleOpenChatVibe}
                                title="Instant Direct Chat (₦500)"
                            >
                                💬 Chat Vibe (₦500)
                            </button>
                        </div>
                        {!isPremium && (
                            <p className="wallet-balance-note">
                                {hasFreeSwipes ? `${userProfile?.free_swipes} free daily swipes remaining` : `Wallet Balance: ₦${walletBalance?.toLocaleString() || 0}`}
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

            {/* Paid Chat Vibe (₦500) Modal */}
            <ChatVibeModal
                isOpen={showChatVibeModal}
                targetProfile={displayProfile}
                onClose={() => setShowChatVibeModal(false)}
                onSuccess={() => {
                    setShowChatVibeModal(false);
                    onClose();
                }}
            />
        </AnimatePresence>
    );

    return createPortal(portalContent, document.body);
}

