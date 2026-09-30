import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { getPublicAppUrl } from '../utils/appUrl';
import './AnonymousStoryCardModal.css';

export default function AnonymousStoryCardModal({ message, username, fullName, onClose }) {
    const canvasRef = useRef(null);
    const [imageUri, setImageUri] = useState(null);
    const [sharing, setSharing] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = 1080;
        const H = 1920;
        canvas.width = W;
        canvas.height = H;

        // 1. Background Gradient
        const bgGrad = ctx.createLinearGradient(0, 0, W, H);
        bgGrad.addColorStop(0, '#0c071e');
        bgGrad.addColorStop(0.4, '#1b0d36');
        bgGrad.addColorStop(0.8, '#2a0845');
        bgGrad.addColorStop(1, '#090a12');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        // 2. Ambient Orbs
        const drawOrb = (x, y, r, color) => {
            const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
            grad.addColorStop(0, color);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        };
        drawOrb(W * 0.2, H * 0.25, 420, 'rgba(236, 72, 153, 0.35)');
        drawOrb(W * 0.8, H * 0.65, 480, 'rgba(99, 102, 241, 0.3)');
        drawOrb(W * 0.5, H * 0.85, 380, 'rgba(217, 70, 239, 0.25)');

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

        // 3. Brand Top Bar
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        roundRect(W * 0.5 - 220, 160, 440, 72, 36);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 30px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✨ The College Date', W * 0.5, 196);
        ctx.restore();

        // 4. Main Question Card
        const cardW = 880;
        const cardH = 760;
        const cardX = (W - cardW) / 2;
        const cardY = 460;

        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 40;
        ctx.shadowOffsetY = 20;

        // Card Surface
        ctx.fillStyle = '#ffffff';
        roundRect(cardX, cardY, cardW, cardH, 44);
        ctx.fill();
        ctx.restore();

        // Card Header Pill
        ctx.save();
        const headerGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + 140);
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

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`send me anonymous questions! 💌`, cardX + cardW / 2, cardY + 80);

        ctx.font = '24px sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillText(`@${username || 'student'}`, cardX + cardW / 2, cardY + 122);
        ctx.restore();

        // Card Body (Question Text with Word Wrap)
        ctx.save();
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 44px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const text = message.content || message.message_text || '';
        const words = text.split(' ');
        const lines = [];
        let curLine = '';
        const maxTextW = cardW - 120;

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

        const lineHeight = 60;
        const totalTextHeight = lines.length * lineHeight;
        const startY = cardY + 160 + (cardH - 160) / 2 - totalTextHeight / 2 + 25;

        lines.slice(0, 6).forEach((line, idx) => {
            ctx.fillText(line, cardX + cardW / 2, startY + idx * lineHeight);
        });
        ctx.restore();

        // 5. Answer / Call to Action Prompt
        const promptY = cardY + cardH + 120;

        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        roundRect(W * 0.5 - 340, promptY, 680, 110, 55);
        ctx.fill();
        ctx.strokeStyle = 'rgba(236, 72, 153, 0.4)';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('👇 tap to send me your secrets', W * 0.5, promptY + 55);
        ctx.restore();

        // 6. Link Footer
        const askUrl = `thecollegedate.com/ask/${username || 'you'}`;
        ctx.save();
        ctx.fillStyle = '#ec4899';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`🔗 ${askUrl}`, W * 0.5, promptY + 200);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '26px sans-serif';
        ctx.fillText('100% Anonymous • Real Nigerian Campuses', W * 0.5, promptY + 260);
        ctx.restore();

        // Generate data URL for image preview & download
        try {
            const dataUrl = canvas.toDataURL('image/png');
            setImageUri(dataUrl);
        } catch (e) {
            console.warn('Canvas toDataURL warning:', e);
        }
    }, [message, username]);

    const handleDownload = () => {
        if (!imageUri) return;
        const link = document.createElement('a');
        link.download = `college-date-ask-${username || 'anonymous'}.png`;
        link.href = imageUri;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleWhatsAppShare = async () => {
        const askUrl = getPublicAppUrl(`ask/${username || ''}`);
        const text = `Send me anonymous questions & confessions! 🤫 Drop yours here:\n${askUrl}`;

        // Attempt Web Share with image if supported
        if (navigator.share && canvasRef.current) {
            try {
                setSharing(true);
                canvasRef.current.toBlob(async (blob) => {
                    if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], 'story.png', { type: 'image/png' })] })) {
                        const file = new File([blob], `ask-${username}.png`, { type: 'image/png' });
                        await navigator.share({
                            files: [file],
                            title: 'Anonymous Campus Q&A',
                            text: text
                        });
                        setSharing(false);
                    } else {
                        // Fallback to WhatsApp URL
                        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                        setSharing(false);
                    }
                }, 'image/png');
                return;
            } catch (err) {
                console.log('Share canceled or not supported:', err);
                setSharing(false);
            }
        }

        // Standard WhatsApp web/app redirect
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const storyContent = (
        <div className="story-modal-overlay" onClick={onClose}>
            <div className="story-modal-card" onClick={(e) => e.stopPropagation()}>
                <div className="story-modal-header">
                    <h3>📸 Story Card Preview</h3>
                    <button type="button" className="story-close-btn" onClick={onClose}>✕</button>
                </div>

                <div className="story-preview-container">
                    <canvas ref={canvasRef} className="story-hidden-canvas" />
                    {imageUri ? (
                        <img src={imageUri} alt="Story Card Preview" className="story-preview-img" />
                    ) : (
                        <div className="story-generating-box">Rendering Story Card...</div>
                    )}
                </div>

                <div className="story-modal-actions">
                    <button
                        type="button"
                        className="btn-story-download"
                        onClick={handleDownload}
                        disabled={!imageUri}
                    >
                        📥 Download PNG Card
                    </button>
                    <button
                        type="button"
                        className="btn-story-whatsapp"
                        onClick={handleWhatsAppShare}
                        disabled={sharing}
                    >
                        💬 Share to WhatsApp Story
                    </button>
                </div>
            </div>
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(storyContent, document.body) : storyContent;
}
