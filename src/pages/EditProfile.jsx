import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { uploadAvatar, upsertProfile, uploadVoiceIntro, uploadProfilePhoto } from '../services/profileService';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import VoiceRecorder from '../components/VoiceRecorder';
import { supabase } from '../lib/supabase';
import './EditProfile.css';

export default function EditProfile() {
    const { currentUser, userProfile, fetchProfile, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const { addToast } = useToast();
    const fileInputRef = useRef(null);

    const [loading, setLoading] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [voiceBlob, setVoiceBlob] = useState(null);
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
        faculty: '',
        department: '',
        level: '',
        genotype: '',
        mbti: '',
        attraction_goal: '',
        interests: [],
        intro_prompt: '',
        profile_photos: []
    });

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
                faculty: userProfile.faculty || '',
                department: userProfile.department || '',
                level: userProfile.level || '',
                genotype: userProfile.genotype || '',
                mbti: userProfile.mbti || '',
                attraction_goal: userProfile.attraction_goal || '',
                interests: userProfile.interests || [],
                intro_prompt: userProfile.intro_prompt || '',
                profile_photos: userProfile.profile_photos || []
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
        try {
            const { url, error } = await uploadProfilePhoto(file, currentUser.id, index);
            if (error) throw new Error(error);

            const newPhotos = [...formData.profile_photos];
            newPhotos[index] = url;

            // Auto-set first photo as avatar if avatar is missing
            const avatarUpdate = !formData.avatar_url && index === 0 ? { avatar_url: url } : {};

            setFormData(prev => ({
                ...prev,
                profile_photos: newPhotos,
                ...avatarUpdate
            }));

            addToast(`Photo ${index + 1} uploaded!`, 'success');
        } catch (err) {
            console.error(err);
            addToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const removePhoto = (index) => {
        const newPhotos = [...formData.profile_photos];
        newPhotos[index] = null;
        setFormData(prev => ({ ...prev, profile_photos: newPhotos }));
    };

    const handleVoiceRecording = (blob) => {
        setVoiceBlob(blob);
        // If blob is null, user deleted the recording
        if (!blob) {
            setFormData(prev => ({ ...prev, voice_intro_url: '' }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Basic validation
            if (!formData.full_name.trim()) {
                throw new Error('Full Name is required');
            }

            let finalVoiceUrl = formData.voice_intro_url;

            // Upload Voice Intro if new blob exists
            if (voiceBlob) {
                const { url, error } = await uploadVoiceIntro(voiceBlob, currentUser.id);
                if (error) throw new Error('Voice upload failed: ' + error);
                finalVoiceUrl = url;
            }

            const profileData = {
                full_name: formData.full_name,
                age: formData.age ? parseInt(formData.age) : null,
                gender: formData.gender ? formData.gender.toLowerCase() : null,
                university: formData.university,
                bio: formData.bio,
                avatar_url: formData.avatar_url,
                anthem: formData.anthem,
                location_status: formData.location_status,
                voice_intro_url: finalVoiceUrl,
                faculty: formData.faculty,
                department: formData.department,
                level: formData.level,
                genotype: formData.genotype,
                mbti: formData.mbti,
                attraction_goal: formData.attraction_goal,
                interests: formData.interests,
                intro_prompt: formData.intro_prompt,
                profile_photos: formData.profile_photos,
                email: currentUser.email,
                updated_at: new Date()
            };

            const { error } = await upsertProfile(currentUser.id, profileData);

            if (error) throw new Error(error);

            await fetchProfile(currentUser.id);

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
                    {/* PHOTO GRID SECTION */}
                    <section className="form-section">
                        <h2 className="section-title">My Gallery</h2>
                        <div className="photo-grid-2x2">
                            {[0, 1, 2, 3].map((idx) => (
                                <div key={idx} className={`photo-sq-slot ${formData.profile_photos[idx] ? 'filled' : ''}`}>
                                    {formData.profile_photos[idx] ? (
                                        <>
                                            <img src={formData.profile_photos[idx]} alt={`Profile ${idx + 1}`} className="slot-img" />
                                            <button
                                                type="button"
                                                className="delete-sq-btn"
                                                onClick={() => removePhoto(idx)}
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
                            ))}
                        </div>
                        <p className="section-hint">The first photo is your main avatar used across the app.</p>
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
                            <label>Bio</label>
                            <textarea
                                name="bio"
                                className="modern-input modern-textarea"
                                value={formData.bio}
                                onChange={handleChange}
                                placeholder="Tell your story..."
                            />
                        </div>
                    </section>

                    {/* STUDENT LIFE SECTION */}
                    <section className="form-section">
                        <h2 className="section-title">Student Life</h2>

                        <div className="form-item">
                            <label>University</label>
                            <input
                                type="text"
                                name="university"
                                className="modern-input"
                                value={formData.university}
                                onChange={handleChange}
                                placeholder="e.g. UNILAG"
                            />
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
                                        className={`vibe-chip ${formData.interests.includes(interest) ? 'active' : ''}`}
                                        onClick={() => {
                                            const newInterests = formData.interests.includes(interest)
                                                ? formData.interests.filter(i => i !== interest)
                                                : [...formData.interests, interest];
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
        </div>
    );
}
