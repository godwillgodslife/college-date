import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getPublicAppUrl } from '../utils/appUrl';
import { useToast } from './Toast';
import './StoryShareModal.css';

const DEFAULT_PROMPTS = [
    'Send me anonymous confessions & questions 🤫',
    'Tell me what you really think of me 🤐',
    'Who is your campus crush? 👀',
    'Ask me anything, zero identity leak 💭',
    'Drop a wild campus confession 🔥'
];

export default function StoryShareModal({ userProfile, currentUser, onClose, initialPrompt }) {
    const canvasRef = useRef(null);
    const [selectedPrompt, setSelectedPrompt] = useState(initialPrompt || DEFAULT_PROMPTS[0]);
    const [imageUri, setImageUri] = useState(null);
    const [isRendering, setIsRendering] = useState(true);
    const [sharing, setSharing] = useState(false);
    const { addToast } = useToast();

    const username = userProfile?.username || currentUser?.id || 'you';
    const displayName = userProfile?.full_name || 'Student';
    const university = userProfile?.university || 'Campus Community';
    const askUrl = getPublicAppUrl(`ask/${username}`);

    const renderCard = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        setIsRendering(true);

        const ctx = canvas.getContext('2d');
        const W = 1080;
        const H = 1920;
        canvas.width = W;
        canvas.height = H;

        // 1. Luxury Obsidian-to-Midnight-Violet Gradient
        const bgGrad = ctx.createLinearGradient(0, 0, W, H);
        bgGrad.addColorStop(0, '#090714');
        bgGrad.addColorStop(0.3, '#0f172a');
        bgGrad.addColorStop(0.65, '#1e1b4b');
        bgGrad.addColorStop(1, '#2e1065');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        // 2. Ambient Luminescent Glow Orbs
        const drawGlow = (x, y, r, color) => {
            const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
            grad.addColorStop(0, color);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        };

        drawGlow(W * 0.2, H * 0.2, 480, 'rgba(244, 63, 94, 0.32)');
        drawGlow(W * 0.85, H * 0.5, 520, 'rgba(124, 58, 237, 0.35)');
        drawGlow(W * 0.3, H * 0.82, 450, 'rgba(6, 182, 212, 0.22)');

        // Helper: Rounded Rectangle
        const roundRect = (x, y, w, h, r) => {
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.arcTo(x + w, y, x + w, y + h, r);
            ctx.arcTo(x + w, y + h, x, y + h, r);
            ctx.arcTo(x, y + h, x, y, r);
            ctx.arcTo(x, y, x + w, y, r);
            ctx.closePath();
        };

        // 3. Top Platform Badge Pill
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        roundRect(W * 0.5 - 260, 140, 520, 76, 38);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✨ The College Date • Campus Q&A', W * 0.5, 178);
        ctx.restore();

        // 4. Student Profile Anchor (Avatar + Name + University)
        const profileY = 270;
        ctx.save();
        // Campus pill
        ctx.fillStyle = 'rgba(236, 72, 153, 0.18)';
        roundRect(W * 0.5 - 220, profileY, 440, 56, 28);
        ctx.fill();
        ctx.strokeStyle = 'rgba(236, 72, 153, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#f472b6';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`🎓 ${university}`, W * 0.5, profileY + 28);

        // Student Name
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 44px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(displayName, W * 0.5, profileY + 105);

        const displayHandle = username.length > 18 ? `${username.slice(0, 10)}...` : username;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '28px sans-serif';
        ctx.fillText(`@${displayHandle}`, W * 0.5, profileY + 150);
        ctx.restore();

        // 5. Main Viral Q&A Sticker Box (Instagram/WhatsApp Sticker style)
        const stickerW = 900;
        const stickerH = 680;
        const stickerX = (W - stickerW) / 2;
        const stickerY = 560;

        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 50;
        ctx.shadowOffsetY = 25;

        // Card surface (Ultra-clean solid white card)
        ctx.fillStyle = '#ffffff';
        roundRect(stickerX, stickerY, stickerW, stickerH, 48);
        ctx.fill();
        ctx.restore();

        // Sticker Header Banner (Hot gradient header)
        ctx.save();
        const headerGrad = ctx.createLinearGradient(stickerX, stickerY, stickerX + stickerW, stickerY + 160);
        headerGrad.addColorStop(0, '#f43f5e');
        headerGrad.addColorStop(1, '#8b5cf6');
        ctx.fillStyle = headerGrad;
        ctx.beginPath();
        ctx.moveTo(stickerX, stickerY + 48);
        ctx.arcTo(stickerX, stickerY, stickerX + 48, stickerY, 48);
        ctx.arcTo(stickerX + stickerW, stickerY, stickerX + stickerW, stickerY + 48, 48);
        ctx.lineTo(stickerX + stickerW, stickerY + 160);
        ctx.lineTo(stickerX, stickerY + 160);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💌 ANONYMOUS CAMPUS Q&A', stickerX + stickerW / 2, stickerY + 80);

        ctx.font = '24px sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillText('I cannot see who asked!', stickerX + stickerW / 2, stickerY + 120);
        ctx.restore();

        // Prompt Text inside sticker
        ctx.save();
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 46px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const words = selectedPrompt.split(' ');
        const lines = [];
        let curLine = '';
        const maxTextW = stickerW - 140;

        for (let i = 0; i < words.length; i++) {
            const testLine = curLine ? `${curLine} ${words[i]}` : words[i];
            const testW = ctx.measureText(testLine).width;
            if (testW > maxTextW && curLine) {
                lines.push(curLine);
                curLine = words[i];
            } else {
                curLine = testLine;
            }
        }
        if (curLine) lines.push(curLine);

        const lineHeight = 64;
        const totalTextHeight = lines.length * lineHeight;
        const startY = stickerY + 180 + (stickerH - 330) / 2 - totalTextHeight / 2 + 30;

        lines.slice(0, 4).forEach((line, idx) => {
            ctx.fillText(line, stickerX + stickerW / 2, startY + idx * lineHeight);
        });
        ctx.restore();

        // Simulated Input Pill inside Sticker (Makes it instantly recognizable as a question sticker)
        const inputY = stickerY + stickerH - 120;
        ctx.save();
        ctx.fillStyle = '#f1f5f9';
        roundRect(stickerX + 60, inputY, stickerW - 120, 80, 40);
        ctx.fill();
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.font = '28px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Tap to type your message anonymously...', stickerX + stickerW / 2, inputY + 40);
        ctx.restore();

        // 6. Action Callout & Status Tap Link
        const ctaY = stickerY + stickerH + 100;
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
        roundRect(W * 0.5 - 380, ctaY, 760, 96, 48);
        ctx.fill();
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.5)';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 34px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('👇 TAP LINK ON MY STATUS TO ANSWER', W * 0.5, ctaY + 48);
        ctx.restore();

        // 7. Prominent Link Card
        ctx.save();
        const displaySlug = username.length > 20 ? `${username.slice(0, 10)}...` : username;
        const shortUrl = `thecollegedate.com/ask/${displaySlug}`;
        ctx.fillStyle = '#f472b6';
        let fontSize = 40;
        ctx.font = `bold ${fontSize}px monospace`;
        while (ctx.measureText(`🔗 ${shortUrl}`).width > 860 && fontSize > 24) {
            fontSize -= 2;
            ctx.font = `bold ${fontSize}px monospace`;
        }
        ctx.textAlign = 'center';
        ctx.fillText(`🔗 ${shortUrl}`, W * 0.5, ctaY + 180);

        // Security / Trust Footnote
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '26px sans-serif';
        ctx.fillText('🔒 100% Anonymous • Zero Identity Leak • Verified Nigerian Campuses', W * 0.5, ctaY + 245);
        ctx.restore();

        // Generate data URI
        try {
            const uri = canvas.toDataURL('image/png');
            setImageUri(uri);
        } catch (err) {
            console.warn('Canvas toDataURL warning:', err);
        } finally {
            setIsRendering(false);
        }
    }, [displayName, username, university, selectedPrompt]);

    useEffect(() => {
        renderCard();
    }, [renderCard]);

    const handleDownload = () => {
        if (!imageUri) return;
        const link = document.createElement('a');
        link.download = `college-date-ask-${username}.png`;
        link.href = imageUri;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        addToast('Story card downloaded! Add it to your WhatsApp status 📸', 'success');
    };

    const handleWhatsAppShare = async () => {
        const text = `Send me anonymous questions & confessions! 🤫 Drop yours here:\n${askUrl}`;

        // Attempt Web Share with image attachment if supported
        if (navigator.share && canvasRef.current) {
            try {
                setSharing(true);
                canvasRef.current.toBlob(async (blob) => {
                    if (blob && navigator.canShare) {
                        const file = new File([blob], `thecollegedate-ask-${username}.png`, { type: 'image/png' });
                        if (navigator.canShare({ files: [file] })) {
                            try {
                                await navigator.share({
                                    files: [file],
                                    title: 'Anonymous Campus Q&A',
                                    text: text
                                });
                                setSharing(false);
                                return;
                            } catch {
                                // User cancelled or fallback needed
                            }
                        }
                    }
                    // Fallback to direct download + WhatsApp open
                    handleDownload();
                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                    setSharing(false);
                }, 'image/png');
                return;
            } catch (err) {
                console.warn('Share error:', err);
                setSharing(false);
            }
        }

        // Standard WhatsApp redirect + prompt download
        handleDownload();
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const handleCopyLink = () => {
        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(askUrl);
            addToast('Ask link copied to clipboard! 📋', 'success');
        }
    };

    const modalContent = (
        <div className="story-share-overlay" onClick={onClose} role="dialog" aria-modal="true">
            <div className="story-share-dialog" onClick={(e) => e.stopPropagation()}>
                <div className="story-share-header">
                    <div className="story-share-title-wrap">
                        <h3>📸 WhatsApp / IG Story Card</h3>
                        <span className="story-share-subtitle">Post to your status & get anonymous campus messages</span>
                    </div>
                    <button type="button" className="story-share-close-btn" onClick={onClose} aria-label="Close">
                        ✕
                    </button>
                </div>

                {/* Prompt Selector Chips */}
                <div className="story-prompt-chips-wrapper">
                    <span className="prompt-label">Choose Sticker Prompt:</span>
                    <div className="story-prompt-chips">
                        {DEFAULT_PROMPTS.map((p, idx) => (
                            <button
                                key={idx}
                                type="button"
                                className={`prompt-chip ${selectedPrompt === p ? 'active' : ''}`}
                                onClick={() => setSelectedPrompt(p)}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Card Canvas Preview */}
                <div className="story-preview-wrapper">
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                    {imageUri ? (
                        <img src={imageUri} alt="Story Card Preview" className="story-preview-card-img" />
                    ) : (
                        <div className="story-rendering-placeholder">
                            {isRendering ? 'Rendering 9:16 Story Card...' : 'Failed to render preview'}
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="story-share-actions-bar">
                    <button
                        type="button"
                        className="btn-story-share-wa"
                        onClick={handleWhatsAppShare}
                        disabled={sharing || isRendering}
                    >
                        <span>💬 Share to WhatsApp Status</span>
                    </button>

                    <div className="story-secondary-actions">
                        <button
                            type="button"
                            className="btn-story-secondary"
                            onClick={handleDownload}
                            disabled={!imageUri}
                        >
                            📥 Save PNG
                        </button>
                        <button
                            type="button"
                            className="btn-story-secondary"
                            onClick={handleCopyLink}
                        >
                            📋 Copy Link
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
