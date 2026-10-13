import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { uploadAvatar, upsertProfile, uploadVoiceIntro, uploadProfilePhoto, uploadProfileVideo } from '../services/profileService';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import VoiceRecorder from '../components/VoiceRecorder';
import { supabase } from '../lib/supabase';
import { requestAiAssistant } from '../services/aiAssistantService';
import { requestProfileAiReview } from '../services/aiTrustService';
import { safeArray, registerProfilePhotoTimestamp } from '../utils/profileData';
import {
    hasActivePremium,
    isEliteUltra,
    getSubscriptionTier,
    getProfilePhotoLimit,
    getProfileVideoDurationLimit,
    canUploadProfileVideo
} from '../utils/premium';
import { clearAppCache } from '../lib/persistentCache';
import { clearMediaCache } from '../lib/mediaCache';
import FaceVerificationModal from '../components/FaceVerificationModal';
import ContextualPaywallSheet from '../components/ContextualPaywallSheet';
import { searchUniversities } from '../constants/universities';
import { detectOffPlatformContact } from '../utils/offPlatformGuard';
import './EditProfile.css';

export default function EditProfile() {
    const { currentUser, userProfile, fetchProfile, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const { addToast } = useToast();
    const fileInputRef = useRef(null);
    const videoInputRef = useRef(null);

    const [loading, setLoading] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [voiceBlob, setVoiceBlob] = useState(null);
    const [videoFile, setVideoFile] = useState(null);
    const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);
    const [aiCoachLoading, setAiCoachLoading] = useState(false);
    const [aiCoach, setAiCoach] = useState(null);
    const [showFaceVerification, setShowFaceVerification] = useState(false);
    const [showUniDropdown, setShowUniDropdown] = useState(false);
    const [paywallOpen, setPaywallOpen] = useState(false);
    const [paywallTrigger, setPaywallTrigger] = useState('video_upload');
    const uniDropdownRef = useRef(null);

    const userTier = useMemo(() => getSubscriptionTier(userProfile), [userProfile]);
    const isUltra = useMemo(() => isEliteUltra(userProfile), [userProfile]);
    const isPremium = useMemo(() => hasActivePremium(userProfile), [userProfile]);
    const photoLimit = useMemo(() => getProfilePhotoLimit(userProfile), [userProfile]);
    const videoDurationLimit = useMemo(() => getProfileVideoDurationLimit(userProfile), [userProfile]);
    const canVideo = useMemo(() => canUploadProfileVideo(userProfile), [userProfile]);

    const [formData, setFormData] = useState({
        full_name: '',
        age: '',
        gender: '',
        university: '',
        bio: '',
        avatar_url: '',
        anthem: '',
        location_status: '',
        voice_intro_url: '',
        video_url: '',
        faculty: '',
        department: '',
        level: '',
        genotype: '',
        mbti: '',
        attraction_goal: '',
        interests: [],
        intro_prompt: '',
    });

    const filteredUnis = useMemo(() => {
        return searchUniversities(formData.university || '', 'ALL').slice(0, 15);
    }, [formData.university]);

    const bioContactCheck = useMemo(() => {
        if (isUltra || !formData.bio) return { blocked: false };
        return detectOffPlatformContact(formData.bio);
    }, [isUltra, formData.bio]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (uniDropdownRef.current && !uniDropdownRef.current.contains(e.target)) {
                setShowUniDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (userProfile) {
            setFormData({
                full_name: userProfile.full_name || '',
                age: userProfile.age || '',
                gender: userProfile.gender || '',
                university: userProfile.university || '',
                bio: userProfile.bio || '',
                avatar_url: userProfile.avatar_url || '',
                anthem: userProfile.anthem || '',
                location_status: userProfile.location_status || '',
                voice_intro_url: userProfile.voice_intro_url || '',
                video_url: userProfile.video_url || '',
                faculty: userProfile.faculty || '',
                department: userProfile.department || '',
                level: userProfile.level || '',
                genotype: userProfile.genotype || '',
                mbti: userProfile.mbti || '',
                attraction_goal: userProfile.attraction_goal || '',
                interests: safeArray(userProfile.interests),
                intro_prompt: userProfile.intro_prompt || '',
                profile_photos: safeArray(userProfile.profile_photos)
            });
        }
    }, [userProfile]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handlePhotoUpload = async (e, index) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        addToast('Verifying photo with AI...', 'info');
        try {
            const { url, approved, reason, error } = await uploadProfilePhoto(file, currentUser.id, index);
            if (error || !approved) {
                throw new Error(reason || error || 'Photo failed validation');
            }

            const newPhotos = [...safeArray(formData.profile_photos)];
            newPhotos[index] = url;

            // Unconditionally sync avatar_url when photo 0 (MAIN) is modified
            const avatarUpdate = index === 0 ? { avatar_url: url } : {};

            setFormData(prev => ({
                ...prev,
                profile_photos: newPhotos,
                ...avatarUpdate
            }));

            if (typeof fetchProfile === 'function') {
                await fetchProfile(currentUser.id);
            }

            addToast(`Photo ${index + 1} verified & approved! ✓`, 'success');
        } catch (err) {
            console.error('Photo upload error:', err);
            addToast(err.message || 'Photo upload failed', 'error');
        } finally {
            setLoading(false);
            if (e.target) e.target.value = '';
        }
    };

    const removePhoto = (index) => {
        const newPhotos = [...safeArray(formData.profile_photos)];
        newPhotos[index] = null;
        const validPhotos = newPhotos.filter(Boolean);
        // If main photo 0 was removed, point avatar_url to next available photo or null
        const avatarUpdate = index === 0 ? { avatar_url: validPhotos[0] || null } : {};
        setFormData(prev => ({
            ...prev,
            profile_photos: newPhotos,
            ...avatarUpdate
        }));
    };

    const handleVoiceRecording = (blob) => {
        setVoiceBlob(blob);
        // If blob is null, user deleted the recording
        if (!blob) {
            setFormData(prev => ({ ...prev, voice_intro_url: '' }));
        }
    };

    const handleProfileCoach = async () => {
        if (aiCoachLoading) return;
        setAiCoachLoading(true);
        const { data, error } = await requestAiAssistant('profile_coach', {
            profileDraft: {
                full_name: formData.full_name,
                university: formData.university,
                department: formData.department,
                level: formData.level,
                bio: formData.bio,
                interests: formData.interests,
                intro_prompt: formData.intro_prompt,
                attraction_goal: formData.attraction_goal,
                photo_count: safeArray(formData.profile_photos).filter(Boolean).length,
                has_voice_intro: Boolean(formData.voice_intro_url || voiceBlob)
            }
        });

        if (error) {
            addToast('AI coach is unavailable right now.', 'warning');
        } else {
            setAiCoach(data);
        }
        setAiCoachLoading(false);
    };

    const handleVideoSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!canVideo) {
            setPaywallTrigger('video_upload');
            setPaywallOpen(true);
            return;
        }

        if (!file.type.startsWith('video/')) {
            addToast('Please select a valid video file.', 'error');
            return;
        }

        if (file.size > 25 * 1024 * 1024) {
            addToast('Video file size exceeds 25MB limit.', 'error');
            return;
        }

        const maxDuration = videoDurationLimit > 0 ? videoDurationLimit : 10;
        const tempUrl = URL.createObjectURL(file);
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
            URL.revokeObjectURL(tempUrl);
            if (video.duration > maxDuration + 0.5) {
                if (isUltra) {
                    addToast(`Video is ${Math.round(video.duration)}s. Maximum duration for Elite Ultra is ${maxDuration} seconds.`, 'error');
                } else {
                    addToast(`Video is ${Math.round(video.duration)}s. Maximum duration for Elite Premium is ${maxDuration} seconds. (Upgrade to Elite Ultra for 30s!)`, 'error');
                }
                return;
            }
            setVideoFile(file);
            setVideoPreviewUrl(URL.createObjectURL(file));
        };
        video.onerror = () => {
            URL.revokeObjectURL(tempUrl);
            addToast('Could not verify video duration.', 'error');
        };
        video.src = tempUrl;
        e.target.value = '';
    };

    const handleRemoveVideo = () => {
        if (videoPreviewUrl) {
            try { URL.revokeObjectURL(videoPreviewUrl); } catch (_) {}
        }
        setVideoFile(null);
        setVideoPreviewUrl(null);
        setFormData(prev => ({ ...prev, video_url: '' }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Basic validation
            if (!formData.full_name.trim()) {
                throw new Error('Full Name is required');
            }

            // Contact sharing safeguard (Elite Ultra VIP exclusive)
            if (!isUltra && formData.bio) {
                const bioCheck = detectOffPlatformContact(formData.bio);
                if (bioCheck.blocked) {
                    throw new Error('Contact sharing (phone numbers, WhatsApp, social handles) in bios is exclusive to Elite Ultra VIP (₦15,000/mo). Please remove contact details or upgrade to Ultra.');
                }
            }

            let finalVoiceUrl = formData.voice_intro_url;

            // Upload Voice Intro if new blob exists
            if (voiceBlob) {
                const { url, error } = await uploadVoiceIntro(voiceBlob, currentUser.id);
                if (error) throw new Error('Voice upload failed: ' + error);
                finalVoiceUrl = url;
            }

            let finalVideoUrl = formData.video_url;
            if (videoFile) {
                setUploadingVideo(true);
                const { url, error: vidErr } = await uploadProfileVideo(videoFile, currentUser.id);
                if (vidErr) throw new Error('Video upload failed: ' + vidErr);
                finalVideoUrl = url;
            }

            const cleanPhotos = safeArray(formData.profile_photos).filter(Boolean);
            const resolvedAvatarUrl = cleanPhotos[0] || formData.avatar_url || null;

            const profileData = {
                full_name: formData.full_name,
                age: formData.age ? parseInt(formData.age) : null,
                gender: formData.gender ? formData.gender.toLowerCase() : null,
                university: formData.university,
                bio: formData.bio,
                avatar_url: resolvedAvatarUrl,
                anthem: formData.anthem,
                location_status: formData.location_status,
                voice_intro_url: finalVoiceUrl,
                video_url: finalVideoUrl,
                faculty: formData.faculty,
                department: formData.department,
                level: formData.level,
                genotype: formData.genotype,
                mbti: formData.mbti,
                attraction_goal: formData.attraction_goal,
                interests: safeArray(formData.interests),
                intro_prompt: formData.intro_prompt,
                profile_photos: cleanPhotos,
                email: currentUser.email,
                photo_updated_at: new Date().toISOString(),
                updated_at: new Date()
            };

            const { error } = await upsertProfile(currentUser.id, profileData);

            if (error) throw new Error(error);

            // Invalidate local client caches so fresh photos reflect across all screens immediately
            clearAppCache({ userId: currentUser.id });
            clearMediaCache();
            registerProfilePhotoTimestamp(currentUser.id, profileData.photo_updated_at);
            window.dispatchEvent(new CustomEvent('cd:profile-photo-updated', {
                detail: { userId: currentUser.id, timestamp: profileData.photo_updated_at }
            }));

            await fetchProfile(currentUser.id);
            requestProfileAiReview('profile_update');
            addToast('Profile updated!', 'success');
            navigate('/profile');
        } catch (err) {
            console.error('Profile update failed:', err);
            addToast(err.message || 'Failed to update profile', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (authLoading) {
        return <LoadingSpinner fullScreen />;
    }

    return (
        <div className="edit-profile-page">
            <div className="edit-profile-container animated fadeIn">
                <header className="edit-profile-header">
                    <h1>Profile Settings</h1>
                    <p>Customize how you appear to others</p>
                </header>

                <form onSubmit={handleSubmit} className="edit-profile-form">
                    {/* PHOTO VERIFICATION SECTION */}
                    <div className="edit-verification-banner">
                        <div className="edit-verification-info">
                            <span className="edit-verification-icon">
                                {(userProfile?.photo_verified || userProfile?.is_verified) ? '🛡️' : '📸'}
                            </span>
                            <div>
                                <strong>{(userProfile?.photo_verified || userProfile?.is_verified) ? 'Photo Verified ✓' : 'Get Photo Verified'}</strong>
                                <p>
                                    {(userProfile?.photo_verified || userProfile?.is_verified)
                                        ? 'Your live selfie matches your photos. Badge active.'
                                        : 'Take a 5-second camera selfie scan to earn your green ✓ badge.'}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            className={`btn ${(userProfile?.photo_verified || userProfile?.is_verified) ? 'btn-secondary' : 'btn-primary'} edit-verify-btn`}
                            onClick={() => setShowFaceVerification(true)}
                        >
                            {(userProfile?.photo_verified || userProfile?.is_verified) ? '🔄 Re-verify' : '🛡️ Verify Face'}
                        </button>
                    </div>

                    {/* PHOTO GRID SECTION */}
                    <section className="form-section gallery-section">
                        <div className="gallery-header-row">
                            <div>
                                <h2 className="section-title">
                                    📸 My Gallery
                                    {isUltra ? (
                                        <span className="gallery-tier-badge ultra">👑✨ Elite Ultra VIP (6 Photos)</span>
                                    ) : isPremium ? (
                                        <span className="gallery-tier-badge premium">👑 Elite Premium (6 Photos)</span>
                                    ) : (
                                        <span className="gallery-tier-badge free">Freemium ({photoLimit} Photos)</span>
                                    )}
                                </h2>
                                <p className="section-subtitle">
                                    {isUltra ? (
                                        'All 6 HD photo slots unlocked with VIP Spotlight priority across campus.'
                                    ) : isPremium ? (
                                        'All 6 photo slots unlocked. Stand out across campus with your full gallery!'
                                    ) : (
                                        'Free accounts can add up to 4 photos. Upgrade to Elite to unlock all 6 photo slots!'
                                    )}
                                </p>
                            </div>
                            {!isPremium && (
                                <button
                                    type="button"
                                    className="btn-unlock-slots-pill"
                                    onClick={() => {
                                        setPaywallTrigger('photo_slots');
                                        setPaywallOpen(true);
                                    }}
                                >
                                    👑 Unlock 6 Photos
                                </button>
                            )}
                        </div>

                        <div className={`photo-grid-gallery ${isUltra ? 'ultra-glow' : ''}`}>
                            {[0, 1, 2, 3, 4, 5].map((idx) => {
                                const isSlotUnlocked = idx < photoLimit;
                                const photoUrl = safeArray(formData.profile_photos)[idx];

                                if (!isSlotUnlocked) {
                                    return (
                                        <div
                                            key={idx}
                                            className="photo-sq-slot locked"
                                            onClick={() => {
                                                setPaywallTrigger('photo_slots');
                                                setPaywallOpen(true);
                                            }}
                                            title="Upgrade to Elite to unlock photo slot"
                                        >
                                            <div className="locked-slot-content">
                                                <span className="locked-slot-icon">🔒</span>
                                                <span className="locked-slot-badge">👑 Elite</span>
                                                <span className="locked-slot-text">Slot {idx + 1}</span>
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <div key={idx} className={`photo-sq-slot ${photoUrl ? 'filled' : ''}`}>
                                        {photoUrl ? (
                                            <>
                                                <img src={photoUrl} alt={`Profile ${idx + 1}`} className="slot-img" />
                                                <button
                                                    type="button"
                                                    className="delete-sq-btn"
                                                    onClick={() => removePhoto(idx)}
                                                    aria-label={`Remove photo ${idx + 1}`}
                                                >
                                                    ×
                                                </button>
                                            </>
                                        ) : (
                                            <label className="slot-sq-empty">
                                                <span className="plus-icon">+</span>
                                                <input
                                                    type="file"
                                                    onChange={(e) => handlePhotoUpload(e, idx)}
                                                    accept="image/*"
                                                    hidden
                                                />
                                            </label>
                                        )}
                                        {idx === 0 && <div className="main-badge">MAIN</div>}
                                    </div>
                                );
                            })}
                        </div>
                        <p className="section-hint">The first photo is your main avatar used across the app.</p>
                    </section>

                    {/* VIDEO PROFILE SECTION */}
                    <section className="form-section video-profile-section">
                        <div className="video-section-header">
                            <div>
                                <h2 className="section-title">
                                    {isUltra ? '🎬 30s Extended Video Profile' : '🎥 10s Video Profile'}
                                </h2>
                                <p className="section-subtitle">
                                    {isUltra
                                        ? 'Showcase your full story and campus charisma with an extended 30-second video moment.'
                                        : 'A dynamic 10-second video moment highlighting your campus personality.'}
                                </p>
                            </div>
                            {isUltra ? (
                                <span className="premium-feature-tag ultra">👑✨ Elite Ultra VIP</span>
                            ) : isPremium ? (
                                <span className="premium-feature-tag premium">👑 Elite Premium</span>
                            ) : (
                                <span className="premium-feature-tag">👑 Elite Feature</span>
                            )}
                        </div>

                        {!canVideo ? (
                            <div
                                className="video-premium-locked-card"
                                onClick={() => {
                                    setPaywallTrigger('video_upload');
                                    setPaywallOpen(true);
                                }}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="locked-icon">🔒</div>
                                <div className="locked-info">
                                    <strong>Unlock Video Profile</strong>
                                    <p>Stand out to campus crushes with a live video introduction. Elite Premium unlocks 10s clips, and Elite Ultra unlocks extended 30s HD showcases!</p>
                                </div>
                                <button
                                    type="button"
                                    className="btn btn-primary btn-sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setPaywallTrigger('video_upload');
                                        setPaywallOpen(true);
                                    }}
                                >
                                    Upgrade 👑
                                </button>
                            </div>
                        ) : (
                            <div className="video-upload-container">
                                {(videoPreviewUrl || formData.video_url) ? (
                                    <div className="video-preview-wrapper">
                                        <div className="video-preview-badge-row">
                                            <span className="video-active-tier-pill">
                                                {isUltra ? '👑✨ 30s Ultra HD Video Active' : '👑 10s Elite Video Active'}
                                            </span>
                                        </div>
                                        <video
                                            src={videoPreviewUrl || formData.video_url}
                                            className="video-profile-preview"
                                            controls
                                            playsInline
                                            preload="metadata"
                                        />
                                        <div className="video-preview-actions">
                                            <button
                                                type="button"
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => videoInputRef.current?.click()}
                                                disabled={uploadingVideo}
                                            >
                                                🔄 Replace Video
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-danger btn-sm"
                                                onClick={handleRemoveVideo}
                                                disabled={uploadingVideo}
                                            >
                                                🗑️ Remove
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        className={`video-upload-dropzone ${isUltra ? 'ultra' : ''}`}
                                        onClick={() => videoInputRef.current?.click()}
                                    >
                                        <span className="dropzone-icon">{isUltra ? '🎬' : '📹'}</span>
                                        <strong>
                                            {isUltra ? 'Upload 30-Second Extended Video' : 'Upload 10-Second Video'}
                                        </strong>
                                        <p>
                                            {isUltra
                                                ? 'Max 30 seconds (MP4, MOV, WebM). Full extended HD campus showcase!'
                                                : 'Max 10 seconds (MP4, MOV, WebM). Show your campus vibe!'}
                                        </p>
                                        <button type="button" className="btn btn-secondary btn-sm">
                                            Choose Video
                                        </button>
                                    </div>
                                )}
                                <input
                                    ref={videoInputRef}
                                    type="file"
                                    accept="video/*"
                                    onChange={handleVideoSelect}
                                    hidden
                                />

                                {isPremium && !isUltra && (
                                    <div
                                        className="ultra-video-upsell"
                                        onClick={() => navigate('/premium?tier=ultra')}
                                    >
                                        <span>🚀 Want 30-second extended videos? <strong>Upgrade to Elite Ultra VIP →</strong></span>
                                    </div>
                                )}
                            </div>
                        )}
                    </section>

                    <section className="form-section ai-profile-coach-card">
                        <div className="ai-profile-coach-header">
                            <div>
                                <h2 className="section-title">AI Profile Coach</h2>
                                <p>Get quick suggestions for photos, bio, prompts, and first impression quality.</p>
                            </div>
                            <button
                                type="button"
                                className="modern-btn ai-coach-btn"
                                onClick={handleProfileCoach}
                                disabled={aiCoachLoading}
                            >
                                {aiCoachLoading ? 'Reviewing...' : 'Review'}
                            </button>
                        </div>

                        {aiCoach && (
                            <div className="ai-coach-result">
                                {aiCoach.summary && <p className="ai-coach-summary">{aiCoach.summary}</p>}
                                {aiCoach.bio_suggestion && (
                                    <div>
                                        <strong>Bio upgrade</strong>
                                        <p>{aiCoach.bio_suggestion}</p>
                                    </div>
                                )}
                                {aiCoach.priority_actions?.length > 0 && (
                                    <div>
                                        <strong>Next actions</strong>
                                        <ul>
                                            {aiCoach.priority_actions.slice(0, 3).map((item) => <li key={item}>{item}</li>)}
                                        </ul>
                                    </div>
                                )}
                                {aiCoach.photo_tips?.length > 0 && (
                                    <div>
                                        <strong>Photo tips</strong>
                                        <ul>
                                            {aiCoach.photo_tips.slice(0, 2).map((item) => <li key={item}>{item}</li>)}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </section>

                    {/* BASIC INFO SECTION */}
                    <section className="form-section">
                        <h2 className="section-title">Basic Information</h2>

                        <div className="form-row">
                            <div className="form-item">
                                <label>Full Name</label>
                                <input
                                    type="text"
                                    name="full_name"
                                    className="modern-input"
                                    value={formData.full_name}
                                    onChange={handleChange}
                                    placeholder="Your name"
                                />
                            </div>
                            <div className="form-item small">
                                <label>Age</label>
                                <input
                                    type="number"
                                    name="age"
                                    className="modern-input"
                                    value={formData.age}
                                    onChange={handleChange}
                                    min="18"
                                    placeholder="21"
                                />
                            </div>
                        </div>

                        <div className="form-item">
                            <label>Gender</label>
                            <select
                                name="gender"
                                className="modern-input"
                                value={formData.gender}
                                onChange={handleChange}
                            >
                                <option value="">Select Gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div className="form-item">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <label style={{ margin: 0 }}>Bio</label>
                                {isUltra ? (
                                    <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600 }}>
                                        👑 Ultra VIP (Contact Sharing Allowed)
                                    </span>
                                ) : (
                                    <span style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.45)' }}>
                                        Keep chats on College Date
                                    </span>
                                )}
                            </div>
                            <textarea
                                name="bio"
                                className={`modern-input modern-textarea ${bioContactCheck.blocked ? 'bio-has-contacts' : ''}`}
                                value={formData.bio}
                                onChange={handleChange}
                                placeholder="Tell your story..."
                            />
                            {!isUltra && bioContactCheck.blocked && (
                                <div className="bio-contact-warning-pill animate-fade-in" style={{
                                    marginTop: '8px',
                                    padding: '8px 12px',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.35)',
                                    borderRadius: '10px',
                                    fontSize: '0.8rem',
                                    color: '#f87171',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '10px',
                                    flexWrap: 'wrap'
                                }}>
                                    <span>⚠️ Phone numbers & social handles in bio require Elite Ultra VIP.</span>
                                    <button
                                        type="button"
                                        onClick={() => navigate('/premium?tier=ultra&selected=ultra_monthly')}
                                        style={{
                                            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                            border: 'none',
                                            borderRadius: '6px',
                                            color: '#fff',
                                            padding: '4px 10px',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        Unlock with Ultra (₦15k) 👑
                                    </button>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* STUDENT LIFE SECTION */}
                    <section className="form-section">
                        <h2 className="section-title">Student Life</h2>

                        <div className="form-item" ref={uniDropdownRef} style={{ position: 'relative' }}>
                            <label>University</label>
                            <input
                                type="text"
                                name="university"
                                className="modern-input"
                                value={formData.university}
                                onChange={(e) => {
                                    handleChange(e);
                                    setShowUniDropdown(true);
                                }}
                                onFocus={() => setShowUniDropdown(true)}
                                placeholder="Search African universities (e.g. UNILAG, Univ of Ghana, UCT...)"
                                autoComplete="off"
                            />
                            {showUniDropdown && filteredUnis.length > 0 && (
                                <div className="uni-dropdown" style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    background: 'rgba(22, 22, 28, 0.98)',
                                    backdropFilter: 'blur(12px)',
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    borderRadius: '12px',
                                    maxHeight: '220px',
                                    overflowY: 'auto',
                                    zIndex: 100,
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.6)'
                                }}>
                                    {filteredUnis.map(u => (
                                        <div
                                            key={u}
                                            className="uni-option"
                                            style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '0.9rem', color: '#fff' }}
                                            onMouseDown={() => {
                                                setFormData(prev => ({ ...prev, university: u }));
                                                setShowUniDropdown(false);
                                            }}
                                        >
                                            🎓 {u}
                                        </div>
                                    ))}
                                    {formData.university?.trim() && !filteredUnis.includes(formData.university.trim()) && (
                                        <div
                                            className="uni-option"
                                            style={{ padding: '0.75rem 1rem', cursor: 'pointer', color: 'var(--brand-teal, #2dd4bf)', fontSize: '0.9rem' }}
                                            onMouseDown={() => setShowUniDropdown(false)}
                                        >
                                            ✨ Use "{formData.university.trim()}"
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="form-row">
                            <div className="form-item">
                                <label>Faculty</label>
                                <input
                                    type="text"
                                    name="faculty"
                                    className="modern-input"
                                    value={formData.faculty}
                                    onChange={handleChange}
                                    placeholder="e.g. Science"
                                />
                            </div>
                            <div className="form-item">
                                <label>Level</label>
                                <select
                                    name="level"
                                    className="modern-input"
                                    value={formData.level}
                                    onChange={handleChange}
                                >
                                    <option value="">Select Level</option>
                                    <option value="100 Lvl">100 Lvl</option>
                                    <option value="200 Lvl">200 Lvl</option>
                                    <option value="300 Lvl">300 Lvl</option>
                                    <option value="400 Lvl">400 Lvl</option>
                                    <option value="500 Lvl">500 Lvl</option>
                                    <option value="Postgrad">Postgrad</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-item">
                                <label>Genotype</label>
                                <select
                                    name="genotype"
                                    className="modern-input"
                                    value={formData.genotype}
                                    onChange={handleChange}
                                >
                                    <option value="">Select</option>
                                    <option value="AA">AA</option>
                                    <option value="AS">AS</option>
                                    <option value="SS">SS</option>
                                </select>
                            </div>
                            <div className="form-item">
                                <label>MBTI</label>
                                <input
                                    type="text"
                                    name="mbti"
                                    className="modern-input"
                                    value={formData.mbti}
                                    onChange={handleChange}
                                    placeholder="INFJ"
                                    maxLength="4"
                                />
                            </div>
                        </div>
                    </section>

                    {/* VIBE CHECK SECTION */}
                    <section className="form-section vibe-accent">
                        <h2 className="section-title">✨ Vibe Check</h2>

                        <div className="form-item">
                            <label>My Anthem 🎵</label>
                            <input
                                type="text"
                                name="anthem"
                                className="modern-input"
                                value={formData.anthem}
                                onChange={handleChange}
                                placeholder="Favorite song..."
                            />
                        </div>

                        <div className="form-item">
                            <label>Current Status 📍</label>
                            <input
                                type="text"
                                name="location_status"
                                className="modern-input"
                                value={formData.location_status}
                                onChange={handleChange}
                                placeholder="What are you up to?"
                            />
                        </div>

                        <div className="form-item">
                            <VoiceRecorder
                                onRecordingComplete={handleVoiceRecording}
                                existingAudioUrl={formData.voice_intro_url}
                            />
                        </div>

                        <div className="form-item">
                            <label>Interests 🎨</label>
                            <div className="interests-flex">
                                {['Coding', 'Music', 'Sports', 'Art', 'Gaming', 'Travel', 'Food', 'Reading', 'Dancing', 'Tech', 'Fashion', 'Fitness'].map(interest => (
                                    <button
                                        key={interest}
                                        type="button"
                                        className={`vibe-chip ${safeArray(formData.interests).includes(interest) ? 'active' : ''}`}
                                        onClick={() => {
                                            const currentInterests = safeArray(formData.interests);
                                            const newInterests = currentInterests.includes(interest)
                                                ? currentInterests.filter(i => i !== interest)
                                                : [...currentInterests, interest];
                                            setFormData(prev => ({ ...prev, interests: newInterests }));
                                        }}
                                    >
                                        {interest}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </section>

                    <div className="form-sticky-actions">
                        <button
                            type="button"
                            className="modern-btn secondary"
                            onClick={() => navigate('/profile')}
                        >
                            Back
                        </button>
                        <button
                            type="submit"
                            className="modern-btn primary"
                            disabled={loading}
                        >
                            {loading ? <LoadingSpinner size="small" color="white" /> : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>

            <FaceVerificationModal
                isOpen={showFaceVerification}
                onClose={() => setShowFaceVerification(false)}
                onVerified={() => {
                    fetchProfile?.(currentUser?.id);
                    setShowFaceVerification(false);
                }}
            />

            {/* Contextual Premium Trial / Subscription Paywall Sheet */}
            <ContextualPaywallSheet
                isOpen={paywallOpen}
                onClose={() => setPaywallOpen(false)}
                triggerSource={paywallTrigger || 'video_upload'} // triggerSource="video_upload"
                onSuccess={() => {
                    if (currentUser?.id) fetchProfile?.(currentUser.id);
                }}
            />
        </div>
    );
}
