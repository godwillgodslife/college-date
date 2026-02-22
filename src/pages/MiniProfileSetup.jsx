import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { uploadProfilePhoto, upsertProfile } from '../services/profileService';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import { motion, AnimatePresence } from 'framer-motion';
import './MiniProfileSetup.css';

export default function MiniProfileSetup() {
    const { currentUser, userProfile, fetchProfile, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1); // 1: Bio & Interests, 2: Photos

    const [formData, setFormData] = useState({
        full_name: '',
        bio: '',
        interests: [],
        university: '',
        age: '',
        profile_photos: [null, null, null, null]
    });

    useEffect(() => {
        if (userProfile) {
            const photos = userProfile.profile_photos || [];
            const normalizedPhotos = [
                photos[0] || null,
                photos[1] || null,
                photos[2] || null,
                photos[3] || null
            ];

            setFormData(prev => {
                // Only sync from profile if the local field is empty to avoid overwriting active edits
                return {
                    ...prev,
                    full_name: prev.full_name || userProfile.full_name || '',
                    bio: prev.bio || userProfile.bio || '',
                    interests: prev.interests.length > 0 ? prev.interests : (userProfile.interests || []),
                    university: prev.university || userProfile.university || '',
                    age: prev.age || userProfile.age || '',
                    // Merge photos: prefer local formData if it has a photo, else take from profile
                    profile_photos: prev.profile_photos.map((p, i) => p || normalizedPhotos[i])
                };
            });
        }
    }, [userProfile]);

    const syncProfileField = async (field, value) => {
        if (!currentUser) return;
        try {
            const updates = { [field]: value, updated_at: new Date() };
            // For complex fields like profile_photos, we might need special handling
            // but for simple fields like bio, full_name, it's fine.
            await upsertProfile(currentUser.id, updates);
        } catch (err) {
            console.error(`Failed to sync ${field}:`, err);
        }
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleBlur = (field) => {
        syncProfileField(field, formData[field]);
    };

    const handleInterestToggle = (interest) => {
        setFormData(prev => {
            const interests = prev.interests.includes(interest)
                ? prev.interests.filter(i => i !== interest)
                : [...prev.interests, interest];
            syncProfileField('interests', interests);
            return { ...prev, interests };
        });
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

            setFormData(prev => ({
                ...prev,
                profile_photos: newPhotos
            }));

            // Real-time sync to indexed profile
            const updates = {
                profile_photos: newPhotos,
                email: currentUser.email,
                updated_at: new Date()
            };

            // Set first photo as main avatar automatically for discovery
            if (index === 0 || !userProfile?.avatar_url) {
                updates.avatar_url = url;
            }

            await upsertProfile(currentUser.id, updates);

            // Give DB a moment to breathe before re-fetching
            setTimeout(() => fetchProfile(currentUser.id), 500);

            addToast(`Photo ${index + 1} uploaded!`, 'success');
        } catch (err) {
            addToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const isStep1Complete = formData.full_name.trim() !== '' &&
        formData.bio.trim().length >= 10 &&
        formData.interests.length >= 3 &&
        formData.age !== '' &&
        formData.university !== '';

    const isStep2Complete = formData.profile_photos.filter(Boolean).length === 4;

    const handleSubmit = async () => {
        if (!isStep1Complete || !isStep2Complete) {
            addToast('Please complete all details and upload 4 photos!', 'error');
            return;
        }

        setLoading(true);
        try {
            const profileData = {
                full_name: formData.full_name,
                bio: formData.bio,
                interests: formData.interests,
                university: formData.university,
                age: parseInt(formData.age),
                profile_photos: formData.profile_photos,
                avatar_url: formData.profile_photos[0], // Set first photo as avatar
                email: currentUser.email,
                updated_at: new Date()
            };

            const { error } = await upsertProfile(currentUser.id, profileData);
            if (error) throw new Error(error);

            await fetchProfile(currentUser.id);
            addToast('Profile ready! Welcome to Discovery 💕', 'success');
            navigate('/discover');
        } catch (err) {
            addToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    if (authLoading) return <LoadingSpinner fullScreen />;

    const INTERESTS_OPTIONS = ['Coding', 'Music', 'Sports', 'Art', 'Gaming', 'Travel', 'Food', 'Reading', 'Dancing', 'Tech', 'Fashion', 'Fitness'];

    return (
        <div className="mini-setup-page">
            <div className="setup-container">
                <div className="setup-header">
                    <motion.h1
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="setup-title"
                    >
                        Finish Your Profile ✨
                    </motion.h1>
                    <p className="setup-subtitle">You're just a few steps away from meeting matches.</p>
                </div>

                <div className="setup-progress-container">
                    <div className="setup-progress-bar">
                        <motion.div
                            className="progress-fill"
                            initial={{ width: '0%' }}
                            animate={{ width: step === 1 ? '50%' : '100%' }}
                        />
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {step === 1 ? (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="setup-step"
                        >
                            <h2 className="step-title">The Basics</h2>

                            <div className="input-field-group">
                                <label className={formData.full_name ? 'completed' : ''}>Full Name</label>
                                <input
                                    type="text"
                                    placeholder="What should people call you?"
                                    value={formData.full_name}
                                    onChange={(e) => handleChange('full_name', e.target.value)}
                                    onBlur={() => handleBlur('full_name')}
                                    className={formData.full_name ? 'input-completed' : ''}
                                />
                            </div>

                            <div className="row-group">
                                <div className="input-field-group">
                                    <label className={formData.age ? 'completed' : ''}>Age</label>
                                    <input
                                        type="number"
                                        placeholder="Age"
                                        value={formData.age}
                                        onChange={(e) => handleChange('age', e.target.value)}
                                        onBlur={() => handleBlur('age')}
                                        className={formData.age ? 'input-completed' : ''}
                                    />
                                </div>
                                <div className="input-field-group">
                                    <label className={formData.university ? 'completed' : ''}>University</label>
                                    <input
                                        type="text"
                                        placeholder="University"
                                        value={formData.university}
                                        onChange={(e) => handleChange('university', e.target.value)}
                                        onBlur={() => handleBlur('university')}
                                        className={formData.university ? 'input-completed' : ''}
                                    />
                                </div>
                            </div>

                            <div className="input-field-group">
                                <label className={formData.bio.length >= 10 ? 'completed' : ''}>Bio (Min 10 chars)</label>
                                <textarea
                                    placeholder="Tell the world about yourself..."
                                    value={formData.bio}
                                    onChange={(e) => handleChange('bio', e.target.value)}
                                    onBlur={() => handleBlur('bio')}
                                    className={formData.bio.length >= 10 ? 'input-completed' : ''}
                                />
                            </div>

                            <div className="interests-section">
                                <label className={formData.interests.length >= 3 ? 'completed' : ''}>Interests (Select 3+)</label>
                                <div className="setup-interests-grid">
                                    {INTERESTS_OPTIONS.map(interest => (
                                        <button
                                            key={interest}
                                            className={`setup-interest-chip ${formData.interests.includes(interest) ? 'active' : ''}`}
                                            onClick={() => handleInterestToggle(interest)}
                                        >
                                            {interest}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                className="setup-next-btn"
                                onClick={() => setStep(2)}
                                disabled={!isStep1Complete}
                            >
                                Next Step ➔
                            </button>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="setup-step"
                        >
                            <h2 className="step-title">Add 4 Photos</h2>
                            <p className="step-desc">Profiles with 4+ photos get 80% more matches!</p>

                            <div className="setup-photo-grid">
                                {[0, 1, 2, 3].map((idx) => (
                                    <div key={idx} className={`setup-photo-slot ${formData.profile_photos[idx] ? 'filled' : ''}`}>
                                        {formData.profile_photos[idx] ? (
                                            <img src={formData.profile_photos[idx]} alt="Profile" />
                                        ) : (
                                            <label className="photo-upload-label">
                                                <span className="plus-icon">+</span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => handlePhotoUpload(e, idx)}
                                                    hidden
                                                    disabled={loading}
                                                />
                                            </label>
                                        )}
                                        {loading && !formData.profile_photos[idx] && (
                                            <div className="photo-loading-overlay">
                                                <div className="mini-spinner"></div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="setup-actions">
                                <button className="setup-back-btn" onClick={() => setStep(1)}>Back</button>
                                <button
                                    className="setup-finish-btn"
                                    disabled={!isStep2Complete || loading}
                                    onClick={handleSubmit}
                                >
                                    {loading ? 'Saving...' : 'Finish Setup! 🚀'}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
