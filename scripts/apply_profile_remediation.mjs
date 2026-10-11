import fs from 'fs';

// 1. Update Profile.jsx
const profileJsxPath = 'src/pages/Profile.jsx';
let jsx = fs.readFileSync(profileJsxPath, 'utf8');

// Replacement block for own-profile view header and layout
const oldOwnProfileSection = `{isOwnProfile ? (
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

                    {/* COMPACT STUDENT IDENTITY & PHOTO VERIFICATION CARD */}
                    <div className="verification-card-permanent">
                        <div className="verification-card-left">
                            <span className="verification-status-icon">
                                {(userProfile?.photo_verified || userProfile?.is_verified) ? '🛡️' : '📸'}
                            </span>
                            <div className="verification-status-info">
                                <div className="verification-title-row">
                                    <strong className="verification-title">Face Verification</strong>
                                </div>
                                <span className="verification-subtitle-compact">
                                    {(userProfile?.photo_verified || userProfile?.is_verified)
                                        ? '✓ Verified • 3x more match requests'
                                        : '5s selfie to earn ✓ badge'}
                                </span>
                            </div>
                        </div>
                        {!(userProfile?.photo_verified || userProfile?.is_verified) ? (
                            <button
                                type="button"
                                className="btn verification-action-btn btn-primary verify-btn-cta"
                                onClick={() => setShowFaceVerification(true)}
                            >
                                Verify →
                            </button>
                        ) : (
                            <span className="verified-status-tag" title="Photo Verified Student">
                                ✓ Verified
                            </span>
                        )}
                    </div>

                    <ProfileCompletion
                        score={userProfile?.completion_score || 0}
                        profile={userProfile}
                        onCompleteClick={() => navigate('/profile/edit')}
                        onAiCoachClick={handleProfileCoach}
                        aiCoachLoading={aiCoachLoading}
                        aiCoachResult={aiCoach}
                    />

                    <div className="profile-header">
                        <div
                            className={\`profile-avatar-wrapper own-avatar-frame \${userStatuses.length > 0 ? 'has-status' : ''}\`}
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
                            {hasActivePremium(isOwnProfile ? userProfile : viewingProfile) && (
                                <div className="avatar-premium-badge" title="Premium Member">
                                    <span className="avatar-premium-icon">👑</span>
                                </div>
                            )}
                        </div>
                        <h1 className="profile-name">
                            {displayName}
                            {hasActivePremium(isOwnProfile ? userProfile : viewingProfile) && (
                                <span className="premium-badge-pill" title="Premium Member">
                                    👑 Premium
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
                        </h1>
                        <p className="profile-uni-text">🎓 {university}</p>
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
                    </div>`;

const newOwnProfileSection = `{isOwnProfile ? (
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
                            className={\`profile-avatar-wrapper own-avatar-frame \${userStatuses.length > 0 ? 'has-status' : ''}\`}
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
                            {hasActivePremium(isOwnProfile ? userProfile : viewingProfile) && (
                                <div className="avatar-premium-badge" title="Premium Member">
                                    <span className="avatar-premium-icon">👑</span>
                                </div>
                            )}
                            {isOnline && <span className="profile-online-dot" />}
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
                                {isOnline && <span className="live-badge">LIVE</span>}
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
                    />`;

// Normalize CRLF to LF for matching
const normJsx = jsx.replace(/\r\n/g, '\n');
const normOld = oldOwnProfileSection.replace(/\r\n/g, '\n');

if (normJsx.includes(normOld)) {
    const updatedNorm = normJsx.replace(normOld, newOwnProfileSection);
    fs.writeFileSync(profileJsxPath, updatedNorm, 'utf8');
    console.log('✓ Successfully updated Profile.jsx layout!');
} else {
    console.error('Could not find exact oldOwnProfileSection in Profile.jsx');
    // Let's do fallback matching
    process.exit(1);
}
