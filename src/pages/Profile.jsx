import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react'; // Add useState, useEffect
import { useAuth } from '../contexts/AuthContext';
import { getWallet } from '../services/paymentService'; // Add wallet service
import AndroidInstallButton from '../components/AndroidInstallButton';
import ProfileCompletion from '../components/ProfileCompletion';
import './Profile.css';
import './Profile_Earnings.css'; // Add this line

export default function Profile() {
    const { currentUser, userProfile } = useAuth();
    const navigate = useNavigate();
    const [wallet, setWallet] = useState(null);

    useEffect(() => {
        if (currentUser) {
            getWallet(currentUser.id).then(({ data }) => setWallet(data));
        }
    }, [currentUser]);

    const displayName = userProfile?.full_name
        || userProfile?.username
        || currentUser?.email?.split('@')[0]
        || 'User';

    const avatarUrl = userProfile?.avatar_url || null;
    const email = currentUser?.email || '';
    const university = userProfile?.university || 'Not set';
    const bio = userProfile?.bio || 'No bio yet';
    const age = userProfile?.age || '—';
    const gender = userProfile?.gender || 'Not set';

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
                    <div className="profile-avatar-wrapper">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt={displayName} className="profile-avatar" />
                        ) : (
                            <div className="profile-avatar profile-avatar-placeholder">
                                {displayName.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <span className="profile-online-dot" />
                    </div>
                    <h1 className="profile-name">{displayName}</h1>
                    <p className="profile-email">{email}</p>
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

                {/* Earnings Section for Ladies */}
                {userProfile?.role === 'Female' && (
                    <div className="profile-section earnings-summary-card" onClick={() => navigate('/wallet')}>
                        <div className="earnings-summary-header">
                            <h3 className="profile-section-title">💰 My Earnings</h3>
                            <button className="btn-text">View Wallet →</button>
                        </div>
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

                <button
                    className="btn btn-primary btn-block"
                    style={{ marginTop: '1.5rem' }}
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
            </div>
        </div>
    );
}
