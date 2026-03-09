import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
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
import { getUserStatuses } from '../services/statusService';
import { formatLastSeen } from '../utils/formatTimestamp';

import useSWR from 'swr';
import OptimizedImage from '../components/OptimizedImage';
import { AnimatePresence } from 'framer-motion';

export default function Profile() {
    const { userId } = useParams();
    const { currentUser, userProfile: myProfile, onlineUserIds } = useAuth();
    const navigate = useNavigate();

    const [showStatusModal, setShowStatusModal] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [checkingPush, setCheckingPush] = useState(true);
    const [showStatusViewer, setShowStatusViewer] = useState(false);

    const isOwnProfile = !userId || userId === currentUser?.id;
    const profileId = userId || currentUser?.id;

    // 1. Resolve Profile data
    const { data: profileResult, isLoading: SWRProfileLoading } = useSWR(
        (!isOwnProfile && profileId) ? ['profile', profileId] : null,
        () => getProfile(profileId),
        { revalidateOnFocus: false }
    );

    const viewingProfile = isOwnProfile ? myProfile : profileResult?.data;
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
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isLocal) {
            setCheckingPush(false);
            return;
        }

        window.OneSignalDeferred = window.OneSignalDeferred || [];
        window.OneSignalDeferred.push(function (OneSignal) {
            const hasPermission = OneSignal.Notifications.permission;
            setIsSubscribed(hasPermission);
            setCheckingPush(false);

            OneSignal.Notifications.addEventListener('permissionChange', (permission) => {
                setIsSubscribed(permission);
            });
        });
    }, [isOwnProfile]);

    const handleEnableAlerts = () => {
        window.OneSignalDeferred.push(async function (OneSignal) {
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
    const isOnline = onlineUserIds.has(userProfile.id);

    const displayName = userProfile?.full_name
        || userProfile?.username
        || currentUser?.email?.split('@')[0]
        || 'User';

    const avatarUrl = userProfile?.avatar_url || null;
    const email = currentUser?.email || '';
    const university = userProfile?.university || 'Not set';
    const bio = userProfile?.bio || 'No bio yet';

    // Vibe Check Data
    const anthem = userProfile?.anthem;
    const locationStatus = userProfile?.location_status;
    const voiceIntro = userProfile?.voice_intro_url;

    return (
        <div className="profile-page">
            <div className="profile-card">
                <ProfileCompletion
                    score={userProfile?.completion_score || 0}
                    profile={userProfile}
                    onCompleteClick={() => navigate('/profile/edit')}
                />

                <div className="profile-header">
                    <div className="profile-photos-carousel">
                        {userProfile?.profile_photos?.length > 0 ? (
                            userProfile.profile_photos.map((photo, idx) => (
                                <div
                                    key={idx}
                                    className={`profile-carousel-item profile-avatar-wrapper ${userStatuses.length > 0 ? 'has-status' : ''}`}
                                    onClick={() => userStatuses.length > 0 && setShowStatusViewer(true)}
                                    style={{ cursor: userStatuses.length > 0 ? 'pointer' : 'default' }}
                                >
                                    <OptimizedImage
                                        src={photo || avatarUrl}
                                        alt={`${displayName} ${idx + 1}`}
                                        className="profile-avatar"
                                        width={300}
                                        priority={idx === 0}
                                    />
                                    {isOnline && <span className="profile-online-dot" />}
                                </div>
                            ))
                        ) : (
                            <div
                                className={`profile-carousel-item profile-avatar-wrapper ${userStatuses.length > 0 ? 'has-status' : ''}`}
                                onClick={() => userStatuses.length > 0 && setShowStatusViewer(true)}
                                style={{ cursor: userStatuses.length > 0 ? 'pointer' : 'default' }}
                            >
                                {avatarUrl ? (
                                    <OptimizedImage
                                        src={avatarUrl}
                                        alt={displayName}
                                        className="profile-avatar"
                                        width={300}
                                        priority
                                    />
                                ) : (
                                    <div className="profile-avatar profile-avatar-placeholder">
                                        {displayName.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                {isOnline && <span className="profile-online-dot" />}
                            </div>
                        )}
                    </div>
                    <h1 className="profile-name">
                        {displayName}
                        {isOnline && <span className="live-badge">LIVE</span>}
                    </h1>
                    <p className="profile-email">
                        {isOnline ? (
                            <span className="online-status-text">Online now</span>
                        ) : (
                            <span className="last-seen-status">{formatLastSeen(userProfile?.last_seen_at)}</span>
                        )}
                    </p>
                </div>


                <div className="profile-info-grid">
                    <div className="profile-info-item">
                        <span className="info-label">Level</span>
                        <span className="info-value">{userProfile?.level || '—'}</span>
                    </div>
                    <div className="profile-info-item">
                        <span className="info-label">Dept</span>
                        <span className="info-value">{userProfile?.department || '—'}</span>
                    </div>
                    <div className="profile-info-item">
                        <span className="info-label">Faculty</span>
                        <span className="info-value">{userProfile?.faculty || '—'}</span>
                    </div>
                    <div className="profile-info-item">
                        <span className="info-label">Genotype</span>
                        <span className="info-value">{userProfile?.genotype || '—'}</span>
                    </div>
                    <div className="profile-info-item">
                        <span className="info-label">MBTI</span>
                        <span className="info-value">{userProfile?.mbti || '—'}</span>
                    </div>
                    <div className="profile-info-item">
                        <span className="info-label">Goal</span>
                        <span className="info-value">{userProfile?.attraction_goal || '—'}</span>
                    </div>
                </div>

                {/* Earnings Section (Prominent for Female users, Wallet for others) */}
                {isOwnProfile && (
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
                )}

                {/* VIBE CHECK SECTION */}
                {(anthem || locationStatus || voiceIntro) && (
                    <div className="profile-section vibe-check-display">
                        <h3 className="profile-section-title">✨ Vibe Check</h3>

                        {locationStatus && (
                            <div className="vibe-item location-status">
                                <span className="vibe-icon">📍</span>
                                <span className="vibe-text">{locationStatus}</span>
                            </div>
                        )}

                        {anthem && (
                            <div className="vibe-item anthem">
                                <span className="vibe-icon">🎵</span>
                                <span className="vibe-text">{anthem}</span>
                            </div>
                        )}

                        {voiceIntro && (
                            <div className="vibe-item voice-intro">
                                <span className="vibe-icon">🎤</span>
                                <div className="voice-player">
                                    <audio controls src={voiceIntro} className="w-full h-8" />
                                </div>
                            </div>
                        )}

                        {userProfile?.intro_prompt && (
                            <div className="vibe-item intro-prompt">
                                <span className="vibe-icon">💬</span>
                                <span className="vibe-text">"{userProfile.intro_prompt}"</span>
                            </div>
                        )}

                        {userProfile?.interests?.length > 0 && (
                            <div className="profile-interests">
                                {userProfile.interests.map((interest, idx) => (
                                    <span key={idx} className="interest-tag">{interest}</span>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="profile-section">
                    <h3 className="profile-section-title">About Me</h3>
                    <p className="profile-bio">{bio}</p>
                </div>

                {isOwnProfile ? (
                    <>
                        <div className="push-status-container" style={{ marginTop: '1.5rem' }}>
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
                        </div>

                        <button
                            className="btn btn-secondary btn-block"
                            style={{ marginTop: '1rem' }}
                            onClick={() => setShowStatusModal(true)}
                        >
                            📸 Update Status
                        </button>

                        <button
                            className="btn btn-secondary btn-block"
                            style={{ marginTop: '1rem' }}
                            onClick={() => navigate('/profile/edit')}
                        >
                            ✏️ Edit Profile
                        </button>

                        <button
                            className="btn btn-gradient btn-block"
                            style={{ marginTop: '1rem' }}
                            onClick={() => navigate('/premium')}
                        >
                            👑 Get Premium
                        </button>

                        <button
                            className="btn btn-secondary btn-block"
                            style={{ marginTop: '1rem' }}
                            onClick={() => navigate('/leaderboard')}
                        >
                            🏆 Leaderboard
                        </button>

                        <AndroidInstallButton />
                    </>
                ) : (
                    <button
                        className="btn btn-primary btn-block"
                        style={{ marginTop: '1.5rem' }}
                        onClick={() => navigate('/chat', { state: { openChatWith: userProfile.id } })}
                    >
                        💬 Send Message
                    </button>
                )}
            </div>

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
