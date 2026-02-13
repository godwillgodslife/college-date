'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';

export default function SnapshotUpload({ onUploadComplete }) {
    const { user } = useAuth();
    const supabase = createClient();
    const [uploading, setUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [file, setFile] = useState(null);
    const [caption, setCaption] = useState('');
    const fileInputRef = useRef(null);

    const handleFileSelect = (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        if (selectedFile.size > 5 * 1024 * 1024) {
            alert('File too large (max 5MB)');
            return;
        }

        setFile(selectedFile);
        setPreviewUrl(URL.createObjectURL(selectedFile));
    };

    const handleUpload = async () => {
        if (!file || !user) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/${Date.now()}.${fileExt}`;

            // 1. Upload Image
            const { error: uploadError } = await supabase.storage
                .from('snapshots')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('snapshots')
                .getPublicUrl(fileName);

            // 3. Insert Record
            const { error: dbError } = await supabase
                .from('snapshots')
                .insert({
                    user_id: user.id,
                    media_url: publicUrl,
                    media_type: 'image',
                    caption: caption.trim() || null,
                    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
                });

            if (dbError) throw dbError;

            // cleanup
            setFile(null);
            setPreviewUrl(null);
            setCaption('');
            if (onUploadComplete) onUploadComplete();
            alert('Snapshot posted! 📸');

        } catch (error) {
            console.error('Snapshot upload error:', error);
            alert('Failed to post snapshot. (Make sure "snapshots" bucket exists)');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="snapshot-upload-container" style={{ padding: '16px', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '12px', color: 'var(--text-primary)' }}>
                Add to Story 📸
            </h3>

            {!previewUrl ? (
                <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                        height: '120px',
                        border: '2px dashed var(--border)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        background: 'var(--bg-secondary)',
                        transition: 'all 0.2s'
                    }}
                >
                    <span style={{ color: 'var(--text-muted)' }}>Tap to select photo</span>
                </div>
            ) : (
                <div style={{ position: 'relative' }}>
                    <div style={{
                        position: 'relative',
                        height: '300px',
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                        marginBottom: '12px'
                    }}>
                        <Image
                            src={previewUrl}
                            alt="Preview"
                            fill
                            style={{ objectFit: 'cover' }}
                        />
                        <button
                            onClick={() => { setFile(null); setPreviewUrl(null); }}
                            style={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                background: 'rgba(0,0,0,0.6)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '50%',
                                width: 32,
                                height: 32,
                                cursor: 'pointer'
                            }}
                        >
                            ✕
                        </button>
                    </div>

                    <input
                        type="text"
                        placeholder="Add a caption..."
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '10px',
                            background: 'var(--bg-input)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--text-primary)',
                            marginBottom: '12px'
                        }}
                    />

                    <button
                        onClick={handleUpload}
                        disabled={uploading}
                        className="btn btn-primary btn-full"
                    >
                        {uploading ? 'Posting...' : 'Share to Story'}
                    </button>
                </div>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
            />
        </div>
    );
}
