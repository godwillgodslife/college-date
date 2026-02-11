'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import BottomNav from '@/components/BottomNav';

export default function ProfilePage() {
    const router = useRouter();
    const supabase = createClient();
    const fileInputRef = useRef(null);
    const [profile, setProfile] = useState(null);
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [showReport, setShowReport] = useState(false);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push('/auth/login'); return; }

            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            setProfile(data);
            setEditForm({
                full_name: data?.full_name || '',
                bio: data?.bio || '',
                phone: data?.phone || '',
                university: data?.university || '',
            });
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await supabase.from('profiles').update({
                ...editForm,
                updated_at: new Date().toISOString(),
            }).eq('id', profile.id);

            setProfile({ ...profile, ...editForm });
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
            }).eq('id', profile.id);

            setProfile({
                ...profile,
                photos: newPhotos,
                avatar_url: profile.avatar_url || urlData.publicUrl,
            });

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

    if (loading) {
        return (
            <div className="loading-screen">
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

                {/* Photos grid */}
                <h3 style={{ fontWeight: 600, marginBottom: 12 }}>Photos</h3>
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
