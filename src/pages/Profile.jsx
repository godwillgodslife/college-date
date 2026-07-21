import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getWallet } from '../services/paymentService';
import { getProfile } from '../services/profileService';
import AndroidInstallButton from '../components/AndroidInstallButton';
import ProfileCompletion from '../components/ProfileCompletion';
import LoadingSpinner from '../components/LoadingSpinner';
import './Profile.css';
import './Profile_Earnings.css';
import StatusInput from '../components/StatusInput';
import StatusViewer from '../components/StatusViewer';
import { useToast } from '../components/Toast';
import { getUserStatuses } from '../services/statusService';
import { formatLastSeen } from '../utils/formatTimestamp';
import { requestProfileAiReview } from '../services/aiTrustService';
import { requestAiAssistant } from '../services/aiAssistantService';
import { partnerWhatsAppUrl } from '../config/contactLinks';

import useSWR from 'swr';
import OptimizedImage from '../components/OptimizedImage';
import { AnimatePresence } from 'framer-motion';
import { getProfilePhotos, normalizeProfile, safeArray } from '../utils/profileData';

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

function ProfileCarousel({ photos, avatarUrl, displayName, isOnline, userStatuses, setShowStatusViewer }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const photosList = getProfilePhotos({ profile_photos: photos, avatar_url: avatarUrl });

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
                <img
                    src={photosList[currentIndex]}
                    alt={`${displayName} photo`}
                    className="profile-carousel-img"
                    onClick={(e) => {
                        if (userStatuses.length > 0) {
                            e.stopPropagation();
                            setShowStatusViewer(true);
                        }
                    }}
                />
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
    const { currentUser, userProfile: myProfile, onlineUserIds, logout } = useAuth();
    const navigate = useNavigate();
    const { addToast } = useToast();

    const [showStatusModal, setShowStatusModal] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [checkingPush, setCheckingPush] = useState(true);
    const [showStatusViewer, setShowStatusViewer] = useState(false);
    const [aiCoach, setAiCoach] = useState(null);
    const [aiCoachLoading, setAiCoachLoading] = useState(false);

    const isOwnProfile = !userId || userId === currentUser?.id;
    const profileId = userId || currentUser?.id;

    // 1. Resolve Profile data
    const { data: profileResult, isLoading: SWRProfileLoading } = useSWR(
        (!isOwnProfile && profileId) ? ['profile', profileId] : null,
        () => getProfile(profileId),
        { revalidateOnFocus: false }
    );

    const viewingProfile = normalizeProfile(isOwnProfile ? myProfile : profileResult?.data);
    const profileLoading = isOwnProfile ? false : SWRProfileLoading;



    const { data: walletResult, isLoading: walletLoading } = useSWR(
        isOwnProfile && currentUser ? ['wallet', currentUser.id] : null,
        () => getWallet(currentUser.id),
        { revalidateOnFocus: false }
    );

    const { data: statusResult, isLoading: statusLoading } = useSWR(
        profileId ? ['statuses', profileId] : null,
        () => getUserStatuses(profileId),
        { revalidateOnFocus: false }
    );

    const wallet = walletResult?.data;
    const userStatuses = statusResult?.data || [];

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

    const avatarUrl = userProfile?.avatar_url || null;
    const email = currentUser?.email || '';
    const university = userProfile?.university || 'Not set';
    const bio = userProfile?.bio || 'No bio yet';
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
                // OWN PROFILE VIEW
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

                    {/* VERIFICATION BANNER: Encourage users to verify they are real */}
                    {!userProfile?.is_verified && (safeArray(userProfile?.profile_photos).length > 0 || userProfile?.avatar_url) && (
                        <div className="verification-alert">
                            <div className="verification-text-block">
                                <span className="verify-shield">🛡️</span>
                                <div className="verify-text">
                                    <strong>Verify Your Profile</strong> {aiVerificationCopy[aiVerificationStatus] || aiVerificationCopy.not_started}
                                </div>
                            </div>
                            <button
                                className="btn btn-primary verify-btn-sm"
                                onClick={() => {
                                    requestProfileAiReview('manual_profile_verify');
                                }}
                            >
                                {aiVerificationStatus === 'reviewing' || aiVerificationStatus === 'pending' ? 'Checking...' : 'AI Check'}
                            </button>
                        </div>
                    )}

                    <ProfileCompletion
                        score={userProfile?.completion_score || 0}
                        profile={userProfile}
                        onCompleteClick={() => navigate('/profile/edit')}
                    />

                    <div className="profile-header">
                        <div
                            className={`profile-avatar-wrapper own-avatar-frame ${userStatuses.length > 0 ? 'has-status' : ''}`}
                            onClick={() => userStatuses.length > 0 && setShowStatusViewer(true)}
                            style={{ cursor: userStatuses.length > 0 ? 'pointer' : 'default' }}
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
                            {isOnline && <span className="profile-online-dot" />}
                        </div>
                        <h1 className="profile-name">
                            {displayName}
                            {isOnline && <span className="live-badge">LIVE</span>}
                        </h1>
                        <p className="profile-uni-text">🎓 {university}</p>
                    </div>

                    <div className="profile-section ai-profile-coach">
                        <div className="wallet-entry-header">
                            <h3 className="profile-section-title">AI Profile Coach</h3>
                            <button className="btn-text" onClick={handleProfileCoach} disabled={aiCoachLoading}>
                                {aiCoachLoading ? 'Thinking...' : 'Improve'}
                            </button>
                        </div>
                        {aiCoach ? (
                            <div className="ai-coach-result">
                                {aiCoach.summary && <p>{aiCoach.summary}</p>}
                                {aiCoach.bio_suggestion && <p><strong>Bio idea:</strong> {aiCoach.bio_suggestion}</p>}
                                {aiCoach.priority_actions?.slice(0, 3).map((action) => (
                                    <span key={action} className="interest-tag">{action}</span>
                                ))}
                            </div>
                        ) : (
                            <p className="section-hint">Get a quick AI review of your bio, photos, prompts, and match appeal.</p>
                        )}
                    </div>

                    {/* Earnings Section (Prominent for Female users, Wallet for others) */}
                    <div className="profile-section wallet-entry-card" onClick={() => navigate('/wallet')}>
                        <div className="wallet-entry-header">
                            <h3 className="profile-section-title">
                                {userProfile?.role === 'Female' ? '💰 My Earnings' : '💰 My Wallet'}
                            </h3>
                            <button className="btn-text">Manage →</button>
                        </div>
                        {userProfile?.role === 'Female' ? (
                            <div className="earnings-summary-grid">
                                <div className="earn-stat">
                                    <span className="earn-val">₦{parseFloat(wallet?.available_balance || 0).toLocaleString()}</span>
                                    <span className="earn-lbl">Available</span>
                                </div>
                                <div className="earn-stat">
                                    <span className="earn-val">₦{parseFloat(wallet?.total_earned || 0).toLocaleString()}</span>
                                    <span className="earn-lbl">Lifetime</span>
                                </div>
                            </div>
                        ) : (
                            <div className="wallet-balance-simple">
                                <span className="balance-val">₦{parseFloat(wallet?.available_balance || 0).toLocaleString()}</span>
                                <span className="balance-lbl">Balance</span>
                            </div>
                        )}
                    </div>

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

                        {userProfile?.role === 'Female' && (
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
                        )}

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
            ) : (
                // PUBLIC PROFILE VIEW
                <div className="profile-card public-profile-view animate-fade-in">
                    {/* Carousel image with status dots and progress bars */}
                    <ProfileCarousel
                        photos={userProfile?.profile_photos}
                        avatarUrl={avatarUrl}
                        displayName={displayName}
                        isOnline={isOnline}
                        userStatuses={userStatuses}
                        setShowStatusViewer={setShowStatusViewer}
                    />

                    <div className="public-profile-details">
                        <div className="profile-title-row-premium">
                            <h2>{displayName}, {userProfile?.age || '—'}</h2>
                            {isOnline && <span className="profile-live-badge-glow">LIVE</span>}
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

                        {/* Q&A Prompt Card */}
                        {userProfile?.intro_prompt && (
                            <div className="profile-prompt-card-premium">
                                <span className="prompt-question">We will get along if...</span>
                                <p className="prompt-answer">"{userProfile.intro_prompt}"</p>
                            </div>
                        )}
                    </div>

                    {/* Floating Action Bar */}
                    <div className="profile-floating-actions-bar">
                        <button
                            className="float-action-btn call-btn-glow"
                            onClick={() => navigate(`/call/${userProfile.id}?type=voice`)}
                        >
                            📞 Call
                        </button>
                        <button
                            className="float-action-btn chat-btn-glow primary"
                            onClick={() => navigate('/chat', { state: { openChatWith: userProfile.id } })}
                        >
                            💬 Message
                        </button>
                        <button
                            className="float-action-btn gift-btn-glow"
                            onClick={() => addToast('🎁 Gift feature coming soon!', 'info')}
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
                {showStatusViewer && userStatuses.length > 0 && (
                    <StatusViewer
                        statuses={userStatuses}
                        profile={userProfile}
                        onClose={() => setShowStatusViewer(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
