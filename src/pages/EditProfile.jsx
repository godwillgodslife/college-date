import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { uploadAvatar, upsertProfile, uploadVoiceIntro } from '../services/profileService';
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
        attraction_goal: ''
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
                attraction_goal: userProfile.attraction_goal || ''
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

    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadingAvatar(true);
        try {
            const { url, error } = await uploadAvatar(file, currentUser.id);
            if (error) throw new Error(error);

            setFormData(prev => ({ ...prev, avatar_url: url }));
            addToast('Avatar uploaded! Click Save to apply.', 'success');
        } catch (err) {
            console.error(err);
            addToast(err.message, 'error');
        } finally {
            setUploadingAvatar(false);
        }
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
            <div className="edit-profile-card animated fadeIn">
                <div className="edit-profile-header">
                    <h1>Edit Profile</h1>
                    <p>Update your personal information</p>
                </div>

                <div className="avatar-upload-section">
                    <div className="avatar-preview-container" onClick={handleAvatarClick}>
                        {uploadingAvatar ? (
                            <LoadingSpinner size="small" />
                        ) : formData.avatar_url ? (
                            <img src={formData.avatar_url} alt="Avatar Preview" className="avatar-preview" />
                        ) : (
                            <div className="avatar-placeholder-large">
                                {formData.full_name ? formData.full_name.charAt(0).toUpperCase() : 'U'}
                            </div>
                        )}
                        <div className="avatar-overlay">
                            <span>📷 Change</span>
                        </div>
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleAvatarChange}
                        accept="image/*"
                        hidden
                    />
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="full_name">Full Name</label>
                        <input
                            type="text"
                            id="full_name"
                            name="full_name"
                            className="form-control"
                            value={formData.full_name}
                            onChange={handleChange}
                            placeholder="e.g. John Doe"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="age">Age</label>
                        <input
                            type="number"
                            id="age"
                            name="age"
                            className="form-control"
                            value={formData.age}
                            onChange={handleChange}
                            min="18"
                            max="100"
                            placeholder="e.g. 21"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="gender">Gender</label>
                        <select
                            id="gender"
                            name="gender"
                            className="form-control"
                            value={formData.gender}
                            onChange={handleChange}
                        >
                            <option value="">Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="university">University</label>
                        <input
                            type="text"
                            id="university"
                            name="university"
                            className="form-control"
                            value={formData.university}
                            onChange={handleChange}
                            placeholder="e.g. UNILAG"
                        />
                    </div>

                    {/* Student Details Section */}
                    <div className="form-group">
                        <label htmlFor="faculty">Faculty</label>
                        <input
                            type="text"
                            id="faculty"
                            name="faculty"
                            className="form-control"
                            value={formData.faculty}
                            onChange={handleChange}
                            placeholder="e.g. Science"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="department">Department</label>
                        <input
                            type="text"
                            id="department"
                            name="department"
                            className="form-control"
                            value={formData.department}
                            onChange={handleChange}
                            placeholder="e.g. Computer Science"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="level">Level</label>
                        <select
                            id="level"
                            name="level"
                            className="form-control"
                            value={formData.level}
                            onChange={handleChange}
                        >
                            <option value="">Select Level</option>
                            <option value="100 Lvl">100 Lvl</option>
                            <option value="200 Lvl">200 Lvl</option>
                            <option value="300 Lvl">300 Lvl</option>
                            <option value="400 Lvl">400 Lvl</option>
                            <option value="500 Lvl">500 Lvl</option>
                            <option value="600+ Lvl">600+ Lvl</option>
                            <option value="Postgrad">Postgrad</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="genotype">Genotype</label>
                        <select
                            id="genotype"
                            name="genotype"
                            className="form-control"
                            value={formData.genotype}
                            onChange={handleChange}
                        >
                            <option value="">Select Genotype</option>
                            <option value="AA">AA</option>
                            <option value="AS">AS</option>
                            <option value="SS">SS</option>
                            <option value="AC">AC</option>
                            <option value="SC">SC</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="mbti">MBTI Personality</label>
                        <input
                            type="text"
                            id="mbti"
                            name="mbti"
                            className="form-control"
                            value={formData.mbti}
                            onChange={handleChange}
                            placeholder="e.g. INFJ"
                            maxLength="4"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="attraction_goal">What are you looking for?</label>
                        <select
                            id="attraction_goal"
                            name="attraction_goal"
                            className="form-control"
                            value={formData.attraction_goal}
                            onChange={handleChange}
                        >
                            <option value="">Select Goal</option>
                            <option value="Serious Relationship">Serious Dating</option>
                            <option value="Study Buddy">Study Buddy</option>
                            <option value="Just Vibes">Just Vibes</option>
                            <option value="Networking">Networking</option>
                        </select>
                    </div>

                    {/* NEW: Vibe Check Section */}
                    <div className="vibe-check-section mb-6 border-t border-b border-gray-200 py-4">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">✨ Vibe Check</h3>

                        <div className="form-group">
                            <label htmlFor="anthem">My Anthem 🎵</label>
                            <input
                                type="text"
                                id="anthem"
                                name="anthem"
                                className="form-control"
                                value={formData.anthem}
                                onChange={handleChange}
                                placeholder="e.g. Burna Boy - Last Last"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="location_status">Current Status 📍</label>
                            <input
                                type="text"
                                id="location_status"
                                name="location_status"
                                className="form-control"
                                value={formData.location_status}
                                onChange={handleChange}
                                placeholder="e.g. At the library, Chilling at Mariere..."
                            />
                        </div>

                        <div className="form-group">
                            <VoiceRecorder
                                onRecordingComplete={handleVoiceRecording}
                                existingAudioUrl={formData.voice_intro_url}
                            />
                        </div>
                    </div>


                    <div className="form-group">
                        <label htmlFor="bio">Bio</label>
                        <textarea
                            id="bio"
                            name="bio"
                            className="form-control"
                            value={formData.bio}
                            onChange={handleChange}
                            placeholder="Tell people about yourself..."
                        />
                    </div>

                    <div className="form-actions">
                        <button
                            type="button"
                            className="btn btn-cancel"
                            onClick={() => navigate('/profile')}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                            style={{ flex: 1 }}
                        >
                            {loading ? <LoadingSpinner size="small" color="white" /> : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
