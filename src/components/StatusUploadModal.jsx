import React, { useState, useRef } from 'react';
import { saveLocalStatus, getDailyStatusCount } from '../services/localStatusService';
import { uploadStatusMedia, createStatus, notifyFriendsOfNewStatus } from '../services/statusService';
import { triggerLightHaptic, triggerSuccessHaptic } from '../utils/haptics';
import { useToast } from './Toast';
import './StatusUploadModal.css';

export default function StatusUploadModal({ isOpen, onClose, userId, userProfile, onStatusAdded }) {
    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [mediaType, setMediaType] = useState('video'); // 'video' | 'image'
    const [caption, setCaption] = useState('');
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef(null);
    const { addToast } = useToast();

    if (!isOpen) return null;

    const dailyInfo = getDailyStatusCount(userId);

    const handleFileChange = (e) => {
        const selected = e.target.files?.[0];
        if (!selected) return;

        const isVideo = selected.type.startsWith('video/') || selected.name.match(/\.(mp4|mov|webm|m4v)$/i);
        const isImage = selected.type.startsWith('image/');

        if (!isVideo && !isImage) {
            addToast('Please select a valid video or image file.', 'error');
            return;
        }

        setFile(selected);
        setMediaType(isVideo ? 'video' : 'image');
        const url = URL.createObjectURL(selected);
        setPreviewUrl(url);
        triggerLightHaptic();
    };

    const handleClearFile = () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            addToast('Please choose a video or photo to post.', 'info');
            return;
        }

        if (!dailyInfo.canUpload) {
            addToast(`Daily limit reached (${dailyInfo.count}/2). Resets at midnight!`, 'warning');
            return;
        }

        setLoading(true);
        triggerLightHaptic();

        try {
            // 1. Save locally for instantaneous local feedback & coin incentive
            let localResult = null;
            try {
                localResult = await saveLocalStatus(userId, file, caption, userProfile);
            } catch (localErr) {
                console.warn('[StatusUploadModal] Local save warning:', localErr);
            }

            // 2. Upload media and create remote status record in Supabase so friends can view it
            let remoteStatus = null;
            try {
                const { url: mediaUrl, error: uploadErr } = await uploadStatusMedia(file, userId);
                if (uploadErr) {
                    console.warn('[StatusUploadModal] Remote upload error:', uploadErr);
                } else if (mediaUrl) {
                    const isVideo = file.type?.startsWith('video/') || file.name?.match(/\.(mp4|mov|webm|m4v)$/i);
                    const { data: created, error: createErr } = await createStatus(
                        userId,
                        mediaUrl,
                        caption,
                        isVideo ? 'video' : 'image'
                    );
                    if (createErr) {
                        console.warn('[StatusUploadModal] Remote create error:', createErr);
                    } else {
                        remoteStatus = created;
                    }
                }
            } catch (remoteErr) {
                console.warn('[StatusUploadModal] Remote status upload non-blocking warning:', remoteErr);
            }

            triggerSuccessHaptic();

            const isVideo = file.type?.startsWith('video/') || file.name?.match(/\.(mp4|mov|webm|m4v)$/i);
            const coinBonus = localResult?.coinBonus || 0;
            if (isVideo && coinBonus > 0) {
                addToast(`🎉 Status posted! +${coinBonus} CD Coins awarded for video moment!`, 'success');
            } else {
                addToast('⚡ Campus status shared successfully!', 'success');
            }

            const finalStatus = remoteStatus || localResult?.status;
            if (typeof onStatusAdded === 'function' && finalStatus) {
                onStatusAdded(finalStatus);
            }

            // Dispatch global event for listeners across chat and profile
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('cd:status-created', { detail: finalStatus }));
            }

            // Notify campus friends of newly uploaded status (In-app, Push, Email)
            if (userId && finalStatus) {
                notifyFriendsOfNewStatus({
                    authorId: userId,
                    authorProfile: userProfile,
                    statusId: finalStatus.id,
                    mediaType: isVideo ? 'video' : 'image',
                    caption
                }).catch((err) => console.warn('[StatusUploadModal] friend alert error:', err));
            }

            handleClearFile();
            setCaption('');
            onClose();
        } catch (err) {
            console.error('[StatusUploadModal] error:', err);
            addToast(err.message || 'Failed to post status', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="status-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
            <div className="status-modal-card" onClick={(e) => e.stopPropagation()}>
                <div className="status-modal-handle" />

                {/* Header */}
                <div className="status-modal-header">
                    <div>
                        <h2 className="status-modal-title">Share Campus Moment ⚡</h2>
                        <span className="status-modal-subtitle">
                            Visible to campus friends • Disappears in 24 hours
                        </span>
                    </div>
                    <div className="status-daily-pill" title="Daily status quota">
                        {dailyInfo.count}/2 today
                    </div>
                </div>

                {/* Video Priority Incentive Banner */}
                <div className="status-incentive-card">
                    <span className="incentive-star">⭐</span>
                    <div className="incentive-text">
                        <strong>Video Priority:</strong> Upload a 10s–30s campus video clip to earn <strong>+10 Free CD Coins</strong> & 3x discovery boost!
                    </div>
                </div>

                {/* Upload / Preview Area */}
                {!previewUrl ? (
                    <div
                        className="status-dropzone"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="video/*,image/*"
                            style={{ display: 'none' }}
                            onChange={handleFileChange}
                        />
                        <div className="dropzone-icon-ring">
                            <span className="dropzone-icon">🎥</span>
                        </div>
                        <h3 className="dropzone-heading">Tap to choose video or photo</h3>
                        <p className="dropzone-sub">
                            Campus moments, library vibes, hangout clips, or quick selfies
                        </p>
                        <div className="dropzone-badges">
                            <span className="dropzone-tag video-tag">🎥 Video (+10 Coins)</span>
                            <span className="dropzone-tag photo-tag">📸 Photo</span>
                        </div>
                    </div>
                ) : (
                    <div className="status-preview-box">
                        <button
                            type="button"
                            className="btn-remove-preview"
                            onClick={handleClearFile}
                            title="Remove file"
                        >
                            ✕
                        </button>

                        {mediaType === 'video' ? (
                            <video
                                src={previewUrl}
                                className="status-preview-media"
                                autoPlay
                                loop
                                muted
                                playsInline
                            />
                        ) : (
                            <img
                                src={previewUrl}
                                alt="Preview"
                                className="status-preview-media"
                            />
                        )}

                        <span className="media-type-badge">
                            {mediaType === 'video' ? '🎥 Video Clip' : '📸 Photo'}
                        </span>
                    </div>
                )}

                {/* Caption Input */}
                <div className="status-caption-wrap">
                    <textarea
                        className="status-caption-input"
                        placeholder="Add a vibe caption... (e.g. Late night reading session at UNILAG library 📚🔥)"
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        maxLength={180}
                        rows={2}
                    />
                    <div className="status-caption-counter">
                        {caption.length}/180
                    </div>
                </div>

                {/* Ephemeral Notice */}
                <p className="status-ephemeral-note">
                    🔒 <strong>Zero-Backend Ephemeral:</strong> Stored locally on your device with 0 cloud storage footprint. Auto-cleans after 24h.
                </p>

                {/* Action Buttons */}
                <div className="status-actions-row">
                    <button
                        type="button"
                        className="status-btn-cancel"
                        onClick={onClose}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="status-btn-submit"
                        onClick={handleSubmit}
                        disabled={loading || !file || !dailyInfo.canUpload}
                    >
                        {loading ? 'Posting...' : !dailyInfo.canUpload ? 'Daily Limit Reached (2/2)' : 'Post Campus Status 🚀'}
                    </button>
                </div>
            </div>
        </div>
    );
}
