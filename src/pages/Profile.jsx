import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getWallet } from '../services/paymentService';
import { getProfile } from '../services/profileService';
import AndroidInstallButton from '../components/AndroidInstallButton';
import ProfileCompletion from '../components/ProfileCompletion';
import LoadingSpinner from '../components/LoadingSpinner';
import OptimizedImage from '../components/OptimizedImage';
import './Profile.css';
import './Profile_Earnings.css';
import StatusInput from '../components/StatusInput';
import StatusViewer from '../components/StatusViewer';
import StatusUploadModal from '../components/StatusUploadModal';
import GiftStore from '../components/GiftStore';
import CoinStoreModal from '../components/CoinStoreModal';
import { getCoinBalance, sendCoinGift } from '../services/coinService';
import { useToast } from '../components/Toast';
import { getUserStatuses, getViewedStatusIds } from '../services/statusService';
import { getLocalUserStatuses } from '../services/localStatusService';
import { formatLastSeen } from '../utils/formatTimestamp';
import { requestProfileAiReview } from '../services/aiTrustService';
import { requestAiAssistant } from '../services/aiAssistantService';
import { partnerWhatsAppUrl } from '../config/contactLinks';
import FaceVerificationModal from '../components/FaceVerificationModal';

import useSWR from 'swr';
import { AnimatePresence } from 'framer-motion';
import { getProfilePhotos, normalizeProfile, safeArray, getAvatarUrl } from '../utils/profileData';
import { recordSwipe, checkSwipeLimit } from '../services/swipeService';
import { hasActivePremium, isEliteUltra } from '../utils/premium';
import { supabase } from '../lib/supabase';
import { getUserPostsAndReposts } from '../services/confessionService';
import { persistentSWR } from '../lib/persistentCache';
import { CACHE_TTL } from '../lib/cachePolicy';
import { sanitizeBioForDisplay } from '../utils/offPlatformGuard';

function ProfileVideoShowcase({ videoUrl, isOwnProfile, onEditVideo, isUltra = false }) {
    const videoRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(true);

    const togglePlay = (e) => {
        e.stopPropagation();
        if (!videoRef.current) return;
        if (isPlaying) {
            videoRef.current.pause();
            setIsPlaying(false);
        } else {
            videoRef.current.play();
            setIsPlaying(true);
        }
    };

    const toggleMute = (e) => {
        e.stopPropagation();
        if (!videoRef.current) return;
        videoRef.current.muted = !isMuted;
        setIsMuted(!isMuted);
    };

    return (
        <div className="profile-video-showcase-card">
            <div className="profile-video-card-header">
                <div className="header-left">
                    <span className="showcase-icon">🎬</span>
                    <strong>{isUltra ? '30s Extended Video Profile' : '10s Video Profile'}</strong>
                </div>
                <span className={`premium-pill ${isUltra ? 'ultra-pill' : ''}`}>
                    {isUltra ? '👑✨ Ultra VIP Moment' : '👑 Verified Moment'}
                </span>
            </div>
            <div className="profile-video-viewport" onClick={togglePlay}>
                <video
                    ref={videoRef}
                    src={videoUrl}
                    playsInline
                    loop
                    muted={isMuted}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    className="profile-showcase-media"
                />
                <div className="profile-video-overlay-bar">
                    <button 
                        type="button" 
                        className="p-vid-ctrl-btn" 
                        onClick={togglePlay}
                        aria-label={isPlaying ? 'Pause video' : 'Play video'}
                    >
                        {isPlaying ? '⏸' : '▶'}
                    </button>
                    <button 
                        type="button" 
                        className="p-vid-ctrl-btn" 
                        onClick={toggleMute}
                        aria-label={isMuted ? 'Unmute' : 'Mute'}
                    >
                        {isMuted ? '🔇' : '🔊'}
                    </button>
                    {isOwnProfile && (
                        <button
                            type="button"
                            className="p-vid-ctrl-btn edit-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                onEditVideo?.();
                            }}
                            title="Edit Video"
                        >
                            ✏️
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function ProfilePostsSection({ posts, loading, navigate }) {
    if (loading) {
        return (
            <div className="profile-posts-loading">
                <LoadingSpinner text="Loading campus posts..." />
            </div>
        );
    }

    if (!posts || posts.length === 0) {
        return (
            <div className="profile-posts-empty">
                <span className="empty-icon">📝</span>
                <p>No campus posts or reposts yet.</p>
            </div>
        );
    }

    return (
        <div className="profile-posts-feed">
            {posts.map((post) => (
                <div 
                    key={post.id} 
                    className="profile-post-card"
                    onClick={() => navigate(`/confessions`)}
                >
                    {post.isRepost && (
                        <div className="repost-header-tag">
                            <span>🔁 Reposted from Campus Feed</span>
                        </div>
                    )}
                    {post.image_url && (
                        <div className="profile-post-image-wrap">
                            <OptimizedImage src={post.image_url} alt="Post attachment" className="profile-post-image" width={600} />
                        </div>
                    )}
                    <p className="profile-post-content">{post.content}</p>
                    <div className="profile-post-footer">
                        <span className="profile-post-type">
                            {post.post_type === 'secret' ? '🎭 Secret' : '👤 Campus Post'}
                        </span>
                        <div className="profile-post-stats">
                            <span>❤️ {post.totalReactions || post.likes || 0}</span>
                            <span>💬 {post.commentCount || post.comments || 0}</span>
                            <span>🔁 {post.repost_count || 0}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function VoicePlayer({ src }) {
    const [playing, setPlaying] = useState(false);
    const audioRef = useRef(null);

    const togglePlay = (e) => {
        e.stopPropagation();
        if (!audioRef.current) return;
        if (playing) {
            audioRef.current.pause();
            setPlaying(false);
        } else {
            audioRef.current.play();
            setPlaying(true);
        }
    };

    return (
        <div className="custom-voice-player">
            <button className="voice-play-btn" onClick={togglePlay}>
                {playing ? '⏸️' : '▶️'}
            </button>
            <audio 
                ref={audioRef} 
                src={src} 
                onEnded={() => setPlaying(false)} 
                style={{ display: 'none' }} 
            />
            <div className="voice-waves">
                {[...Array(12)].map((_, i) => (
                    <span 
                        key={i} 
                        className={`wave-bar ${playing ? 'animating' : ''}`} 
                        style={{ 
                            height: `${(i % 3 === 0 ? 16 : i % 2 === 0 ? 22 : 12)}px`,
                            animationDelay: `${i * 0.12}s`
                        }}
                    />
                ))}
            </div>
            <span className="voice-duration">0:15</span>
        </div>
    );
}

function ProfileCarousel({ photos, avatarUrl, displayName, isOnline, userStatuses, setShowStatusViewer, isPremium, photoUpdatedAt, updatedAt }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const photosList = getProfilePhotos({ profile_photos: photos, avatar_url: avatarUrl, photo_updated_at: photoUpdatedAt, updated_at: updatedAt });

    const nextPhoto = (e) => {
        e.stopPropagation();
        if (photosList.length <= 1) return;
        setCurrentIndex(prev => (prev + 1) % photosList.length);
    };

    const prevPhoto = (e) => {
        e.stopPropagation();
        if (photosList.length <= 1) return;
        setCurrentIndex(prev => (prev - 1 + photosList.length) % photosList.length);
    };

    if (photosList.length === 0) {
        return (
            <div className="profile-carousel-wrapper placeholder">
                <div className="profile-avatar profile-avatar-placeholder">
                    {displayName.charAt(0).toUpperCase()}
                </div>
                {isPremium && (
                    <div className="avatar-premium-badge carousel-premium-badge" title="👑 Premium Member">
                        <span className="avatar-premium-icon">👑</span>
                    </div>
                )}
                {isOnline && <span className="profile-online-dot" />}
            </div>
        );
    }

    return (
        <div className="profile-carousel-wrapper">
            {photosList.length > 1 && (
                <div className="photo-progress-bars">
                    {photosList.map((_, i) => (
                        <span key={i} className={`bar ${i === currentIndex ? 'active' : ''}`} />
                    ))}
                </div>
            )}

            <div className="profile-carousel-img-container">
                <OptimizedImage
                    src={photosList[currentIndex]}
                    alt={`${displayName} photo`}
                    className="profile-carousel-img"
                    width={800}
                    onClick={(e) => {
                        if (userStatuses.length > 0) {
                            e.stopPropagation();
                            setShowStatusViewer(true);
                        }
                    }}
                />
                {isPremium && (
                    <div className="avatar-premium-badge carousel-premium-badge" title="👑 Premium Member">
                        <span className="avatar-premium-icon">👑</span>
                    </div>
                )}
            </div>

            {photosList.length > 1 && (
                <>
                    <div className="carousel-nav-zone left" onClick={prevPhoto} />
                    <div className="carousel-nav-zone right" onClick={nextPhoto} />
                    <div className="carousel-dots">
                        {photosList.map((_, i) => (
                            <span key={i} className={`dot ${i === currentIndex ? 'active' : ''}`} />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

export default function Profile() {
    const { userId } = useParams();
    const { currentUser, userProfile: myProfile, walletBalance, onlineUserIds, logout, fetchProfile } = useAuth();
    const navigate = useNavigate();
    const { addToast } = useToast();

    const location = useLocation();
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [showStatusUploadModal, setShowStatusUploadModal] = useState(false);
    const [localStatuses, setLocalStatuses] = useState([]);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [checkingPush, setCheckingPush] = useState(true);
    const [showStatusViewer, setShowStatusViewer] = useState(false);
    const [aiCoach, setAiCoach] = useState(null);
    const [aiCoachLoading, setAiCoachLoading] = useState(false);
    const [showFaceVerification, setShowFaceVerification] = useState(false);
    const [vibeLoading, setVibeLoading] = useState(false);
    const [vibeSent, setVibeSent] = useState(false);

    // Gift & Coins Integration
    const [showGiftStore, setShowGiftStore] = useState(false);
    const [showCoinStore, setShowCoinStore] = useState(false);
    const [coinBalance, setCoinBalance] = useState(0);
    const [conversationId, setConversationId] = useState(
        location.state?.conversationId || location.state?.matchId || null
    );
    const queryParams = new URLSearchParams(location.search);
    const isFromChat = Boolean(location.state?.fromChat || queryParams.get('fromChat') === 'true');
    const [showGalleryView, setShowGalleryView] = useState(false);

    const isOwnProfile = !userId || userId === currentUser?.id;
    const profileId = userId || currentUser?.id;

    // Load coin balance for current user
    useEffect(() => {
        if (currentUser?.id) {
            getCoinBalance(currentUser.id).then(({ coins }) => {
                if (typeof coins === 'number') setCoinBalance(coins);
            });
        }
    }, [currentUser?.id]);

    // Resolve match / conversation ID if not passed via location state
    useEffect(() => {
        if (!conversationId && currentUser?.id && profileId && currentUser.id !== profileId) {
            supabase
                .from('matches')
                .select('id')
                .or(`and(user1_id.eq.${currentUser.id},user2_id.eq.${profileId}),and(user1_id.eq.${profileId},user2_id.eq.${currentUser.id})`)
                .maybeSingle()
                .then(({ data }) => {
                    if (data?.id) {
                        setConversationId(data.id);
                    }
                });
        }
    }, [conversationId, currentUser?.id, profileId]);

    // Load local statuses from IndexedDB for zero-backend storage
    useEffect(() => {
        if (profileId) {
            getLocalUserStatuses(profileId).then(list => setLocalStatuses(list || []));
        }
    }, [profileId]);

    useEffect(() => {
        const handleStatusCreated = () => {
            if (profileId) {
                getLocalUserStatuses(profileId).then(list => setLocalStatuses(list || []));
            }
        };
        window.addEventListener('cd:status-created', handleStatusCreated);
        return () => window.removeEventListener('cd:status-created', handleStatusCreated);
    }, [profileId]);

    // 1. Resolve Profile data
    const profileKey = (!isOwnProfile && profileId) ? ['profile', profileId] : null;
    const { data: profileResult, isLoading: SWRProfileLoading } = useSWR(
        profileKey,
        () => getProfile(profileId),
        persistentSWR(profileKey, { revalidateOnFocus: false, ttlMs: CACHE_TTL.profile })
    );

    const viewingProfile = normalizeProfile(isOwnProfile ? myProfile : profileResult?.data);
    const profileLoading = isOwnProfile ? false : SWRProfileLoading;

    const walletKey = isOwnProfile && currentUser ? ['wallet', currentUser.id] : null;
    const { data: walletResult, isLoading: walletLoading } = useSWR(
        walletKey,
        () => getWallet(currentUser.id),
        persistentSWR(walletKey, { revalidateOnFocus: false, ttlMs: CACHE_TTL.wallet })
    );

    const statusKey = profileId ? ['statuses', profileId] : null;
    const { data: statusResult, isLoading: statusLoading } = useSWR(
        statusKey,
        () => getUserStatuses(profileId),
        persistentSWR(statusKey, { revalidateOnFocus: false, ttlMs: CACHE_TTL.statuses })
    );

    const postsKey = profileId ? ['user_posts_reposts', profileId] : null;
    const { data: postsResult, isLoading: postsLoading } = useSWR(
        postsKey,
        () => getUserPostsAndReposts(profileId),
        persistentSWR(postsKey, { revalidateOnFocus: false, ttlMs: CACHE_TTL.confessions })
    );

    const wallet = walletResult?.data;
    const userStatuses = statusResult?.data || [];
    const allStatuses = useMemo(() => {
        const seen = new Set();
        const merged = [];
        for (const s of [...localStatuses, ...userStatuses]) {
            if (!s) continue;
            const key = s.id || s.media_url;
            if (!seen.has(key)) {
                seen.add(key);
                merged.push(s);
            }
        }
        return merged;
    }, [localStatuses, userStatuses]);

    const [viewedStatusIds, setViewedStatusIds] = useState(() => getViewedStatusIds(currentUser?.id));

    useEffect(() => {
        const handleStatusViewed = () => {
            setViewedStatusIds(getViewedStatusIds(currentUser?.id));
        };
        window.addEventListener('cd:status-viewed', handleStatusViewed);
        return () => window.removeEventListener('cd:status-viewed', handleStatusViewed);
    }, [currentUser?.id]);

    const hasUnviewedStatus = useMemo(() => {
        if (!allStatuses || allStatuses.length === 0) return false;
        if (isOwnProfile) return false;
        return allStatuses.some(s => !viewedStatusIds.has(s.id || s.media_url));
    }, [allStatuses, isOwnProfile, viewedStatusIds]);

    const userPosts = postsResult?.data || [];

    const loading = (profileLoading && !viewingProfile) || (isOwnProfile && walletLoading && !wallet);

    useEffect(() => {
        if (!isOwnProfile) return;
        const isNativePlatform = window.Capacitor?.isNativePlatform?.();
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isNativePlatform || isLocal || !window.OneSignalDeferred) {
            setCheckingPush(false);
            return;
        }

        window.OneSignalDeferred = window.OneSignalDeferred || [];
        window.OneSignalDeferred.push(function (OneSignal) {
            if (!OneSignal?.Notifications) {
                setCheckingPush(false);
                return;
            }
            const hasPermission = OneSignal.Notifications.permission;
            setIsSubscribed(hasPermission);
            setCheckingPush(false);

            OneSignal.Notifications.addEventListener('permissionChange', (permission) => {
                setIsSubscribed(permission);
            });
        });
    }, [isOwnProfile]);

    const handleEnableAlerts = () => {
        const isNativePlatform = window.Capacitor?.isNativePlatform?.();
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isNativePlatform || isLocal || !window.OneSignalDeferred) return;
        window.OneSignalDeferred.push(async function (OneSignal) {
            if (!OneSignal?.Notifications) return;
            await OneSignal.Notifications.requestPermission();
            setIsSubscribed(OneSignal.Notifications.permission);
        });
    };

    if (loading) return <LoadingSpinner fullScreen text="Loading profile..." />;
    if (!viewingProfile) return (
        <div className="profile-page">
            <div className="profile-card">
                <h2>Profile not found</h2>
                <button className="btn btn-primary" onClick={() => navigate(-1)}>Go Back</button>
            </div>
        </div>
    );

    const userProfile = viewingProfile;
    const isOnline = typeof onlineUserIds?.has === 'function' ? onlineUserIds.has(userProfile.id) : false;

    const displayName = userProfile?.full_name
        || userProfile?.username
        || currentUser?.email?.split('@')[0]
        || 'User';

    const avatarUrl = getAvatarUrl(userProfile);
    const email = currentUser?.email || '';
    const university = userProfile?.university || 'Not set';
    const bio = sanitizeBioForDisplay(userProfile?.bio || 'No bio yet', isOwnProfile || isEliteUltra(userProfile));
    const canUseWebPush = !window.Capacitor?.isNativePlatform?.()
        && window.location.hostname !== 'localhost'
        && window.location.hostname !== '127.0.0.1';
    const aiVerificationStatus = userProfile?.ai_verification_status || 'not_started';
    const aiVerificationCopy = {
        not_started: 'Run a quick AI trust check on your student profile and photos.',
        pending: 'Your AI trust check is queued.',
        reviewing: 'AI is reviewing your student profile and photos.',
        verified: 'AI trust check passed.',
        needs_review: 'AI flagged something for manual review.',
        rejected: 'This profile needs changes before verification.'
    };

    const handleVibe = async () => {
        if (!currentUser?.id) {
            addToast('Please sign in to connect.', 'info');
            return;
        }
        if (vibeSent) {
            addToast('Vibe request already sent!', 'info');
            return;
        }

        const isUserPremium = hasActivePremium(myProfile);
        let canProceed = isUserPremium;
        if (!canProceed) {
            const limits = await checkSwipeLimit(currentUser.id);
            const hasDailyLimitRemaining = limits.canSwipe;
            const hasBonusSwipes = (myProfile?.free_swipes ?? 0) > 0;
            const balance = wallet?.balance ?? walletBalance ?? 0;
            canProceed = hasDailyLimitRemaining || hasBonusSwipes || balance >= 500;
        }

        if (!canProceed) {
            addToast('Out of free swipes! Top up your wallet or upgrade to Premium.', 'warning');
            setTimeout(() => navigate('/wallet'), 1500);
            return;
        }

        setVibeLoading(true);
        try {
            const result = await recordSwipe(
                currentUser.id,
                userProfile.id,
                'right',
                'standard',
                'Started a vibe from Profile',
                { isPremium: isUserPremium }
            );

            if (result.error) {
                addToast(result.error, 'error');
            } else {
                setVibeSent(true);
                const { data: matchData } = await supabase
                    .from('matches')
                    .select('id')
                    .contains('user_ids', [currentUser.id, userProfile.id])
                    .maybeSingle();

                if (matchData?.id) {
                    addToast(`It's a Match! Connected with ${displayName}! 🔥`, 'success');
                    navigate(`/chat?chatId=${matchData.id}`);
                } else {
                    addToast(`✨ Vibe request sent to ${displayName}! They'll see you in Requests.`, 'success');
                }
            }
        } catch (err) {
            console.error('handleVibe error:', err);
            addToast('Failed to start vibe. Please try again.', 'error');
        } finally {
            setVibeLoading(false);
        }
    };

    const handleGiftSend = async (gift) => {
        if (!userProfile?.id) {
            addToast('Recipient profile not found', 'error');
            return false;
        }
        if (!currentUser?.id) {
            addToast('Please login to send gifts', 'error');
            return false;
        }

        let activeMatchId = conversationId;
        if (!activeMatchId) {
            const { data: matchData } = await supabase
                .from('matches')
                .select('id')
                .or(`and(user1_id.eq.${currentUser.id},user2_id.eq.${userProfile.id}),and(user1_id.eq.${userProfile.id},user2_id.eq.${currentUser.id})`)
                .maybeSingle();
            if (matchData?.id) {
                activeMatchId = matchData.id;
                setConversationId(activeMatchId);
            }
        }

        if (!activeMatchId) {
            addToast('Connect or match first before sending gifts!', 'info');
            return false;
        }

        try {
            const res = await sendCoinGift(userProfile.id, gift.id, activeMatchId);
            if (!res.success) {
                addToast(res.error || 'Failed to send gift', 'error');
                return false;
            }

            if (res.newCoinBalance !== undefined) {
                setCoinBalance(res.newCoinBalance);
            }
            addToast(`Sent ${gift.name}! 🎁`, 'success');

            // Dispatch global event so chat and conversation lists sync immediately
            window.dispatchEvent(new CustomEvent('tcd:gift-sent', {
                detail: {
                    matchId: activeMatchId,
                    receiverId: userProfile.id,
                    giftId: gift.id,
                    giftName: gift.name
                }
            }));

            return true;
        } catch (err) {
            console.warn('Gift send error:', err);
            addToast('Error sending gift.', 'error');
            return false;
        }
    };

    const handleProfileCoach = async () => {
        if (aiCoachLoading) return;
        setAiCoachLoading(true);
        const { data, error } = await requestAiAssistant('profile_coach');
        if (!error) setAiCoach(data);
        setAiCoachLoading(false);
    };

    // Vibe Check Data
    const anthem = userProfile?.anthem;
    const locationStatus = userProfile?.location_status;
    const voiceIntro = userProfile?.voice_intro_url;

    // Compatibility helpers for viewing other profiles
    const mutualInterests = safeArray(myProfile?.interests).filter(interest => 
        safeArray(userProfile?.interests).includes(interest)
    );

    const getCompatibilityScore = () => {
        let score = 55; // base score
        if (userProfile?.intent && userProfile?.intent === myProfile?.intent) score += 20;
        if (userProfile?.university && userProfile?.university === myProfile?.university) score += 15;
        const mutualCount = mutualInterests.length;
        score += Math.min(15, mutualCount * 5);
        return Math.min(99, score);
    };

    return (
        <div className="profile-page">
            {isOwnProfile ? (
                // OWN PROFILE VIEW - AVATAR FIRST, SUBTLE BADGES, YOUTUBE-STYLE BRIDGE, NO REDUNDANT CARDS
                <div className="profile-card own-profile-view animate-fade-in">
                    {/* GO LIVE BANNER: Shown persistently if user owns profile and has no photos */}
                    {safeArray(userProfile?.profile_photos).length === 0 && !userProfile?.avatar_url && (
                        <div className="go-live-alert">
                            <span className="go-live-icon">📸</span>
                            <div className="go-live-text">
                                <strong>You're invisible!</strong> Upload a photo to Go Live and start matching.
                            </div>
                            <button
                                className="go-live-btn"
                                onClick={() => navigate('/profile/edit')}
                            >
                                Add Photo
                            </button>
                        </div>
                    )}

                    {/* 1. PRIMARY IDENTITY HEADER: AVATAR FIRST */}
                    <div className="profile-header">
                        <div
                            className={`profile-avatar-wrapper own-avatar-frame ${allStatuses.length > 0 ? 'has-status' : ''}`}
                            onClick={() => allStatuses.length > 0 && setShowStatusViewer(true)}
                            style={{ cursor: allStatuses.length > 0 ? 'pointer' : 'default' }}
                        >
                            {avatarUrl ? (
                                <OptimizedImage
                                    src={avatarUrl}
                                    alt={displayName}
                                    className="profile-avatar"
                                    width={150}
                                    priority
                                />
                            ) : (
                                <div className="profile-avatar profile-avatar-placeholder">
                                    {displayName.charAt(0).toUpperCase()}
                                </div>
                            )}
                            {hasActivePremium(isOwnProfile ? userProfile : viewingProfile) && (
                                <div className="avatar-premium-badge" title="Premium Member">
                                    <span className="avatar-premium-icon">👑</span>
                                </div>
                            )}
                            {isOwnProfile && (
                                <button
                                    type="button"
                                    className="avatar-add-status-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowStatusUploadModal(true);
                                    }}
                                    title="Add Campus Status (Max 2/day)"
                                    aria-label="Add Status"
                                >
                                    +
                                </button>
                            )}
                        </div>
                        <h1 className="profile-name">
                            <span className="profile-name-text">{displayName}</span>
                            <span className="profile-badges-row">
                                {hasActivePremium(isOwnProfile ? userProfile : viewingProfile) && (
                                    <span className="premium-badge-pill" title="Premium Member">
                                        <span className="premium-pill-icon">👑</span>
                                        <span className="premium-pill-text">Elite</span>
                                    </span>
                                )}
                                {(viewingProfile?.is_verified || viewingProfile?.photo_verified || userProfile?.photo_verified) && (
                                    <span 
                                        className="verified-badge-pill" 
                                        title={isOwnProfile ? "Click to view photo verification" : "Photo Verified"}
                                        onClick={() => isOwnProfile && setShowFaceVerification(true)}
                                        style={isOwnProfile ? { cursor: 'pointer' } : undefined}
                                    >
                                        ✓ Verified
                                    </span>
                                )}
                            </span>
                        </h1>
                        <p className="profile-uni-text">🎓 {university}</p>
                    </div>

                    {/* 2. YOUTUBE-STYLE CLEAN COMMAND CENTER & BALANCE BRIDGE */}
                    <div className="profile-yt-bridge-wrap">
                        <button
                            type="button"
                            className="profile-yt-bridge-btn"
                            onClick={() => navigate('/dashboard')}
                            aria-label="Go to Campus Dashboard and view streaks and balance"
                        >
                            <div className="profile-yt-bridge-left">
                                <span className="profile-yt-bridge-icon">🏛️</span>
                                <div className="profile-yt-bridge-text">
                                    <span className="profile-yt-bridge-title">Campus Command Center</span>
                                    <span className="profile-yt-bridge-sub">Streaks • Daily Activities</span>
                                </div>
                            </div>
                            <div className="profile-yt-bridge-right">
                                <span className="profile-yt-bridge-balance">
                                    ₦{parseFloat(wallet?.available_balance || walletBalance || 0).toLocaleString()}
                                </span>
                                <span className="profile-yt-bridge-arrow">›</span>
                            </div>
                        </button>
                    </div>

                    {/* 3. FACE VERIFICATION CARD: ONLY SHOWN IF NOT YET VERIFIED */}
                    {!(userProfile?.photo_verified || userProfile?.is_verified) && (
                        <div className="verification-card-permanent">
                            <div className="verification-card-left">
                                <span className="verification-status-icon">📸</span>
                                <div className="verification-status-info">
                                    <div className="verification-title-row">
                                        <strong className="verification-title">Face Verification</strong>
                                    </div>
                                    <span className="verification-subtitle-compact">
                                        5s selfie to earn ✓ badge & 3x more matches
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                className="btn verification-action-btn btn-primary verify-btn-cta"
                                onClick={() => setShowFaceVerification(true)}
                            >
                                Verify →
                            </button>
                        </div>
                    )}

                    {/* 4. COMPACT PROFILE COMPLETION */}
                    <ProfileCompletion
                        score={userProfile?.completion_score || 0}
                        profile={userProfile}
                        onCompleteClick={() => navigate('/profile/edit')}
                        onAiCoachClick={handleProfileCoach}
                        aiCoachLoading={aiCoachLoading}
                        aiCoachResult={aiCoach}
                    />

                    {userProfile?.video_url && (
                        <ProfileVideoShowcase
                            videoUrl={userProfile.video_url}
                            isOwnProfile={true}
                            onEditVideo={() => navigate('/profile/edit')}
                            isUltra={isEliteUltra(userProfile)}
                        />
                    )}

                    <div className="profile-dashboard-grid">
                        <button
                            className="dashboard-card premium-card"
                            onClick={() => navigate('/premium')}
                        >
                            <span className="card-icon">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M2 19h20M3 10l4 4 5-8 5 8 4-4 1 9H2l1-9z"/>
                                </svg>
                            </span>
                            <span className="card-title">Get Premium</span>
                        </button>

                        <button
                            className="dashboard-card"
                            onClick={() => navigate('/profile/edit')}
                        >
                            <span className="card-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                            </span>
                            <span className="card-title">Edit Profile</span>
                        </button>

                        <button
                            className="dashboard-card"
                            onClick={() => navigate('/wallet')}
                        >
                            <span className="card-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="2" y="5" width="20" height="14" rx="2"/>
                                    <path d="M16 13a1 1 0 1 0 2 0 1 1 0 0 0-2 0z" fill="currentColor"/>
                                    <path d="M2 10h20"/>
                                </svg>
                            </span>
                            <span className="card-title">
                                {userProfile?.role === 'Female' ? 'Earnings' : 'Wallet'}
                            </span>
                        </button>

                        <button
                            className="dashboard-card"
                            onClick={() => navigate('/referrals')}
                        >
                            <span className="card-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 12 20 22 4 22 4 12"/>
                                    <rect x="2" y="7" width="20" height="5"/>
                                    <line x1="12" y1="22" x2="12" y2="7"/>
                                    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
                                    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
                                </svg>
                            </span>
                            <span className="card-title">Referrals</span>
                        </button>

                        <button
                            className="dashboard-card"
                            onClick={() => navigate('/settings')}
                        >
                            <span className="card-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="3"/>
                                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                                </svg>
                            </span>
                            <span className="card-title">Settings</span>
                        </button>

                        <a
                            href={partnerWhatsAppUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="dashboard-card partner-card-link"
                        >
                            <span className="card-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 12l2 2 4-4"/>
                                    <path d="M20 12c0 4.418-3.582 8-8 8a7.96 7.96 0 0 1-4.145-1.155L3 21l2.155-4.855A7.96 7.96 0 0 1 4 12c0-4.418 3.582-8 8-8s8 3.582 8 8z"/>
                                </svg>
                            </span>
                            <span className="card-title">Partner Up</span>
                        </a>

                        <button
                            className="dashboard-card"
                            onClick={() => navigate('/requests')}
                        >
                            <span className="card-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                    <polyline points="22,6 12,13 2,6"/>
                                </svg>
                            </span>
                            <span className="card-title">Requests</span>
                        </button>

                        <button
                            className="dashboard-card"
                            onClick={() => navigate('/leaderboard')}
                        >
                            <span className="card-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="18 20 18 10"/>
                                    <polyline points="12 20 12 4"/>
                                    <polyline points="6 20 6 14"/>
                                </svg>
                            </span>
                            <span className="card-title">Leaderboard</span>
                        </button>

                        <button
                            className="dashboard-card logout-card"
                            onClick={async () => {
                                await logout();
                                navigate('/login', { replace: true });
                            }}
                        >
                            <span className="card-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                                    <polyline points="16 17 21 12 16 7"/>
                                    <line x1="21" y1="12" x2="9" y2="12"/>
                                </svg>
                            </span>
                            <span className="card-title">Logout</span>
                        </button>
                    </div>

                    <div className="profile-section profile-posts-container">
                        <div className="profile-section-header-flex">
                            <h3 className="profile-section-title">Campus Posts & Reposts</h3>
                            <button className="btn-text" onClick={() => navigate('/confessions')}>
                                View Feed →
                            </button>
                        </div>
                        <ProfilePostsSection posts={userPosts} loading={postsLoading} navigate={navigate} />
                    </div>

                    {canUseWebPush && <div className="push-status-container" style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>
                        {!checkingPush && (
                            isSubscribed ? (
                                <button className="btn btn-secondary btn-block" disabled style={{ opacity: 0.7 }}>
                                    🔔 Notifications Subscribed ✓
                                </button>
                            ) : (
                                <button className="btn btn-primary btn-block" onClick={handleEnableAlerts} style={{ animation: 'pulse 2s infinite' }}>
                                    🔔 Enable Push Alerts
                                </button>
                            )
                        )}
                    </div>}

                    <AndroidInstallButton />
                </div>
            ) : isFromChat && !showGalleryView ? (
                // CHAT-OPENED PROFILE VIEW (Redesigned compact, polished, balanced view)
                <div className="profile-card chat-opened-profile-view animate-fade-in" data-testid="chat-opened-profile-view">
                    {/* Top Navigation Bar */}
                    <div className="chat-profile-top-bar">
                        <button
                            type="button"
                            className="chat-profile-back-btn"
                            onClick={() => {
                                if (conversationId) {
                                    navigate(`/chat?chatId=${conversationId}`);
                                } else {
                                    navigate('/chat');
                                }
                            }}
                            aria-label="Back to chat"
                        >
                            <span className="back-arrow">←</span>
                            <span>Back to Chat</span>
                        </button>

                        <button
                            type="button"
                            className="chat-profile-gallery-toggle"
                            onClick={() => setShowGalleryView(true)}
                            title="View Full Photos Gallery"
                        >
                            <span>🖼️ Full Gallery</span>
                        </button>
                    </div>

                    {/* Profile Hero Header */}
                    <div className="chat-profile-hero">
                        <div 
                            className={`chat-profile-avatar-wrap ${allStatuses.length > 0 ? (hasUnviewedStatus ? 'has-active-status' : 'has-viewed-status') : ''}`}
                            onClick={() => {
                                if (allStatuses.length > 0) {
                                    setShowStatusViewer(true);
                                }
                            }}
                            role={allStatuses.length > 0 ? 'button' : undefined}
                            tabIndex={allStatuses.length > 0 ? 0 : undefined}
                            title={allStatuses.length > 0 ? (hasUnviewedStatus ? 'Tap to view new campus story' : 'Viewed campus story') : displayName}
                        >
                            <OptimizedImage
                                src={avatarUrl}
                                alt={displayName}
                                className="chat-profile-avatar"
                                width={160}
                            />
                            {hasActivePremium(userProfile) && (
                                <div className="avatar-premium-badge" title="👑 Premium Member">
                                    <span className="avatar-premium-icon">👑</span>
                                </div>
                            )}
                            {isOnline && <span className="profile-online-dot chat-profile-online-dot" title="Online" />}
                            {allStatuses.length > 0 && (
                                <span className={`chat-profile-story-badge ${hasUnviewedStatus ? 'is-unviewed' : 'is-viewed'}`} title={hasUnviewedStatus ? 'Active Story' : 'Viewed Story'}>
                                    ▶
                                </span>
                            )}
                        </div>

                        <div className="chat-profile-header-info">
                            <div className="chat-profile-name-row">
                                <h2 className="chat-profile-name">
                                    {displayName}{userProfile?.age ? `, ${userProfile.age}` : ''}
                                </h2>
                                {(userProfile?.photo_verified || userProfile?.is_verified) && (
                                    <span className="card-verified-tick" title="Photo Verified Student">✓</span>
                                )}
                            </div>

                            <p className="chat-profile-sub-uni">
                                🎓 {university} {userProfile?.department ? `• ${userProfile.department}` : ''}
                            </p>

                            <div className="chat-profile-pills-row">
                                {isOnline && <span className="profile-live-badge-glow">LIVE</span>}
                                {hasActivePremium(userProfile) && <span className="premium-badge-glow">👑 Premium</span>}
                                {(userProfile?.photo_verified || userProfile?.is_verified) && (
                                    <span className="verified-badge-pill">✓ Verified Student</span>
                                )}
                                {userProfile?.location_status && (
                                    <span className="chat-profile-loc-pill">📍 {userProfile.location_status}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Active Status Card / Banner */}
                    {allStatuses.length > 0 ? (
                        <div 
                            className={`chat-profile-status-banner ${hasUnviewedStatus ? 'is-unviewed' : 'is-viewed'}`}
                            onClick={() => setShowStatusViewer(true)}
                            role="button"
                            tabIndex={0}
                        >
                            <div className="status-banner-left">
                                <div className="status-pulse-ring">
                                    <span className="status-pulse-core">{hasUnviewedStatus ? '🔥' : '✓'}</span>
                                </div>
                                <div className="status-banner-text">
                                    <span className="status-banner-title">{hasUnviewedStatus ? 'Active Campus Story' : 'Campus Story'}</span>
                                    <span className="status-banner-sub">
                                        {allStatuses.length} {allStatuses.length === 1 ? 'update' : 'updates'} • {hasUnviewedStatus ? 'Tap to watch' : 'Already viewed'}
                                    </span>
                                </div>
                            </div>
                            <button 
                                type="button" 
                                className="status-watch-cta-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowStatusViewer(true);
                                }}
                            >
                                {hasUnviewedStatus ? 'Watch Story ▶' : 'Replay Story ↺'}
                            </button>
                        </div>
                    ) : (
                        <div className="chat-profile-no-status-pill">
                            <span>✨ No active story right now</span>
                        </div>
                    )}

                    {/* Action Strip (4 Core Actions: Vibe, Message, Call, Gift) */}
                    <div className="chat-profile-actions-bar">
                        <button
                            type="button"
                            className={`chat-action-btn vibe-action-btn ${vibeSent ? 'sent' : ''}`}
                            onClick={handleVibe}
                            disabled={vibeLoading || vibeSent}
                        >
                            <span className="btn-icon">✨</span>
                            <span className="btn-text">{vibeLoading ? 'Vibing...' : vibeSent ? 'Vibed ✓' : 'Vibe'}</span>
                        </button>
                        <button
                            type="button"
                            className="chat-action-btn message-action-btn primary"
                            onClick={() => {
                                if (conversationId) {
                                    navigate(`/chat?chatId=${conversationId}`);
                                } else {
                                    navigate('/chat', { state: { openChatWith: userProfile.id } });
                                }
                            }}
                        >
                            <span className="btn-icon">💬</span>
                            <span className="btn-text">Message</span>
                        </button>
                        <button
                            type="button"
                            className="chat-action-btn call-action-btn"
                            onClick={() => navigate(`/call/${userProfile.id}?type=voice`)}
                        >
                            <span className="btn-icon">📞</span>
                            <span className="btn-text">Call</span>
                        </button>
                        <button
                            type="button"
                            className="chat-action-btn gift-action-btn"
                            onClick={() => setShowGiftStore(true)}
                            title="Send Campus Gift"
                            data-action="gift"
                        >
                            <span className="btn-icon">🎁</span>
                            <span className="btn-text">Gift</span>
                        </button>
                    </div>

                    {/* Profile Details Cards */}
                    <div className="chat-profile-body-sections">
                        {/* Bio Section */}
                        {bio && bio !== 'No bio yet' && (
                            <div className="chat-profile-section-card">
                                <h4 className="chat-section-label">About {displayName}</h4>
                                <p className="chat-profile-bio-text">{bio}</p>
                            </div>
                        )}

                        {/* AI Compatibility Signal Banner */}
                        <div className="profile-compatibility-card-premium chat-profile-compat">
                            <div className="comp-percentage-glow">{getCompatibilityScore()}%</div>
                            <div className="comp-info-details">
                                <strong>AI Wingmate Compatibility</strong>
                                {mutualInterests.length > 0 ? (
                                    <p>You both enjoy <strong>{mutualInterests.join(', ')}</strong> and share common vibes!</p>
                                ) : (
                                    <p>Shared academic focus and campus vibe alignment.</p>
                                )}
                            </div>
                        </div>

                        {/* Student Academic & Vibe Grid */}
                        <div className="profile-info-grid-premium chat-profile-grid">
                            <div className="grid-item"><strong>Level</strong><span>{userProfile?.level || '—'}</span></div>
                            <div className="grid-item"><strong>Dept</strong><span>{userProfile?.department || '—'}</span></div>
                            <div className="grid-item"><strong>MBTI</strong><span>{userProfile?.mbti || '—'}</span></div>
                            <div className="grid-item"><strong>Genotype</strong><span>{userProfile?.genotype || '—'}</span></div>
                        </div>

                        {/* Voice Intro Player */}
                        {voiceIntro && (
                            <div className="chat-profile-section-card">
                                <span className="voice-label-glow">🎤 VOICE INTRO</span>
                                <VoicePlayer src={voiceIntro} />
                            </div>
                        )}

                        {/* Spotify Campus Anthem Widget */}
                        {anthem && (
                            <div className="spotify-anthem-widget-premium">
                                <div className="spotify-wave-logo">🎵</div>
                                <div className="spotify-track-details">
                                    <span className="track-title">{anthem.split('-')[0]?.trim() || 'Anthem'}</span>
                                    <span className="track-artist">{anthem.split('-')[1]?.trim() || 'Campus Track'} • Campus Anthem</span>
                                </div>
                                <span className="spotify-play-btn">▶</span>
                            </div>
                        )}

                        {/* Interest Tags */}
                        {safeArray(userProfile?.interests).length > 0 && (
                            <div className="chat-profile-section-card">
                                <h4 className="chat-section-label">Vibe Tags</h4>
                                <div className="profile-interests-pills">
                                    {safeArray(userProfile.interests).map((interest, idx) => (
                                        <span key={idx} className="interest-pill">{interest}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 10s Video Profile Showcase */}
                        {userProfile?.video_url && (
                            <ProfileVideoShowcase
                                videoUrl={userProfile.video_url}
                                isOwnProfile={false}
                                isUltra={isEliteUltra(userProfile)}
                            />
                        )}

                        {/* Q&A Prompt Card */}
                        {userProfile?.intro_prompt && (
                            <div className="profile-prompt-card-premium">
                                <span className="prompt-question">We will get along if...</span>
                                <p className="prompt-answer">"{userProfile.intro_prompt}"</p>
                            </div>
                        )}

                        {/* Campus Posts & Reposts Section */}
                        {userPosts.length > 0 && (
                            <div className="chat-profile-section-card profile-posts-wrapper">
                                <h4 className="chat-section-label">Campus Posts & Reposts</h4>
                                <ProfilePostsSection posts={userPosts} loading={postsLoading} navigate={navigate} />
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                // PUBLIC PROFILE VIEW
                <div className="profile-card public-profile-view animate-fade-in">
                    {/* Return to chat overview if from chat */}
                    {isFromChat && (
                        <div className="gallery-view-top-bar">
                            <button
                                type="button"
                                className="chat-profile-back-btn"
                                onClick={() => setShowGalleryView(false)}
                            >
                                <span className="back-arrow">←</span>
                                <span>Back to Profile Overview</span>
                            </button>
                        </div>
                    )}

                    {/* Carousel image with status dots and progress bars */}
                    <ProfileCarousel
                        photos={userProfile?.profile_photos}
                        avatarUrl={avatarUrl}
                        displayName={displayName}
                        isOnline={isOnline}
                        userStatuses={allStatuses}
                        setShowStatusViewer={setShowStatusViewer}
                        isPremium={hasActivePremium(userProfile)}
                        photoUpdatedAt={userProfile?.photo_updated_at}
                        updatedAt={userProfile?.updated_at}
                    />

                    <div className="public-profile-details">
                        <div className="profile-title-row-premium">
                            <h2>
                                {displayName}, {userProfile?.age || '—'}
                                {hasActivePremium(userProfile) && <span className="premium-crown" title="Premium Member">👑</span>}
                                {(userProfile?.photo_verified || userProfile?.is_verified) && (
                                    <span className="card-verified-tick" title="Photo Verified Student">✓</span>
                                )}
                            </h2>
                            <div className="profile-badges-cluster">
                                {hasActivePremium(userProfile) && <span className="premium-badge-glow">👑 Premium</span>}
                                {(userProfile?.photo_verified || userProfile?.is_verified) && (
                                    <span className="verified-badge-pill" title="Photo Verified Student">✓ Verified</span>
                                )}
                                {isOnline && <span className="profile-live-badge-glow">LIVE</span>}
                            </div>
                        </div>
                        <p className="profile-uni-subtitle">🎓 {university} • {userProfile?.location_status || 'Campus'}</p>

                        {/* AI Compatibility Signal Banner */}
                        <div className="profile-compatibility-card-premium">
                            <div className="comp-percentage-glow">{getCompatibilityScore()}%</div>
                            <div className="comp-info-details">
                                <strong>AI Wingmate Compatibility Check</strong>
                                {mutualInterests.length > 0 ? (
                                    <p>You both enjoy <strong>{mutualInterests.join(', ')}</strong> and share common student vibes!</p>
                                ) : (
                                    <p>Shared academic focus, level details, and common campus vibe goals.</p>
                                )}
                            </div>
                        </div>

                        {/* Info grid */}
                        <div className="profile-info-grid-premium">
                            <div className="grid-item"><strong>Level</strong><span>{userProfile?.level || '—'}</span></div>
                            <div className="grid-item"><strong>Dept</strong><span>{userProfile?.department || '—'}</span></div>
                            <div className="grid-item"><strong>MBTI</strong><span>{userProfile?.mbti || '—'}</span></div>
                            <div className="grid-item"><strong>Genotype</strong><span>{userProfile?.genotype || '—'}</span></div>
                        </div>

                        {/* Voice Intro Player */}
                        {voiceIntro && (
                            <div className="profile-voice-player-section">
                                <span className="voice-label-glow">🎤 VOICE INTRO</span>
                                <VoicePlayer src={voiceIntro} />
                            </div>
                        )}

                        {/* Bio */}
                        <div className="profile-section-premium-block">
                            <h4>About Me</h4>
                            <p className="profile-bio-text">{bio}</p>
                        </div>

                        {/* Spotify Campus Anthem Widget */}
                        {anthem && (
                            <div className="spotify-anthem-widget-premium">
                                <div className="spotify-wave-logo">🎵</div>
                                <div className="spotify-track-details">
                                    <span className="track-title">{anthem.split('-')[0]?.trim() || 'Anthem'}</span>
                                    <span className="track-artist">{anthem.split('-')[1]?.trim() || 'Campus Track'} • Campus Anthem</span>
                                </div>
                                <span className="spotify-play-btn">▶</span>
                            </div>
                        )}

                        {/* Interest Tags */}
                        {safeArray(userProfile?.interests).length > 0 && (
                            <div className="profile-section-premium-block">
                                <h4>Vibe Tags</h4>
                                <div className="profile-interests-pills">
                                    {safeArray(userProfile.interests).map((interest, idx) => (
                                        <span key={idx} className="interest-pill">{interest}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 10s Video Profile Showcase */}
                        {userProfile?.video_url && (
                            <ProfileVideoShowcase
                                videoUrl={userProfile.video_url}
                                isOwnProfile={false}
                                isUltra={isEliteUltra(userProfile)}
                            />
                        )}

                        {/* Q&A Prompt Card */}
                        {userProfile?.intro_prompt && (
                            <div className="profile-prompt-card-premium">
                                <span className="prompt-question">We will get along if...</span>
                                <p className="prompt-answer">"{userProfile.intro_prompt}"</p>
                            </div>
                        )}

                        {/* Campus Posts & Reposts Section */}
                        <div className="profile-section-premium-block profile-posts-wrapper">
                            <h4>Campus Posts & Reposts</h4>
                            <ProfilePostsSection posts={userPosts} loading={postsLoading} navigate={navigate} />
                        </div>
                    </div>

                    {/* Floating Action Bar */}
                    <div className="profile-floating-actions-bar">
                        <button
                            className={`float-action-btn vibe-btn-glow ${vibeSent ? 'sent' : ''}`}
                            onClick={handleVibe}
                            disabled={vibeLoading || vibeSent}
                        >
                            {vibeLoading ? '⏳ Vibing...' : vibeSent ? '✓ Vibe Sent' : '✨ Vibe'}
                        </button>
                        <button
                            className="float-action-btn chat-btn-glow primary"
                            onClick={() => navigate('/chat', { state: { openChatWith: userProfile.id, chatId: conversationId } })}
                        >
                            💬 Message
                        </button>
                        <button
                            className="float-action-btn call-btn-glow"
                            onClick={() => navigate(`/call/${userProfile.id}?type=voice`)}
                        >
                            📞 Call
                        </button>
                        <button
                            className="float-action-btn gift-btn-glow"
                            onClick={() => setShowGiftStore(true)}
                            title="Send Campus Gift"
                            aria-label="Send Gift"
                            data-action="gift"
                        >
                            🎁 Gift
                        </button>
                    </div>
                </div>
            )}

            {/* Status Update Modal */}
            {showStatusModal && (
                <div className="modal-overlay" onClick={() => setShowStatusModal(false)} style={{ zIndex: 2000 }}>
                    <div className="modal-content glass" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Update Status</h3>
                            <button className="close-btn" onClick={() => setShowStatusModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <StatusInput onStatusPosted={() => {
                                setShowStatusModal(false);
                            }} />
                        </div>
                    </div>
                </div>
            )}

            {/* Status Viewer Overlay */}
            <AnimatePresence>
                {showStatusViewer && allStatuses.length > 0 && (
                    <StatusViewer
                        statuses={allStatuses}
                        profile={isOwnProfile ? userProfile : (viewingProfile || userProfile)}
                        onClose={() => setShowStatusViewer(false)}
                    />
                )}
            </AnimatePresence>

            {/* Zero-Backend Ephemeral Status Upload Modal */}
            <StatusUploadModal
                isOpen={showStatusUploadModal}
                onClose={() => setShowStatusUploadModal(false)}
                userId={currentUser?.id}
                userProfile={userProfile}
                onStatusAdded={(newStatus) => {
                    setLocalStatuses(prev => [newStatus, ...prev]);
                }}
            />

            <FaceVerificationModal
                isOpen={showFaceVerification}
                onClose={() => setShowFaceVerification(false)}
                onVerified={() => {
                    fetchProfile?.(currentUser?.id);
                    setShowFaceVerification(false);
                }}
            />

            {/* Campus Virtual Gift Store Modal */}
            {showGiftStore && (
                <GiftStore
                    onClose={() => setShowGiftStore(false)}
                    onSend={handleGiftSend}
                    coinBalance={coinBalance}
                    onOpenCoinStore={() => setShowCoinStore(true)}
                />
            )}

            {/* CD Coin Store Modal */}
            {showCoinStore && (
                <CoinStoreModal
                    userCoins={coinBalance}
                    walletBalance={walletBalance}
                    onClose={() => setShowCoinStore(false)}
                    onCoinsUpdated={(newBal) => setCoinBalance(newBal)}
                />
            )}
        </div>
    );
}
