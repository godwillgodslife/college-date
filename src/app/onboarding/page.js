'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';

const NIGERIAN_UNIVERSITIES = [
    'University of Lagos (UNILAG)',
    'University of Ibadan (UI)',
    'Obafemi Awolowo University (OAU)',
    'University of Nigeria, Nsukka (UNN)',
    'Ahmadu Bello University (ABU)',
    'University of Benin (UNIBEN)',
    'University of Ilorin (UNILORIN)',
    'Federal University of Technology, Akure (FUTA)',
    'Lagos State University (LASU)',
    'Covenant University',
    'Babcock University',
    'University of Port Harcourt (UNIPORT)',
    'Federal University of Agriculture, Abeokuta (FUNAAB)',
    'Nnamdi Azikiwe University (UNIZIK)',
    'Rivers State University',
    'Ekiti State University',
    'Osun State University',
    'Ladoke Akintola University of Technology (LAUTECH)',
    'Yaba College of Technology (YABATECH)',
    'Federal Polytechnic, Ile-Oluji',
    'Other',
];

export default function OnboardingPage() {
    const router = useRouter();
    const supabase = createClient();
    const { user, profile, refreshProfile, loading: authLoading } = useAuth();

    const fileInputRef = useRef(null);
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);

    // Form fields
    const [bio, setBio] = useState('');
    const [phone, setPhone] = useState('');
    const [photos, setPhotos] = useState([]);
    const [previewUrls, setPreviewUrls] = useState([]);

    // Profile fields
    const [fullName, setFullName] = useState('');
    const [gender, setGender] = useState('');
    const [age, setAge] = useState('');
    const [university, setUniversity] = useState('');

    useEffect(() => {
        if (!authLoading && user) {
            initializeForm();
        }
    }, [user, authLoading, profile]);

    const initializeForm = () => {
        if (profile) {
            setFullName(profile.full_name || user.user_metadata?.full_name || '');
            setBio(profile.bio || '');
            setPhone(profile.phone || '');
            if (profile.avatar_url) setPreviewUrls([profile.avatar_url]);

            setGender(profile.gender || '');
            setAge(profile.age || '');
            setUniversity(profile.university || '');

            // Calculate step based on data completeness
            if (!profile.gender || !profile.age || !profile.university) {
                setStep(0);
            } else if (!profile.photos || profile.photos.length === 0) {
                setStep(1);
            } else {
                setStep(2);
            }
        } else {
            // Basic fallback using user metadata if profile row missing
            setFullName(user.user_metadata?.full_name || '');
            setStep(0);
        }
    };

    const handlePhotoUpload = (e) => {
        const files = Array.from(e.target.files);
        if (photos.length + files.length > 6) {
            alert('Maximum 6 photos allowed');
            return;
        }
        setPhotos([...photos, ...files]);
        const urls = files.map((f) => URL.createObjectURL(f));
        setPreviewUrls([...previewUrls, ...urls]);
    };

    const removePhoto = (idx) => {
        setPhotos(photos.filter((_, i) => i !== idx));
        setPreviewUrls(previewUrls.filter((_, i) => i !== idx));
    };

    const handleGenderSelect = (g) => setGender(g);

    const handleNextStep = async () => {
        if (step === 0) {
            if (!gender || !age || !university || !fullName) {
                alert('Please fill in all fields');
                return;
            }
            if (parseInt(age) < 18) {
                alert('You must be 18+');
                return;
            }

            // Save basic info immediately
            setLoading(true);
            const updates = {
                id: user.id,
                email: user.email,
                full_name: fullName,
                gender,
                age: parseInt(age),
                university,
                updated_at: new Date().toISOString(),
                free_swipes_remaining: gender === 'male' ? 3 : 0,
            };

            console.log('Attempting to save profile:', updates);

            // Upsert profile
            const { error } = await supabase.from('profiles').upsert(updates);

            if (error) {
                alert('Error saving profile: ' + error.message);
                setLoading(false);
                return;
            }

            console.log('Profile saved successfully');

            // Create wallet if female
            if (gender === 'female') {
                const { data: wallet } = await supabase.from('wallets').select('id').eq('user_id', user.id).single();
                if (!wallet) {
                    await supabase.from('wallets').insert({ user_id: user.id });
                }
            }

            // Refresh global context so it knows we have partial data
            await refreshProfile();

            setLoading(false);
            setStep(1);
        } else if (step === 1) {
            setStep(2);
        }
    };

    const handleComplete = async () => {
        setLoading(true);
        try {
            // Upload photos
            const photoUrls = [];

            // Keep existing avatar if it's a URL string in previewUrls
            const existingPhotos = previewUrls.filter(url => !url.startsWith('blob:'));
            photoUrls.push(...existingPhotos);

            for (const photo of photos) {
                const fileName = `${user.id}/${Date.now()}_${photo.name}`;
                const { error: uploadError } = await supabase.storage
                    .from('profile-photos')
                    .upload(fileName, photo);

                if (!uploadError) {
                    const { data: urlData } = supabase.storage
                        .from('profile-photos')
                        .getPublicUrl(fileName);
                    photoUrls.push(urlData.publicUrl);
                }
            }

            // Final Update
            const { error } = await supabase.from('profiles').update({
                bio,
                phone,
                photos: photoUrls,
                avatar_url: photoUrls[0] || '',
                updated_at: new Date().toISOString(),
            }).eq('id', user.id);

            if (error) throw error;

            console.log('Profile finalized. Redirecting to discover...');
            // Critical: Refresh global context before redirecting
            await refreshProfile();

            router.push('/discover');
        } catch (err) {
            console.error('Onboarding error:', err);
            alert('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (authLoading || !user) return <div className="loading-screen"><div className="spinner"></div></div>;

    return (
        <div className="onboarding-page">
            <div style={{ width: '100%', maxWidth: '420px' }}>
                <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                    <span className="onboarding-step">
                        {step === 0 && 'Step 1 of 3'}
                        {step === 1 && 'Step 2 of 3'}
                        {step === 2 && 'Step 3 of 3'}
                    </span>
                </div>

                <div className="onboarding-progress" style={{ justifyContent: 'center' }}>
                    <div className={`onboarding-dot ${step >= 0 ? 'active' : ''}`} />
                    <div className={`onboarding-dot ${step >= 1 ? 'active' : ''}`} />
                    <div className={`onboarding-dot ${step >= 2 ? 'active' : ''}`} />
                </div>

                <h2 style={{
                    textAlign: 'center',
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    marginBottom: '8px',
                }}>
                    {step === 0 && '👤 Basic Info'}
                    {step === 1 && '📸 Add Your Photos'}
                    {step === 2 && '✍️ Tell Us About You'}
                </h2>
                <p style={{
                    textAlign: 'center',
                    color: 'var(--text-secondary)',
                    marginBottom: '32px',
                    fontSize: '0.9rem',
                }}>
                    {step === 0 && 'Tell us a bit about yourself to get started.'}
                    {step === 1 && 'Add up to 6 photos. Your first photo will be your main profile pic.'}
                    {step === 2 && 'A short bio helps others know you better.'}
                </p>

                {step === 0 && (
                    <div>
                        <div className="form-group">
                            <label className="form-label">Full Name</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="YOUR NAME"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">I am a...</label>
                            <div className="gender-select">
                                <div
                                    className={`gender-option ${gender === 'male' ? 'active' : ''}`}
                                    onClick={() => handleGenderSelect('male')}
                                >
                                    <div className="gender-icon">👨</div>
                                    <div>Male</div>
                                </div>
                                <div
                                    className={`gender-option ${gender === 'female' ? 'active' : ''}`}
                                    onClick={() => handleGenderSelect('female')}
                                >
                                    <div className="gender-icon">👩</div>
                                    <div>Female</div>
                                </div>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Age</label>
                            <input
                                type="number"
                                className="form-input"
                                placeholder="Must be 18+"
                                min="18"
                                max="35"
                                value={age}
                                onChange={(e) => setAge(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">University</label>
                            <select
                                className="form-select"
                                value={university}
                                onChange={(e) => setUniversity(e.target.value)}
                            >
                                <option value="">Select your university</option>
                                {NIGERIAN_UNIVERSITIES.map((uni) => (
                                    <option key={uni} value={uni}>{uni}</option>
                                ))}
                            </select>
                        </div>

                        <button
                            className="btn btn-primary btn-full btn-lg"
                            onClick={handleNextStep}
                            disabled={loading}
                        >
                            Next →
                        </button>
                    </div>
                )}

                {step === 1 && (
                    <div>
                        <div className="profile-photos" style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '12px',
                            marginBottom: '24px'
                        }}>
                            {previewUrls.map((url, i) => (
                                <div key={i} className="upload-preview-frame">
                                    <img src={url} alt="" className="upload-preview-img" />
                                    <button
                                        onClick={() => removePhoto(i)}
                                        style={{
                                            position: 'absolute',
                                            top: 6,
                                            right: 6,
                                            background: 'rgba(0,0,0,0.6)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '50%',
                                            width: 28,
                                            height: 28,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            backdropFilter: 'blur(4px)',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--error)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.6)'}
                                    >✕</button>
                                    {i === 0 && (
                                        <div style={{
                                            position: 'absolute',
                                            bottom: 0,
                                            left: 0,
                                            right: 0,
                                            background: 'rgba(0,0,0,0.6)',
                                            color: 'white',
                                            fontSize: '0.7rem',
                                            padding: '4px',
                                            textAlign: 'center',
                                            backdropFilter: 'blur(4px)'
                                        }}>
                                            Main Photo
                                        </div>
                                    )}
                                </div>
                            ))}
                            {photos.length < 6 && (
                                <div
                                    className="profile-photo-add"
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{
                                        aspectRatio: '3/4',
                                        border: '2px dashed var(--border-light)',
                                        borderRadius: 'var(--radius-md)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        background: 'var(--bg-card)',
                                        transition: 'all 0.2s',
                                        color: 'var(--primary)'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = 'var(--primary)';
                                        e.currentTarget.style.background = 'var(--bg-card-hover)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = 'var(--border-light)';
                                        e.currentTarget.style.background = 'var(--bg-card)';
                                    }}
                                >
                                    <span style={{ fontSize: '2rem' }}>+</span>
                                </div>
                            )}
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            style={{ display: 'none' }}
                            onChange={handlePhotoUpload}
                        />
                        <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
                            <button
                                className="btn btn-secondary btn-full"
                                onClick={handleNextStep}
                            >
                                Skip for now
                            </button>
                            <button
                                className="btn btn-primary btn-full"
                                onClick={handleNextStep}
                                disabled={photos.length === 0}
                            >
                                Next →
                            </button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div>
                        <div className="form-group">
                            <label className="form-label">Short Bio</label>
                            <textarea
                                className="form-textarea"
                                placeholder="e.g. 300L Computer Science @ UNILAG. Love afrobeats, football, and good vibes 💫"
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                maxLength={200}
                            />
                            <div style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 4 }}>
                                {bio.length}/200
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Phone Number (Optional)</label>
                            <input
                                type="tel"
                                className="form-input"
                                placeholder="+234 801 234 5678"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                            />
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 4 }}>
                                Only revealed to matches after a swipe
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
                            <button className="btn btn-secondary btn-full" onClick={() => setStep(1)}>
                                ← Back
                            </button>
                            <button
                                className="btn btn-primary btn-full"
                                onClick={handleComplete}
                                disabled={loading}
                            >
                                {loading ? 'Saving...' : '🎉 Complete'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
