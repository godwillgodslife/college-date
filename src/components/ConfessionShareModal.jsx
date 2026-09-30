import React from 'react';
import { createPortal } from 'react-dom';
import { useToast } from './Toast';
import { getPublicAppUrl } from '../utils/appUrl';
import './ConfessionShareModal.css';

export default function ConfessionShareModal({ post, onClose, onOpenStoryModal }) {
    const { addToast } = useToast();
    if (!post) return null;

    const postUrl = getPublicAppUrl(`confessions?id=${post.id}`);
    const preview = post.content ? post.content.substring(0, 90) : 'Campus Secret';

    const handleCopyLink = () => {
        navigator.clipboard?.writeText(postUrl);
        addToast('Confession link copied to clipboard! 🔗', 'success');
        onClose();
    };

    const handleWhatsAppShare = () => {
        const shareText = `"${preview}..."\n\nRead & reply on The College Date:\n${postUrl}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
        onClose();
    };

    const handleNativeShare = async () => {
        const shareText = `"${preview}..."\n\nRead & reply on The College Date:`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Campus Secret • The College Date',
                    text: shareText,
                    url: postUrl
                });
                onClose();
            } catch (err) {
                // Cancelled
            }
        } else {
            handleCopyLink();
        }
    };

    const modalContent = (
        <div className="confession-share-overlay" onClick={onClose}>
            <div className="confession-share-card" onClick={(e) => e.stopPropagation()}>
                <div className="share-card-header">
                    <div className="share-card-title-wrap">
                        <span className="share-card-icon">📤</span>
                        <div>
                            <h3 className="share-card-title">Share Confession</h3>
                            <p className="share-card-subtitle">{post.university || 'Campus Hub'}</p>
                        </div>
                    </div>
                    <button type="button" className="btn-share-close" onClick={onClose} aria-label="Close">
                        ✕
                    </button>
                </div>

                <div className="share-preview-bubble">
                    <p className="share-preview-text">"{preview}{post.content?.length > 90 ? '...' : ''}"</p>
                    <span className="share-preview-url">{postUrl}</span>
                </div>

                <div className="share-options-list">
                    <button type="button" className="btn-share-option" onClick={handleCopyLink}>
                        <div className="option-icon-box blue">📋</div>
                        <div className="option-text-box">
                            <span className="option-title">Copy Link</span>
                            <span className="option-sub">Direct link with auto-open on load</span>
                        </div>
                        <span className="option-chevron">➔</span>
                    </button>

                    <button
                        type="button"
                        className="btn-share-option featured"
                        onClick={() => {
                            onClose();
                            onOpenStoryModal(post);
                        }}
                    >
                        <div className="option-icon-box pink">📸</div>
                        <div className="option-text-box">
                            <span className="option-title">9:16 Story Card</span>
                            <span className="option-sub">Generate Instagram & WhatsApp Story card</span>
                        </div>
                        <span className="option-badge">Viral 🔥</span>
                    </button>

                    <button type="button" className="btn-share-option" onClick={handleWhatsAppShare}>
                        <div className="option-icon-box green">💬</div>
                        <div className="option-text-box">
                            <span className="option-title">WhatsApp Status</span>
                            <span className="option-sub">Share directly to contacts or status</span>
                        </div>
                        <span className="option-chevron">➔</span>
                    </button>

                    {navigator.share && (
                        <button type="button" className="btn-share-option" onClick={handleNativeShare}>
                            <div className="option-icon-box purple">✨</div>
                            <div className="option-text-box">
                                <span className="option-title">More Sharing Options</span>
                                <span className="option-sub">Open system share sheet</span>
                            </div>
                            <span className="option-chevron">➔</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
