'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import ReferralDashboard from '@/components/ReferralDashboard';
import BottomNav from '@/components/BottomNav';

export default function ProfilePage() {
    const router = useRouter();
    const supabase = createClient();
    const { user, profile, refreshProfile, loading: authLoading } = useAuth();
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [showReport, setShowReport] = useState(false);

    useEffect(() => {
        if (!authLoading && user && profile) {
            setEditForm({
                full_name: profile.full_name || '',
                bio: profile.bio || '',
                phone: profile.phone || '',
                university: profile.university || '',
            });
            setLoading(false);
        }
    }, [authLoading, user, profile]);

    const loadProfile = async () => {
        // Redundant but keeping signature for now if other things call it
        await refreshProfile();
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await supabase.from('profiles').update({
                ...editForm,
                updated_at: new Date().toISOString(),
            }).eq('id', user.id);

            await refreshProfile();
            setEditing(false);
            setToast({ message: 'Profile updated! ✅', type: 'success' });
            setTimeout(() => setToast(null), 3000);
        } catch (err) {
            setToast({ message: 'Error saving', type: 'error' });
            setTimeout(() => setToast(null), 3000);
        } finally {
            setSaving(false);
        }
    };

    const handlePhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const fileName = `${profile.id}/${Date.now()}_${file.name}`;
            const { error: uploadError } = await supabase.storage
                .from('profile-photos')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from('profile-photos')
                .getPublicUrl(fileName);

            const newPhotos = [...(profile.photos || []), urlData.publicUrl];

            await supabase.from('profiles').update({
                photos: newPhotos,
                avatar_url: profile.avatar_url || urlData.publicUrl,
            }).eq('id', user.id);

            await refreshProfile();

            setToast({ message: 'Photo uploaded! 📸', type: 'success' });
            setTimeout(() => setToast(null), 3000);
        } catch (err) {
            console.error('Upload error:', err);
            setToast({ message: 'Upload failed', type: 'error' });
            setTimeout(() => setToast(null), 3000);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/');
    };

    if (authLoading || (loading && !profile)) {
        return (
            <div className="loading-screen" style={{
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)'
            }}>
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="page">
            <div className="container">
                <div className="page-header">
                    <h1 className="page-title">Profile</h1>
                    {!editing ? (
                        <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>
                            ✏️ Edit
                        </button>
                    ) : (
                        <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                            {saving ? 'Saving...' : '✅ Save'}
                        </button>
                    )}
                </div>

                <div className="profile-header">
                    <img
                        src={profile?.avatar_url || '/placeholder-avatar.png'}
                        alt={profile?.full_name}
                        className="profile-avatar-large"
                    />
                    {editing ? (
                        <input
                            type="text"
                            className="form-input"
                            value={editForm.full_name}
                            onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                            style={{ textAlign: 'center', maxWidth: 300, margin: '12px auto' }}
                        />
                    ) : (
                        <h2 className="profile-name">{profile?.full_name}, {profile?.age}</h2>
                    )}
                    <p className="profile-uni">🎓 {profile?.university}</p>

                    {editing ? (
                        <textarea
                            className="form-textarea"
                            value={editForm.bio}
                            onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                            placeholder="Write a short bio..."
                            maxLength={200}
                            style={{ marginTop: 12, maxWidth: 400, marginLeft: 'auto', marginRight: 'auto' }}
                        />
                    ) : (
                        profile?.bio && <p className="profile-bio">{profile.bio}</p>
                    )}

                    {profile?.gender === 'male' && (
                        <div style={{ marginTop: 16 }}>
                            <div className="free-swipes-badge">
                                ⚡ {profile.free_swipes_remaining} free swipes remaining
                            </div>
                        </div>
                    )}
                </div>

                {/* Referral & Rewards Section */}
                {profile && <ReferralDashboard profile={profile} onUpdate={refreshProfile} />}

                {/* Boost Section */}
                <div style={{ marginBottom: 24, padding: '16px', background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)', borderRadius: 'var(--radius-lg)', color: 'black', boxShadow: '0 4px 15px rgba(255, 215, 0, 0.3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>⚡ Boost Profile</h3>
                        <span style={{ fontWeight: 800, background: 'rgba(0,0,0,0.1)', padding: '2px 8px', borderRadius: '4px' }}>500 Coins</span>
                    </div>
                    <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', opacity: 0.9, fontWeight: 500 }}>
                        Get 10x more visibility for 1 hour!
                    </p>
                    <button
                        onClick={handleBoost}
                        className="btn"
                        style={{
                            width: '100%',
                            background: 'black',
                            color: 'white',
                            border: 'none',
                            fontWeight: 'bold'
                        }}
                    >
                        Activate Boost
                    </button>
                </div>

                {/* Photos grid */}
                <div className="profile-photos">
                    {(profile?.photos || []).map((url, i) => (
                        <img key={i} src={url} alt="" className="profile-photo" />
                    ))}
                    {(profile?.photos || []).length < 6 && (
                        <div className="profile-photo-add" onClick={() => fileInputRef.current?.click()}>
                            +
                        </div>
                    )}
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handlePhotoUpload}
                />

                {/* Phone */}
                {editing && (
                    <div className="form-group" style={{ marginTop: 20 }}>
                        <label className="form-label">Phone Number</label>
                        <input
                            type="tel"
                            className="form-input"
                            placeholder="+234 801 234 5678"
                            value={editForm.phone}
                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        />
                    </div>
                )}

                {/* Account Info */}
                <div className="card" style={{ marginTop: 24, marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Email</span>
                        <span style={{ fontSize: '0.9rem' }}>{profile?.email}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Gender</span>
                        <span style={{ fontSize: '0.9rem', textTransform: 'capitalize' }}>{profile?.gender}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Status</span>
                        <span className={`badge ${profile?.is_verified ? 'badge-success' : 'badge-warning'}`}>
                            {profile?.is_verified ? 'Verified' : 'Unverified'}
                        </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Joined</span>
                        <span style={{ fontSize: '0.9rem' }}>
                            {new Date(profile?.created_at).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' })}
                        </span>
                    </div>
                </div>

                <button className="btn btn-danger btn-full" onClick={handleLogout} style={{ marginTop: 8 }}>
                    🚪 Log Out
                </button>
            </div>

            {toast && (
                <div className={`toast toast-${toast.type}`}>
                    <span className="toast-message">{toast.message}</span>
                </div>
            )}

            <BottomNav gender={profile?.gender} />
        </div>
    );
}
