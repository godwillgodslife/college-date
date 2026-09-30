import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from './Toast';
import { getPublicAppUrl } from '../utils/appUrl';
import './ConfessionStoryModal.css';

export default function ConfessionStoryModal({ post, onClose }) {
    const canvasRef = useRef(null);
    const [imageUri, setImageUri] = useState(null);
    const [sharing, setSharing] = useState(false);
    const { addToast } = useToast();

    const postUrl = getPublicAppUrl(`confessions?id=${post?.id || ''}`);

    // Draw 9:16 Canvas Story Card (1080 x 1920)
    useEffect(() => {
        if (!post) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = 1080;
        const H = 1920;
        canvas.width = W;
        canvas.height = H;

        // 1. Background Gradient (deep midnight violet/obsidian)
        const bgGrad = ctx.createLinearGradient(0, 0, W, H);
        bgGrad.addColorStop(0, '#090714');
        bgGrad.addColorStop(0.35, '#150c2a');
        bgGrad.addColorStop(0.7, '#240d3a');
        bgGrad.addColorStop(1, '#06070d');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        // 2. Ambient Lighting Glow Orbs
        const drawOrb = (x, y, r, color) => {
            const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
            grad.addColorStop(0, color);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        };
        drawOrb(W * 0.25, H * 0.2, 450, 'rgba(236, 72, 153, 0.32)');
        drawOrb(W * 0.8, H * 0.55, 480, 'rgba(139, 92, 246, 0.28)');
        drawOrb(W * 0.35, H * 0.85, 400, 'rgba(217, 70, 239, 0.22)');

        // Helper for rounded rectangle
        const roundRect = (x, y, w, h, r) => {
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.arcTo(x + w, y, x + w, y + h, r);
            ctx.arcTo(x + w, y + h, x, y + h, r);
            ctx.arcTo(x, y + h, x, y, r);
            ctx.arcTo(x, y, x + w, y, r);
            ctx.closePath();
        };

        // 3. Top Platform Pill
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        roundRect(W * 0.5 - 240, 150, 480, 76, 38);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 30px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✨ The College Date • Secrets', W * 0.5, 188);
        ctx.restore();

        // 4. University Badge
        const uniName = post.university || 'Campus Hub';
        ctx.save();
        ctx.fillStyle = 'rgba(236, 72, 153, 0.2)';
        roundRect(W * 0.5 - 200, 246, 400, 54, 27);
        ctx.fill();
        ctx.strokeStyle = 'rgba(236, 72, 153, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#f472b6';
        ctx.font = '600 24px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`🎓 ${uniName}`, W * 0.5, 273);
        ctx.restore();

        // 5. Main Card Surface
        const cardW = 900;
        const cardH = 880;
        const cardX = (W - cardW) / 2;
        const cardY = 380;

        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 50;
        ctx.shadowOffsetY = 24;

        ctx.fillStyle = '#121324';
        roundRect(cardX, cardY, cardW, cardH, 44);
        ctx.fill();
        ctx.restore();

        // Card Border
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 2;
        roundRect(cardX, cardY, cardW, cardH, 44);
        ctx.stroke();
        ctx.restore();

        // Card Header Pill
        ctx.save();
        const headerGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + 160);
        headerGrad.addColorStop(0, '#ec4899');
        headerGrad.addColorStop(1, '#8b5cf6');
        ctx.fillStyle = headerGrad;
        ctx.beginPath();
        ctx.moveTo(cardX, cardY + 44);
        ctx.arcTo(cardX, cardY, cardX + 44, cardY, 44);
        ctx.arcTo(cardX + cardW, cardY, cardX + cardW, cardY + 44, 44);
        ctx.lineTo(cardX + cardW, cardY + 160);
        ctx.lineTo(cardX, cardY + 160);
        ctx.closePath();
        ctx.fill();

        // Author or Secret Mask Badge
        const isAnon = post.is_anonymous !== false;
        const authorTitle = isAnon ? '🎭 Campus Secret' : `👤 ${post.author_name || 'Campus Student'}`;
        const authorSub = isAnon ? '100% Anonymous Student' : (post.author_username ? `@${post.author_username}` : 'Verified Student');

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(authorTitle, cardX + 50, cardY + 68);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.font = '500 24px system-ui, -apple-system, sans-serif';
        ctx.fillText(authorSub, cardX + 50, cardY + 114);
        ctx.restore();

        // Confession Content Text with Adaptive Font Size
        const content = post.content || '';
        let fontSize = 48;
        if (content.length > 200) fontSize = 36;
        else if (content.length > 120) fontSize = 42;

        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        const maxTextW = cardW - 100;
        const lineHeight = fontSize * 1.5;
        const words = content.split(' ');
        let lines = [];
        let curLine = '';

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

        // Limit lines to fit card comfortably
        const maxLines = Math.floor((cardH - 300) / lineHeight);
        if (lines.length > maxLines) {
            lines = lines.slice(0, maxLines);
            lines[lines.length - 1] += '...';
        }

        const textStartY = cardY + 210;
        lines.forEach((line, idx) => {
            ctx.fillText(line, cardX + 50, textStartY + (idx * lineHeight));
        });
        ctx.restore();

        // Card Footer: Social Metrics
        ctx.save();
        const footerY = cardY + cardH - 80;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        roundRect(cardX + 30, footerY - 20, cardW - 60, 72, 20);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '600 24px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const totalReactions = post.totalReactions || 0;
        const commentsCount = post.commentCount || 0;
        const viewsCount = post.viewCount || 0;
        ctx.fillText(
            `✨ ${totalReactions} Reactions  •  💬 ${commentsCount} Comments  •  👁 ${viewsCount} Views`,
            cardX + (cardW / 2),
            footerY + 16
        );
        ctx.restore();

        // 6. Bottom Sticky Stamp / Swipe Up CTA
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        roundRect(W * 0.5 - 280, 1330, 560, 96, 48);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 2;
        roundRect(W * 0.5 - 280, 1330, 560, 96, 48);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🤫 Tap or Swipe up to Reply', W * 0.5, 1378);
        ctx.restore();

        // URL snippet
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '500 22px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('thecollegedate.com • 100% Student-verified', W * 0.5, 1460);
        ctx.restore();

        // Export Data URI
        try {
            const uri = canvas.toDataURL('image/png');
            setImageUri(uri);
        } catch (e) {
            console.warn('Canvas export error:', e);
        }
    }, [post]);

    const handleDownload = useCallback(() => {
        if (!imageUri) return;
        const link = document.createElement('a');
        link.download = `college-date-confession-${post?.id?.slice(0, 8) || 'story'}.png`;
        link.href = imageUri;
        link.click();
        addToast('Story card downloaded! 📥', 'success');
    }, [imageUri, post, addToast]);

    const handleWhatsAppStatus = useCallback(() => {
        navigator.clipboard?.writeText(postUrl);
        const text = `Check this confession from ${post?.university || 'campus'}! 🤫\nRead & reply:\n${postUrl}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
        addToast('Link copied! Share card & link to your WhatsApp Status 📲', 'success');
    }, [postUrl, post, addToast]);

    const handleNativeShare = useCallback(async () => {
        if (!canvasRef.current) return;
        setSharing(true);
        try {
            const preview = post?.content ? post.content.substring(0, 80) : 'Campus Secret';
            if (navigator.share) {
                canvasRef.current.toBlob(async (blob) => {
                    if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], 'story.png', { type: 'image/png' })] })) {
                        const file = new File([blob], 'confession-story.png', { type: 'image/png' });
                        try {
                            await navigator.share({
                                title: 'Campus Secret • The College Date',
                                text: `"${preview}..."\n${postUrl}`,
                                files: [file]
                            });
                            return;
                        } catch (err) {
                            // Cancelled
                        }
                    }
                    await navigator.share({
                        title: 'Campus Secret • The College Date',
                        text: `"${preview}..."\n${postUrl}`,
                        url: postUrl
                    }).catch(() => {});
                }, 'image/png');
            } else {
                handleWhatsAppStatus();
            }
        } catch (e) {
            console.warn('Share error:', e);
        } finally {
            setSharing(false);
        }
    }, [post, postUrl, handleWhatsAppStatus]);

    const modalContent = (
        <div className="confession-story-modal-overlay" onClick={onClose}>
            <div className="confession-story-modal-container" onClick={(e) => e.stopPropagation()}>
                <div className="story-modal-top-bar">
                    <div className="story-modal-title">
                        <span>📸 9:16 Story Card</span>
                    </div>
                    <button type="button" className="btn-story-close" onClick={onClose} aria-label="Close">
                        ✕
                    </button>
                </div>

                <div className="story-card-preview-area">
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                    {imageUri ? (
                        <img src={imageUri} alt="Confession Story Card" className="story-card-preview-img" />
                    ) : (
                        <div className="story-card-loading">Generating 9:16 Story Card...</div>
                    )}
                </div>

                <div className="story-modal-actions-grid">
                    <button
                        type="button"
                        className="btn-story-action primary-wa"
                        onClick={handleWhatsAppStatus}
                    >
                        <span>💬</span>
                        <span>WhatsApp Status</span>
                    </button>

                    <button
                        type="button"
                        className="btn-story-action secondary-dl"
                        onClick={handleDownload}
                        disabled={!imageUri}
                    >
                        <span>📥</span>
                        <span>Save PNG</span>
                    </button>

                    <button
                        type="button"
                        className="btn-story-action secondary-share"
                        onClick={handleNativeShare}
                        disabled={sharing}
                    >
                        <span>📤</span>
                        <span>{sharing ? 'Sharing...' : 'Share Sheet'}</span>
                    </button>
                </div>

                <div className="story-card-tip-text">
                    💡 Tip: Save PNG to share directly to your Instagram or WhatsApp Story with link sticker: <br />
                    <strong>{postUrl}</strong>
                </div>
            </div>
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
