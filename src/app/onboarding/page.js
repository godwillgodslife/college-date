'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function OnboardingPage() {
    const router = useRouter();
    const supabase = createClient();
    const fileInputRef = useRef(null);
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [bio, setBio] = useState('');
    const [phone, setPhone] = useState('');
    const [photos, setPhotos] = useState([]);
    const [previewUrls, setPreviewUrls] = useState([]);

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

    const handleComplete = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/auth/login');
                return;
            }

            // Upload photos
            const photoUrls = [];
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

            // Update profile
            await supabase.from('profiles').update({
                bio,
                phone,
                photos: photoUrls,
                avatar_url: photoUrls[0] || '',
                updated_at: new Date().toISOString(),
            }).eq('id', user.id);

            router.push('/discover');
        } catch (err) {
            console.error('Onboarding error:', err);
            alert('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="onboarding-page">
            <div style={{ width: '100%', maxWidth: '420px' }}>
                <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                    <span className="onboarding-step">Step {step} of 2</span>
                </div>

                <div className="onboarding-progress" style={{ justifyContent: 'center' }}>
                    <div className={`onboarding-dot ${step >= 1 ? 'active' : ''}`} />
                    <div className={`onboarding-dot ${step >= 2 ? 'active' : ''}`} />
                </div>

                <h2 style={{
                    textAlign: 'center',
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    marginBottom: '8px',
                }}>
                    {step === 1 ? '📸 Add Your Photos' : '✍️ Tell Us About You'}
                </h2>
                <p style={{
                    textAlign: 'center',
                    color: 'var(--text-secondary)',
                    marginBottom: '32px',
                    fontSize: '0.9rem',
                }}>
                    {step === 1
                        ? 'Add up to 6 photos. Your first photo will be your main profile pic.'
                        : 'A short bio helps others know you better.'}
                </p>

                {step === 1 && (
                    <div>
                        <div className="profile-photos">
                            {previewUrls.map((url, i) => (
                                <div key={i} style={{ position: 'relative' }}>
                                    <img src={url} alt="" className="profile-photo" />
                                    <button
                                        onClick={() => removePhoto(i)}
                                        style={{
                                            position: 'absolute',
                                            top: 4,
                                            right: 4,
                                            background: 'var(--error)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '50%',
                                            width: 24,
                                            height: 24,
                                            fontSize: '0.8rem',
                                            cursor: 'pointer',
                                        }}
                                    >✕</button>
                                </div>
                            ))}
                            {photos.length < 6 && (
                                <div className="profile-photo-add" onClick={() => fileInputRef.current?.click()}>
                                    +
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
                                onClick={() => setStep(2)}
                            >
                                Skip for now
                            </button>
                            <button
                                className="btn btn-primary btn-full"
                                onClick={() => setStep(2)}
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
