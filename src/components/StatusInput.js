'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';

export default function StatusInput() {
    const { user, refreshProfile } = useAuth();
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const fileInputRef = useRef(null);
    const supabase = createClient();

    const handleFileSelect = (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;
        setFile(selectedFile);
        setPreviewUrl(URL.createObjectURL(selectedFile));
        setIsExpanded(true);
    };

    const handleUpdateStatus = async (e) => {
        e.preventDefault();
        if (!status.trim() && !file) return;

        setLoading(true);
        try {
            if (file) {
                // Image Status (5h Expiry)
                const fileExt = file.name.split('.').pop();
                const fileName = `${user.id}/${Date.now()}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('snapshots')
                    .upload(fileName, file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('snapshots')
                    .getPublicUrl(fileName);

                const { error: dbError } = await supabase
                    .from('snapshots')
                    .insert({
                        user_id: user.id,
                        media_url: publicUrl,
                        media_type: 'image',
                        caption: status.trim() || null,
                        expires_at: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString() // 5 hours
                    });

                if (dbError) throw dbError;
            } else {
                // Text Status (Updated on Profile, typically 24h filter in stories)
                const { error } = await supabase
                    .from('profiles')
                    .update({
                        status_text: status,
                        status_updated_at: new Date().toISOString()
                    })
                    .eq('id', user.id);

                if (error) throw error;
            }

            // Success cleanup
            setStatus('');
            setFile(null);
            setPreviewUrl(null);
            setIsExpanded(false);
            await refreshProfile();
        } catch (err) {
            console.error('Error updating status:', err);
            alert('Could not update status.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            background: 'var(--bg-card)',
            padding: '16px',
            borderRadius: 'var(--radius-lg)',
            marginBottom: '20px',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)'
        }}>
            {!isExpanded ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div
                        onClick={() => setIsExpanded(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            cursor: 'pointer',
                            color: 'var(--text-secondary)',
                            flex: 1
                        }}
                    >
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'var(--bg-elevated)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.2rem'
                        }}>
                            ✨
                        </div>
                        <span>Share your vibe today...</span>
                    </div>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            background: 'var(--bg-elevated)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '40px',
                            height: '40px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.2rem'
                        }}
                    >
                        📸
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleFileSelect}
                    />
                </div>
            ) : (
                <form onSubmit={handleUpdateStatus}>
                    {previewUrl && (
                        <div style={{
                            position: 'relative',
                            height: '150px',
                            borderRadius: 'var(--radius-md)',
                            overflow: 'hidden',
                            marginBottom: '12px',
                            border: '1px solid var(--border)'
                        }}>
                            <Image src={previewUrl} alt="Preview" fill style={{ objectFit: 'cover' }} />
                            <button
                                type="button"
                                onClick={() => { setFile(null); setPreviewUrl(null); }}
                                style={{
                                    position: 'absolute',
                                    top: 8,
                                    right: 8,
                                    background: 'rgba(0,0,0,0.6)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: 24,
                                    height: 24,
                                    cursor: 'pointer'
                                }}
                            >✕</button>
                        </div>
                    )}
                    <input
                        type="text"
                        placeholder={file ? "Add a caption..." : "What's happening? (e.g. Library grind 📚)"}
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        maxLength={60}
                        style={{
                            width: '100%',
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border-light)',
                            borderRadius: 'var(--radius-md)',
                            padding: '12px',
                            color: 'var(--text-primary)',
                            fontSize: '1rem',
                            marginBottom: '12px',
                            outline: 'none'
                        }}
                        autoFocus
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button
                            type="button"
                            onClick={() => { setIsExpanded(false); setFile(null); setPreviewUrl(null); }}
                            style={{
                                background: 'transparent',
                                color: 'var(--text-muted)',
                                border: 'none',
                                padding: '8px 16px',
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || (!status.trim() && !file)}
                            className="btn btn-primary"
                            style={{
                                padding: '8px 24px',
                                borderRadius: 'var(--radius-full)',
                                fontSize: '0.9rem'
                            }}
                        >
                            {loading ? 'Posting...' : 'Post'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}
